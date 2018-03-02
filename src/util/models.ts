import * as Joi from 'joi';
import { Schema } from 'joi';
import urlRegex = require('url-regex');

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

export const JoiSubscriptionPostRequest = Joi.object().keys({
  name: Joi.string().min(1).max(256).required(),
  description: Joi.string().max(1024),
  webhookUrl: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .regex(urlRegex(), 'URL regular expression')
    .required(),
  filters: Joi.object({
    address: filterOption(address),
    topic0: filterOption(topic),
    topic1: filterOption(topic),
    topic2: filterOption(topic),
    topic3: filterOption(topic)
  }).required()
}).unknown(false);

export const JoiSubscription = JoiSubscriptionPostRequest.keys({
  id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  timestamp: Joi.number().required(),
  user: Joi.string().required(),
  status: Joi.string().valid('active', 'pending', 'deactivated'),
  subscriptionArn: Joi.string().required()
});

export enum SubscriptionStatus {
  active = 'active',
  pending = 'pending',
  deactivated = 'deactivated'
}

export enum FilterType {
  address = 'address',
  topic0 = 'topic0',
  topic1 = 'topic1',
  topic2 = 'topic2',
  topic3 = 'topic3'
}

export type FilterOptionValue = string | string[] | null;
export type SubscriptionFilters = Partial<{[filterType in FilterType]: FilterOptionValue}>;

export interface Subscription {
  id: string; // uuid v4
  timestamp: number;
  user: string;
  name: string; // reasonable max length
  description?: string; // reasonable max length - longer
  webhookUrl: string;
  status: SubscriptionStatus;
  filters: SubscriptionFilters;
  subscriptionArn: string;
}

export interface Receipt {
  id: string;
  subscriptionId: string;
  success: boolean;
  timestamp: number;
  webhookUrl: string;
}
