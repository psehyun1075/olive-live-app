import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
} from "@aws-sdk/client-sqs";

const REGION = process.env.AWS_REGION || "ap-northeast-2";
const QUEUE_URL = process.env.ORDER_QUEUE_URL;

if (!QUEUE_URL) {
  console.error("ERROR: ORDER_QUEUE_URL env is required");
  process.exit(1);
}

const sqs = new SQSClient({ region: REGION });

const WAIT_TIME_SECONDS = Number(process.env.WAIT_TIME_SECONDS || 20);
const MAX_NUMBER_OF_MESSAGES = Number(process.env.MAX_NUMBER_OF_MESSAGES || 5);
const VISIBILITY_TIMEOUT = Number(process.env.VISIBILITY_TIMEOUT || 60);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function handleMessage(m) {
  const body = m.Body ? JSON.parse(m.Body) : {};
  console.log("[worker] received:", body);

  // TODO: 여기서 DB 처리/결제/재고 처리 등으로 확장
  await sleep(300);

  // 처리 완료 -> delete
  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: QUEUE_URL,
      ReceiptHandle: m.ReceiptHandle,
    })
  );

  console.log("[worker] deleted message:", m.MessageId);
}

async function loop() {
  console.log("[worker] started");
  console.log(`[worker] region=${REGION}`);
  console.log(`[worker] queue=${QUEUE_URL}`);

  while (true) {
    try {
      const out = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: MAX_NUMBER_OF_MESSAGES,
          WaitTimeSeconds: WAIT_TIME_SECONDS,
          VisibilityTimeout: VISIBILITY_TIMEOUT,
        })
      );

      const msgs = out.Messages ?? [];
      if (msgs.length === 0) continue;

      for (const m of msgs) {
        try {
          await handleMessage(m);
        } catch (e) {
          console.error("[worker] handleMessage error:", e);

          // 실패 시 재시도 여지(가시성 시간 조절) - 간단 처리
          if (m.ReceiptHandle) {
            await sqs.send(
              new ChangeMessageVisibilityCommand({
                QueueUrl: QUEUE_URL,
                ReceiptHandle: m.ReceiptHandle,
                VisibilityTimeout: 0,
              })
            );
          }
        }
      }
    } catch (err) {
      console.error("[worker] receive error:", err);
      await sleep(1000);
    }
  }
}

loop();
