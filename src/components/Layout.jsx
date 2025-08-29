import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { format, parseISO } from "date-fns";
import EventDetailModal from "./EventDetailModal"; // ✅ 상세 모달 임포트

export default function Layout({
  user,
  onLogout,
  children,
  sessionRemainingSec,
  onExtendSession,
  showToast,
}) {
  const location = useLocation();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [hostEvents, setHostEvents] = useState([]);
  const [supportEvents, setSupportEvents] = useState([]); // [{event, rangeText}]

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 기본 메뉴
  const navItems = [
    { label: "행사 조회", path: "/main" },
    { label: "직원 명부", path: "/directory" },
  ];
  if (user?.is_admin) {
    navItems.push({ label: "행사 업로드", path: "/events/new" });
  }

  // 세션 남은 시간 표시
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
              const updated = prev.filter((u) => u.user_id !== payload.new.user_id);
              return [...updated, payload.new];
            }
            if (payload.eventType === "DELETE") {
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
    if (!error) setOnlineUsers(data || []);
  };

  // ✅ 날짜 압축 (연속 → 범위, 띄엄띄엄 → 콤마)
  function compressDateRanges(dates) {
    if (!dates || dates.length === 0) return "";
    const sorted = dates.map((d) => parseISO(d)).sort((a, b) => a - b);

    const ranges = [];
    let rangeStart = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i];
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        prev = curr;
      } else {
        ranges.push([rangeStart, prev]);
        rangeStart = curr;
        prev = curr;
      }
    }
    ranges.push([rangeStart, prev]);

    return ranges
      .map(([s, e]) =>
        s.getTime() === e.getTime()
          ? `(${format(s, "MM/dd")})`
          : `(${format(s, "MM/dd")}-${format(e, "MM/dd")})`
      )
      .join(", ");
  }

  // ✅ 내 일정 가져오기
  useEffect(() => {
    if (!user?.id) return;
    const today = new Date().toISOString().split("T")[0];

    const fetchData = async () => {
      // 진행 예정 행사 (내가 host)
      const { data: hostEv } = await supabase
        .from("events")
        .select(
          "id, event_name, start_date, end_date, region, department, host, host_id, company_name, product_name, venue"
        )
        .eq("host_id", user.id)
        .gte("start_date", today)
        .order("start_date", { ascending: true });

      setHostEvents(hostEv || []);

      // 지원 예정 행사 (내가 support)
      const { data: sp } = await supabase
        .from("event_supports")
        .select(
          "support_date, events(id, event_name, start_date, end_date, region, department, host, host_id, company_name, product_name, venue)"
        )
        .eq("user_id", user.id)
        .gte("support_date", today)
        .order("support_date", { ascending: true });

      const grouped = {};
      (sp || []).forEach((row) => {
        if (!row.events) return;
        const ev = row.events;
        if (!grouped[ev.id]) {
          grouped[ev.id] = { event: ev, dates: [] };
        }
        grouped[ev.id].dates.push(row.support_date);
      });

      const supportList = Object.values(grouped).map(({ event, dates }) => {
        dates.sort();
        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];

        const totalDays =
          (new Date(event.end_date) - new Date(event.start_date)) /
            (1000 * 60 * 60 * 24) +
          1;
        const fullSupport =
          minDate === event.start_date &&
          maxDate === event.end_date &&
          dates.length === totalDays;

        let rangeText = "";
        if (fullSupport) {
          rangeText = fmtRange(event.start_date, event.end_date);
        } else {
          rangeText = compressDateRanges(dates);
        }

        return { event, dates, rangeText, firstDate: minDate };
      });

      // ✅ 날짜순 정렬
      supportList.sort((a, b) => new Date(a.firstDate) - new Date(b.firstDate));

      setSupportEvents(supportList);
    };

    fetchData();
  }, [user?.id]);

  const fmtRange = (start, end) => {
    try {
      const s = format(parseISO(start), "MM/dd");
      const e = format(parseISO(end), "MM/dd");
      return start === end ? `(${s})` : `(${s}-${e})`;
    } catch {
      return "";
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

        {/* 우측 사이드 */}
        <aside
          className="sticky top-4 space-y-4"
          style={{ gridColumn: "2 / 3", gridRow: "1 / 3" }}
        >
          {/* 로그인 정보 */}
          <div className="relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="absolute top-2 right-2 flex items-center gap-2 text-xs">
              <span className={`font-mono ${danger ? "text-red-600" : "text-gray-600"}`}>
                {fmt(sessionRemainingSec)}
              </span>
              <button
                onClick={onExtendSession}
                className="px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100"
              >
                연장
              </button>
            </div>

            <h2 className="mb-2 text-lg font-medium text-gray-900">로그인 정보</h2>
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

          {/* 내 일정 */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-lg font-medium text-gray-900">내 일정</h2>

            <h3 className="text-sm font-semibold text-gray-800 mb-1">진행 예정 행사</h3>
            {hostEvents.length === 0 ? (
              <p className="text-sm text-gray-500 mb-2">없음</p>
            ) : (
              <ul className="space-y-1 mb-2 text-sm">
                {hostEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="text-gray-700 cursor-pointer hover:underline"
                    onClick={() => {
                      setSelectedEvent(ev);
                      setModalOpen(true);
                    }}
                  >
                    {fmtRange(ev.start_date, ev.end_date)} {ev.event_name} {ev.region || ""}
                  </li>
                ))}
              </ul>
            )}

            <h3 className="text-sm font-semibold text-gray-800 mb-1">지원 예정 행사</h3>
            {supportEvents.length === 0 ? (
              <p className="text-sm text-gray-500">없음</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {supportEvents.map((row) => (
                  <li
                    key={row.event.id}
                    className="text-gray-700 cursor-pointer hover:underline"
                    onClick={() => {
                      setSelectedEvent(row.event);
                      setModalOpen(true);
                    }}
                  >
                    {row.rangeText} {row.event.event_name} {row.event.region || ""}
                  </li>
                ))}
              </ul>
            )}
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
                      <span className="text-gray-400 text-xs">{u.department}</span>
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

      {/* ✅ 상세 모달 */}
      {modalOpen && selectedEvent && (
        <EventDetailModal
          open={modalOpen}
          event={selectedEvent}
          onClose={() => setModalOpen(false)}
          getDeptColor={() => ""}
          status={() => ""}
          onRefresh={() => {}}
          showToast={showToast || (() => {})}
          user={user}
        />
      )}
    </div>
  );
}
