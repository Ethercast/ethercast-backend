import * as Joi from 'joi';
import urlRegex = require('url-regex');

export const SubscriptionPostRequest = Joi.object().keys({
  name: Joi.string().min(1).max(256).required(),
  description: Joi.string().max(1024),
  webhookUrl: Joi.string()
    .uri({ scheme: 'https' })
    .regex(urlRegex())
    .required(),
  logic: Joi.array()
    .items(
      Joi.array()
        .items(
          Joi.alternatives(
            [
              Joi.object().keys({
                type: Joi.string().only('address', 'topic0', 'topic1', 'topic2', 'topic3').required(),
                value: Joi.when(
                  Joi.ref('type'),
                  {
                    is: 'address',
                    then: Joi.string().regex(/^0x[0-9a-fA-F]{40}$/).required(),
                    otherwise: Joi.string().regex(/^0x[0-9a-f]{64}$/).required()
                  }
                )
              })
            ]
          )
        )
        .min(1)
        .max(10)
    )
    .required()
    .min(1)
    .max(10)
}).unknown(false);
