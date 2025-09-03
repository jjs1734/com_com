// src/pages/DirectoryPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// 원하는 부서 정렬 순서
const DEPARTMENT_ORDER = [
  "대표이사", "관리부", "MK팀", "제약 1팀", "제약 2팀",
  "학회 1팀", "학회 2팀", "디지털마케팅팀", "디자인팀"
];

// 직급 정렬 우선순위 (높을수록 상위)
const POSITION_ORDER = [
  "대표이사", "이사", "부장", "차장", "과장",
  "대리", "사원"
];

export default function DirectoryPage() {
  const [users, setUsers] = useState([]);
  const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
  const nowHour = new Date().getHours(); // 현재 시각 (시 단위)

  useEffect(() => {
    const fetchUsers = async () => {
      // 직원 기본 정보
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, department, position, profile_image");

      if (usersError) {
        console.error("직원 목록 로딩 오류:", usersError);
        return;
      }

      // 오늘 진행 중 행사 (host 기준)
      const { data: hostEvents } = await supabase
        .from("events")
        .select("id, host_id, start_date, end_date")
        .lte("start_date", today)
        .gte("end_date", today);

      // 오늘 지원 중 행사
      const { data: supportEvents } = await supabase
        .from("event_supports")
        .select("user_id, support_date")
        .eq("support_date", today);

      const hostIds = hostEvents?.map(e => e.host_id) || [];
      const supportIds = supportEvents?.map(e => e.user_id) || [];

      // 오늘 휴가 정보 (vacations + vacation_types 조인)
      const { data: todayVacations, error: vacError } = await supabase
        .from("vacations")
        .select("user_id, vacation_types(name, code, start_time, end_time)")
        .lte("start_date", today)
        .gte("end_date", today)
        .eq("status", "승인");

      if (vacError) {
        console.error("휴가 조회 오류:", vacError);
      }

      // user_id → 휴가 상태 매핑
      const vacationMap = {};
      (todayVacations || []).forEach(v => {
        const vac = v.vacation_types;
        if (!vac) return;

        let status = vac.name;

        // 반차일 경우 start_time ~ end_time 시간대만 반영
        if (vac.code === "half_am" || vac.code === "half_pm") {
          const startHour = parseInt(vac.start_time?.split(":")[0], 10);
          const endHour = parseInt(vac.end_time?.split(":")[0], 10);

          if (nowHour >= startHour && nowHour < endHour) {
            status = vac.name; // "오전 반차" / "오후 반차"
          } else {
            status = "내부";
          }
        }

        vacationMap[v.user_id] = status;
      });

      // 정렬 + 상태 부여
      const sorted = [...usersData].map(u => {
        let status = "내부";

        // 1. 휴가 우선
        if (vacationMap[u.id]) {
          status = vacationMap[u.id];
        }

        // 2. 행사 참여 (외근) → 휴가가 없을 때만 반영
        if (status === "내부" && (hostIds.includes(u.id) || supportIds.includes(u.id))) {
          status = "외근 중";
        }

        return { ...u, status };
      }).sort((a, b) => {
        const deptA = DEPARTMENT_ORDER.indexOf(a.department);
        const deptB = DEPARTMENT_ORDER.indexOf(b.department);
        if (deptA !== deptB) return deptA - deptB;

        const posA = POSITION_ORDER.indexOf(a.position || "");
        const posB = POSITION_ORDER.indexOf(b.position || "");
        return posA - posB;
      });

      setUsers(sorted);
    };

    fetchUsers();
  }, [today, nowHour]);

  // 부서별로 그룹화
  const groupedByDept = users.reduce((acc, user) => {
    const dept = user.department || "기타";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(user);
    return acc;
  }, {});

  // ✅ 프로필 이미지 URL 가져오기
  const getProfileUrl = (path) => {
    if (!path) {
      return supabase.storage.from("profile-images").getPublicUrl("default-avatar.png").data.publicUrl;
    }
    return supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl;
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case "외근 중": return "bg-yellow-200 text-yellow-800";
      case "연차": return "bg-red-200 text-red-800";
      case "월차": return "bg-orange-200 text-orange-800";
      case "오전 반차": return "bg-blue-200 text-blue-800";
      case "오후 반차": return "bg-indigo-200 text-indigo-800";
      case "육아휴직": return "bg-pink-200 text-pink-800";
      case "경조사 휴가": return "bg-purple-200 text-purple-800";
      case "기타 휴가": return "bg-gray-200 text-gray-800";
      case "회사 지정 연차": return "bg-green-200 text-green-800";
      case "보상휴가": return "bg-teal-200 text-teal-800";
      default: return "bg-white text-gray-600";
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">📒 직원 명부</h1>

      <div className="space-y-6">
        {DEPARTMENT_ORDER.map((dept) => {
          const members = groupedByDept[dept];
          if (!members || members.length === 0) return null;

          return (
            <section key={dept}>
              <h2 className="text-xl font-semibold mb-3 text-gray-700">{dept}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {members.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 rounded-lg shadow-sm flex items-center gap-4
                      ${user.status !== "내부"
                        ? "border-2 " + getStatusColor(user.status).split(" ")[0]
                        : "bg-white border border-gray-200"}`}
                  >
                    <img
                      src={getProfileUrl(user.profile_image)}
                      alt="프로필"
                      className="w-16 h-20 rounded-md object-cover border"
                    />
                    <div className="flex flex-col items-start">
                      <p className="text-lg font-medium text-gray-900">{user.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">{user.position || "직급 없음"}</p>
                        {user.status !== "내부" && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(user.status)}`}>
                            {user.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
