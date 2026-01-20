import { products } from "../data/products.js";

function ProductCard({ p, onOrder, onLive }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
        상품 이미지
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {p.tag}
          </div>
          <div className="text-sm font-bold">{p.price}</div>
        </div>

        <div className="mt-3 font-semibold">{p.name}</div>
        <div className="mt-1 text-sm text-gray-600 line-clamp-1">
          {p.liveTitle}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => onLive(p)}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          >
            LIVE 보기
          </button>
          <button
            onClick={() => onOrder(p)}
            className="px-4 py-2 rounded-xl bg-black text-white"
          >
            주문하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductGrid({ onQuickOrder, onOpenLive }) {
  return (
    <section id="best" className="max-w-6xl mx-auto px-6 pt-10">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-lg font-extrabold">오늘의 추천</div>
          <div className="text-sm text-gray-600">라이브 상품 3종</div>
        </div>
        <a href="#orders" className="text-sm text-gray-700 hover:text-black">
          주문하기 →
        </a>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            p={p}
            onOrder={onQuickOrder}
            onLive={onOpenLive}
          />
        ))}
      </div>
    </section>
  );
}