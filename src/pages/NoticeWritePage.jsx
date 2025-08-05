// src/pages/NoticeWritePage.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function NoticeWritePage({ user, onSubmitNotice }) {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)

  // 로그인 여부 확인
  useEffect(() => {
    if (!user || !user.name) {
      alert('로그인 후 작성 가능합니다.')
      navigate('/')
    }
  }, [user, navigate])

  const handleSubmit = (e) => {
    e.preventDefault()

    const newNotice = {
      id: Date.now(),
      title,
      content,
      file,
      author: `${user.name} (${user.department})`,
      views: 0,
    }

    onSubmitNotice(newNotice)
    navigate('/notice')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center items-start">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow max-w-xl w-full space-y-4"
      >
        <h2 className="text-xl font-bold">📄 공지 작성</h2>

        <input
          type="text"
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />

        <textarea
          placeholder="내용을 입력하세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows="6"
          required
          className="w-full border p-2 rounded"
        />

        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full"
        />

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
        >
          등록하기
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-full bg-gray-300 text-black py-2 rounded hover:bg-gray-400 transition"
        >
          ← 뒤로가기
        </button>
      </form>
    </div>
  )
}

export default NoticeWritePage
