import * as env from 'env-var';
import { LogLevel } from 'bunyan';

export const LOG_LEVEL: LogLevel = env.get('LOG_LEVEL').required().asString() as LogLevel;

export const SUBSCRIPTIONS_TABLE: string = env.get('SUBSCRIPTIONS_TABLE').required().asString();
export const WEBHOOK_RECEIPTS_TABLE: string = env.get('WEBHOOK_RECEIPTS_TABLE').required().asString();

export const NOTIFICATION_TOPIC_NAME: string = env.get('NOTIFICATION_TOPIC_NAME').required().asString();
export const NOTIFICATION_LAMBDA_NAME: string = env.get('NOTIFICATION_LAMBDA_NAME').required().asString();

export const LOG_QUEUE_NAME: string = env.get('LOG_QUEUE_NAME').required().asString();
export const TX_QUEUE_NAME: string = env.get('TX_QUEUE_NAME').required().asString();

export const TOKEN_ISSUER: string = env.get('TOKEN_ISSUER').required().asUrlString();
