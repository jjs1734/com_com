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

  useEffect(() => {
    const fetchUsers = async () => {
      // 직원 기본 정보
      const { data: usersData, error } = await supabase
        .from("users")
        .select("id, name, department, position, profile_image");

      if (error) {
        console.error("직원 목록 로딩 오류:", error);
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

      // 정렬 + 상태 부여
      const sorted = [...usersData].map(u => {
        let status = "내부";
        if (hostIds.includes(u.id) || supportIds.includes(u.id)) {
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
  }, [today]);

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
                      ${user.status === "외근 중" 
                        ? "bg-yellow-50 border border-yellow-300" 
                        : "bg-white border border-gray-200"}
                    `}
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
                        {user.status === "외근 중" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">
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
