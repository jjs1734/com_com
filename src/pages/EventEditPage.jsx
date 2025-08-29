import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { eachDayOfInterval, parseISO, formatISO } from "date-fns";

// 부서 옵션
const DEPT_OPTIONS = [
  "MK팀",
  "제약 1팀", "제약 2팀",
  "학회 1팀", "학회 2팀"
];

export default function EventEditPage({ user, onUpdated, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [users, setUsers] = useState([]);
  const [hist, setHist] = useState({ company: [], product: [], region: [], venue: [] });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // 지원 인력 상태
  const [supports, setSupports] = useState([]); // { user_id, partial, start_date, end_date }

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

        // 지원 인력 불러오기
        const { data: sp } = await supabase
          .from("event_supports")
          .select("id, user_id, support_date, users(name, department, position)")
          .eq("event_id", id);

        const uniq = (arr) =>
          Array.from(new Set((arr || []).filter(Boolean))).sort((a, b) =>
            String(a).localeCompare(String(b), "ko")
          );

        setForm({
          event_name: ev.event_name || "",
          start_date: ev.start_date || "",
          end_date: ev.end_date || "",
          department: ev.department || "",
          host: ev.host || "",
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

        // 기존 supports 복원 → 단순히 날짜별 row니까 하나로 합치기 어려워서 partial=true로 기본 복원
        setSupports(
          (sp || []).map((s) => ({
            user_id: s.user_id,
            name: s.users?.name,
            department: s.users?.department,
            position: s.users?.position,
            partial: true,
            start_date: s.support_date,
            end_date: s.support_date,
          }))
        );
      } catch (err) {
        console.error(err);
        setMsg("데이터 로드 중 오류 발생");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  // 담당자 후보
  const hostCandidates = useMemo(() => {
    if (!form?.department) return [];
    const list = (users || []).filter((u) => u.department === form.department);
    return Array.from(new Set(list.map((u) => u.name))).sort((a, b) =>
      a.localeCompare(b, "ko")
    );
  }, [users, form?.department]);

  // 부서 변경 시 후보에 없는 담당자면 초기화
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

  // 지원 인력 조작
  const addSupport = () => {
    setSupports((s) => [
      ...s,
      { user_id: "", partial: false, start_date: form.start_date, end_date: form.end_date }
    ]);
  };

  const updateSupport = (idx, key, value) => {
    setSupports((s) =>
      s.map((item, i) =>
        i === idx ? { ...item, [key]: value } : item
      )
    );
  };

  const removeSupport = (idx) => {
    setSupports((s) => s.filter((_, i) => i !== idx));
  };

  // 저장
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.is_admin) {
      showToast("권한이 없습니다. 관리자만 행사를 수정할 수 있습니다.", "error", 3000);
      return;
    }
    if (!requiredOk) return setMsg("필수 항목을 입력해 주세요.");
    if (invalidEnd) return setMsg("종료일은 시작일보다 빠를 수 없습니다.");

    try {
      // host_id 매핑
      const hostUser = users.find((u) => u.name === form.host);

      const payload = {
        event_name: form.event_name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        department: form.department,
        host: form.host,
        host_id: hostUser ? hostUser.id : null,
        company_name: form.company_name || null,
        product_name: form.product_name || null,
        region: form.region || null,
        venue: form.venue || null,
      };

      const { error } = await supabase.from("events").update(payload).eq("id", id);
      if (error) throw error;

      // 지원 인력 갱신 (기존 삭제 후 다시 insert)
      await supabase.from("event_supports").delete().eq("event_id", id);

      let supportPayloads = [];
      supports.forEach((s) => {
        if (!s.user_id) return;

        const start = s.partial ? s.start_date : form.start_date;
        const end = s.partial ? s.end_date : form.end_date;
        if (!start || !end) return;

        const dates = eachDayOfInterval({
          start: parseISO(start),
          end: parseISO(end),
        });

        dates.forEach((d) => {
          supportPayloads.push({
            event_id: id,
            user_id: s.user_id,
            support_date: formatISO(d, { representation: "date" }),
          });
        });
      });

      if (supportPayloads.length > 0) {
        const { error: spErr } = await supabase
          .from("event_supports")
          .insert(supportPayloads);
        if (spErr) throw spErr;
      }

      if (typeof onUpdated === "function") await onUpdated();

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

        {!user?.is_admin ? (
          <p className="text-red-600 text-sm">권한이 없습니다. 관리자만 행사를 수정할 수 있습니다.</p>
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
                {invalidEnd && <p className="text-xs text-red-600">종료일은 시작일보다 빠를 수 없습니다.</p>}
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

            {/* 지원 인력 */}
            <div>
              <label className="block text-sm mb-1">지원 인력</label>
              <div className="space-y-2">
                {supports.map((s, idx) => (
                  <div key={idx} className="flex flex-col gap-2 border p-2 rounded">
                    <div className="flex gap-2">
                      <select
                        value={String(s.user_id)}
                        onChange={(e) => updateSupport(idx, "user_id", e.target.value)}
                        className="flex-1 border rounded px-2 py-1 text-sm bg-white"
                      >
                        <option value="">직원 선택</option>
                        {users.map((u) => (
                          <option key={u.id} value={String(u.id)}>
                            {u.name} ({u.department})
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={s.partial}
                          onChange={(e) => updateSupport(idx, "partial", e.target.checked)}
                        />
                        부분 지원
                      </label>
                      <button
                        type="button"
                        onClick={() => removeSupport(idx)}
                        className="px-2 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600"
                      >
                        삭제
                      </button>
                    </div>
                    {s.partial && (
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={s.start_date || ""}
                          onChange={(e) => updateSupport(idx, "start_date", e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="date"
                          value={s.end_date || ""}
                          onChange={(e) => updateSupport(idx, "end_date", e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addSupport}
                className="mt-2 px-3 py-1 rounded bg-blue-500 text-white text-sm hover:bg-blue-600"
              >
                + 지원 인력 추가
              </button>
            </div>

            {msg && <p className="text-sm text-red-600">{msg}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!requiredOk || invalidEnd}
                className="px-4 py-2 bg-black text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
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
