import React from "react"

export default function AllEventsModal({
  open,
  date,
  events,
  onClose,
  onSelectEvent,
  getDeptColor,
  status,
  showToast,   // ✅ 전역 토스트 (EventDetailModal로 이어질 수 있도록)
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-[400px] max-h-[80vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">📅 {date}의 모든 행사</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">닫기</button>
        </div>

        {/* 본문 */}
        <ul className="p-4 space-y-2">
          {events.map((e) => {
            const st = status(e)
            const cls = getDeptColor
              ? getDeptColor(e.department, st === "past", st === "ongoing")
              : "bg-gray-600 text-white"

            return (
              <li
                key={e.id}
                className={`px-3 py-2 rounded cursor-pointer text-sm ${cls} hover:opacity-90`}
                onClick={() => {
                  // 👉 선택 이벤트 전달
                  onSelectEvent(e)
                  // 👉 토스트도 필요하다면 여기서 바로 띄울 수 있음
                  // showToast?.(`${e.event_name} 상세 보기`, "success", 1200)
                }}
              >
                {e.event_name}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
