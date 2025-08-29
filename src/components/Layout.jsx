// src/components/Layout.jsx
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Layout({
  user,
  onLogout,
  children,
  sessionRemainingSec,
  onExtendSession,
}) {
  const location = useLocation();
  const [onlineUsers, setOnlineUsers] = useState([]);

  // 기본 메뉴
  const navItems = [
    { label: "행사 조회", path: "/main" },
    { label: "직원 명부", path: "/directory" },
  ];

  if (user?.is_admin) {
    navItems.push({ label: "행사 업로드", path: "/events/new" });
  }

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

  const ASIDE_W = 320;

  // ✅ online_users 실시간 구독
  useEffect(() => {
    fetchOnlineUsers();

    const channel = supabase
      .channel("online-users-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "online_users" },
        (payload) => {
          setOnlineUsers((prev) => {
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              // 동일 user_id 제거 후 새 데이터 추가
              const updated = prev.filter((u) => u.user_id !== payload.new.user_id);
              return [...updated, payload.new];
            }
            if (payload.eventType === "DELETE") {
              // Supabase에서 old.user_id 안 내려줄 경우 대비
              const deletedUserId = payload.old.user_id || payload.old.id;
              return prev.filter((u) => u.user_id !== deletedUserId);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOnlineUsers = async () => {
    const { data, error } = await supabase
      .from("online_users")
      .select("user_id, name, department");
    if (!error) {
      setOnlineUsers(data || []);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] py-6">
      <div
        className="w-full px-6 grid gap-x-6 gap-y-4"
        style={{
          gridTemplateColumns: `1fr ${ASIDE_W}px`,
          gridTemplateRows: "auto 1fr",
        }}
      >
        {/* 상단 메뉴 */}
        <header
          className="flex gap-3 items-center"
          style={{ gridColumn: "1 / 2", gridRow: "1 / 2" }}
        >
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

        {/* 우측 사이드 (로그인 + 접속자) */}
        <aside
          className="sticky top-4 space-y-4"
          style={{ gridColumn: "2 / 3", gridRow: "1 / 3" }}
        >
          {/* 로그인 정보 */}
          <div className="relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="absolute top-2 right-2 flex items-center gap-2 text-xs">
              <span
                className={`font-mono ${
                  danger ? "text-red-600" : "text-gray-600"
                }`}
              >
                {fmt(sessionRemainingSec)}
              </span>
              <button
                onClick={onExtendSession}
                className="px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100"
              >
                연장
              </button>
            </div>

            <h2 className="mb-2 text-lg font-medium text-gray-900">
              로그인 정보
            </h2>
            <p className="text-sm text-gray-700">
              성명: <strong>{user?.name}</strong>
            </p>
            <p className="text-sm text-gray-700">
              직급: <strong>{user?.position || "-"}</strong>
            </p>
            <p className="mb-4 text-sm text-gray-700">
              부서: <strong>{user?.department || "-"}</strong>
            </p>

            <button
              onClick={onLogout}
              className="w-full rounded bg-black py-2 text-white hover:bg-gray-800"
            >
              로그아웃
            </button>
          </div>

          {/* 접속자 */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-lg font-medium text-gray-900">접속자</h2>
            {onlineUsers.length === 0 ? (
              <p className="text-sm text-gray-500">현재 접속자가 없습니다.</p>
            ) : (
              <ul className="space-y-1 max-h-64 overflow-y-auto text-sm">
                {onlineUsers.map((u) => (
                  <li
                    key={u.user_id}
                    className="flex items-center gap-2 text-gray-700"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
                    <span>{u.name}</span>
                    {u.department && (
                      <span className="text-gray-400 text-xs">
                        {u.department}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* 본문 */}
        <main
          className="min-w-0"
          style={{ gridColumn: "1 / 2", gridRow: "2 / 3" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
