import { createLogger, stdSerializers } from 'bunyan';
import { LOG_LEVEL } from './env';

export default createLogger({
  name: 'ethercast',
  level: LOG_LEVEL,
  serializers: stdSerializers
});