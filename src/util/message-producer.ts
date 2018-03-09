import logger from './logger';
import { Log, Transaction } from '@ethercast/model';
import toLogMessageAttributes from './to-log-message-attributes';
import * as SNS from 'aws-sdk/clients/sns';
import toTxMessageAttributes from './to-tx-message-attributes';

export default class MessageProducer {
  private sns: SNS;
  private topicArn: string;

  constructor(sns: SNS, topicArn: string) {
    this.topicArn = topicArn;
    this.sns = sns;

    logger.debug({ topicArn }, `constructed log message producer`);
  }

  public async publishLog(log: Log) {
    const MessageAttributes = toLogMessageAttributes(log);

    const { MessageId } = await this.sns.publish({
      Message: JSON.stringify(log),
      MessageAttributes,
      TopicArn: this.topicArn
    }).promise();

    logger.debug({ MessageId, MessageAttributes, topicArn: this.topicArn }, `published log message`);
  }

  public async publishTransaction(transaction: Transaction) {
    const MessageAttributes = toTxMessageAttributes(transaction);

    const { MessageId } = await this.sns.publish({
      Message: JSON.stringify(transaction),
      MessageAttributes,
      TopicArn: this.topicArn
    }).promise();

    logger.debug({ MessageId, MessageAttributes, topicArn: this.topicArn }, `published log message`);
  }
}
