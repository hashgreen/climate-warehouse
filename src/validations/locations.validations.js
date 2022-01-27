import Joi from 'joi';

export const locationSchema = Joi.object({
  id: Joi.string().optional(),
  country: Joi.string().required(),
  inCountryRegion: Joi.string().required(),
  geographicIdentifier: Joi.string().required(),
});
