import logo from "../assets/olive-live-logo.png";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      {/* ✅ py-4 → py-6 : 헤더 높이 살짝 키움 */}
      <div className="max-w-6xl mx-auto px-6 py-6 flex items-center gap-4">
        <div className="flex items-center gap-3">
          {/* ✅ 로고 키우기: h-9 → h-12, 동그랗게/약간 또렷하게 */}
          <img
            src={logo}
            alt="Olive Live"
            className="h-15 w-15 rounded-full object-contain"
          />
          <div className="leading-tight">
            {/* ✅ 타이틀도 약간 키움 */}
            <div className="text-lg font-extrabold">Olive Live</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-5 text-sm text-gray-700 ml-6">
          <a className="hover:text-black" href="#live">
            라이브
          </a>
          <a className="hover:text-black" href="#best">
            추천
          </a>
          <a className="hover:text-black" href="#orders">
            주문하기
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2 w-full max-w-md">
          {/* ✅ input도 높이 살짝 맞춰줌 */}
          <input
            className="w-full border rounded-2xl px-4 py-3 text-sm outline-none focus:ring"
            placeholder="검색(추후 고도화)"
            onChange={() => {}}
          />
          {/* ✅ 줄바꿈 방지: whitespace-nowrap + min-w */}
          <button className="px-5 py-3 rounded-2xl bg-black text-white text-sm font-semibold whitespace-nowrap min-w-[76px]">
            검색
          </button>
        </div>
      </div>
    </header>
  );
}
