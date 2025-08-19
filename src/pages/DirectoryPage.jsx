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
  "대리", "주임", "사원", "인턴"
];

export default function DirectoryPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, department, position");

      if (error) {
        console.error("직원 목록 로딩 오류:", error);
        return;
      }

      // 정렬
      const sorted = [...data].sort((a, b) => {
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
  }, []);

  // 부서별로 그룹화
  const groupedByDept = users.reduce((acc, user) => {
    const dept = user.department || "기타";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(user);
    return acc;
  }, {});

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
                    className="p-4 bg-white rounded-lg shadow-sm border border-gray-200"
                  >
                    <p className="text-lg font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.position || "직급 없음"}</p>
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
