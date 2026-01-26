import { useCallback, useEffect, useRef, useState } from "react";

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function jitter(ms) {
  const r = 0.8 + Math.random() * 0.4; // 0.8~1.2
  return Math.floor(ms * r);
}

export default function useWsChat({
  url,
  user = "anonymous",
  autoConnect = true,
  pingIntervalMs = 25000,
  maxBackoffMs = 8000,
} = {}) {
  const wsRef = useRef(null);
  const outboxRef = useRef([]); // 끊김 중 메시지 큐
  const closingRef = useRef(false);

  const retryRef = useRef({ attempt: 0, timer: null });
  const pingRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle|connecting|connected|reconnecting|closed|error
  const [messages, setMessages] = useState([]);

  const pushMsg = useCallback((m) => {
    setMessages((prev) => [...prev, m].slice(-200));
  }, []);

  const stopPing = useCallback(() => {
    if (pingRef.current) clearInterval(pingRef.current);
    pingRef.current = null;
  }, []);

  const startPing = useCallback(() => {
    stopPing();
    pingRef.current = setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ action: "ping", at: nowSec() }));
    }, pingIntervalMs);
  }, [pingIntervalMs, stopPing]);

  const flushOutbox = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const q = outboxRef.current;
    outboxRef.current = [];
    for (const data of q) ws.send(data);
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (closingRef.current) return;

    const attempt = retryRef.current.attempt;
    const base = Math.min(maxBackoffMs, 500 * Math.pow(2, attempt)); // 0.5,1,2,4,8...
    const delay = jitter(base);
    retryRef.current.attempt = attempt + 1;

    setStatus("reconnecting");

    retryRef.current.timer = setTimeout(() => {
      connect();
    }, delay);
  }, [maxBackoffMs]);

  const connect = useCallback(() => {
    if (!url) {
      setStatus("error");
      return;
    }

    // 이미 open/connecting이면 중복 연결 방지
    const cur = wsRef.current;
    if (cur && (cur.readyState === WebSocket.OPEN || cur.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus((s) => (s === "idle" ? "connecting" : "reconnecting"));

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current.attempt = 0;
      setStatus("connected");
      pushMsg({ type: "system", message: "연결됨", at: nowSec() });

      // (옵션) 입장 시스템 메시지
      ws.send(JSON.stringify({ action: "sendMessage", kind: "join", user, at: nowSec() }));

      startPing();
      flushOutbox();
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        pushMsg(data);
      } catch {
        pushMsg({ type: "raw", from: "system", message: String(e.data), at: nowSec() });
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = (e) => {
      stopPing();
      wsRef.current = null;

      if (closingRef.current) {
        setStatus("closed");
        return;
      }

      pushMsg({
        type: "system",
        message: `연결 끊김(code=${e.code}) → 재연결 시도`,
        at: nowSec(),
      });

      scheduleReconnect();
    };
  }, [url, user, pushMsg, startPing, stopPing, flushOutbox, scheduleReconnect]);

  const disconnect = useCallback(() => {
    closingRef.current = true;

    stopPing();
    if (retryRef.current.timer) clearTimeout(retryRef.current.timer);
    retryRef.current.timer = null;

    const ws = wsRef.current;
    wsRef.current = null;

    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        // (옵션) 퇴장 메시지
        ws.send(JSON.stringify({ action: "sendMessage", kind: "leave", user, at: nowSec() }));
        ws.close(1000, "client closing");
      }
    } catch {}

    setStatus("closed");
  }, [stopPing, user]);

  const send = useCallback(
    (text) => {
      const t = String(text ?? "").trim();
      if (!t) return false;

      const body = JSON.stringify({
        action: "sendMessage",
        user,
        message: t,
        at: nowSec(),
      });

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(body);
        return true;
      }

      // 끊겼으면 큐에 쌓아두기
      outboxRef.current.push(body);
      return false;
    },
    [user]
  );

  useEffect(() => {
    closingRef.current = false;
    if (autoConnect) connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return {
    status,
    messages,
    send,
    connect,
    disconnect,
    queued: outboxRef.current.length,
  };
}
