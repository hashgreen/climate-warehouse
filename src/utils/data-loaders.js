import _ from 'lodash';

import request from 'request-promise';

import { Governance } from '../models';
import PickListStub from '../models/governance/governance.stub.json';
import { getConfig } from '../utils/config-loader';
import { logger } from '../config/logger.cjs';

const { USE_SIMULATOR, USE_DEVELOPMENT_MODE } = getConfig().APP;

let downloadedPickList = {};
export const getPicklistValues = () => downloadedPickList;

export const pullPickListValues = async () => {
  if (USE_SIMULATOR || USE_DEVELOPMENT_MODE) {
    downloadedPickList = PickListStub;
  } else {
    const governanceData = await Governance.findOne({
      where: { metaKey: 'pickList' },
      raw: true,
    });

    if (_.get(governanceData, 'metaValue')) {
      downloadedPickList = JSON.parse(governanceData.metaValue);
    }
  }

  return downloadedPickList;
};

export const getDefaultOrganizationList = async () => {
  if (USE_SIMULATOR || USE_DEVELOPMENT_MODE) {
    return [];
  } else {
    const governanceData = await Governance.findOne({
      where: { metaKey: 'orgList' },
      raw: true,
    });

    return JSON.parse(_.get(governanceData, 'metaValue', '[]'));
  }
};

export const serverAvailable = async (server, port) => {
  const options = {
    method: 'GET',
    url: `http://${server}:${port}`,
  };

  try {
    await request(Object.assign({}, options));
    return true;
  } catch (err) {
    if (JSON.stringify(err).includes('Python')) {
      logger.info(`SERVER IS AVAILABLE ${server}`);
      return true;
    } else {
      return false;
    }
  }
};
