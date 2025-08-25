// src/components/Layout.jsx
import { Link, useLocation } from "react-router-dom";

export default function Layout({
  user,
  onLogout,
  children,
  sessionRemainingSec,
  onExtendSession,
}) {
  const location = useLocation();

  const navItems = [
    { label: "행사 조회", path: "/main" },
    { label: "직원 명부", path: "/directory" },
    { label: "행사 업로드", path: "/events/new" },
  ];

  const fmt = (sec) => {
    if (sec == null) return "-";
    const s = Math.max(0, sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(ss)}`;
  };
  const danger = sessionRemainingSec != null && sessionRemainingSec <= 600;

  const ASIDE_W = 320; // 우측 카드 폭

  return (
    <div className="min-h-screen bg-[#f7f7f7] py-6">
      <div
        className="w-full px-6 grid gap-x-6 gap-y-4"
        style={{
          gridTemplateColumns: `1fr ${ASIDE_W}px`,
          gridTemplateRows: "auto 1fr",
        }}
      >
        {/* 1행-좌: 상단 메뉴 */}
        <header className="flex gap-3 items-center" style={{ gridColumn: "1 / 2", gridRow: "1 / 2" }}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm px-4 py-2 rounded ${
                location.pathname === item.path
                  ? "bg-black text-white"
                  : "bg-white text-gray-800 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </header>

        {/* 1~2행-우: 로그인 카드 (헤더와 정확히 같은 Y에서 시작) */}
        <aside
          className="sticky top-4"
          style={{ gridColumn: "2 / 3", gridRow: "1 / 3" }}
        >
          <div className="relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            {/* 우상단 남은시간/연장 */}
            <div className="absolute top-2 right-2 flex items-center gap-2 text-xs">
              <span className={`font-mono ${danger ? "text-red-600" : "text-gray-600"}`}>
                {fmt(sessionRemainingSec)}
              </span>
              <button
                onClick={onExtendSession}
                className="px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100"
                title="4시간 연장"
              >
                연장
              </button>
            </div>

            <h2 className="mb-2 text-lg font-medium text-gray-900">🙋‍♂️ 로그인 정보</h2>
            <p className="text-sm text-gray-700">사용자: <strong>{user?.name}</strong></p>
            <p className="text-sm text-gray-700">직급: <strong>{user?.position || "미지정"}</strong></p>
            <p className="mb-4 text-sm text-gray-700">부서: <strong>{user?.department || "미지정"}</strong></p>

            <button
              onClick={onLogout}
              className="w-full rounded bg-black py-2 text-white hover:bg-gray-800"
            >
              로그아웃
            </button>
          </div>
        </aside>

        {/* 2행-좌: 본문(캘린더) — 메뉴 바로 아래에 붙음 */}
        <main className="min-w-0" style={{ gridColumn: "1 / 2", gridRow: "2 / 3" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
