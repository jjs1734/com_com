import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import DeptEventBarChart from "../components/charts/DeptEventBarChart";
import MonthlyEventLineChart from "../components/charts/MonthlyEventLineChart";
import HostEventBarChart from "../components/charts/HostEventBarChart";
import EventSupportBarChart from "../components/charts/EventSupportBarChart";

// ✅ 부서 색상 팔레트 (캘린더와 동일)
const DEPT_COLORS = {
  "제약 1팀": "#0369a1",
  "제약 2팀": "#9333ea",
  "학회 1팀": "#b45309",
  "학회 2팀": "#be185d",
};

export default function EventStatsPage() {
  const [deptStats, setDeptStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [hostStats, setHostStats] = useState([]);
  const [supportStats, setSupportStats] = useState([]);

  const [selectedDetail, setSelectedDetail] = useState(null); // ✅ 단일 상태
  const [detailEvents, setDetailEvents] = useState([]);

  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState("전체");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ✅ 캐시 ref
  const allEventsCache = useRef([]);
  const supportEventsCache = useRef({});

  // ✅ 상세 표 ref
  const detailRef = useRef(null);

  // ✅ 부서 순서 고정
  const DEPARTMENTS = ["제약 1팀", "제약 2팀", "학회 1팀", "학회 2팀"];

  // ✅ 년도 + 분기에 따라 기간 계산
  useEffect(() => {
    let start, end;
    if (quarter === "전체") {
      start = `${year}-01-01`;
      end = `${year}-12-31`;
    } else if (quarter === "1분기") {
      start = `${year}-01-01`;
      end = `${year}-03-31`;
    } else if (quarter === "2분기") {
      start = `${year}-04-01`;
      end = `${year}-06-30`;
    } else if (quarter === "3분기") {
      start = `${year}-07-01`;
      end = `${year}-09-30`;
    } else if (quarter === "4분기") {
      start = `${year}-10-01`;
      end = `${year}-12-31`;
    }
    setStartDate(start);
    setEndDate(end);
  }, [year, quarter]);

  // ✅ 기간이 설정되면 통계 갱신
  useEffect(() => {
    if (startDate && endDate) {
      fetchStats();
      fetchSupportStats();
    }
  }, [startDate, endDate]);

  // ✅ 행사 통계 불러오기
  const fetchStats = async () => {
    let { data } = await supabase
      .from("events")
      .select("id, event_name, start_date, end_date, department, host, venue")
      .gte("start_date", startDate)
      .lte("end_date", endDate);

    if (!data) return;

    // 부서별 카운트
    const deptCount = {};
    data.forEach((e) => {
      deptCount[e.department] = (deptCount[e.department] || 0) + 1;
    });
    const deptResult = DEPARTMENTS.map((dept) => ({
      department: dept,
      total: deptCount[dept] || 0,
    }));

    // 월별 집계
    const monthCount = {};
    data.forEach((e) => {
      const month = new Date(e.start_date).toISOString().slice(0, 7);
      if (month >= startDate.slice(0, 7) && month <= endDate.slice(0, 7)) {
        monthCount[month] = (monthCount[month] || 0) + 1;
      }
    });
    const sortedMonths = Object.entries(monthCount)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }));

    // 주최자별 집계 (주최자 + 부서 포함)
    const hostMap = {};
    data.forEach((e) => {
      const key = `${e.host}-${e.department}`;
      if (!hostMap[key]) {
        hostMap[key] = { host: e.host, department: e.department, total: 0 };
      }
      hostMap[key].total += 1;
    });
    const hostResult = Object.values(hostMap);

    setDeptStats(deptResult);
    setMonthlyStats(sortedMonths);
    setHostStats(hostResult);

    // ✅ 캐시에 저장
    allEventsCache.current = data;
  };

  // ✅ 행사 지원 통계 불러오기 (행사 1건 단위)
  const fetchSupportStats = async () => {
    let { data } = await supabase
      .from("event_supports")
      .select("user_id, event_id, users(id, name, department), events(id, event_name, start_date, end_date, department, host, venue)")
      .gte("support_date", startDate)
      .lte("support_date", endDate);

    if (!data) return;

    const userEventSet = new Set();
    const userCount = {};
    const supportEvents = {};

    data.forEach((row) => {
      const u = row.users;
      if (!u) return;

      const key = `${u.id}-${row.event_id}`;
      if (userEventSet.has(key)) return;
      userEventSet.add(key);

      if (!userCount[u.id]) {
        userCount[u.id] = { id: u.id, name: u.name, department: u.department, total: 0 };
        supportEvents[u.id] = [];
      }
      userCount[u.id].total += 1;
      if (row.events) supportEvents[u.id].push(row.events);
    });

    const sortedUsers = Object.values(userCount).sort((a, b) => b.total - a.total);
    setSupportStats(sortedUsers);

    // ✅ 캐시에 저장
    supportEventsCache.current = supportEvents;
  };

  // ✅ 상세 데이터 불러오기
  useEffect(() => {
    if (!selectedDetail) return;

    if (selectedDetail.type === "support") {
      const events = (supportEventsCache.current[selectedDetail.value.id] || []).sort(
        (a, b) => new Date(a.start_date) - new Date(b.start_date)
      );
      setDetailEvents(events);
    } else {
      let filtered = [...allEventsCache.current];
      if (selectedDetail.type === "department") {
        filtered = filtered.filter((e) => e.department === selectedDetail.value);
      } else if (selectedDetail.type === "host") {
        filtered = filtered.filter((e) => e.host === selectedDetail.value);
      } else if (selectedDetail.type === "month") {
        filtered = filtered.filter((e) => e.start_date.startsWith(selectedDetail.value));
      }
      setDetailEvents(filtered);
    }
  }, [selectedDetail]);

  // ✅ 표 출력 시 스크롤 이동
  useEffect(() => {
    if (selectedDetail && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDetail]);

  // ✅ 닫기 버튼 핸들러
  const handleCloseDetail = () => {
    setSelectedDetail(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">행사 통계</h1>

      {/* ✅ 검색 조건 */}
      <div className="flex items-center gap-4 mb-6">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border rounded px-2 py-1 text-sm"
        >
          {Array.from({ length: 5 }, (_, i) => {
            const y = new Date().getFullYear() - i;
            return (
              <option key={y} value={y}>
                {y}년
              </option>
            );
          })}
        </select>

        <select
          value={quarter}
          onChange={(e) => setQuarter(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option>전체</option>
          <option>1분기</option>
          <option>2분기</option>
          <option>3분기</option>
          <option>4분기</option>
        </select>
      </div>

      {/* ✅ 차트 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DeptEventBarChart
          data={deptStats}
          onSelect={(filter) => setSelectedDetail({ type: "department", value: filter.value })}
        />
        <MonthlyEventLineChart
          data={monthlyStats}
          onSelect={(filter) => setSelectedDetail({ type: "month", value: filter.value })}
        />
        <HostEventBarChart
          data={hostStats}
          onSelect={(filter) => setSelectedDetail({ type: "host", value: filter.value })}
        />
        <EventSupportBarChart
          data={supportStats}
          onSelect={(user) => setSelectedDetail({ type: "support", value: user })}
        />
      </div>

      {/* ✅ 단일 상세 표 */}
      {selectedDetail && (
        <div ref={detailRef} className="mt-6 bg-white shadow rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {year}년 {quarter} -{" "}
              {selectedDetail.type === "support"
                ? `${selectedDetail.value.name} (${selectedDetail.value.department}) 지원 행사`
                : `${selectedDetail.value} 행사 상세`}
            </h2>
            {/* 닫기 버튼 */}
            <button
              onClick={handleCloseDetail}
              className="text-gray-500 hover:text-gray-700 text-lg font-bold px-2"
            >
              ×
            </button>
          </div>

          {detailEvents.length === 0 ? (
            <p className="text-gray-500">행사가 없습니다.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="px-3 py-2 text-left">행사명</th>
                  <th className="px-3 py-2">시작일</th>
                  <th className="px-3 py-2">종료일</th>
                  <th className="px-3 py-2">주최자</th>
                  <th className="px-3 py-2">부서</th>
                  <th className="px-3 py-2">장소</th>
                </tr>
              </thead>
              <tbody>
                {detailEvents.map((ev) => (
                  <tr key={ev.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{ev.event_name}</td>
                    <td className="px-3 py-2">{ev.start_date}</td>
                    <td className="px-3 py-2">{ev.end_date}</td>
                    <td className="px-3 py-2">{ev.host}</td>
                    <td className="px-3 py-2">
                      <span
                        className="px-2 py-1 rounded text-white text-xs"
                        style={{ backgroundColor: DEPT_COLORS[ev.department] || "#6b7280" }}
                      >
                        {ev.department}
                      </span>
                    </td>
                    <td className="px-3 py-2">{ev.venue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
