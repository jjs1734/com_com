// src/components/EventDetailModal.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { supabase } from '../supabaseClient'

export default function EventDetailModal({
  open,
  event,
  onClose,
  getDeptColor,
  status,
  onRefresh,
  showToast,
  user,          // ✅ 현재 로그인 사용자 정보
}) {
  const overlayRef = useRef(null)
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !event) return null

  const tone = typeof status === 'function' ? status(event) : 'upcoming'
  const colorClass =
    getDeptColor?.(event.department, tone === 'past', tone === 'ongoing') ??
    'bg-neutral-900 text-white'

  const fmt = (d) => {
    try {
      return format(parseISO(String(d)), 'yyyy.MM.dd')
    } catch {
      return String(d ?? '-')
    }
  }

  const hostLabel =
    event.host_name ??
    (typeof event.host === 'string' ? event.host : event.host?.name) ??
    '미지정'

  const hostPos = event.host?.position ?? ''
  const hostDept = event.host?.department ?? ''
  const hostLine =
    hostLabel === '미지정'
      ? '미지정'
      : `${hostLabel}${hostPos ? ` (${hostPos}${hostDept ? `, ${hostDept}` : ''})` : hostDept ? ` (${hostDept})` : ''}`

  // 👉 수정
  const handleEdit = () => {
    if (!event?.id) return
    if (!user?.is_admin) {
      showToast("권한이 없습니다. 관리자만 수정할 수 있습니다.", "error", 3000)
      return
    }
    navigate(`/events/${event.id}/edit`)
  }

  // 👉 삭제
  const handleDelete = async () => {
    if (!event?.id) return
    if (!user?.is_admin) {
      showToast("권한이 없습니다. 관리자만 삭제할 수 있습니다.", "error", 3000)
      return
    }
    if (!window.confirm('정말 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.')) return
    try {
      setDeleting(true)
      const { error } = await supabase.from('events').delete().eq('id', event.id)
      if (error) throw error
      if (typeof onRefresh === 'function') await onRefresh()
      onClose?.()
      showToast("삭제되었습니다.", "success")
    } catch (e) {
      console.error(e)
      showToast(e.message || "삭제 중 오류가 발생했습니다.", "error", 3000)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl px-1">
        <div className="absolute -inset-1 rounded-3xl bg-[conic-gradient(at_30%_20%,#ffffff40,transparent_30%,#60a5fa40_60%,transparent_75%,#a78bfa40)] blur-xl opacity-70 pointer-events-none" />

        <div className="relative rounded-3xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.35)] overflow-hidden">
          {/* 헤더 */}
          <div className="relative px-6 py-5 border-b border-white/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ring-4 ring-white/50 ${colorClass.replace(
                    'text-white',
                    ''
                  )}`}
                />
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
            <div className="relative grid grid-cols-3 gap-x-4 gap-y-3">
              <Label>기간</Label>
              <Value>
                {fmt(event.start_date)} ~ {fmt(event.end_date)}
              </Value>

              <Label>부서</Label>
              <Value>{event.department || '미지정'}</Value>

              <Label>담당자</Label>
              <Value>{hostLine}</Value>

              <Label>클라이언트</Label>
              <Value>{event.company_name || '미지정'}</Value>

              <Label>제품</Label>
              <Value>{event.product_name || '미지정'}</Value>

              <Label>지역/장소</Label>
              <Value>
                {event.region || '미지정'}
                {event.venue ? ` · ${event.venue}` : ''}
              </Value>
            </div>
          </div>

          {/* 푸터 */}
          <div className="relative px-6 pb-6 pt-2 flex items-center justify-between border-t">
            <div className="flex gap-2">
              {user?.is_admin && (   /* ✅ 관리자만 버튼 표시 */
                <>
                  <button
                    onClick={handleEdit}
                    disabled={!event?.id}
                    className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white/80 hover:bg-white text-sm
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    수정
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || !event?.id}
                    className="px-3 py-1.5 rounded-xl border text-sm text-red-600 border-red-300 hover:bg-red-50
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-busy={deleting ? 'true' : 'false'}
                  >
                    {deleting ? '삭제 중...' : '삭제'}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-black text-white text-sm hover:bg-gray-800"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ children }) {
  return <span className="text-gray-500">{children}</span>
}
function Value({ children }) {
  return <span className="col-span-2 font-medium text-gray-900">{children}</span>
}
