export default function HeroBanner({ onGoOrder, onGoBest }) {
  return (
    <section id="live" className="max-w-6xl mx-auto px-6 pt-8">
      <div className="rounded-3xl overflow-hidden border shadow bg-gradient-to-r from-gray-900 to-gray-700 text-white">
        <div className="p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm">
              <span className="h-2 w-2 rounded-full bg-white" />
              오늘 20:00 LIVE
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-extrabold">
              Olive Live 쇼
            </h1>
            <p className="mt-3 text-white/80">
              라이브 방송 중 상품을 바로 주문할 수 있어요.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onGoOrder}
              className="px-5 py-3 rounded-2xl bg-white text-black font-semibold"
            >
              주문하기
            </button>
            <button
              onClick={onGoBest}
              className="px-5 py-3 rounded-2xl border border-white/30 text-white font-semibold"
            >
              상품 보기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}