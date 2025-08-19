// src/pages/DirectoryPage.jsx
import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function DirectoryPage() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, department, position")
        .order("department", { ascending: true })

      if (error) {
        console.error("사용자 목록 불러오기 실패:", error)
      } else {
        setUsers(data)
      }
    }

    fetchUsers()
  }, [])

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-4 text-gray-800">📋 직원 명부</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-2 border-b">이름</th>
              <th className="px-4 py-2 border-b">직급</th>
              <th className="px-4 py-2 border-b">부서</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-4 py-4 text-center text-gray-500">직원 정보를 불러오는 중이거나 없습니다.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{u.name}</td>
                  <td className="px-4 py-2 border-b">{u.position || "미지정"}</td>
                  <td className="px-4 py-2 border-b">{u.department || "미지정"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
