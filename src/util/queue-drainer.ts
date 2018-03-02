import { SQS } from 'aws-sdk';
import logger from './logger';

const POLL_SECONDS = 1;
const sqs = new SQS();

export type Message = SQS.Types.Message;
export type MessageHandler = (message: Message) => Promise<void>;
export type TimerFn = () => number;

export default class QueueDrainer {
  private queueUrl: string;
  private handleMessage: MessageHandler;
  private getRemainingTime: TimerFn;

  constructor(queueUrl: string, handleMessage: MessageHandler, getRemainingTime: TimerFn) {
    this.queueUrl = queueUrl;
    this.handleMessage = handleMessage;
    this.getRemainingTime = getRemainingTime;

    logger.info({ queueUrl }, `initializing polling queue`);
  }

  private async poll(numMessages: number = 10) {
    const response = await sqs.receiveMessage({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: numMessages,
      WaitTimeSeconds: POLL_SECONDS
    }).promise();
    return response.Messages || [];
  }


  private async deleteMessage(message: Message) {
    if (!message.ReceiptHandle) {
      throw new Error('missing receipt handle');
    }

    try {
      await sqs.deleteMessage({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle
      }).promise();
    } catch (err) {
      logger.error({ err, message }, 'failed to delete message');
    }
  }

  processMessages = async (messages: Message[]) => {
    logger.info({ messageCount: messages.length }, `processing messages`);

    for (let i = 0; i < messages.length; i++) {
      const message: Message = messages[i];
      await this.handleMessage(message);
      await this.deleteMessage(message);
    }
  };

  public async start() {
    let processedMessageCount = 0;
    let pollCount = 0;

    // while we have more than 2 polling intervals left
    while (this.getRemainingTime() > 2 * POLL_SECONDS * 1000) {
      const messages = await this.poll();

      logger.info({ pollCount, processedMessageCount, messageCount: messages.length }, `polled queue`);

      await this.processMessages(messages);

      processedMessageCount += messages.length;

      pollCount++;
    }

    logger.info({ processedMessageCount, pollCount }, 'finished draining queue');
  }
}
