export default function Toast({ toast }) {
  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm text-white animate-fadein z-[99999]
        ${toast.type === "success" ? "bg-black" : "bg-red-600"}`}
    >
      {toast.msg}
      <style>{`
        @keyframes fadein {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fadein { animation: fadein .25s ease-out; }
      `}</style>
    </div>
  );
}
