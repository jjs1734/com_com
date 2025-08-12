// src/components/EventDetailModal.jsx
import { useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'

export default function EventDetailModal({ open, event, onClose, getDeptColor, status }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !event) return null

  // status가 함수가 아닐 가능성도 대비
  const tone = typeof status === 'function' ? status(event) : 'upcoming' // 'upcoming' | 'ongoing' | 'past'
  const colorClass =
    getDeptColor?.(event.department, tone === 'past', tone === 'ongoing') ??
    'bg-neutral-900 text-white'

  const fmt = (d) => {
    try { return format(parseISO(String(d)), 'yyyy.MM.dd') } catch { return String(d ?? '-') }
  }

  // ✅ host는 객체일 수 있으므로 안전하게 분해
  const hostName = event.host?.name ?? '-'
  const hostPos  = event.host?.position ?? ''
  const hostDept = event.host?.department ?? ''

  // 담당자 표기 조합 (예: 홍길동 (대리, 학회1팀))
  const hostLine = hostName === '-' ? '-' :
    `${hostName}${hostPos ? ` (${hostPos}${hostDept ? `, ${hostDept}` : ''})` : hostDept ? ` (${hostDept})` : ''}`

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      {/* 외곽 글로우(살짝 퍼지는 빛) */}
      <div className="relative w-full max-w-xl px-1">
        <div className="absolute -inset-1 rounded-3xl bg-[conic-gradient(at_30%_20%,#ffffff40,transparent_30%,#60a5fa40_60%,transparent_75%,#a78bfa40)] blur-xl opacity-70 pointer-events-none" />

        {/* 유리 카드 + 애니메이션 보더 */}
        <div className="relative rounded-3xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.35)] overflow-hidden">
          {/* 반짝이는 하이라이트(대각선 스윕) */}
          <div className="pointer-events-none absolute -top-1/2 -left-1/2 w-[200%] h-[200%] rotate-[-15deg] opacity-30">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent blur-2xl animate-[shine_3.2s_linear_infinite]" />
          </div>

          {/* 상단 칩 + 제목 */}
          <div className="relative px-6 py-5 border-b border-white/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ring-4 ring-white/50 ${colorClass.replace('text-white','')}`} />
                <h3 className="text-lg font-semibold text-gray-900 tracking-tight">
                  {event.event_name}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl px-2.5 py-1.5 text-gray-600 hover:bg-white/70 hover:text-gray-900 transition"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 본문 */}
          <div className="relative px-6 py-5 text-sm text-gray-800">
            {/* 유리 느낌의 내부 음영 */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/0 to-white/20 pointer-events-none" />

            <div className="relative grid grid-cols-3 gap-x-4 gap-y-3">
              <Label>기간</Label>
              <Value>{fmt(event.start_date)} ~ {fmt(event.end_date)}</Value>

              <Label>부서</Label>
              <Value>{event.department || '-'}</Value>

              <Label>담당자</Label>
              {/* ⬇️ 기존: {event.host} (객체라서 오류)
                  변경: 안전한 문자열 hostLine */}
              <Value>{hostLine}</Value>

              <Label>클라이언트</Label>
              <Value>{event.company_name || '-'}</Value>

              <Label>제품</Label>
              <Value>{event.product_name || '-'}</Value>

              <Label>지역/장소</Label>
              <Value>{event.region || '-'}{event.venue ? ` · ${event.venue}` : ''}</Value>
            </div>
          </div>

          {/* 푸터 버튼 */}
          <div className="relative px-6 pb-6 pt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 bg-white/80 hover:bg-white transition shadow-sm"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      {/* 애니메이션 키프레임 (shine) */}
      <style>{`
        @keyframes shine {
          0% { transform: translateX(-25%); opacity: .15; }
          45% { transform: translateX(25%); opacity: .35; }
          100% { transform: translateX(60%); opacity: .05; }
        }
      `}</style>
    </div>
  )
}

/* 소소한 UI 컴포넌트 */
function Label({ children }) {
  return <span className="text-gray-500">{children}</span>
}
function Value({ children }) {
  return <span className="col-span-2 font-medium text-gray-900">{children}</span>
}
