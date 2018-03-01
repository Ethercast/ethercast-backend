import * as env from 'env-var';
import { LogLevel } from 'bunyan';

export const LOG_LEVEL: LogLevel = env.get('LOG_LEVEL').required().asString() as LogLevel;
export const SUBSCRIPTIONS_TABLE: string = env.get('SUBSCRIPTIONS_TABLE').required().asString();
export const WEBHOOK_RECEIPTS_TABLE: string = env.get('WEBHOOK_RECEIPTS_TABLE').required().asString();
export const QUEUE_ARN: string = env.get('QUEUE_ARN').required().asString();

export const TOKEN_ISSUER: string = env.get('TOKEN_ISSUER').required().asString();
