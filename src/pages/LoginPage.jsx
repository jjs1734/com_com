// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError('아이디와 비밀번호를 모두 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      // 🔐 Supabase RPC 로그인 검증
      const { data, error } = await supabase.rpc('login_user', {
        p_username: username,
        p_password: password,
      })

      if (error) {
        console.error(error)
        setError('로그인 중 오류가 발생했습니다.')
        return
      }

      if (!data || data.length === 0) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      const user = data[0]
      onLogin({
        id: user.id,
        username: user.username,
        name: user.name,
        department: user.department,
        position: user.position,
      })

      navigate('/main')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-pink-100 p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white/30 backdrop-blur-md border border-white/20 p-10 rounded-2xl shadow-xl max-w-md w-full"
      >
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">🔐 사내 커뮤니티 로그인</h1>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block text-gray-700 mb-1">아이디</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="아이디(username)를 입력하세요"
            autoComplete="username"
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
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}

export default LoginPage
