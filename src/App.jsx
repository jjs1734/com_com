// App.jsx
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import NoticePage from './pages/NoticePage'
import NoticeWritePage from './pages/NoticeWritePage'

function App() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user')
    return storedUser ? JSON.parse(storedUser) : null
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  const [notices, setNotices] = useState([])

  const handleLogin = (loginUser) => {
    setUser(loginUser)
  }

  const handleLogout = () => {
    setUser(null)
  }

  const handleAddNotice = (newNotice) => {
    setNotices([newNotice, ...notices])
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage onLogin={handleLogin} />} />
        <Route
          path="/notice"
          element={<NoticePage user={user} notices={notices} onLogout={handleLogout} />}
        />
        <Route
          path="/notice/write"
          element={<NoticeWritePage user={user} onSubmitNotice={handleAddNotice} />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
