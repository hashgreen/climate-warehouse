'use strict';

import _ from 'lodash';

import { uuid as uuidv4 } from 'uuidv4';
import {
  Staging,
  UnitMock,
  Unit,
  Qualification,
  Vintage,
  Organization,
} from '../models';
import { optionallyPaginatedResponse, paginationParams } from './helpers';

export const create = async (req, res, next) => {
  try {
    const newRecord = _.cloneDeep(req.body);

    // When creating new unitd assign a uuid to is so
    // multiple organizations will always have unique ids
    const uuid = uuidv4();

    newRecord.warehouseUnitId = uuid;

    // All new units are assigned to the home orgUid
    const orgUid = _.head(Object.keys(await Organization.getHomeOrg()));
    newRecord.orgUid = orgUid;
    newRecord.unitOwnerOrgUid = orgUid;

    // The new unit is getting created in this registry
    newRecord.registry = orgUid;

    newRecord.unitCount =
      Number(newRecord.unitBlockEnd.replace(/^\D+/, '')) -
      Number(newRecord.unitBlockStart.replace(/^\D+/, ''));

    const stagedData = {
      uuid,
      action: 'INSERT',
      table: 'Units',
      data: JSON.stringify([newRecord]),
    };

    await Staging.create(stagedData);

    res.json({
      message: 'Unit created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const findAll = async (req, res) => {
  const { page, limit } = req.query;

  if (req.query.onlyEssentialColumns) {
    return res.json(
      optionallyPaginatedResponse(
        await Unit.findAndCountAll({
          distinct: true,
          attributes: [
            'orgUid',
            'unitLink',
            'registry',
            'unitType',
            'unitCount',
            'unitStatus',
            'unitStatusDate',
          ],
        }),
        page,
        limit,
      ),
    );
  }

  res.json(
    optionallyPaginatedResponse(
      await Unit.findAndCountAll({
        distinct: true,
        include: [
          {
            model: Qualification,
            as: 'qualifications',
          },
          Vintage,
        ],
        ...paginationParams(page, limit),
      }),
      page,
      limit,
    ),
  );
};

export const findOne = async (req, res) => {
  console.info('req.query', req.query);
  res.json(
    await Unit.findByPk(req.query.warehouseUnitId, {
      include: [
        {
          model: Qualification,
          as: 'qualifications',
        },
        Vintage,
      ],
    }),
  );
};

export const update = async (req, res) => {
  try {
    const stagedData = {
      uuid: req.body.warehouseUnitId,
      action: 'UPDATE',
      table: 'Units',
      data: JSON.stringify(Array.isArray(req.body) ? req.body : [req.body]),
    };

    await Staging.upsert(stagedData);

    res.json({
      message: 'Unit updated successfully',
    });
  } catch (err) {
    res.json({
      message: 'Error updating new unit',
    });
  }
};

export const destroy = async (req, res) => {
  try {
    const stagedData = {
      uuid: req.body.warehouseUnitId,
      action: 'DELETE',
      table: 'Units',
    };

    await Staging.create(stagedData);
    res.json({
      message: 'Unit deleted successfully',
    });
  } catch (err) {
    res.json({
      message: 'Error deleting new unit',
    });
  }
};

export const split = async (req, res) => {
  try {
    const originalRecordResult = await Unit.findByPk(req.body.warehouseUnitId);
    const originalRecord = originalRecordResult.dataValues;

    if (!originalRecord) {
      res.status(404).json({
        message: `The unit record for the warehouseUnitId: ${req.body.warehouseUnitId} does not exist`,
      });
      return;
    }

    const sumOfSplitUnits = req.body.records.reduce(
      (previousValue, currentValue) =>
        previousValue.unitCount + currentValue.unitCount,
    );

    if (sumOfSplitUnits !== originalRecord.unitCount) {
      res.status(404).json({
        message: `The sum of the split units is ${sumOfSplitUnits} and the original record is ${originalRecord.unitCount}. These should be the same.`,
      });
      return;
    }

    const splitRecords = req.body.records.map((record, index) => {
      const newRecord = _.cloneDeep(originalRecord);
      newRecord.warehouseUnitId = uuidv4();
      console.log(uuidv4());
      newRecord.unitCount = record.unitCount;

      if (record.orgUid) {
        newRecord.unitOwnerOrgUid = record.orgUid;
      }

      return newRecord;
    });

    // console.log(splitRecords);

    const stagedData = {
      uuid: req.body.warehouseUnitId,
      action: 'UPDATE',
      commited: false,
      table: 'Units',
      data: JSON.stringify(splitRecords),
    };

    await Staging.upsert(stagedData);

    res.json({
      message: 'Unit split successful',
    });
  } catch (err) {
    res.json({
      message: 'Error splitting unit',
    });
  }
};
