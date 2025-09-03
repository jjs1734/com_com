// src/pages/MyVacationPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { format } from "date-fns";

export default function MyVacationPage({ user }) {
  const [balance, setBalance] = useState(null);
  const [vacations, setVacations] = useState([]);

  // 남은 연차/보상휴가 불러오기
  const fetchBalance = async () => {
    const { data, error } = await supabase
      .from("leave_balance")
      .select("total_days, used_days, comp_days")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("연차 잔여 불러오기 오류:", error);
      return;
    }
    setBalance(data);
  };

  // 내 휴가 내역 불러오기
  const fetchVacations = async () => {
    const { data, error } = await supabase
      .from("vacations")
      .select("id, start_date, end_date, reason, status, vacation_types(name, code)")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("휴가 내역 불러오기 오류:", error);
      return;
    }
    setVacations(data || []);
  };

  useEffect(() => {
    if (user?.id) {
      fetchBalance();
      fetchVacations();
    }
  }, [user?.id]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">🌴 내 휴가</h1>

      {/* 잔여 연차 요약 */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg shadow border">
          <p className="text-sm text-gray-500">총 연차</p>
          <p className="text-xl font-semibold">{balance?.total_days ?? "-"} 일</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow border">
          <p className="text-sm text-gray-500">사용한 연차</p>
          <p className="text-xl font-semibold">{balance?.used_days ?? "-"} 일</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow border">
          <p className="text-sm text-gray-500">보상휴가</p>
          <p className="text-xl font-semibold">{balance?.comp_days ?? "-"} 일</p>
        </div>
      </div>

      {/* 휴가 내역 */}
      <div className="bg-white rounded-lg shadow border p-4">
        <h2 className="text-lg font-semibold mb-4">📋 휴가 내역</h2>
        {vacations.length === 0 ? (
          <p className="text-sm text-gray-500">휴가 내역이 없습니다.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">기간</th>
                <th className="p-2 border">종류</th>
                <th className="p-2 border">사유</th>
                <th className="p-2 border">상태</th>
              </tr>
            </thead>
            <tbody>
              {vacations.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="p-2 border">
                    {format(new Date(v.start_date), "yyyy-MM-dd")}
                    {v.start_date !== v.end_date &&
                      ` ~ ${format(new Date(v.end_date), "yyyy-MM-dd")}`}
                  </td>
                  <td className="p-2 border">{v.vacation_types?.name || "-"}</td>
                  <td className="p-2 border">{v.reason || "-"}</td>
                  <td className="p-2 border">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        v.status === "승인"
                          ? "bg-green-100 text-green-800"
                          : v.status === "대기"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
