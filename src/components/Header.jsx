// src/components/Header.jsx
import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const location = useLocation()

  const linkClass = (path) =>
    location.pathname === path
      ? 'font-semibold text-blue-600'
      : 'text-gray-600 hover:text-blue-500'

  return (
    <header className="flex justify-start items-center px-6 py-3 bg-white border-b shadow-sm">
      <nav className="flex gap-4">
        <Link to="/main" className={linkClass('/main')}>
          행사 조회
        </Link>
        <Link to="/directory" className={linkClass('/directory')}>
          직원 명부
        </Link>
        {/* ✅ 행사 업로드 메뉴 추가 */}
        <Link to="/events/new" className={linkClass('/events/new')}>
          행사 업로드
        </Link>
      </nav>
    </header>
  )
}
