// src/hooks/useRealtimeMessages.js
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function useRealtimeMessages(userId, partnerId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!userId || !partnerId) return;

    // ✅ 기존 메시지 불러오기
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("id, sender_id, receiver_id, content, created_at")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });

      if (!error) setMessages(data || []);
    };
    fetchMessages();

    // ✅ 실시간 메시지 구독
    const channel = supabase
      .channel("direct_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const newMsg = payload.new;
          if (
            (newMsg.sender_id === userId && newMsg.receiver_id === partnerId) ||
            (newMsg.sender_id === partnerId && newMsg.receiver_id === userId)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, partnerId]);

  return messages;
}
