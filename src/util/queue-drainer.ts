import logger from './logger';
import { SQS } from 'aws-sdk';
import _ = require('underscore');

export type Message = SQS.Types.Message;
export type MessageHandler = (message: Message) => Promise<void>;
export type TimerFn = () => number;

export default class QueueDrainer {
  private sqs: SQS;
  private queueUrl: string;
  private handleMessage: MessageHandler;
  private getRemainingTime: TimerFn;

  constructor({ sqs, queueUrl, handleMessage, getRemainingTime }: { sqs: SQS, queueUrl: string, handleMessage: MessageHandler, getRemainingTime: TimerFn }) {
    this.sqs = sqs;
    this.queueUrl = queueUrl;
    this.handleMessage = handleMessage;
    this.getRemainingTime = getRemainingTime;
  }

  private async poll(numMessages: number = 10): Promise<Message[]> {
    const response = await this.sqs.receiveMessage({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: numMessages,
      WaitTimeSeconds: 1
    }).promise();

    if (!response.Messages) {
      logger.info('polling returned no messages');
      return [];
    }

    if (
      _.any(
        response.Messages,
        ({ MessageId, ReceiptHandle }) => typeof MessageId !== 'string' || typeof ReceiptHandle !== 'string'
      )
    ) {
      logger.warn({ response }, 'missing message ids or receipt handles');
      return [];
    }

    return response.Messages;
  }

  private deleteMessages = async (messages: Message[]) => {
    if (messages.length === 0) {
      return;
    }

    logger.debug({ messageCount: messages.length }, 'deleting messages');

    const Entries = messages
      .map(
        ({ MessageId, ReceiptHandle }) => {
          if (!MessageId || !ReceiptHandle) {
            logger.error({ MessageId, ReceiptHandle }, 'missing message id or receipt handle');
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

    logger.debug({ messageCount: messages.length }, 'deleted messages');
  };

  private processMessages = async (messages: Message[]) => {
    logger.debug({ messageCount: messages.length }, `processing messages`);

    for (let i = 0; i < messages.length; i++) {
      await this.handleMessage(messages[i]);
    }
  };

  public async start() {
    let processedMessageCount = 0;
    let pollCount = 0;

    // while we have more than 3 seconds remaining
    while (this.getRemainingTime() > 3000) {
      if (pollCount % 5 === 0) {
        logger.info({ pollCount, processedMessageCount }, 'polling...');
      } else {
        logger.debug({ pollCount, processedMessageCount }, 'polling...');
      }

      const messages = await this.poll();

      await this.processMessages(messages);

      if (messages.length === 0) {
        logger.info({ processedMessageCount, pollCount }, 'queue is empty, ending drain');
        break;
      }

      await this.deleteMessages(messages);

      processedMessageCount += messages.length;
      pollCount++;
    }

    logger.debug({ processedMessageCount, pollCount }, 'finished draining queue');
  }
}
