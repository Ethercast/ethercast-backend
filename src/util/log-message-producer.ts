import { SNS } from 'aws-sdk';
import logger from './logger';
import { Log } from '@ethercast/model';
import toMessageAttributes from './to-message-attributes';

export default class LogMessageProducer {
  private sns: SNS;
  private topicArn: string;

  constructor(sns: SNS, topicArn: string) {
    this.topicArn = topicArn;
    this.sns = sns;

    logger.debug({ topicArn }, `constructed log message producer`);
  }

  public async publish(log: Log) {
    const attributes = toMessageAttributes(log);

    const { MessageId } = await this.sns.publish({
      Message: JSON.stringify(log),
      MessageAttributes: attributes,
      TopicArn: this.topicArn
    }).promise();

    logger.debug({ MessageId, topicArn: this.topicArn, attributes }, `published message`);
  }
}
