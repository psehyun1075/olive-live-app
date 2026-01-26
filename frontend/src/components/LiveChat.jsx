import { useEffect, useMemo, useRef, useState } from "react";
import useWsChat from "../hooks/useWsChat.js";

function fmtTime(secOrMs) {
  // 서버는 sec(너 람다 now=sec), 혹시 ms 들어와도 처리
  const ms = secOrMs > 10_000_000_000 ? secOrMs : secOrMs * 1000;
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function LiveChat({ wsUrl, user }) {
  const { status, messages, send, queued } = useWsChat({ url: wsUrl, user });
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const badge = useMemo(() => {
    if (status === "connected") return { label: "연결됨", cls: "bg-emerald-100 text-emerald-700" };
    if (status === "connecting") return { label: "연결 중…", cls: "bg-gray-100 text-gray-700" };
    if (status === "reconnecting") return { label: `재연결 중…${queued ? ` (대기 ${queued})` : ""}`, cls: "bg-amber-100 text-amber-700" };
    if (status === "error") return { label: "오류", cls: "bg-red-100 text-red-700" };
    if (status === "closed") return { label: "종료됨", cls: "bg-gray-100 text-gray-500" };
    return { label: "대기", cls: "bg-gray-100 text-gray-500" };
  }, [status, queued]);

  function onSend() {
    const t = text.trim();
    if (!t) return;
    const ok = send(t);
    setText(""); // 끊겨도 큐에 쌓이니까 입력은 비워주는 게 UX 좋음
    return ok;
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <div className="font-bold">실시간 채팅</div>
        <span className={`text-xs px-2 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
      </div>

      <div
        ref={listRef}
        className="mt-3 h-56 overflow-y-auto rounded-xl bg-gray-50 p-3 text-sm"
      >
        {messages.length === 0 ? (
          <div className="text-gray-400">아직 메시지가 없어요.</div>
        ) : (
          messages.map((m, idx) => {
            // system
            if (m?.type === "system") {
              return (
                <div key={m.id ?? idx} className="my-2 text-center text-xs text-gray-500">
                  {m.message ?? ""}
                </div>
              );
            }

            const from = m?.from ?? "unknown";
            const mine = user && from === user;
            const time = m?.at ? fmtTime(m.at) : "";

            return (
              <div key={m.id ?? idx} className={`flex my-2 ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
                  mine ? "bg-black text-white" : "bg-white border"
                }`}>
                  <div className={`text-[11px] mb-1 ${mine ? "text-white/70" : "text-gray-500"}`}>
                    {!mine && <span className="font-semibold text-gray-800">{from}</span>}
                    {time && <span className={`${!mine ? "ml-2" : ""}`}>{time}</span>}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {m?.message ?? JSON.stringify(m)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 border rounded-xl px-3 py-2 outline-none focus:ring"
          placeholder="메시지 입력…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button
          onClick={onSend}
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
