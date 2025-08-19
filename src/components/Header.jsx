// src/components/Header.jsx
import { Link, useLocation } from 'react-router-dom'

export default function Header({ user }) {
  const location = useLocation()

  return (
    <header className="flex justify-between items-center px-6 py-3 bg-white border-b shadow-sm">
      <nav className="flex gap-4">
        <Link to="/main" className={location.pathname === '/main' ? 'font-semibold text-blue-600' : 'text-gray-600 hover:text-blue-500'}>
          행사 조회
        </Link>
        <Link to="/directory" className={location.pathname === '/directory' ? 'font-semibold text-blue-600' : 'text-gray-600 hover:text-blue-500'}>
          직원 명부
        </Link>
      </nav>
      <div className="text-sm text-gray-700">
        {user?.name} ({user?.position}) - {user?.department}
      </div>
    </header>
  )
}
