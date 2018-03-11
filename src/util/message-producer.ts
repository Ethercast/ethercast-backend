import logger from './logger';
import { Log, Transaction } from '@ethercast/model';
import toLogMessageAttributes from './to-log-message-attributes';
import * as SNS from 'aws-sdk/clients/sns';
import toTxMessageAttributes from './to-tx-message-attributes';
import { createMessage } from '@ethercast/message-compressor';
import { MessageAttributeMap } from 'aws-sdk/clients/sns';

export default class MessageProducer {
  private sns: SNS;
  private topicArn: string;

  constructor(sns: SNS, topicArn: string) {
    this.topicArn = topicArn;
    this.sns = sns;

    logger.debug({ topicArn }, `constructed log message producer`);
  }

  private async publish(MessageAttributes: MessageAttributeMap, obj: object) {
    const { MessageId } = await this.sns.publish({
      Message: createMessage(obj),
      MessageAttributes,
      TopicArn: this.topicArn
    }).promise();

    logger.debug({ MessageId, MessageAttributes, topicArn: this.topicArn }, `published log message`);
  }

  public async publishLog(log: Log) {
    await this.publish(toLogMessageAttributes(log), log);
  }

  public async publishTransaction(transaction: Transaction) {
    await this.publish(toTxMessageAttributes(transaction), transaction);
  }
}
