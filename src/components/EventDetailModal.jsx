import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, eachDayOfInterval, isSameDay, min, max } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "../supabaseClient";

export default function EventDetailModal({
  open,
  event,
  onClose,
  getDeptColor,
  status,
  onRefresh,
  showToast,
  user,
}) {
  const overlayRef = useRef(null);
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [supports, setSupports] = useState([]);

  useEffect(() => {
    if (!open || !event?.id) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);

    fetchSupports();

    return () => window.removeEventListener("keydown", onKey);
  }, [open, event?.id]);

  const fetchSupports = async () => {
    try {
      const { data, error } = await supabase
        .from("event_supports")
        .select("support_date, users ( id, name, department, position )")
        .eq("event_id", event.id)
        .order("support_date", { ascending: true });

      if (error) throw error;
      setSupports(data || []);
    } catch (err) {
      console.error(err);
      showToast("지원 인력 불러오기 오류", "error", 3000);
    }
  };

  if (!open || !event) return null;

  const tone = typeof status === "function" ? status(event) : "upcoming";
  const colorClass =
    getDeptColor?.(event.department, tone === "past", tone === "ongoing") ??
    "bg-neutral-900 text-white";

  const fmt = (d) => {
    try {
      return format(parseISO(String(d)), "yyyy.MM.dd");
    } catch {
      return String(d ?? "-");
    }
  };

  const fmtWithDay = (d) => {
    try {
      return format(parseISO(String(d)), "MM.dd(EEE)", { locale: ko });
    } catch {
      return String(d ?? "-");
    }
  };

  const hostLabel =
    event.host_name ??
    (typeof event.host === "string" ? event.host : event.host?.name) ??
    "-";

  const hostPos = event.host?.position ?? "";
  const hostDept = event.host?.department ?? "";
  const hostLine =
    hostLabel === "-"
      ? "-"
      : `${hostLabel}${
          hostPos ? ` (${hostPos}${hostDept ? `, ${hostDept}` : ""})` : hostDept ? ` (${hostDept})` : ""
        }`;

  // 직급 우선순위
  const positionOrder = [
    "대표이사",
    "이사",
    "부장",
    "차장",
    "과장",
    "대리",
    "사원",
  ];

  const sortByPositionAndName = (arr) => {
    return [...arr].sort((a, b) => {
      const aIdx = positionOrder.indexOf(a.users?.position || "");
      const bIdx = positionOrder.indexOf(b.users?.position || "");
      if (aIdx !== bIdx) return aIdx - bIdx;
      return (a.users?.name || "").localeCompare(b.users?.name || "", "ko");
    });
  };

  // 지원 인력 표시
  const renderSupports = () => {
    if (!supports.length) return <p className="text-sm text-gray-500">지원 인력 없음</p>;

    const start = parseISO(event.start_date);
    const end = parseISO(event.end_date);
    const eventDays = eachDayOfInterval({ start, end });

    // 전체 기간 지원자와 날짜별 그룹 분리
    const fullRangeSupports = [];
    const dailyGroups = {}; // 날짜별 그룹

    supports.forEach((s) => {
      const d = parseISO(s.support_date);
      const dayKey = format(d, "yyyy-MM-dd");
      const userId = s.users?.id;
      if (!userId) return;

      // 유저가 전체 기간 지원자인지 확인
      const userDates = supports
        .filter((x) => x.users?.id === userId)
        .map((x) => parseISO(x.support_date).getTime());

      const userMin = min(userDates.map((t) => new Date(t)));
      const userMax = max(userDates.map((t) => new Date(t)));

      const coversAll =
        isSameDay(userMin, start) &&
        isSameDay(userMax, end) &&
        eventDays.every((d) => userDates.includes(d.getTime()));

      if (coversAll) {
        if (!fullRangeSupports.find((u) => u.users?.id === userId)) {
          fullRangeSupports.push(s);
        }
      } else {
        if (!dailyGroups[dayKey]) dailyGroups[dayKey] = [];
        if (!dailyGroups[dayKey].find((u) => u.users?.id === userId)) {
          dailyGroups[dayKey].push(s);
        }
      }
    });

    return (
      <div className="space-y-3">
        {/* 전체 기간 지원자 */}
        {fullRangeSupports.length > 0 && (
          <ul className="text-sm">
            {sortByPositionAndName(fullRangeSupports).map((s, idx) => {
              const u = s.users;
              return (
                <li key={`full-${idx}`} className="text-gray-700">
                  {u?.name || "-"} {u?.position ? `(${u.position})` : ""}{" "}
                  {u?.department ? `[${u.department}]` : ""}
                </li>
              );
            })}
          </ul>
        )}

        {/* 날짜별 부분 지원자 */}
        {Object.keys(dailyGroups)
          .sort((a, b) => new Date(a) - new Date(b))
          .map((day, gi) => (
            <div key={gi}>
              <div className="font-semibold mt-2 mb-1 text-gray-900">
                {fmtWithDay(day)}
              </div>
              <ul className="text-sm">
                {sortByPositionAndName(dailyGroups[day]).map((s, idx) => {
                  const u = s.users;
                  return (
                    <li key={`partial-${gi}-${idx}`} className="text-gray-700">
                      {u?.name || "-"} {u?.position ? `(${u.position})` : ""}{" "}
                      {u?.department ? `[${u.department}]` : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </div>
    );
  };

  // 수정
  const handleEdit = () => {
    if (!event?.id) return;
    if (!user?.is_admin) {
      showToast("권한이 없습니다. 관리자만 수정할 수 있습니다.", "error", 3000);
      return;
    }
    navigate(`/events/${event.id}/edit`);
  };

  // 삭제
  const handleDelete = async () => {
    if (!event?.id) return;
    if (!user?.is_admin) {
      showToast("권한이 없습니다. 관리자만 삭제할 수 있습니다.", "error", 3000);
      return;
    }
    if (!window.confirm("정말 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.")) return;
    try {
      setDeleting(true);
      const { error } = await supabase.from("events").delete().eq("id", event.id);
      if (error) throw error;
      if (typeof onRefresh === "function") await onRefresh();
      onClose?.();
      showToast("삭제되었습니다.", "success");
    } catch (e) {
      console.error(e);
      showToast(e.message || "삭제 중 오류가 발생했습니다.", "error", 3000);
    } finally {
      setDeleting(false);
    }
  };

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
                    "text-white",
                    ""
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
              <Value>{event.department || "-"}</Value>

              <Label>담당자</Label>
              <Value>{hostLine}</Value>

              <Label>클라이언트</Label>
              <Value>{event.company_name || "-"}</Value>

              <Label>제품</Label>
              <Value>{event.product_name || "-"}</Value>

              <Label>지역/장소</Label>
              <Value>
                {event.region || "-"}
                {event.venue ? ` · ${event.venue}` : ""}
              </Value>
            </div>

            {/* 지원 인력 */}
            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 mb-2">지원 인력</h4>
              {renderSupports()}
            </div>
          </div>

          {/* 푸터 */}
          <div className="relative px-6 pb-6 pt-2 flex items-center justify-between border-t">
            <div className="flex gap-2">
              {user?.is_admin && (
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
                    aria-busy={deleting ? "true" : "false"}
                  >
                    {deleting ? "삭제 중..." : "삭제"}
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
  );
}

function Label({ children }) {
  return <span className="text-gray-500">{children}</span>;
}
function Value({ children }) {
  return <span className="col-span-2 font-medium text-gray-900">{children}</span>;
}
