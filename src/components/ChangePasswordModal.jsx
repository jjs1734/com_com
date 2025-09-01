// src/components/ChangePasswordModal.jsx
import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function ChangePasswordModal({ open, onClose, user, onSuccess }) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);

  // 에러 메시지 상태
  const [errorMsg, setErrorMsg] = useState({
    old: "",
    new: "",
    confirm: "",
    general: "",
  });

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 새 비밀번호가 현재 비밀번호와 같음
    if (oldPw === newPw) {
      setErrorMsg((prev) => ({
        ...prev,
        new: "현재 비밀번호와 동일한 비밀번호는 사용할 수 없습니다.",
      }));
      return;
    }

    // 새 비밀번호 확인 불일치
    if (newPw !== confirmPw) {
      setErrorMsg((prev) => ({ ...prev, confirm: "새 비밀번호가 일치하지 않습니다." }));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("change_password", {
        p_user_id: user.id,
        p_old_pw: oldPw,
        p_new_pw: newPw,
      });

      if (error) throw error;

      // false → 현재 비밀번호 틀림
      if (data !== true) {
        setErrorMsg((prev) => ({ ...prev, old: "현재 비밀번호가 일치하지 않습니다." }));
        return;
      }

      // 성공 → 부모(Layout)에 알림 전달
      onSuccess?.("비밀번호가 변경되었습니다. 다시 로그인 해주세요.");
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg((prev) => ({
        ...prev,
        general: err.message || "비밀번호 변경 중 오류가 발생했습니다.",
      }));
    } finally {
      setLoading(false);
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 relative">
        <h2 className="text-lg font-semibold mb-4">비밀번호 변경</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 현재 비밀번호 */}
          <div>
            <label className="block text-sm mb-1">현재 비밀번호</label>
            <input
              type="password"
              value={oldPw}
              onChange={(e) => {
                setOldPw(e.target.value);
                setErrorMsg((prev) => ({ ...prev, old: "" }));
              }}
              className="w-full border rounded px-3 py-2"
              required
            />
            {errorMsg.old && <p className="text-xs text-red-600 mt-1">{errorMsg.old}</p>}
          </div>

          {/* 새 비밀번호 */}
          <div>
            <label className="block text-sm mb-1">새 비밀번호</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => {
                setNewPw(e.target.value);
                setErrorMsg((prev) => ({ ...prev, new: "" }));
              }}
              className="w-full border rounded px-3 py-2"
              required
            />
            {errorMsg.new && <p className="text-xs text-red-600 mt-1">{errorMsg.new}</p>}
          </div>

          {/* 새 비밀번호 확인 */}
          <div>
            <label className="block text-sm mb-1">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => {
                setConfirmPw(e.target.value);
                setErrorMsg((prev) => ({ ...prev, confirm: "" }));
              }}
              className="w-full border rounded px-3 py-2"
              required
            />
            {errorMsg.confirm && <p className="text-xs text-red-600 mt-1">{errorMsg.confirm}</p>}
          </div>

          {/* 일반 오류 */}
          {errorMsg.general && (
            <p className="text-xs text-red-600 mt-1">{errorMsg.general}</p>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded border text-sm"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1 rounded bg-black text-white text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "변경 중..." : "변경"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
