// src/App.jsx
import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'
import NoticeWritePage from './pages/NoticeWritePage'

function App() {
  const [user, setUser] = useState(null)
  const [notices, setNotices] = useState([])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
  }

  const handleAddNotice = (newNotice) => {
    setNotices((prev) => [...prev, newNotice])
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage onLogin={handleLogin} />} />
        <Route
          path="/main"
          element={<MainPage user={user} notices={notices} onLogout={handleLogout} />}
        />
        <Route
          path="/notice/write"
          element={
            user ? (
              <NoticeWritePage user={user} onSubmitNotice={handleAddNotice} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App