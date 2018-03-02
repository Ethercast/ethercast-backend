import logger from './logger';
import * as SQS from 'aws-sdk/clients/sqs';

const POLL_SECONDS = 3;

export type Message = SQS.Types.Message;
export type MessageHandler = (message: Message) => Promise<void>;
export type TimerFn = () => number;

export default class QueueDrainer {
  private sqs: SQS;
  private queueUrl: string;
  private handleMessage: MessageHandler;
  private getRemainingTime: TimerFn;

  constructor(sqs: SQS, queueUrl: string, handleMessage: MessageHandler, getRemainingTime: TimerFn) {
    this.sqs = sqs;
    this.queueUrl = queueUrl;
    this.handleMessage = handleMessage;
    this.getRemainingTime = getRemainingTime;

    logger.info({ queueUrl }, `initializing polling queue`);
  }

  private async poll(numMessages: number = 10) {
    const response = await this.sqs.receiveMessage({
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
      await this.sqs.deleteMessage({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle
      }).promise();
    } catch (err) {
      logger.error({ err, message }, 'failed to delete message');
    }
  }

  processMessages = async (messages: Message[]) => {
    logger.debug({ messageCount: messages.length }, `processing messages`);

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

      logger.debug({ pollCount, processedMessageCount, messageCount: messages.length }, `polled queue`);

      await this.processMessages(messages);

      processedMessageCount += messages.length;

      pollCount++;
    }

    logger.debug({ processedMessageCount, pollCount }, 'finished draining queue');
  }
}
