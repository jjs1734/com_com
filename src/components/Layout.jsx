// src/components/Layout.jsx
import { Link, useLocation } from 'react-router-dom'

export default function Layout({ user, onLogout, children }) {
  const location = useLocation()

  const navItems = [
    { label: '행사 조회', path: '/main' },
    { label: '직원 명부', path: '/directory' },
  ]

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-6 font-sans">
      {/* 상단 바 */}
      <header className="flex justify-between items-center mb-6">
        {/* 메뉴 */}
        <nav className="flex gap-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm px-4 py-2 rounded ${
                location.pathname === item.path
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 로그인 정보 */}
        <div className="p-4 border border-gray-200 rounded-lg bg-white">
          <p className="text-sm text-gray-800">
            사용자: <strong>{user?.name}</strong>
          </p>
          <p className="text-sm text-gray-800">
            직급: <strong>{user?.position || '미지정'}</strong>
          </p>
          <p className="text-sm text-gray-800">
            부서: <strong>{user?.department || '미지정'}</strong>
          </p>
          <button
            onClick={onLogout}
            className="mt-2 w-full text-sm bg-black text-white py-1.5 rounded hover:bg-gray-800"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 콘텐츠 */}
      <main>{children}</main>
    </div>
  )
}
