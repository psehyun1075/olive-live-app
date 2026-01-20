import logo from "../assets/olive-live-logo.png";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Olive Live" className="h-9 w-auto" />
          <div className="leading-tight">
            <div className="font-extrabold">Olive Live</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-4 text-sm text-gray-700 ml-6">
          <a className="hover:text-black" href="#live">라이브</a>
          <a className="hover:text-black" href="#best">추천</a>
          <a className="hover:text-black" href="#orders">주문하기</a>
        </nav>

        <div className="ml-auto flex items-center gap-2 w-full max-w-md">
          <input
            className="w-full border rounded-xl px-4 py-2 text-sm outline-none focus:ring"
            placeholder="검색(추후 고도화)"
            onChange={() => {}}
          />
          <button className="px-4 py-2 rounded-xl bg-black text-white text-sm">
            검색
          </button>
        </div>
      </div>
    </header>
  );
}