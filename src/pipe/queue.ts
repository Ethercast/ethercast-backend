import { SQS } from 'aws-sdk';
import logger from '../util/logger';

const POLL_SECONDS = 1;
const sqs = new SQS();

export type Message = SQS.Types.Message;
export type MessageFn = (message: Message) => Promise<void>;
export type TimerFn = () => number;

export class Queue {
  private queueUrl: string;
  private handleMessage: MessageFn;
  private getRemainingTime: TimerFn;
  private longPolling: boolean;

  constructor(queueUrl: string, handleMessage: MessageFn, getRemainingTime: TimerFn, longPolling: boolean = true) {
    this.queueUrl = queueUrl;
    this.handleMessage = handleMessage;
    this.getRemainingTime = getRemainingTime;
    this.longPolling = longPolling;

    logger.info({ longPolling, queueUrl }, `initializing polling queue`);

    if (!this.handleMessage) throw new Error('missing fn');
  }

  private async longPoll(numMessages: number = 10) {
    const response = await sqs.receiveMessage({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: numMessages,
      WaitTimeSeconds: POLL_SECONDS
    }).promise();
    return response.Messages || [];
  }

  private async shortPoll() {
    const response = await sqs.receiveMessage({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 0
    }).promise();
    return response.Messages || [];
  }

  private async delete(message: Message) {
    try {
      if (message.ReceiptHandle === undefined) throw new Error('undefined receipt handle');
      await sqs.deleteMessage({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle
      }).promise();
    } catch (err) {
      logger.warn({ err, message }, 'failed to delete message');
    }
  }

  private async handle(message: Message) {
    try {
      await this.handleMessage(message);
    } catch (err) {
      logger.warn({ message, err }, 'failed to invoke handleMessage');
      throw err;
    }

    await this.delete(message);
  }

  processMessages = async (messages: Message[]) => {
    logger.info({ messageCount: messages.length }, `processing messages`);

    for (let i = 0; i < messages.length; i++) {
      await this.handleMessage(messages[i]);
    }

    logger.info({ messageCount: messages.length }, 'processing messages');
  };

  public async dequeue() {
    let count = 0;
    let firstPoll = true;
    let messages;

    do {

      // long poll for the triggering message to avoid any possible race
      if (firstPoll) {
        firstPoll = false;
        messages = await this.longPoll(1);
        if (!messages.length && !this.longPolling) console.warn('received no triggering message');
      } else {
        messages = await (this.longPolling ? this.longPoll() : this.shortPoll());
      }

      logger.info({ firstPoll, count, messageCount: messages.length }, `polled queue`);

      await this.processMessages(messages);

      count += messages.length;
    } while (
      (this.getRemainingTime() > 2 * POLL_SECONDS * 1000) &&
      (this.longPolling || messages.length)
      );

    if (messages.length) {
      logger.warn({ messageCount: messages.length }, 'quit with messages left in queue');
    }
  }
}
