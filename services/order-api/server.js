import express from"express";
import cors from"cors";
import { SQSClient, SendMessageCommand } from"@aws-sdk/client-sqs";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const REGION = process.env.AWS_REGION ||"ap-northeast-2";
const QUEUE_URL = process.env.ORDER_QUEUE_URL;

if (!QUEUE_URL) {
  console.error("ERROR: ORDER_QUEUE_URL env is required");
  process.exit(1);
}

const sqs = new SQSClient({ region: REGION });

app.get(['/healthz','/api/healthz'], (_req, res) => res.status(200).send("ok"));

app.post(['/orders','/api/orders'], async (req, res) => {
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
      ok:true,
      orderId,
      messageId: out.MessageId,
    });
  } catch (err) {
    console.error("POST /orders error:", err);
return res.status(500).json({ ok:false, error:"internal_error" });
  }
});

app.listen(PORT, () => {
  console.log(`[order-api] listening on :${PORT}`);
  console.log(`[order-api] region=${REGION}`);
  console.log(`[order-api] queue=${QUEUE_URL}`);
});
