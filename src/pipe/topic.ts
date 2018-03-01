import { SNS } from 'aws-sdk';
import * as _ from 'underscore';
import { MessageAttributeMap } from 'aws-sdk/clients/sns';

const sns = new SNS();

export class Topic {
  private arn: string;

  constructor(arn: string) {
    this.arn = arn;
    console.log(`initializing topic:${this.arn}`);
  }

  public async publish(attributes: MessageAttributeMap, message: Object) {
    const MessageAttributes = _.mapObject(
      attributes,
      (attr: string) => ({
        DataType: 'String',
        StringValue: attr
      })
    );

    console.log(`publishing message: ${attributes}`);

    return sns.publish({
      Message: JSON.stringify(message),
      MessageAttributes: attributes,
      TopicArn: this.arn
    }).promise();
  }
}
