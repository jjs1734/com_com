// src/pages/TestPage.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function TestPage() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('*')
      if (error) {
        console.error('❌ Supabase 연결 실패:', error.message)
      } else {
        console.log('✅ Supabase 연결 성공! 사용자 목록:', data)
        setUsers(data)
      }
    }

    fetchUsers()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow space-y-4">
        <h1 className="text-2xl font-bold">🧪 Supabase 테스트</h1>
        {users.length > 0 ? (
          <ul className="list-disc pl-5 space-y-2">
            {users.map((user, index) => (
              <li key={index}>
                <p>🧑‍💻 이름: {user.name}</p>
                <p>🔐 비밀번호: {user.password}</p>
                <p>🏢 부서: {user.department}</p>
                <hr className="my-2" />
              </li>
            ))}
          </ul>
        ) : (
          <p>📭 사용자 데이터가 없습니다. Supabase에 입력된 값이 있는지 확인해주세요.</p>
        )}
      </div>
    </div>
  )
}

export default TestPage
