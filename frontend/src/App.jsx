import { useMemo, useState } from "react";

import Header from "./components/Header.jsx";
import HeroBanner from "./components/HeroBanner.jsx";
import ProductGrid from "./components/ProductGrid.jsx";
import LiveModal from "./components/LiveModal.jsx";

import Toast from "./components/Toast.jsx";
import OrderList from "./components/OrderList.jsx";
import { createOrder, getApiBase } from "./lib/api.js";
import { getTabNickname } from "./lib/nickname.js"; // ✅ 추가

export default function App() {
  const apiBase = useMemo(() => getApiBase(), []);

  const [orderId, setOrderId] = useState("frontend-demo");
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({ kind: "success", message: "" });
  const [sentOrders, setSentOrders] = useState([]);

  const [liveOpen, setLiveOpen] = useState(false);
  const [selectedLive, setSelectedLive] = useState(null);

  // ✅ 탭마다 다른 닉네임 (sessionStorage 기반)
  const [chatUser] = useState(() => getTabNickname("guest"));

  // ✅ IVS Playback URL (Vite env로 주입)
  const playbackUrl = import.meta.env.VITE_IVS_PLAYBACK_URL || "";

  // ✅ WebSocket URL (Vite env로 주입)
  const wsUrl = import.meta.env.VITE_WS_URL || "";

  async function sendOrder(nextOrderId) {
    const oid = nextOrderId ?? orderId;
    if (!oid) return;

    setLoading(true);
    setToast({ kind: "success", message: "" });

    try {
      const data = await createOrder(oid, apiBase);

      setSentOrders((prev) => [{ ...data, sentAt: Date.now() }, ...prev].slice(0, 10));

      setToast({
        kind: "success",
        message: `주문 완료!\norderId=${data.orderId}\nmessageId=${data.messageId}`,
      });
    } catch (e) {
      setToast({ kind: "error", message: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }

  function onQuickOrder(product) {
    const oid = `${product.id}-${Date.now()}`;
    setOrderId(oid);
    sendOrder(oid);
    document.getElementById("orders")?.scrollIntoView({ behavior: "smooth" });
  }

  function onOpenLive(product) {
    setSelectedLive(product);
    setLiveOpen(true);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <HeroBanner
        onGoOrder={() => document.getElementById("orders")?.scrollIntoView({ behavior: "smooth" })}
        onGoBest={() => document.getElementById("best")?.scrollIntoView({ behavior: "smooth" })}
      />

      <ProductGrid onQuickOrder={onQuickOrder} onOpenLive={onOpenLive} />

      <section id="orders" className="max-w-6xl mx-auto px-6 py-10">
        <div className="rounded-2xl shadow bg-white p-6">
          <div className="text-lg font-extrabold">주문하기</div>
          <div className="mt-1 text-sm text-gray-600">
            주문 ID를 입력해서 주문을 전송할 수 있어요.
          </div>

          <div className="mt-6 grid gap-3">
            <label className="text-sm font-semibold">orderId</label>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded-xl px-4 py-2 outline-none focus:ring"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="ex) user-123-order-001"
              />
              <button
                onClick={() => sendOrder()}
                disabled={loading || !orderId}
                className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
              >
                {loading ? "처리 중..." : "주문하기"}
              </button>
            </div>

            <OrderList items={sentOrders} />
          </div>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-gray-600">
          ※ 본 화면은 과제/데모용이며 실제 서비스와 무관합니다.
        </div>
      </footer>

      <LiveModal
        open={liveOpen}
        live={selectedLive}
        onClose={() => setLiveOpen(false)}
        onOrder={(p) => {
          setLiveOpen(false);
          onQuickOrder(p);
        }}
        playbackUrl={playbackUrl}
        wsUrl={wsUrl}       // ✅ 추가
        user={chatUser}     // ✅ 탭 닉네임 전달
      />

      <Toast
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast({ kind: "success", message: "" })}
      />
    </div>
  );
}
