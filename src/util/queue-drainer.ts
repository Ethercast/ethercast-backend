import { SQS } from 'aws-sdk';
import * as Logger from 'bunyan';

export type Message = SQS.Types.Message;
export type MessageHandler = (message: Message) => Promise<void>;
export type RemainingTimeFunction = () => number;

export default class QueueDrainer {
  private logger: Logger;
  private sqs: SQS;
  private queueUrl: string;
  private handleMessage: MessageHandler;
  private getRemainingTime: RemainingTimeFunction;

  constructor({ logger, sqs, queueUrl, handleMessage, getRemainingTime }: { logger: Logger, sqs: SQS, queueUrl: string, handleMessage: MessageHandler, getRemainingTime: RemainingTimeFunction }) {
    this.logger = logger.child({ name: 'QueueDrainer' });
    this.sqs = sqs;
    this.queueUrl = queueUrl;
    this.handleMessage = handleMessage;
    this.getRemainingTime = getRemainingTime;
  }

  private async poll(numMessages: number = 10): Promise<Message[]> {
    const { Messages } = await this.sqs.receiveMessage({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: numMessages,
      WaitTimeSeconds: 1
    }).promise();

    if (!Messages) {
      this.logger.info('polling returned undefined messages');
      return [];
    }

    return Messages;
  }

  private deleteMessages = async (messages: Message[]) => {
    if (messages.length === 0) {
      return;
    }

    this.logger.debug({ messageCount: messages.length }, 'deleting messages');

    const Entries = messages
      .map(
        ({ MessageId, ReceiptHandle }) => {
          if (!MessageId || !ReceiptHandle) {
            this.logger.error({ MessageId, ReceiptHandle }, 'missing message id or receipt handle');
            throw new Error('missing message id or receipt handle');
          }

          return {
            Id: MessageId,
            ReceiptHandle
          };
        }
      );

    await this.sqs.deleteMessageBatch({
      QueueUrl: this.queueUrl,
      Entries
    }).promise();

    this.logger.debug({ messageCount: messages.length }, 'deleted messages');
  };

  private processMessages = async (messages: Message[]) => {
    this.logger.debug({ messageCount: messages.length }, `processing messages`);

    for (let i = 0; i < messages.length; i++) {
      await this.handleMessage(messages[i]);
    }
  };

  public async drain() {
    let processedMessageCount = 0;
    let pollCount = 0;

    // while we have more than 3 seconds remaining
    while (this.getRemainingTime() > 3000) {
      if (pollCount % 5 === 0) {
        this.logger.info({ pollCount, processedMessageCount }, 'polling...');
      } else {
        this.logger.debug({ pollCount, processedMessageCount }, 'polling...');
      }

      const messages = await this.poll();

      await this.processMessages(messages);

      if (messages.length === 0) {
        this.logger.info({ processedMessageCount, pollCount }, 'queue is empty, ending drain');
        break;
      }

      await this.deleteMessages(messages);

      processedMessageCount += messages.length;
      pollCount++;
    }

    this.logger.debug({ processedMessageCount, pollCount }, 'finished draining queue');
  }
}
