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
      <div className="grid grid-cols-4 gap-6">
        {/* 좌측 3칸 (콘텐츠 영역) */}
        <div className="col-span-3">
          {/* 상단 메뉴 */}
          <header className="flex gap-4 mb-6">
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
          </header>

          {/* 페이지별 콘텐츠 */}
          <main>{children}</main>
        </div>

        {/* 우측 로그인 정보 */}
        <div className="col-span-1 p-4 border border-gray-200 rounded-lg bg-white h-fit">
          <h2 className="text-lg font-medium text-gray-900 mb-2">🙋‍♂️ 로그인 정보</h2>
          <p className="text-sm text-gray-700">
            사용자: <strong>{user?.name}</strong>
          </p>
          <p className="text-sm text-gray-700">
            직급: <strong>{user?.position || "미지정"}</strong>
          </p>
          <p className="text-sm text-gray-700 mb-4">
            부서: <strong>{user?.department || "미지정"}</strong>
          </p>
          <button
            onClick={onLogout}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}
