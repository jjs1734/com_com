// src/pages/VacationAdminPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { format } from "date-fns";

export default function VacationAdminPage({ user }) {
  const [balances, setBalances] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [types, setTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [holidays, setHolidays] = useState([]); // ✅ 공휴일 목록

  const [form, setForm] = useState({
    user_id: "",
    type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [singleDay, setSingleDay] = useState(false); // ✅ 하루만 체크박스 상태

  // 보상휴가 부여 폼
  const [compForm, setCompForm] = useState({ user_id: "", days: "" });

  // 검색 상태
  const [searchName, setSearchName] = useState("");
  const [searchDept, setSearchDept] = useState("");

  // 페이징 상태
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [vacPage, setVacPage] = useState(1);
  const vacPageSize = 10;

  useEffect(() => {
    fetchBalances();
    fetchVacations();
    fetchTypes();
    fetchEmployees();
    fetchHolidays(); // ✅ 공휴일 로드
  }, []);

  const fetchBalances = async () => {
    const { data, error } = await supabase
      .from("leave_balance")
      .select("user_id, total_days, used_days, comp_days, users(name, department, position)")
      .order("user_id");
    if (!error) setBalances(data || []);
  };

  const fetchVacations = async () => {
    const { data, error } = await supabase
      .from("vacations")
      .select(
        "id, user_id, start_date, end_date, reason, status, vacation_types(id, name, code, deduct, category), users(name, department)"
      )
      .order("start_date", { ascending: false });
    if (!error) setVacations(data || []);
  };

  const fetchTypes = async () => {
    const { data, error } = await supabase.from("vacation_types").select("id, name, code, deduct, category");
    if (!error) setTypes(data || []);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase.from("users").select("id, name, department, position").order("department");
    if (!error) setEmployees(data || []);
  };

  const fetchHolidays = async () => {
    const { data, error } = await supabase.from("holidays").select("date");
    if (!error) {
      setHolidays(data.map((h) => h.date)); // [ "2025-01-01", "2025-05-05", ... ]
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ✅ 주말+공휴일 제외 계산 함수
  const calculateDays = (start, end, holidays = []) => {
    let days = 0;
    let current = new Date(start);
    const last = new Date(end);

    while (current <= last) {
      const day = current.getDay(); // 0=일, 6=토
      const dateStr = current.toISOString().split("T")[0];
      const isHoliday = holidays.includes(dateStr);

      if (day !== 0 && day !== 6 && !isHoliday) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  // ✅ 휴가 종류 자동 반영 (연차/반차 → 하루짜리 기본 세팅)
  useEffect(() => {
    const type = types.find((t) => t.id === Number(form.type_id));
    if (type && form.start_date) {
      if (type.code === "half_am" || type.code === "half_pm" || type.code === "annual") {
        setForm((prev) => ({ ...prev, end_date: prev.start_date }));
        setSingleDay(true); // 자동으로 하루만 체크
      }
    }
  }, [form.type_id, form.start_date, types]);

  // 휴가 등록
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedEmp = employees.find((emp) => emp.name === form.user_id);
      if (!selectedEmp) return alert("직원을 올바르게 선택해주세요 ❌");

      const selectedType = types.find((t) => t.id === Number(form.type_id));
      let days = 0;

      if (selectedType?.deduct && (selectedType.category === "personal" || selectedType.category === "company")) {
        if (selectedType.code === "half_am" || selectedType.code === "half_pm") {
          days = 0.5;
        } else {
          days = calculateDays(form.start_date, form.end_date, holidays);
        }
      }

      const { error } = await supabase.from("vacations").insert([
        {
          user_id: selectedEmp.id,
          type_id: Number(form.type_id),
          start_date: form.start_date,
          end_date: form.end_date,
          reason: form.reason,
          status: "승인",
        },
      ]);
      if (error) throw error;

      if (days > 0) {
        const { error: updateError } = await supabase.rpc("increment_used_days", {
          p_user_id: selectedEmp.id,
          p_days: days,
        });
        if (updateError) throw updateError;
      }

      alert("휴가가 등록되었습니다 ✅");
      setForm({ user_id: "", type_id: "", start_date: "", end_date: "", reason: "" });
      setSingleDay(false);
      fetchVacations();
      fetchBalances();
    } catch (err) {
      console.error("휴가 등록 오류:", err);
      alert("휴가 등록에 실패했습니다 ❌");
    }
  };

  // 보상휴가 부여
  const handleGrantComp = async (e) => {
    e.preventDefault();
    try {
      const selectedEmp = employees.find((emp) => emp.name === compForm.user_id);
      if (!selectedEmp) return alert("직원을 올바르게 선택해주세요 ❌");

      const { error } = await supabase.rpc("grant_comp_days", {
        p_user_id: selectedEmp.id,
        p_days: parseFloat(compForm.days),
      });

      if (error) throw error;

      alert("보상휴가가 부여되었습니다 ✅");
      setCompForm({ user_id: "", days: "" });
      fetchBalances();
    } catch (err) {
      console.error("보상휴가 부여 오류:", err);
      alert("보상휴가 부여 실패 ❌");
    }
  };

  // 검색 적용
  const filteredBalances = balances.filter((b) => {
    const nameMatch = b.users?.name?.includes(searchName);
    const deptMatch = searchDept ? b.users?.department === searchDept : true;
    return nameMatch && deptMatch;
  });

  const totalPages = Math.ceil(filteredBalances.length / pageSize);
  const pagedBalances = filteredBalances.slice((page - 1) * pageSize, page * pageSize);
  const totalVacPages = Math.ceil(vacations.length / vacPageSize);
  const pagedVacations = vacations.slice((vacPage - 1) * vacPageSize, vacPage * vacPageSize);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">🛠️ 휴가 관리 (관리자)</h1>

      {/* 직원별 연차 잔여 */}
      <div className="mb-8 bg-white rounded-lg shadow border p-4 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-3">📊 직원별 연차 잔여</h2>
        <table className="w-full text-sm border-collapse table-fixed">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border w-[120px]">이름</th>
              <th className="p-2 border w-[150px]">부서</th>
              <th className="p-2 border w-[120px]">직급</th>
              <th className="p-2 border w-[100px]">총 연차</th>
              <th className="p-2 border w-[100px]">보상휴가</th>
              <th className="p-2 border w-[100px]">사용</th>
              <th className="p-2 border w-[100px]">남은 연차</th>
            </tr>
          </thead>
          <tbody>
            {pagedBalances.map((b) => (
              <tr key={b.user_id} className="hover:bg-gray-50">
                <td className="p-2 border">{b.users?.name}</td>
                <td className="p-2 border">{b.users?.department}</td>
                <td className="p-2 border">{b.users?.position}</td>
                <td className="p-2 border">{b.total_days}</td>
                <td className="p-2 border">{b.comp_days}</td>
                <td className="p-2 border">{b.used_days}</td>
                <td className="p-2 border">{b.total_days + b.comp_days - b.used_days}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 페이징 버튼 */}
        <div className="flex justify-center mt-4 gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded ${page === i + 1 ? "bg-blue-500 text-white" : "bg-gray-100"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* 보상휴가 부여 */}
      <div className="mb-8 bg-white rounded-lg shadow border p-4">
        <h2 className="text-xl font-semibold mb-3">🎁 보상휴가 부여</h2>
        <form onSubmit={handleGrantComp} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                list="employee-list"
                name="user_id"
                value={compForm.user_id}
                onChange={(e) => setCompForm({ ...compForm, user_id: e.target.value })}
                placeholder="직원 선택 또는 검색"
                className="border rounded p-2 w-full"
                required
              />
              <datalist id="employee-list">
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </datalist>
            </div>
            <input
              type="number"
              name="days"
              value={compForm.days}
              onChange={(e) => setCompForm({ ...compForm, days: e.target.value })}
              placeholder="보상휴가 일수"
              className="border rounded p-2"
              required
              min="0.5"
              step="0.5"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            부여
          </button>
        </form>
      </div>

      {/* 휴가 등록 */}
      <div className="mb-8 bg-white rounded-lg shadow border p-4">
        <h2 className="text-xl font-semibold mb-3">➕ 휴가 등록</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                list="employee-list"
                name="user_id"
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                placeholder="직원 선택 또는 검색"
                className="border rounded p-2 w-full"
                required
              />
              <datalist id="employee-list">
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </datalist>
            </div>

            <select
              name="type_id"
              value={form.type_id}
              onChange={handleChange}
              required
              className="border rounded p-2"
            >
              <option value="">휴가 종류 선택</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={(e) => {
                const { value } = e.target;
                setForm((prev) => ({
                  ...prev,
                  start_date: value,
                  end_date: singleDay ? value : prev.end_date,
                }));
              }}
              required
              className="border rounded p-2"
            />
            <input
              type="date"
              name="end_date"
              value={form.end_date}
              onChange={handleChange}
              required
              className="border rounded p-2"
              disabled={singleDay}
            />
          </div>

          {/* ✅ 하루만 체크박스 */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={singleDay}
              onChange={(e) => {
                setSingleDay(e.target.checked);
                if (e.target.checked && form.start_date) {
                  setForm((prev) => ({ ...prev, end_date: prev.start_date }));
                }
              }}
            />
            하루만
          </label>

          <textarea
            name="reason"
            value={form.reason}
            onChange={handleChange}
            placeholder="사유 (선택)"
            className="border rounded p-2 w-full"
          />

          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            등록
          </button>
        </form>
      </div>

      {/* 최근 휴가 내역 */}
      <div className="bg-white rounded-lg shadow border p-4">
        <h2 className="text-xl font-semibold mb-3">📋 최근 휴가 내역</h2>
        {pagedVacations.length === 0 ? (
          <p className="text-sm text-gray-500">휴가 내역이 없습니다.</p>
        ) : (
          <>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">직원</th>
                  <th className="p-2 border">부서</th>
                  <th className="p-2 border">기간</th>
                  <th className="p-2 border">종류</th>
                  <th className="p-2 border">사유</th>
                  <th className="p-2 border">상태</th>
                </tr>
              </thead>
              <tbody>
                {pagedVacations.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="p-2 border">{v.users?.name}</td>
                    <td className="p-2 border">{v.users?.department}</td>
                    <td className="p-2 border">
                      {format(new Date(v.start_date), "yyyy-MM-dd")}
                      {v.start_date !== v.end_date &&
                        ` ~ ${format(new Date(v.end_date), "yyyy-MM-dd")}`}
                    </td>
                    <td className="p-2 border">{v.vacation_types?.name}</td>
                    <td className="p-2 border">{v.reason || "-"}</td>
                    <td className="p-2 border">{v.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 페이징 버튼 */}
            <div className="flex justify-center mt-4 gap-2">
              {Array.from({ length: totalVacPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setVacPage(i + 1)}
                  className={`px-3 py-1 rounded ${
                    vacPage === i + 1 ? "bg-blue-500 text-white" : "bg-gray-100"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
