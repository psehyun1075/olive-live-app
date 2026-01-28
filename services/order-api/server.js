import "./tracer.js"; // ✅ 반드시 제일 위

import express from "express";
import cors from "cors";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import pg from "pg";

const { Pool } = pg;

// ==================
// 0) App bootstrap
// ==================
const app = express();
app.use(cors({
  origin: ["https://psehyun.cloud", "https://www.psehyun.cloud"],
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Olive-Origin"],
}));
app.use(express.json());

// ==================
// 1) Env
// ==================
const PORT = process.env.PORT || 8080;

const REGION = process.env.AWS_REGION || "ap-northeast-2";
const QUEUE_URL = process.env.ORDER_QUEUE_URL;

// ✅ Datadog 값 우선 사용 (로그/대시보드 일관성)
const ENV = process.env.DD_ENV || process.env.ENV || "dev";
const SERVICE_NAME = process.env.DD_SERVICE || process.env.SERVICE_NAME || "order-api";

// CloudFront Only Guard (dev/demo)
const ORIGIN_HEADER_NAME = "x-olive-origin";
const ORIGIN_HEADER_VALUE = process.env.ORIGIN_HEADER_VALUE;

// DB env (Aurora PostgreSQL)
const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

// ==================
// 2) Analytics logger (JSON one-line)
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

// ==================
// 3) Guards / Middleware
// ==================
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  if (!ORIGIN_HEADER_VALUE) return next();

  const got = req.headers[ORIGIN_HEADER_NAME];
  if (got !== ORIGIN_HEADER_VALUE) {
    logEvent({
      event_type: "DIRECT_ALB_BLOCKED",
      path: req.path,
      client_ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
    });

    return res.status(403).json({ ok: false, message: "Forbidden (direct ALB access blocked)" });
  }
  next();
});

// ==================
// 4) Clients
// ==================
if (!QUEUE_URL) {
  console.error("ERROR: ORDER_QUEUE_URL env is required");
  process.exit(1);
}
const sqs = new SQSClient({ region: REGION });

for (const [k, v] of Object.entries({ DB_HOST, DB_NAME, DB_USER, DB_PASSWORD })) {
  if (!v) {
    console.error(`ERROR: ${k} env is required for DB read API`);
    process.exit(1);
  }
}

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// ==================
// 5) Routes
// ==================
app.get(["/healthz", "/api/healthz"], (_req, res) => res.status(200).send("ok"));

app.get("/api/orders", async (req, res) => {
  const start = Date.now();
  try {
    const limit = Math.min(Number(req.query.limit || 20), 100);

    const { rows } = await pool.query(
      `select order_id, status, created_at, updated_at, payload
       from orders
       order by created_at desc
       limit $1`,
      [limit]
    );

    logEvent({
      event_type: "ORDER_LIST_FETCHED",
      latency_ms: Date.now() - start,
      limit,
      count: rows.length,
    });

    return res.status(200).json({ ok: true, items: rows });
  } catch (err) {
    logError({
      event_type: "ORDER_API_ERROR",
      route: "GET /api/orders",
      error: err?.message || String(err),
    });
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  const start = Date.now();
  try {
    const id = req.params.id;

    const { rows } = await pool.query(
      `select order_id, status, created_at, updated_at, payload
       from orders
       where order_id = $1`,
      [id]
    );

    logEvent({
      event_type: "ORDER_FETCHED",
      latency_ms: Date.now() - start,
      order_id: id,
      found: rows.length > 0,
    });

    if (rows.length === 0) return res.status(404).json({ ok: false, error: "not_found" });
    return res.status(200).json({ ok: true, item: rows[0] });
  } catch (err) {
    logError({
      event_type: "ORDER_API_ERROR",
      route: "GET /api/orders/:id",
      error: err?.message || String(err),
    });
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

app.post(["/orders", "/api/orders"], async (req, res) => {
  const start = Date.now();
  try {
    const body = req.body ?? {};
    const orderId = body.orderId || `order-${Date.now()}`;

    const msg = {
      orderId,
      createdAt: new Date().toISOString(),
      payload: body,
    };

    const out = await sqs.send(
      new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(msg),
      })
    );

    logEvent({
      event_type: "ORDER_RECEIVED",
      order_id: orderId,
      message_id: out.MessageId || null,
      stream_id: body?.streamId || null,
      user_id: body?.userId || null,
      item_count: Array.isArray(body?.items) ? body.items.length : null,
      latency_ms: Date.now() - start,
    });

    return res.status(202).json({ ok: true, orderId, messageId: out.MessageId });
  } catch (err) {
    logError({
      event_type: "ORDER_API_ERROR",
      route: "POST /api/orders",
      error: err?.message || String(err),
    });
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

// ==================
// 6) Listen
// ==================
app.listen(PORT, () => {
  console.log(`[order-api] listening on :${PORT}`);
  console.log(`[order-api] region=${REGION}`);
  console.log(`[order-api] queue=${QUEUE_URL}`);
  console.log(`[order-api] db=${DB_HOST}:${DB_PORT}/${DB_NAME} user=${DB_USER}`);
});
