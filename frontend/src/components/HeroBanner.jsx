import heroBg from "../assets/hero-bg.png";

export default function HeroBanner({ onGoOrder, onGoBest }) {
  return (
    <section id="live" className="max-w-6xl mx-auto px-6 pt-8">
      <div className="relative rounded-3xl overflow-hidden border shadow bg-white">
        {/* ✅ 배경 이미지: '전부 보이게' */}
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Hero background"
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* ✅ 가독성 오버레이 (필요 없으면 지워도 됨) */}
          <div className="absolute inset-0 bg-black/35" />
        </div>

        {/* ✅ 배너 높이(원하면 더 키워도 됨) */}
        <div className="relative z-10 p-8 md:p-10 min-h-[260px] md:min-h-[340px] flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-white">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-sm">
              <span className="h-2 w-2 rounded-full bg-white" />
              오늘 20:00 LIVE
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-extrabold">
              Olive Live 쇼
            </h1>
            <p className="mt-3 text-white/85">
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
              className="px-5 py-3 rounded-2xl border border-white/40 text-white font-semibold hover:bg-white/10"
            >
              상품 보기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
