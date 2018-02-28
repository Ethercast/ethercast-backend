import { SNS } from 'aws-sdk';
import mapValues = require('lodash.mapvalues');

const sns = new SNS();

interface Attributes {
  [string]: string[];
}

export class Topic {
  private arn: string;

  constructor(arn: string) {
    this.arn = arn;
    console.log(`initializing topic:${this.arn}`);
  }

  public async publish(attributes: Attributes, message: Object) {
    const MessageAttributes = mapValues(attributes, (attr) => ({
      DataType: 'String',
      StringValue: attr,
    }));

    console.log(`publishing message: ${attributes}`);

    return sns.publish({
      Message: message,
      MessageAttributes,
      TopicArn: this.arn,
    }).promise();
  }
}
