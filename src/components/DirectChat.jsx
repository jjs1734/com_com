// src/components/DirectChat.jsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import useRealtimeMessages from "../hooks/useRealtimeMessages";
import { format } from "date-fns";

export default function DirectChat({ user, partner }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const endRef = useRef(null);

  const realtimeMsgs = useRealtimeMessages(user.id, partner.id);

  useEffect(() => {
    setMessages(realtimeMsgs);
  }, [realtimeMsgs]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ KST 변환 함수 (UTC → 한국시간)
  const toKST = (date) => {
    const utc = new Date(date);
    return new Date(utc.getTime() + 9 * 60 * 60 * 1000); // UTC + 9h
  };

  // ✅ 메시지 전송
  const sendMessage = async () => {
    if (!text.trim()) return;
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({
        sender_id: user.id,
        receiver_id: partner.id,
        content: text,
      })
      .select()
      .single();
    if (!error && data) {
      setMessages((prev) => [...prev, data]);
    }
    setText("");
  };

  // ✅ 읽음 처리
  useEffect(() => {
  const markAsRead = async () => {
    if (!user?.id || !partner?.id) return;

    const { data, error } = await supabase
  .from("direct_messages")
  .update({ read_at: new Date().toISOString() })
  .eq("receiver_id", user.id)
  .eq("sender_id", partner.id)
  .is("read_at", null)
  .select();

if (error) {
  console.error("읽음 처리 실패:", error);
} else {
  console.log("읽음 처리 성공, 업데이트된 행:", data.length);
}
  };

  markAsRead();
}, [user?.id, partner?.id, messages]);

  // ✅ 날짜별 그룹화
  const groupByDate = (msgs) => {
    const groups = {};
    msgs.forEach((m) => {
      const zoned = toKST(m.created_at);
      const dateKey = format(zoned, "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(m);
    });
    return groups;
  };

  const groupedMessages = groupByDate(messages);

  // ✅ 내가 보낸 메시지 중 마지막 메시지 ID
  const lastMyMessageId = [...messages]
    .reverse()
    .find((m) => m.sender_id === user.id)?.id;

  return (
    <div className="flex flex-col h-full">
      {/* 메시지 리스트 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* 날짜 구분선 */}
            <div className="flex justify-center mb-4">
              <span className="text-xs bg-gray-300 text-white px-3 py-1 rounded-full">
                {format(new Date(date), "yyyy년 MM월 dd일")}
              </span>
            </div>

            {msgs.map((m) => {
              const zoned = toKST(m.created_at);
              const timeText = format(zoned, "a h:mm"); // 오전/오후 h:mm
              const isMe = m.sender_id === user.id;

              return (
                <div
                  key={m.id}
                  className={`flex mb-2 ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div>
                    <div
                      className={`px-3 py-2 rounded-lg max-w-xs ${
                        isMe
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      {m.content}
                    </div>
                    <div
                      className={`text-[10px] mt-1 ${
                        isMe
                          ? "text-right text-gray-400"
                          : "text-left text-gray-400"
                      }`}
                    >
                      {timeText}
                      {/* ✅ 마지막 내 메시지에만 읽음/안읽음 표시 */}
                      {isMe && m.id === lastMyMessageId && (
                        m.read_at ? " · 읽음" : " · 안읽음"
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={endRef}></div>
      </div>

      {/* 입력창 */}
      <div className="p-2 border-t flex">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="메시지 입력..."
        />
        <button
          onClick={sendMessage}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          보내기
        </button>
      </div>
    </div>
  );
}
