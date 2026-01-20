export default function LiveModal({ open, live, onClose, onOrder }) {
  if (!open || !live) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-xl overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">LIVE</div>
            <div className="font-extrabold text-lg">{live.liveTitle}</div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50"
          >
            닫기
          </button>
        </div>

        <div className="p-6 grid gap-4">
          <div className="rounded-2xl bg-gray-100 h-64 flex items-center justify-center text-gray-400">
            라이브 플레이어 영역(추후 IVS 삽입)
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">{live.name}</div>
              <div className="text-sm text-gray-600">{live.price}</div>
            </div>
            <button
              onClick={() => onOrder(live)}
              className="px-5 py-3 rounded-2xl bg-black text-white font-semibold"
            >
              이 상품 주문하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}