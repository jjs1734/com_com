// src/components/Layout.jsx
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { format, parseISO } from "date-fns";
import EventDetailModal from "./EventDetailModal";
import ChangePasswordModal from "./ChangePasswordModal";
import MiniChat from "./MiniChat";

export default function Layout({
  user,
  setUser,
  onLogout,
  children,
  sessionRemainingSec,
  onExtendSession,
  showToast,
  setMiniChatHandler, // ✅ App.jsx에서 전달받음
}) {
  const location = useLocation();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [hostEventsPlanned, setHostEventsPlanned] = useState([]);
  const [supportEventsPlanned, setSupportEventsPlanned] = useState([]);
  const [hostEventsDone, setHostEventsDone] = useState([]);
  const [supportEventsDone, setSupportEventsDone] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [tab, setTab] = useState("planned");
  const [doneStart, setDoneStart] = useState(null);
  const [doneEnd, setDoneEnd] = useState(null);

  const [pwModalOpen, setPwModalOpen] = useState(false);

  // 프로필
  const [profileUrl, setProfileUrl] = useState("");
  const fileInputRef = useRef(null);

  // ✅ MiniChat 여러 개
  const [miniChatPartners, setMiniChatPartners] = useState([]);

  // ✅ 메시지 관련
  const [unreadCounts, setUnreadCounts] = useState({}); // { partnerId: count }

  // ✅ MiniChat 열기/닫기
  const openMiniChat = (partner) => {
    setMiniChatPartners((prev) => {
      if (prev.find((p) => p.id === partner.id)) return prev; // 중복 방지
      return [...prev, partner];
    });
  };
  const closeMiniChat = (partnerId) => {
    setMiniChatPartners((prev) => prev.filter((p) => p.id !== partnerId));
  };

  // ✅ App에서 핸들러 등록
  useEffect(() => {
    if (setMiniChatHandler) {
      setMiniChatHandler(() => openMiniChat);
    }
  }, [setMiniChatHandler]);

  // ✅ 세션 남은 시간
  const fmt = (sec) => {
    if (sec == null) return "-";
    const s = Math.max(0, sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(ss)}`;
  };
  const danger = sessionRemainingSec != null && sessionRemainingSec <= 600;

  const ASIDE_W = 320;

  // ✅ 프로필 이미지 불러오기
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.profile_image) {
        const { data } = supabase.storage.from("profile-images").getPublicUrl("default-avatar.png");
        setProfileUrl(data.publicUrl);
      } else {
        const { data } = supabase.storage.from("profile-images").getPublicUrl(user.profile_image);
        setProfileUrl(data.publicUrl);
      }
    };
    loadProfile();
  }, [user?.profile_image]);

  // ✅ 프로필 업로드
  const handleProfileUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file || !user?.id) return;

      const oldPath = user.profile_image;
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("users")
        .update({ profile_image: filePath })
        .eq("id", user.id);
      if (dbError) throw dbError;

      if (oldPath && oldPath !== "default-avatar.png") {
        await supabase.storage.from("profile-images").remove([oldPath]);
      }

      const { data: refreshedUser } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      if (refreshedUser) {
        setUser(refreshedUser);
        localStorage.setItem("app_user", JSON.stringify(refreshedUser));
      }

      const { data } = supabase.storage.from("profile-images").getPublicUrl(filePath);
      setProfileUrl(data.publicUrl);

      showToast("프로필 사진이 변경되었습니다.", "success", 3000);
    } catch (err) {
      console.error("프로필 업로드 실패:", err);
      showToast("프로필 사진 업로드 실패", "error", 3000);
    }
  };

  // ✅ 접속자 관리
  useEffect(() => {
    const fetchOnlineUsers = async () => {
      const { data } = await supabase.from("online_users").select("user_id, name, department");
      setOnlineUsers(data || []);
    };
    fetchOnlineUsers();

    const channel = supabase
      .channel("online-users-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "online_users" }, (payload) => {
        setOnlineUsers((prev) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const updated = prev.filter((u) => u.user_id !== payload.new.user_id);
            return [...updated, payload.new];
          }
          if (payload.eventType === "DELETE") {
            const deletedUserId = payload.old.user_id || payload.old.id;
            return prev.filter((u) => u.user_id !== deletedUserId);
          }
          return prev;
        });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ✅ 일정 데이터
  useEffect(() => {
    if (!user?.id) return;
    const today = new Date().toISOString().split("T")[0];

    const fetchData = async () => {
      const { data: hostEv } = await supabase
        .from("events")
        .select("id, event_name, start_date, end_date, region, department, host, host_id")
        .eq("host_id", user.id)
        .order("start_date", { ascending: true });

      setHostEventsPlanned((hostEv || []).filter((e) => e.start_date >= today));
      setHostEventsDone((hostEv || []).filter((e) => e.end_date < today));

      const { data: sp } = await supabase
        .from("event_supports")
        .select("support_date, events(id, event_name, start_date, end_date, region, department)")
        .eq("user_id", user.id)
        .order("support_date", { ascending: true });

      const grouped = {};
      (sp || []).forEach((row) => {
        if (!row.events) return;
        const ev = row.events;
        if (!grouped[ev.id]) grouped[ev.id] = { event: ev, dates: [] };
        grouped[ev.id].dates.push(row.support_date);
      });

      const supportList = Object.values(grouped).map(({ event, dates }) => {
        dates.sort();
        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];
        const totalDays =
          (new Date(event.end_date) - new Date(event.start_date)) / (1000 * 60 * 60 * 24) + 1;
        const fullSupport =
          minDate === event.start_date &&
          maxDate === event.end_date &&
          dates.length === totalDays;
        let rangeText = fullSupport
          ? fmtRange(event.start_date, event.end_date)
          : compressDateRanges(dates);
        return { event, dates, rangeText, firstDate: minDate };
      });

      setSupportEventsPlanned(supportList.filter((r) => r.firstDate >= today));
      setSupportEventsDone(supportList.filter((r) => r.event.end_date < today));
    };
    fetchData();
  }, [user?.id]);

  const compressDateRanges = (dates) => {
    if (!dates || dates.length === 0) return "";
    const sorted = dates.map((d) => parseISO(d)).sort((a, b) => a - b);
    const ranges = [];
    let rangeStart = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i];
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        prev = curr;
      } else {
        ranges.push([rangeStart, prev]);
        rangeStart = curr;
        prev = curr;
      }
    }
    ranges.push([rangeStart, prev]);
    return ranges
      .map(([s, e]) =>
        s.getTime() === e.getTime()
          ? `(${format(s, "MM/dd")})`
          : `(${format(s, "MM/dd")}-${format(e, "MM/dd")})`
      )
      .join(", ");
  };

  const fmtRange = (start, end) => {
    try {
      const s = format(parseISO(start), "MM/dd");
      const e = format(parseISO(end), "MM/dd");
      return start === end ? `(${s})` : `(${s}-${e})`;
    } catch {
      return "";
    }
  };

  // ✅ 이벤트 모달 열기
  const handleOpenEvent = async (ev) => {
    try {
      const { data, error } = await supabase.from("events").select("*").eq("id", ev.id).single();
      if (error) throw error;
      setSelectedEvent(data);
      setModalOpen(true);
    } catch (e) {
      console.error(e);
      showToast("행사 정보를 불러올 수 없습니다.", "error", 3000);
    }
  };

  // ✅ 안읽은 메시지 수 불러오기
  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("id, sender_id, read_at, sender:sender_id(id, name)")
        .eq("receiver_id", user.id)
        .is("read_at", null);

      if (!data) return;
      const counts = {};
      data.forEach((m) => {
        if (!counts[m.sender_id]) {
          counts[m.sender_id] = { sender: m.sender, count: 0 };
        }
        counts[m.sender_id].count++;
      });
      setUnreadCounts(counts);
    };
    fetchUnread();

    const channel = supabase
      .channel("direct_messages_unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, () => {
        fetchUnread();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  const navItems = [
    { label: "행사 조회", path: "/main" },
    { label: "직원 명부", path: "/directory" },
    { label: "통계", path: "/stats" },
    { label: "내 휴가", path: "/my-vacation" },
    { label: "휴일근무수당", path: "/expense" },
  ];
  if (user?.is_admin) {
    navItems.push({ label: "행사 업로드", path: "/events/new" });
    navItems.push({ label: "휴가 관리", path: "/vacation-admin" });
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] py-6">
      <div
        className="w-full px-6 grid gap-x-6 gap-y-4"
        style={{ gridTemplateColumns: `1fr ${ASIDE_W}px`, gridTemplateRows: "auto 1fr auto" }}
      >
        {/* 상단 메뉴 */}
        <header className="flex gap-3 items-center" style={{ gridColumn: "1 / 2", gridRow: "1 / 2" }}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm px-4 py-2 rounded ${
                location.pathname === item.path
                  ? "bg-black text-white"
                  : "bg-white text-gray-800 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </header>

        {/* 사이드 */}
        <aside className="sticky top-4 space-y-4" style={{ gridColumn: "2 / 3", gridRow: "1 / 3" }}>
          {/* 로그인 정보 */}
<div className="relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
  {/* 세션 남은 시간 + 연장 버튼 */}
  <div className="absolute top-2 right-2 flex items-center gap-2 text-xs">
    <span className={`font-mono ${danger ? "text-red-600" : "text-gray-600"}`}>
      {fmt(sessionRemainingSec)}
    </span>
    <button
      onClick={onExtendSession}
      className="px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100"
    >
      연장
    </button>
  </div>

  <div className="flex items-center gap-6 mb-4">
    <div className="flex flex-col items-center">
      <img
        src={profileUrl || undefined}
        alt="프로필"
        className="w-24 h-32 rounded-md object-cover shadow-md"
      />
      <button
        onClick={() => fileInputRef.current.click()}
        className="mt-2 text-xs text-blue-600 hover:underline"
      >
        사진 변경
      </button>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleProfileUpload}
      />
    </div>
    <div>
      <p className="text-base font-semibold">{user?.name}</p>
      <p className="text-sm text-gray-600">직급: {user?.position || "-"}</p>
      <p className="text-sm text-gray-600">부서: {user?.department || "-"}</p>
    </div>
  </div>

  <div className="space-y-2">
    <button
      onClick={() => setPwModalOpen(true)}
      className="w-full rounded bg-gray-100 py-2 text-sm hover:bg-gray-200"
    >
      비밀번호 변경
    </button>
    <button
      onClick={onLogout}
      className="w-full rounded bg-black py-2 text-white hover:bg-gray-800"
    >
      로그아웃
    </button>
  </div>
</div>


          {/* 내 일정 */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-medium mb-2">내 일정</h2>
            <div className="flex gap-2 mb-3">
              <button
                className={`px-2 py-1 rounded ${tab === "planned" ? "bg-black text-white" : "bg-gray-100"}`}
                onClick={() => setTab("planned")}
              >
                예정
              </button>
              <button
                className={`px-2 py-1 rounded ${tab === "done" ? "bg-black text-white" : "bg-gray-100"}`}
                onClick={() => setTab("done")}
              >
                완료
              </button>
            </div>

            {tab === "planned" ? (
              <>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">
                  진행 예정 행사 ({hostEventsPlanned.length}건)
                </h3>
                {hostEventsPlanned.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-2">없음</p>
                ) : (
                  <ul className="space-y-1 mb-2 text-sm max-h-48 overflow-y-auto">
                    {hostEventsPlanned.map((ev) => (
                      <li
                        key={ev.id}
                        className="text-gray-700 cursor-pointer hover:underline"
                        onClick={() => handleOpenEvent(ev)}
                      >
                        {fmtRange(ev.start_date, ev.end_date)} {ev.event_name} {ev.region || ""}
                      </li>
                    ))}
                  </ul>
                )}

                <h3 className="text-sm font-semibold text-gray-800 mb-1">
                  지원 예정 행사 ({supportEventsPlanned.length}건)
                </h3>
                {supportEventsPlanned.length === 0 ? (
                  <p className="text-sm text-gray-500">없음</p>
                ) : (
                  <ul className="space-y-1 text-sm max-h-48 overflow-y-auto">
                    {supportEventsPlanned.map((row) => (
                      <li
                        key={row.event.id}
                        className="text-gray-700 cursor-pointer hover:underline"
                        onClick={() => handleOpenEvent(row.event)}
                      >
                        {row.rangeText} {row.event.event_name} {row.event.region || ""}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="date"
                    value={doneStart ? doneStart.toISOString().split("T")[0] : ""}
                    onChange={(e) => setDoneStart(e.target.value ? new Date(e.target.value) : null)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                  <span>~</span>
                  <input
                    type="date"
                    value={doneEnd ? doneEnd.toISOString().split("T")[0] : ""}
                    onChange={(e) => setDoneEnd(e.target.value ? new Date(e.target.value) : null)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>

                <h3 className="text-sm font-semibold text-gray-800 mb-1">
                  진행 완료 행사 ({hostEventsDone.length}건)
                </h3>
                {hostEventsDone.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-2">없음</p>
                ) : (
                  <ul className="space-y-1 mb-2 text-sm max-h-48 overflow-y-auto">
                    {hostEventsDone.map((ev) => (
                      <li
                        key={ev.id}
                        className="text-gray-700 cursor-pointer hover:underline"
                        onClick={() => handleOpenEvent(ev)}
                      >
                        {fmtRange(ev.start_date, ev.end_date)} {ev.event_name} {ev.region || ""}
                      </li>
                    ))}
                  </ul>
                )}

                <h3 className="text-sm font-semibold text-gray-800 mb-1">
                  지원 완료 행사 ({supportEventsDone.length}건)
                </h3>
                {supportEventsDone.length === 0 ? (
                  <p className="text-sm text-gray-500">없음</p>
                ) : (
                  <ul className="space-y-1 text-sm max-h-48 overflow-y-auto">
                    {supportEventsDone.map((row) => (
                      <li
                        key={row.event.id}
                        className="text-gray-700 cursor-pointer hover:underline"
                        onClick={() => handleOpenEvent(row.event)}
                      >
                        {row.rangeText} {row.event.event_name} {row.event.region || ""}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* 접속자 */}
          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-2 text-lg font-medium">접속자</h2>
            <ul className="text-sm max-h-48 overflow-y-auto">
              {onlineUsers.map((u) => (
                <li key={u.user_id} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
                  {u.name} <span className="text-xs text-gray-500">{u.department}</span>
                </li>
              ))}
            </ul>
          </div>
        {/* 안읽은 메시지 */}
<div className="rounded-lg border bg-white p-4 shadow-sm">
  <h2 className="mb-2 text-lg font-medium">안읽은 메시지</h2>
  {Object.values(unreadCounts).length === 0 ? (
    <p className="text-sm text-gray-500">읽지 않은 메시지 없음</p>
  ) : (
    <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
      {Object.values(unreadCounts).map(({ sender, count }) => (
        <li
          key={sender.id}
          onClick={() => openMiniChat(sender)}
          className="flex justify-between items-center cursor-pointer hover:bg-gray-100 p-2 rounded"
        >
          <span>{sender.name}</span>
          <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
            {count}
          </span>
        </li>
      ))}
    </ul>
  )}
</div>
        </aside>


        {/* 본문 */}
        <main className="min-w-0" style={{ gridColumn: "1 / 2", gridRow: "2 / 3" }}>
          {children}
        </main>
      </div>

      {/* ✅ MiniChat 여러 개 */}
      {miniChatPartners.map((partner) => (
        <MiniChat
          key={partner.id}
          user={user}
          partner={partner}
          onClose={() => closeMiniChat(partner.id)}
        />
      ))}

      {/* 모달 */}
      {modalOpen && selectedEvent && (
        <EventDetailModal
          open={modalOpen}
          event={selectedEvent}
          onClose={() => setModalOpen(false)}
          getDeptColor={() => ""}
          status={() => ""}
          onRefresh={() => {}}
          showToast={showToast || (() => {})}
          user={user}
        />
      )}
      {pwModalOpen && (
        <ChangePasswordModal
          open={pwModalOpen}
          onClose={() => setPwModalOpen(false)}
          user={user}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}
