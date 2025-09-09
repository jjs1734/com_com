// src/components/MiniChat.jsx
import DirectChat from "./DirectChat";

export default function MiniChat({ user, partner, onClose }) {
  return (
    <div className="fixed bottom-4 right-4 w-96 h-96 bg-white border rounded-lg shadow-lg flex flex-col z-50">
      {/* 헤더 */}
      <div className="flex justify-between items-center p-2 border-b bg-gray-100">
        <div>
          <p className="font-semibold">{partner.name}</p>
          <p className="text-xs text-gray-500">
            {partner.department || "-"} / {partner.position || "-"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-sm px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
        >
          ✕
        </button>
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1">
        <DirectChat user={user} partner={partner} />
      </div>
    </div>
  );
}
