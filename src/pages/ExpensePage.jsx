// src/pages/ExpensePage.jsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  parseISO, eachDayOfInterval, isWeekend,
  format, startOfMonth, endOfMonth, isWithinInterval
} from "date-fns";

// ✅ 기간 표시 유틸 함수
const formatPeriod = (start, end) => {
  if (start === end) {
    return format(parseISO(start), "yyyy. MM. dd");
  }
  return `${format(parseISO(start), "yyyy. MM. dd")} ~ ${format(parseISO(end), "yyyy. MM. dd")}`;
};

export default function ExpensePage() {
  const [events, setEvents] = useState([]);
  const [supports, setSupports] = useState([]);
  const [users, setUsers] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // ✅ DB 불러오기
  useEffect(() => {
    const fetchData = async () => {
      const { data: ev } = await supabase
        .from("events")
        .select("id,event_name,department,host,host_id,event_type,start_date,end_date,setup_date,region,region_id,venue");

      const { data: sp } = await supabase
        .from("event_supports")
        .select("event_id,user_id,support_date,users(id,name,position,department)");

      const { data: us } = await supabase
        .from("users")
        .select("id,name,position,department");

      const { data: hd } = await supabase
        .from("holidays")
        .select("date");

      setEvents(ev || []);
      setSupports(sp || []);
      setUsers(us || []);
      setHolidays((hd || []).map(h => h.date));
    };
    fetchData();
  }, []);

  const isHolidayOrWeekend = (date) => {
    const d = format(date, "yyyy-MM-dd");
    return isWeekend(date) || holidays.includes(d);
  };

  // 출장비 계산
  const calcDailyExpense = (date, ev, position) => {
    if (["대표이사", "이사"].includes(position)) return 0;
    const isHoliday = isHolidayOrWeekend(date);

    if (!isHoliday) {
      if (ev.region_id) return 40000; // 평일+지방
      return 0;
    } else {
      if (ev.region_id) {
        if (ev.event_type === "제약행사") return 90000;
        if (ev.event_type === "학회행사") return 150000;
      } else {
        if (ev.event_type === "제약행사") return 70000;
        if (ev.event_type === "학회행사") return 150000;
      }
    }
    return 0;
  };

  const calcSetupExpense = (ev, position) => {
    if (["대표이사", "이사"].includes(position)) return 0;
    if (!ev.setup_date) return 0;
    const setupDate = parseISO(ev.setup_date);
    if (isHolidayOrWeekend(setupDate) && ev.event_type === "학회행사") {
      return 70000;
    }
    return 0;
  };

  // 월별 필터
  const filteredEvents = useMemo(() => {
    const start = startOfMonth(parseISO(`${month}-01`));
    const end = endOfMonth(start);
    return events.filter(ev => isWithinInterval(parseISO(ev.start_date), { start, end }));
  }, [events, month]);

  // 직원별 상세 row
  const staffRows = useMemo(() => {
    let rows = [];

    filteredEvents.forEach(ev => {
      // 진행자
      const hostUser = users.find(u => u.id === ev.host_id);
      if (hostUser) {
        const days = eachDayOfInterval({
          start: parseISO(ev.start_date),
          end: parseISO(ev.end_date)
        });
        let amount = days.reduce((sum, d) => sum + calcDailyExpense(d, ev, hostUser.position), 0);
        amount += calcSetupExpense(ev, hostUser.position);

        rows.push({ user_id: hostUser.id, ...hostUser, event: ev, amount });
      }

      // ✅ 진행자 세팅날 참가 반영
      if (hostUser && ev.setup_date) {
        const setupAmount = calcSetupExpense(ev, hostUser.position);
        if (setupAmount > 0) {
          rows.push({
            user_id: hostUser.id,
            ...hostUser,
            event: { ...ev, start_date: ev.setup_date, end_date: ev.setup_date },
            amount: setupAmount
          });
        }
      }

      // 지원자
      supports.filter(s => s.event_id === ev.id).forEach(sp => {
        const su = sp.users;
        if (!su) return;
        const d = parseISO(sp.support_date);
        const amount = calcDailyExpense(d, ev, su.position);
        rows.push({
          user_id: su.id,
          ...su,
          event: { ...ev, start_date: sp.support_date, end_date: sp.support_date },
          amount
        });
      });
    });

    return rows;
  }, [filteredEvents, supports, users]);

  // 직원별 합계
  const staffSummary = useMemo(() => {
    const map = {};
    staffRows.forEach(r => {
      if (!map[r.user_id]) {
        map[r.user_id] = { ...r, amount: 0 };
      }
      map[r.user_id].amount += r.amount;
    });
    return Object.values(map);
  }, [staffRows]);

  // 행사별 합계 + 참가자 중복 제거
  const eventSummary = useMemo(() => {
    const map = {};
    staffRows.forEach(r => {
      if (!map[r.event.id]) {
        map[r.event.id] = { ev: r.event, amount: 0, participants: {} };
      }
      map[r.event.id].amount += r.amount;
      if (!map[r.event.id].participants[r.user_id]) {
        map[r.event.id].participants[r.user_id] = { ...r };
      } else {
        map[r.event.id].participants[r.user_id].amount += r.amount;
      }
    });
    return Object.values(map)
      .filter(e => e.amount > 0)
      .map(e => ({ ...e, participants: Object.values(e.participants) }));
  }, [staffRows]);

  const totalStaff = staffSummary.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow border p-6">
        <h1 className="text-xl font-semibold mb-6">💰 휴일근무수당 정산</h1>

        {/* 월 선택 */}
        <div className="mb-6">
          <label className="text-sm text-gray-700 mr-2">월 선택:</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          />
        </div>

        {/* 직원별 합계표 */}
        <h2 className="text-lg font-semibold mb-2">직원별 출장비 합계</h2>
        <table className="w-full text-sm border-collapse mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">이름</th>
              <th className="border p-2">부서</th>
              <th className="border p-2">직급</th>
              <th className="border p-2">총액</th>
            </tr>
          </thead>
          <tbody>
            {staffSummary.map(r => (
              <tr
                key={r.user_id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedStaff(r.user_id)}
              >
                <td className="border p-2">{r.name}</td>
                <td className="border p-2">{r.department}</td>
                <td className="border p-2">{r.position}</td>
                <td className="border p-2 text-right">{r.amount.toLocaleString()} 원</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 직원 총합 */}
        <div className="mb-8 text-right font-semibold text-lg">
          총 합계: {totalStaff.toLocaleString()} 원
        </div>

        {/* 행사별 합계표 */}
        <h2 className="text-lg font-semibold mb-2">행사별 출장비 합계</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">기간</th>
              <th className="border p-2">행사명</th>
              <th className="border p-2">지역</th>
              <th className="border p-2">장소</th>
              <th className="border p-2">진행자</th>
              <th className="border p-2">총액</th>
            </tr>
          </thead>
          <tbody>
            {eventSummary.map(({ ev, amount }) => (
              <tr
                key={ev.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedEvent(ev)}
              >
                <td className="border p-2">{formatPeriod(ev.start_date, ev.end_date)}</td>
                <td className="border p-2">{ev.event_name}</td>
                <td className="border p-2">{ev.region}</td>
                <td className="border p-2">{ev.venue}</td>
                <td className="border p-2">
                  {users.find(u => u.id === ev.host_id)?.name || ""}
                </td>
                <td className="border p-2 text-right">{amount.toLocaleString()} 원</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 직원 상세 모달 */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow p-6 w-[650px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">직원 상세 내역</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">행사명</th>
                  <th className="border p-2">기간</th>
                  <th className="border p-2">지역</th>
                  <th className="border p-2">장소</th>
                  <th className="border p-2">금액</th>
                </tr>
              </thead>
              <tbody>
                {staffRows
                  .filter(r => r.user_id === selectedStaff)
                  .map((r, idx) => (
                    <tr key={idx}>
                      <td className="border p-2">{r.event.event_name}</td>
                      <td className="border p-2">{formatPeriod(r.event.start_date, r.event.end_date)}</td>
                      <td className="border p-2">{r.event.region}</td>
                      <td className="border p-2">{r.event.venue}</td>
                      <td className="border p-2 text-right">{r.amount.toLocaleString()} 원</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="text-right mt-4">
              <button
                onClick={() => setSelectedStaff(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 행사 상세 모달 */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow p-6 w-[700px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">행사 상세 내역</h3>
            <p className="mb-2 font-medium">{selectedEvent.event_name}</p>
            <p className="mb-4 text-sm text-gray-600">
              {formatPeriod(selectedEvent.start_date, selectedEvent.end_date)} / {selectedEvent.region} / {selectedEvent.venue}
            </p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">이름</th>
                  <th className="border p-2">부서</th>
                  <th className="border p-2">직급</th>
                  <th className="border p-2">참가기간</th>
                  <th className="border p-2">금액</th>
                </tr>
              </thead>
              <tbody>
                {eventSummary
                  .find(e => e.ev.id === selectedEvent.id)
                  ?.participants.map((p, idx) => (
                    <tr key={idx}>
                      <td className="border p-2">{p.name}</td>
                      <td className="border p-2">{p.department}</td>
                      <td className="border p-2">{p.position}</td>
                      <td className="border p-2">
                        {formatPeriod(p.event.start_date, p.event.end_date)}
                      </td>
                      <td className="border p-2 text-right">{p.amount.toLocaleString()} 원</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="text-right mt-4">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
