// src/App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";
import DirectoryPage from "./pages/DirectoryPage";
import EventUploadPage from "./pages/EventUploadPage";
import EventEditPage from "./pages/EventEditPage";
import Layout from "./components/Layout";
import Toast from "./components/Toast";

const SESSION_MS = 4 * 60 * 60 * 1000; // 4시간

export default function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [exp, setExp] = useState(null);
  const [remaining, setRemaining] = useState(null);

  // ✅ 전역 토스트
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success", delay = 2000) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), delay);
  };

  // 최초 복원
  useEffect(() => {
    const savedUser = localStorage.getItem("app_user");
    const savedExp = localStorage.getItem("app_session_exp");
    if (savedUser && savedExp) {
      try {
        const u = JSON.parse(savedUser);
        const e = Number(savedExp);
        if (!Number.isNaN(e) && Date.now() < e) {
          setUser(u);
          setExp(e);
          setRemaining(Math.max(0, Math.floor((e - Date.now()) / 1000)));

          // ✅ 세션 복원 시에도 online_users에 등록
          supabase.from("online_users").upsert({
            user_id: u.id,
            name: u.name,
            department: u.department,
            last_seen: new Date().toISOString(),
          });
        } else {
          localStorage.removeItem("app_user");
          localStorage.removeItem("app_session_exp");
        }
      } catch {}
    }
  }, []);

  // 남은시간 타이머 + 자동 로그아웃
  useEffect(() => {
    if (!exp) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const left = Math.floor((exp - Date.now()) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        sessionStorage.setItem("logout_reason", "expired");
        handleLogout();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [exp]);

  const isLoggedIn = !!user;

  // 로그아웃 후 로그인 화면 알림
  useEffect(() => {
    if (!isLoggedIn) {
      const reason = sessionStorage.getItem("logout_reason");
      if (reason === "expired") {
        sessionStorage.removeItem("logout_reason");
        setTimeout(() => alert("세션이 만료되어 로그아웃 되었습니다."), 0);
      }
    }
  }, [isLoggedIn]);

  // 이벤트 로더
  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, event_name, start_date, end_date, department, company_name, product_name, region, venue, host")
      .order("start_date", { ascending: true });
    if (!error) setEvents(data || []);
  };
  useEffect(() => {
    if (isLoggedIn) fetchEvents();
  }, [isLoggedIn]);

  // 로그인
  const handleLogin = async (u) => {
    const newExp = Date.now() + SESSION_MS;
    setUser(u);
    setExp(newExp);
    localStorage.setItem("app_user", JSON.stringify(u));
    localStorage.setItem("app_session_exp", String(newExp));

    // ✅ online_users 등록/갱신
    try {
      await supabase.from("online_users").upsert({
        user_id: u.id,
        name: u.name,
        department: u.department,
        last_seen: new Date().toISOString(),
      });
    } catch (err) {
      console.error("online_users upsert 실패:", err);
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    if (user) {
      try {
        // ✅ online_users에서 제거
        await supabase.from("online_users").delete().eq("user_id", user.id);
      } catch (err) {
        console.error("online_users delete 실패:", err);
      }
    }
    setUser(null);
    setExp(null);
    setRemaining(null);
    localStorage.removeItem("app_user");
    localStorage.removeItem("app_session_exp");
  };

  // 세션 연장
  const extendSession = () => {
    const newExp = Date.now() + SESSION_MS;
    setExp(newExp);
    localStorage.setItem("app_session_exp", String(newExp));

    // ✅ 세션 연장 시 last_seen 갱신
    if (user) {
      supabase.from("online_users").upsert({
        user_id: user.id,
        name: user.name,
        department: user.department,
        last_seen: new Date().toISOString(),
      });
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to="/main" replace /> : <LoginPage onLogin={handleLogin} />}
        />
        <Route
          path="/main"
          element={
            isLoggedIn ? (
              <Layout
                user={user}
                onLogout={handleLogout}
                sessionRemainingSec={remaining}
                onExtendSession={extendSession}
              >
                <MainPage user={user} events={events} onRefresh={fetchEvents} showToast={showToast} />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/directory"
          element={
            isLoggedIn ? (
              <Layout
                user={user}
                onLogout={handleLogout}
                sessionRemainingSec={remaining}
                onExtendSession={extendSession}
              >
                <DirectoryPage />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/events/:id/edit"
          element={
            isLoggedIn ? (
              <Layout
                user={user}
                onLogout={handleLogout}
                sessionRemainingSec={remaining}
                onExtendSession={extendSession}
              >
                <EventEditPage user={user} onUpdated={fetchEvents} showToast={showToast} />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/events/new"
          element={
            isLoggedIn ? (
              <Layout
                user={user}
                onLogout={handleLogout}
                sessionRemainingSec={remaining}
                onExtendSession={extendSession}
              >
                <EventUploadPage user={user} onCreated={fetchEvents} showToast={showToast} />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* ✅ 전역 토스트 */}
      <Toast toast={toast} />
    </Router>
  );
}
