export default function OrderList({ items }) {
  if (!items?.length) {
    return (
      <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
        아직 전송한 주문이 없어.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border">
      <div className="bg-gray-50 px-4 py-2 text-sm font-semibold">
        최근 전송한 주문
      </div>
      <ul className="divide-y">
        {items.map((it) => (
          <li key={it.messageId} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{it.orderId}</div>
                <div className="text-xs text-gray-500">
                  {new Date(it.sentAt).toLocaleString()}
                </div>
              </div>
              <div className="text-xs font-mono text-gray-700 break-all">
                {it.messageId}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}