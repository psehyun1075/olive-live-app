import { useEffect, useRef, useState } from "react";

export default function useWsChat({ url, user }) {
  const wsRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle|connecting|open|closed|error
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!url) {
      setStatus("error");
      return;
    }

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener("open", () => setStatus("open"));
    ws.addEventListener("close", () => setStatus("closed"));
    ws.addEventListener("error", () => setStatus("error"));

    ws.addEventListener("message", (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) => [...prev, data]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { type: "raw", from: "system", message: String(e.data), at: Date.now() },
        ]);
      }
    });

    return () => {
      try {
        ws.close();
      } catch {}
    };
  }, [url]);

  function send(text) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;

    ws.send(
      JSON.stringify({
        action: "sendMessage",
        user: user || "anonymous",
        message: text,
      })
    );
    return true;
  }

  return { status, messages, send };
}