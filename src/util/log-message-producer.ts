import { SNS } from 'aws-sdk';
import logger from './logger';
import { Log } from '@ethercast/model';
import toMessageAttributes from './to-message-attributes';

const sns = new SNS();

export default class LogMessageProducer {
  private topicArn: string;

  constructor(topicArn: string) {
    this.topicArn = topicArn;

    logger.info({ topicArn }, `initializing topic`);
  }

  public async publish(log: Log) {
    const attributes = toMessageAttributes(log);

    logger.info({ attributes }, `publishing message`);

    const { MessageId } = await sns.publish({
      Message: JSON.stringify(log),
      MessageAttributes: attributes,
      TopicArn: this.topicArn
    }).promise();

    logger.info({ MessageId }, `published message`);

    return;
  }
}
