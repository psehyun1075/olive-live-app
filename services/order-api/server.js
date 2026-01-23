import "./tracer.js";// ✅ 반드시 제일 위

import express from "express";
import cors from "cors";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import pg from "pg";

const { Pool } = pg;

// ==================
// 0) App bootstrap
// ==================
const app = express();
app.use(cors());
app.use(express.json());

// ==================
// 1) Env
// ==================
const PORT = process.env.PORT || 8080;

const REGION = process.env.AWS_REGION || "ap-northeast-2";
const QUEUE_URL = process.env.ORDER_QUEUE_URL;

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
// 2) Guards / Middleware
// ==================
app.use((req, res, next) => {
  // /api/* 만 보호 (CloudFront 프록시 경로)
  if (!req.path.startsWith("/api/")) return next();

  // 로컬 개발 편의: 값이 없으면 가드 비활성화
  if (!ORIGIN_HEADER_VALUE) return next();

  const got = req.headers[ORIGIN_HEADER_NAME];
  if (got !== ORIGIN_HEADER_VALUE) {
    return res
      .status(403)
      .json({ ok: false, message: "Forbidden (direct ALB access blocked)" });
  }
  next();
});

// ==================
// 3) Clients
// ==================
if (!QUEUE_URL) {
  console.error("ERROR: ORDER_QUEUE_URL env is required");
  process.exit(1);
}

const sqs = new SQSClient({ region: REGION });

// ✅ DB는 “조회 API”에서 쓰므로, 데모/과제는 필수로 두는 게 깔끔.
// 만약 'POST만 살리고 GET은 비활성'로 하고 싶으면 아래 체크를 완화하면 됨.
for (const [k, v] of Object.entries({ DB_HOST, DB_NAME, DB_USER, DB_PASSWORD })) {
  if (!v) {
    console.error(`ERROR: ${k} env is required for DB read API`);
    process.exit(1);
  }
}

// ✅ Aurora가 SSL 강제인 경우가 있어서 worker처럼 ssl 옵션 켜는 게 안전
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

// ==================
// 4) Routes
// ==================
app.get(["/healthz", "/api/healthz"], (_req, res) => res.status(200).send("ok"));

/**
 * ✅ 조회: 최근 주문 리스트
 * GET /api/orders?limit=20
 */
app.get("/api/orders", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 100);

    const { rows } = await pool.query(
      `select order_id, status, created_at, updated_at, payload
       from orders
       order by created_at desc
       limit $1`,
      [limit]
    );

    return res.status(200).json({ ok: true, items: rows });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/**
 * ✅ 조회: 단건
 * GET /api/orders/:id
 */
app.get("/api/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const { rows } = await pool.query(
      `select order_id, status, created_at, updated_at, payload
       from orders
       where order_id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }

    return res.status(200).json({ ok: true, item: rows[0] });
  } catch (err) {
    console.error("GET /api/orders/:id error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/**
 * ✅ 주문 생성(비동기): SQS로 적재
 * POST /api/orders  (또는 /orders)
 */
app.post(["/orders", "/api/orders"], async (req, res) => {
  try {
    const body = req.body ?? {};
    const orderId = body.orderId || `order-${Date.now()}`;

    const msg = {
      orderId,
      createdAt: new Date().toISOString(),
      payload: body,
    };

    const cmd = new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(msg),
    });

    const out = await sqs.send(cmd);

    return res.status(202).json({
      ok: true,
      orderId,
      messageId: out.MessageId,
    });
  } catch (err) {
    console.error("POST /orders error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

// ==================
// 5) Listen
// ==================
app.listen(PORT, () => {
  console.log(`[order-api] listening on :${PORT}`);
  console.log(`[order-api] region=${REGION}`);
  console.log(`[order-api] queue=${QUEUE_URL}`);
  console.log(`[order-api] db=${DB_HOST}:${DB_PORT}/${DB_NAME} user=${DB_USER}`);
});
