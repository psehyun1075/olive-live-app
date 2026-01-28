// ✅ 반드시 제일 위 (모듈 패칭을 위해)
import tracer from "./tracer.js";

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
} from "@aws-sdk/client-sqs";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import pg from "pg";

const { Pool } = pg;

const REGION = process.env.AWS_REGION || "ap-northeast-2";
const QUEUE_URL = process.env.ORDER_QUEUE_URL;

const ENV = process.env.ENV || "dev";
const SERVICE_NAME = process.env.DD_SERVICE || process.env.SERVICE_NAME || "order-worker";

// DynamoDB serving counter
const SERVING_COUNTER_TABLE = process.env.SERVING_COUNTER_TABLE;
const SERVING_COUNTER_ID = process.env.SERVING_COUNTER_ID || "event-001";
const SERVING_COUNTER_TTL_SECONDS = Number(process.env.SERVING_COUNTER_TTL_SECONDS || 86400);

const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!QUEUE_URL) {
  console.error("ERROR: ORDER_QUEUE_URL env is required");
  process.exit(1);
}
if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
  console.error("ERROR: DB envs are missing (DB_HOST/DB_NAME/DB_USER/DB_PASSWORD)");
  process.exit(1);
}
if (!SERVING_COUNTER_TABLE) {
  console.error("ERROR: SERVING_COUNTER_TABLE env is required");
  process.exit(1);
}

// ==================
// Analytics logger (JSON one-line)
// ==================
function logEvent(evt) {
  const base = {
    ts: new Date().toISOString(),
    env: ENV,
    service: SERVICE_NAME,
  };
  console.log(JSON.stringify({ ...base, ...evt }));
}
function logError(evt) {
  const base = {
    ts: new Date().toISOString(),
    env: ENV,
    service: SERVICE_NAME,
  };
  console.error(JSON.stringify({ ...base, ...evt }));
}

const sqs = new SQSClient({ region: REGION });

// DynamoDB Document client
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// Aurora PostgreSQL은 보통 SSL 강제인 경우가 많아서 데모는 이게 제일 간단
const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

const WAIT_TIME_SECONDS = Number(process.env.WAIT_TIME_SECONDS || 20);
const MAX_NUMBER_OF_MESSAGES = Number(process.env.MAX_NUMBER_OF_MESSAGES || 5);
const VISIBILITY_TIMEOUT = Number(process.env.VISIBILITY_TIMEOUT || 60);

// 데모용 처리시간(밀리초). 필요 없으면 0으로
const PROCESSING_DELAY_MS = Number(process.env.PROCESSING_DELAY_MS || 300);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * ✅ DynamoDB 원자 카운터 증가
 */
async function incrementServingCounter() {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SERVING_COUNTER_TTL_SECONDS;

  const res = await ddb.send(
    new UpdateCommand({
      TableName: SERVING_COUNTER_TABLE,
      Key: { counter_id: SERVING_COUNTER_ID },
      UpdateExpression:
        "SET #v = if_not_exists(#v, :zero) + :inc, updated_at = :now, expires_at = :exp",
      ExpressionAttributeNames: { "#v": "value" },
      ExpressionAttributeValues: {
        ":zero": 0,
        ":inc": 1,
        ":now": now,
        ":exp": expiresAt,
      },
      ReturnValues: "ALL_NEW",
    })
  );

  const newValue = res?.Attributes?.value;
  if (typeof newValue !== "number") {
    throw new Error(`Serving counter update returned invalid value: ${String(newValue)}`);
  }
  return newValue;
}

/**
 * 1) orders upsert(RECEIVED)
 * 2) order_events insert(RECEIVED)  (중복방지)
 */
async function upsertReceived(body) {
  const orderId = body?.orderId;
  if (!orderId) throw new Error("orderId missing");

  const payload = body?.payload ?? body ?? {};

  const client = await pool.connect();
  try {
    await client.query("begin");

    await client.query(
      `
      insert into orders(order_id, status, payload)
      values ($1, 'RECEIVED', $2::jsonb)
      on conflict(order_id)
      do update set
        payload = excluded.payload,
        updated_at = now()
      `,
      [orderId, JSON.stringify(payload)]
    );

    await client.query(
      `
      insert into order_events(order_id, event_type)
      values ($1, 'RECEIVED')
      on conflict (order_id, event_type) do nothing
      `,
      [orderId]
    );

    await client.query("commit");
    return orderId;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * 3) orders status=PROCESSED
 * 4) order_events insert(PROCESSED) (중복방지)
 */
async function markProcessed(orderId) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    await client.query(
      `
      update orders
      set status='PROCESSED', updated_at=now()
      where order_id=$1
      `,
      [orderId]
    );

    await client.query(
      `
      insert into order_events(order_id, event_type)
      values ($1, 'PROCESSED')
      on conflict (order_id, event_type) do nothing
      `,
      [orderId]
    );

    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * ✅ 메시지 1개 처리 단위를 root span으로 감싼다.
 */
async function handleMessage(m) {
  const resource = "olive-dev-order-queue";

  return tracer.trace(
    "sqs.message.process",
    {
      service: process.env.DD_SERVICE || "order-worker",
      resource,
      type: "worker",
      tags: {
        "span.kind": "consumer",
        "messaging.system": "aws.sqs",
        "sqs.queue_url": QUEUE_URL,
        "sqs.message_id": m.MessageId,
      },
    },
    async () => {
      const start = Date.now();
      let orderId = null;

      try {
        const body = m.Body ? JSON.parse(m.Body) : {};
        orderId = body?.orderId || null;

        const span = tracer.scope().active();
        if (orderId && span) span.setTag("order.id", orderId);

        // 1) RECEIVED 저장/이벤트
        const savedOrderId = await upsertReceived(body);

        // (데모용) 처리시간 시뮬 (트랜잭션 밖)
        if (PROCESSING_DELAY_MS > 0) await sleep(PROCESSING_DELAY_MS);

        // 2) PROCESSED로 상태 전환/이벤트
        await markProcessed(savedOrderId);

        // 3) DynamoDB 원자 카운터 증가
        const servedNumber = await incrementServingCounter();

        // trace 태그
        if (span) {
          span.setTag("serving.counter_id", SERVING_COUNTER_ID);
          span.setTag("serving.value", servedNumber);
          span.setTag("serving.table", SERVING_COUNTER_TABLE);
        }

        // ✅ 분석용 핵심 이벤트(처리 완료)
        logEvent({
          event_type: "ORDER_PROCESSED",
          order_id: savedOrderId,
          sqs_message_id: m.MessageId || null,
          serving_value: servedNumber,
          latency_ms: Date.now() - start,
        });

        // 4) 성공 후에만 큐 메시지 삭제
        await sqs.send(
          new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: m.ReceiptHandle,
          })
        );

      } catch (err) {
        const span = tracer.scope().active();
        if (span) {
          span.setTag("error", err);
          span.setTag("error.type", err?.name || "Error");
          span.setTag("error.msg", err?.message || String(err));
        }

        // ✅ 분석용 실패 이벤트
        logError({
          event_type: "ORDER_FAILED",
          order_id: orderId,
          sqs_message_id: m.MessageId || null,
          error: err?.message || String(err),
          latency_ms: Date.now() - start,
        });

        throw err;
      }
    }
  );
}

async function loop() {
  console.log("[worker] started");
  console.log(`[worker] region=${REGION}`);
  console.log(`[worker] queue=${QUEUE_URL}`);
  console.log(`[worker] servingCounterTable=${SERVING_COUNTER_TABLE}`);
  console.log(`[worker] servingCounterId=${SERVING_COUNTER_ID}`);
  console.log(`[worker] servingCounterTtlSeconds=${SERVING_COUNTER_TTL_SECONDS}`);
  console.log(`[worker] processingDelayMs=${PROCESSING_DELAY_MS}`);

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

          // 실패 시 delete 하지 않음 → 재시도 유도(가시성 0)
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
