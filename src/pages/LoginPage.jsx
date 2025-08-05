import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function LoginPage({ onLogin }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()

    if (!name || !password) {
      setError('이름과 비밀번호를 모두 입력해주세요.')
      return
    }

    // 로그인 검증
    if (name === 'admin' && password === '1234') {
      const userInfo = {
        name,
        department: '관리부', // 필요에 따라 동적으로 입력도 가능
      }
      onLogin(userInfo) // ✅ App.jsx의 setUser로 전달
      navigate('/notice')
    } else {
      setError('로그인 정보가 올바르지 않습니다.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-pink-100 p-4">
      <form onSubmit={handleLogin} className="bg-white/30 backdrop-blur-md border border-white/20 p-10 rounded-2xl shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">🔐 3nnoN 로그인</h1>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block text-gray-700 mb-1">이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="이름을 입력하세요"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-1">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="비밀번호를 입력하세요"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
        >
          로그인
        </button>
      </form>
    </div>
  )
}

export default LoginPage
