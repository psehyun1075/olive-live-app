import { useEffect, useMemo, useRef, useState } from "react";
import useWsChat from "../hooks/useWsChat.js";

export default function LiveChat({ wsUrl, user }) {
  const { status, messages, send } = useWsChat({ url: wsUrl, user });
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const statusLabel = useMemo(() => {
    if (status === "open") return "연결됨";
    if (status === "connecting") return "연결 중…";
    if (status === "closed") return "연결 종료";
    if (status === "error") return "연결 오류";
    return "대기";
  }, [status]);

  function onSend() {
    const t = text.trim();
    if (!t) return;
    const ok = send(t);
    if (ok) setText("");
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <div className="font-bold">실시간 채팅</div>
        <div className="text-xs text-gray-500">{statusLabel}</div>
      </div>

      <div
        ref={listRef}
        className="mt-3 h-48 overflow-y-auto rounded-xl bg-gray-50 p-3 text-sm"
      >
        {messages.length === 0 ? (
          <div className="text-gray-400">아직 메시지가 없어요.</div>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className="py-1">
              <span className="font-semibold">{m.from ?? "unknown"}</span>
              <span className="text-gray-600">: </span>
              <span>{m.message ?? JSON.stringify(m)}</span>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 border rounded-xl px-3 py-2 outline-none focus:ring"
          placeholder="메시지 입력…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend();
          }}
        />
        <button
          onClick={onSend}
          disabled={status !== "open"}
          className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
        >
          전송
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500 break-all">
        {wsUrl ? wsUrl : "VITE_WS_URL이 비어있음"}
      </div>
    </div>
  );
}