import * as Joi from 'joi';
import urlRegex = require('url-regex');
import { Schema } from 'joi';

const address = Joi.string().regex(/^0x[0-9a-fA-F]{40}$/).lowercase();
const topic = Joi.string().regex(/^0x[0-9a-f]{64}$/).lowercase();

function filterOption(item: Schema) {
  return Joi.alternatives(
    // Either null...
    Joi.any().valid(null),
    // or the item...
    item,
    // or an array of the item.
    Joi.array().items(item).min(1).max(100)
  );
}

export const SubscriptionPostRequest = Joi.object().keys({
  name: Joi.string().min(1).max(256).required(),
  description: Joi.string().max(1024),
  webhookUrl: Joi.string().regex(urlRegex()).required(),
  filters: Joi.object({
    address: filterOption(address).required(),
    topic0: filterOption(topic).required(),
    topic1: filterOption(topic).required(),
    topic2: filterOption(topic).required(),
    topic3: filterOption(topic).required()
  }).required()
}).unknown(false);
