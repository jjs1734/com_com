// src/pages/MainPage.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import EventCalendar from "../components/EventCalendar";
import { addMonths, subMonths, addDays } from "date-fns";

// 부서별 색상 팔레트
const getDeptColor = (dept, isPast, isOngoing) => {
  const palette = {
    "학회 1팀": {
      upcoming: "bg-amber-700 text-white",
      ongoing: "bg-amber-600 text-white",
      past: "bg-amber-300 text-gray-700",
    },
    "학회 2팀": {
      upcoming: "bg-pink-700 text-white",
      ongoing: "bg-pink-600 text-white",
      past: "bg-pink-300 text-gray-700",
    },
    "제약 1팀": {
      upcoming: "bg-sky-700 text-white",
      ongoing: "bg-sky-600 text-white",
      past: "bg-sky-300 text-gray-700",
    },
    "제약 2팀": {
      upcoming: "bg-violet-700 text-white",
      ongoing: "bg-violet-600 text-white",
      past: "bg-violet-300 text-gray-700",
    },
    default: {
      upcoming: "bg-neutral-800 text-white",
      ongoing: "bg-neutral-900 text-white",
      past: "bg-neutral-300 text-gray-700",
    },
  };
  const tone = isPast ? "past" : isOngoing ? "ongoing" : "upcoming";
  const set = palette[dept] || palette.default;
  return set[tone];
};

// 안전 문자열화
const s = (v, fallback = "미지정") =>
  v === null || v === undefined || v === "" ? fallback : String(v);

// 정렬 유틸(문자열 전용)
const sortOptions = (arr) =>
  ["전체", ...Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b, "ko"))];

function MainPage({ user, events = [], onLogout }) {
  const navigate = useNavigate();

  // 1) 이벤트를 먼저 "문자열로 정규화" (host 객체도 name만 별도 보관)
  const normalizedEvents = useMemo(() => {
    return (events || []).map((e) => ({
      ...e,
      // 꼭 문자열로!
      department: s(e.department),
      company_name: s(e.company_name),
      product_name: s(e.product_name),
      // host는 객체로 두되, 렌더/필터용 문자열을 따로
      host: e.host || null,               // 모달 등에서 사용할 수 있음
      host_name: s(e.host?.name, "미지정"),
    }));
  }, [events]);

  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [deptFilter, setDeptFilter] = useState("전체");
  const [hostFilter, setHostFilter] = useState("전체");
  const [clientFilter, setClientFilter] = useState("전체");

  // 한국 공휴일(예시)
  const holidaysKR = useMemo(
    () =>
      new Set([
        "2025-01-01", "2025-03-01", "2025-05-05", "2025-06-06",
        "2025-08-15", "2025-10-03", "2025-10-09", "2025-12-25",
      ]),
    []
  );

  // 2) 드롭다운 옵션(반드시 문자열 배열)
  const optionsDept = useMemo(() => {
    let pool = normalizedEvents;
    if (hostFilter !== "전체") pool = pool.filter((e) => e.host_name === hostFilter);
    if (clientFilter !== "전체") pool = pool.filter((e) => e.company_name === clientFilter);
    return sortOptions(pool.map((e) => e.department));
  }, [normalizedEvents, hostFilter, clientFilter]);

  const optionsHost = useMemo(() => {
    let pool = normalizedEvents;
    if (deptFilter !== "전체") pool = pool.filter((e) => e.department === deptFilter);
    if (clientFilter !== "전체") pool = pool.filter((e) => e.company_name === clientFilter);
    return sortOptions(pool.map((e) => e.host_name));
  }, [normalizedEvents, deptFilter, clientFilter]);

  const optionsClient = useMemo(() => {
    let pool = normalizedEvents;
    if (deptFilter !== "전체") pool = pool.filter((e) => e.department === deptFilter);
    if (hostFilter !== "전체") pool = pool.filter((e) => e.host_name === hostFilter);
    return sortOptions(pool.map((e) => e.company_name));
  }, [normalizedEvents, deptFilter, hostFilter]);

  // 3) 필터 유효성 보정
  useEffect(() => {
    if (hostFilter !== "전체" && !optionsHost.includes(hostFilter)) setHostFilter("전체");
    if (clientFilter !== "전체" && !optionsClient.includes(clientFilter)) setClientFilter("전체");
  }, [deptFilter, optionsHost, optionsClient]);

  useEffect(() => {
    if (deptFilter !== "전체" && !optionsDept.includes(deptFilter)) setDeptFilter("전체");
    if (clientFilter !== "전체" && !optionsClient.includes(clientFilter)) setClientFilter("전체");
  }, [hostFilter, optionsDept, optionsClient]);

  useEffect(() => {
    if (deptFilter !== "전체" && !optionsDept.includes(deptFilter)) setDeptFilter("전체");
    if (hostFilter !== "전체" && !optionsHost.includes(hostFilter)) setHostFilter("전체");
  }, [clientFilter, optionsDept, optionsHost]);

  // 4) 필터 적용
  const filteredEvents = useMemo(() => {
    return normalizedEvents.filter(
      (e) =>
        (deptFilter === "전체" || e.department === deptFilter) &&
        (hostFilter === "전체" || e.host_name === hostFilter) &&
        (clientFilter === "전체" || e.company_name === clientFilter)
    );
  }, [normalizedEvents, deptFilter, hostFilter, clientFilter]);

  const resetFilters = () => {
    setDeptFilter("전체");
    setHostFilter("전체");
    setClientFilter("전체");
  };

  // 네비게이션
  const handlePrev = () => {
    setCurrentDate((d) => (view === "week" ? addDays(d, -7) : subMonths(d, 1)));
  };
  const handleToday = () => setCurrentDate(new Date());
  const handleNext = () => {
    setCurrentDate((d) => (view === "week" ? addDays(d, 7) : addMonths(d, 1)));
  };

  const handleLogoutClick = () => {
    onLogout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-8 font-sans">
      <div className="grid grid-cols-4 gap-6">
        {/* 좌측 3칸 */}
        <div className="col-span-3 space-y-6">
          {/* 보기/필터 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setView("month")}
                className={`px-3 py-1.5 text-sm ${view === "month" ? "bg-black text-white" : "bg-white text-gray-700"}`}
              >
                월
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-3 py-1.5 text-sm ${view === "week" ? "bg-black text-white" : "bg-white text-gray-700"}`}
              >
                주
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
              >
                {optionsDept.map((v, idx) => (
                  <option key={`dept-${v}-${idx}`} value={v}>
                    {v}
                  </option>
                ))}
              </select>

              <select
                value={hostFilter}
                onChange={(e) => setHostFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
              >
                {optionsHost.map((v, idx) => (
                  <option key={`host-${v}-${idx}`} value={v}>
                    {v}
                  </option>
                ))}
              </select>

              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
              >
                {optionsClient.map((v, idx) => (
                  <option key={`client-${v}-${idx}`} value={v}>
                    {v}
                  </option>
                ))}
              </select>

              <button
                onClick={resetFilters}
                className="ml-2 px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50"
              >
                초기화
              </button>
            </div>
          </div>

          {/* 📅 캘린더 */}
          <EventCalendar
            events={filteredEvents}
            view={view}
            currentDate={currentDate}
            onPrev={handlePrev}
            onToday={handleToday}
            onNext={handleNext}
            holidays={holidaysKR}
            getDeptColor={getDeptColor}
          />
        </div>

        {/* 우측 로그인 정보 */}
        <div className="col-span-1 p-4 border border-gray-200 rounded-lg bg-white h-fit">
          <h2 className="text-lg font-medium text-gray-900 mb-2">🙋‍♂️ 로그인 정보</h2>
          <p className="text-sm text-gray-700">
            사용자: <strong>{user?.name}</strong>
          </p>
          <p className="text-sm text-gray-700">
            직급: <strong>{user?.position || "미지정"}</strong>
          </p>
          <p className="text-sm text-gray-700 mb-4">
            부서: <strong>{user?.department || "미지정"}</strong>
          </p>
          <button
            onClick={handleLogoutClick}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

export default MainPage;
