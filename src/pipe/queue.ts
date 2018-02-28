import { SQS } from 'aws-sdk';

const POLL_SECONDS = 1;
const sqs = new SQS();

export type Message = SQS.Types.Message;
export type MessageFn = (message: Message) => Promise<void>;
export type TimerFn = () => number;

export class Queue {
  private qurl: string;
  private fn: MessageFn;
  private getRemainingTime: TimerFn;
  private longPolling: boolean;

  constructor(queue: string, fn: MessageFn, getRemainingTime: TimerFn, longPolling: boolean = true) {
    this.qurl = queue;
    this.fn = fn;
    this.getRemainingTime = getRemainingTime;
    this.longPolling = longPolling;
    console.log(`initializing ${this.longPolling ? 'long' : 'short'}-polling queue:${this.qurl}`);
    if (!this.fn) throw new Error('missing fn');
  }

  private async longPoll(numMessages: number = 10) {
    const response = await sqs.receiveMessage({
      QueueUrl: await this.qurl,
      MaxNumberOfMessages: numMessages,
      WaitTimeSeconds: POLL_SECONDS,
    }).promise();
    return response.Messages || [];
  }

  private async shortPoll() {
    const response = await sqs.receiveMessage({
      QueueUrl: await this.qurl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 0,
    }).promise();
    return response.Messages || [];
  }

  private async delete(message: Message) {
    return sqs.deleteMessage({
      QueueUrl: await this.qurl,
      ReceiptHandle: message.ReceiptHandle,
    }).promise()
      .catch((err) => console.warn('failed to delete message', message, err));
  }

  private async handle(message: Message) {
    try {
      await this.fn(message);
    } catch (err) {
      console.warn('failed to invoke fn', message, err);
      throw err;
    }

    await this.delete(message);
  }

  public async dequeue() {
    let count = 0;
    const handle = async (messages: Message[]) => {
      console.log(`received ${messages.length} messages`);
      console.time(`handled ${messages.length} messages`);
      await messages.map(this.handle);
      console.timeEnd(`handled ${messages.length} messages`);
      count += messages.length;
    };

    // long poll for triggering message to avoid any possible race
    console.time(`polled`)
    let messages = await this.longPoll(1);
    console.timeEnd(`polled`)
    if (!messages.length && !this.longPolling) console.warn('received no messages on first poll');

    while(
      (this.getRemainingTime() > 2 * POLL_SECONDS * 1000) &&
      (this.longPolling || messages.length)
    ) do {
      handle(messages);
      console.time(`polled`)
      messages = await (this.longPolling ? this.longPoll() : this.shortPoll());
      console.timeEnd(`polled`)
    }

    if (messages.length) {
      handle(messages);
      console.warn('quit with messages left in queue');
    }
  }
}
