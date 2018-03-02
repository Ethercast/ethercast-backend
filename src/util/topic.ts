import { SNS } from 'aws-sdk';
import { MessageAttributeMap } from 'aws-sdk/clients/sns';
import logger from './logger';

const sns = new SNS();

export class Topic {
  private topicArn: string;

  constructor(topicArn: string) {
    this.topicArn = topicArn;

    logger.info({ topicArn }, `initializing topic`);
  }

  public async publish(attributes: MessageAttributeMap, message: Object) {
    logger.info({ attributes }, `publishing message`);

    const { MessageId } = await sns.publish({
      Message: JSON.stringify(message),
      MessageAttributes: attributes,
      TopicArn: this.topicArn
    }).promise();

    logger.info({ MessageId }, `published message`);

    return;
  }
}
