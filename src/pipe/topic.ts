import { SNS } from 'aws-sdk';
import { MessageAttributeMap } from 'aws-sdk/clients/sns';
import logger from '../util/logger';

const sns = new SNS();

export class Topic {
  private arn: string;

  constructor(arn: string) {
    this.arn = arn;

    logger.info({ arn: this.arn }, `initializing topic`);
  }

  public async publish(attributes: MessageAttributeMap, message: Object) {
    logger.info({ attributes }, `publishing message`);

    const { MessageId } = await sns.publish({
      Message: JSON.stringify(message),
      MessageAttributes: attributes,
      TopicArn: this.arn
    }).promise();

    logger.info({ MessageId }, `published message`);

    return;
  }
}
