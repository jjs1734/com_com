// src/pages/EventEditPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

// 부서 옵션 (행사를 직접 진행하는 4개 팀만)
const DEPT_OPTIONS = [
  "MK팀",
  "제약 1팀","제약 2팀",
  "학회 1팀","학회 2팀"
];

export default function EventEditPage({ user, onUpdated, showToast }) {   // ✅ user 추가
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [users, setUsers] = useState([]);
  const [hist, setHist] = useState({ company: [], product: [], region: [], venue: [] });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // 기존 데이터 로드
  useEffect(() => {
    const run = async () => {
      try {
        const { data: ev, error: e1 } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .single();
        if (e1) throw e1;

        const { data: u } = await supabase
          .from("users")
          .select("id,name,department,position");

        const { data: evAll } = await supabase
          .from("events")
          .select("company_name,product_name,region,venue");

        const uniq = (arr) =>
          Array.from(new Set((arr || []).filter(Boolean))).sort((a, b) =>
            String(a).localeCompare(String(b), "ko")
          );

        setForm({
          event_name: ev.event_name || "",
          start_date: ev.start_date || "",
          end_date: ev.end_date || "",
          department: ev.department || "",
          host: ev.host || "", // ✅ 필수
          company_name: ev.company_name || "",
          product_name: ev.product_name || "",
          region: ev.region || "",
          venue: ev.venue || "",
        });
        setUsers(u || []);
        setHist({
          company: uniq((evAll || []).map((x) => x.company_name)),
          product: uniq((evAll || []).map((x) => x.product_name)),
          region: uniq((evAll || []).map((x) => x.region)),
          venue: uniq((evAll || []).map((x) => x.venue)),
        });
      } catch (err) {
        console.error(err);
        setMsg("데이터 로드 중 오류 발생");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  // ✅ 부서별 담당자 후보
  const hostCandidates = useMemo(() => {
    if (!form?.department) return [];
    const list = (users || []).filter((u) => u.department === form.department);
    return Array.from(new Set(list.map((u) => u.name))).sort((a, b) =>
      a.localeCompare(b, "ko")
    );
  }, [users, form?.department]);

  // ✅ 부서 변경 시 후보에 없는 담당자면 초기화
  useEffect(() => {
    if (!form) return;
    if (!form.department) {
      if (form.host) setForm((f) => ({ ...f, host: "" }));
      return;
    }
    if (form.host && !hostCandidates.includes(form.host)) {
      setForm((f) => ({ ...f, host: "" }));
    }
  }, [form?.department, hostCandidates]);

  if (loading) return <div className="p-8">불러오는 중...</div>;
  if (!form) return <div className="p-8">데이터 없음</div>;

  const invalidEnd =
    form.start_date && form.end_date && form.end_date < form.start_date;

  const requiredOk =
    form.event_name &&
    form.start_date &&
    form.end_date &&
    form.department &&
    form.host;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // ✅ 관리자 권한 확인
    if (!user?.is_admin) {
      showToast("권한이 없습니다. 관리자만 행사를 수정할 수 있습니다.", "error", 3000);
      return;
    }

    if (!requiredOk) return setMsg("필수 항목을 입력해 주세요.");
    if (invalidEnd) return setMsg("종료일은 시작일보다 빠를 수 없습니다.");

    try {
      const { id: _id, ...payload } = form; // id는 빼고 업데이트
      const { error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      if (typeof onUpdated === "function") await onUpdated();

      // ✅ 성공 토스트
      showToast("수정되었습니다.", "success");
      setTimeout(() => navigate("/main", { replace: true }), 1500);
    } catch (err) {
      console.error(err);
      showToast(err.message || "수정 중 오류 발생", "error", 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">행사 수정</h1>

        {/* ✅ 관리자만 수정 가능 */}
        {!user?.is_admin ? (
          <p className="text-red-600 text-sm">
            권한이 없습니다. 관리자만 행사를 수정할 수 있습니다.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="bg-white rounded-xl border p-6 space-y-5">
            {/* 행사명 */}
            <div>
              <label className="block text-sm mb-1">행사명 *</label>
              <input
                name="event_name"
                value={form.event_name}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            {/* 기간 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">시작일 *</label>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">종료일 *</label>
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  required
                  min={form.start_date || undefined}
                />
                {invalidEnd && (
                  <p className="text-xs text-red-600">
                    종료일은 시작일보다 빠를 수 없습니다.
                  </p>
                )}
              </div>
            </div>

            {/* 부서 / 담당자 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">부서 *</label>
                <select
                  name="department"
                  value={form.department}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2 bg-white"
                  required
                >
                  <option value="">선택</option>
                  {DEPT_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">담당자 *</label>
                <select
                  name="host"
                  value={form.host}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2 bg-white"
                  required
                  disabled={!form.department || hostCandidates.length === 0}
                >
                  <option value="">
                    {!form.department ? "부서를 먼저 선택하세요" : "담당자 선택"}
                  </option>
                  {hostCandidates.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 클라이언트 / 제품 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">클라이언트</label>
                <input
                  name="company_name"
                  value={form.company_name}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  list="companyOptions"
                />
                <datalist id="companyOptions">
                  {hist.company.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm mb-1">제품</label>
                <input
                  name="product_name"
                  value={form.product_name}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  list="productOptions"
                />
                <datalist id="productOptions">
                  {hist.product.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* 지역 / 장소 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">지역</label>
                <input
                  name="region"
                  value={form.region}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  list="regionOptions"
                />
                <datalist id="regionOptions">
                  {hist.region.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm mb-1">장소</label>
                <input
                  name="venue"
                  value={form.venue}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  list="venueOptions"
                />
                <datalist id="venueOptions">
                  {hist.venue.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
            </div>

            {msg && <p className="text-sm text-red-600">{msg}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!requiredOk || invalidEnd}
                className="px-4 py-2 bg-black text-white rounded transition
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border rounded"
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
