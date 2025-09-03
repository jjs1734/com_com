// src/pages/EventEditPage.jsx
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

// 행사 유형 옵션
const EVENT_TYPE_OPTIONS = ["제약행사", "학회행사"];

// 부서 정렬 우선순위
const DEPT_ORDER = [
  "대표이사","관리부","MK팀",
  "제약 1팀","제약 2팀","학회 1팀","학회 2팀",
  "디지털마케팅팀","디자인팀",
];

// 직급 정렬 우선순위
const POSITION_ORDER = [
  "대표이사","이사","부장","차장","과장","대리","주임","사원",
];

export default function EventEditPage({ user, onUpdated, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [setupOption, setSetupOption] = useState(""); // "prev" | "same" | ""
  const [users, setUsers] = useState([]);
  const [hist, setHist] = useState({ company: [], product: [], region: [], venue: [] });
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [supports, setSupports] = useState([]); 

  const sortUsers = (list) =>
    [...list].sort((a, b) => {
      const deptA = DEPT_ORDER.indexOf(a.department);
      const deptB = DEPT_ORDER.indexOf(b.department);
      if (deptA !== deptB) return deptA - deptB;
      const posA = POSITION_ORDER.indexOf(a.position);
      const posB = POSITION_ORDER.indexOf(b.position);
      if (posA !== posB) return posA - posB;
      return a.name.localeCompare(b.name, "ko");
    });

  // 기존 데이터 로드
  useEffect(() => {
    const run = async () => {
      try {
        const { data: ev } = await supabase.from("events").select("*").eq("id", id).single();
        const { data: u } = await supabase.from("users").select("id,name,department,position");
        const { data: evAll } = await supabase.from("events").select("company_name,product_name,region,venue");
        const { data: sp } = await supabase
          .from("event_supports")
          .select("id, user_id, support_date, users(name, department, position)")
          .eq("event_id", id);
        const { data: regionData } = await supabase.from("regions").select("id,name");

        const uniq = (arr) =>
          Array.from(new Set((arr || []).filter(Boolean))).sort((a, b) =>
            String(a).localeCompare(String(b), "ko")
          );

        setForm({
          event_name: ev.event_name || "",
          start_date: ev.start_date || "",
          end_date: ev.end_date || "",
          setup_date: ev.setup_date || "",
          department: ev.department || "",
          host: ev.host || "",
          company_name: ev.company_name || "",
          product_name: ev.product_name || "",
          region: ev.region || "",
          venue: ev.venue || "",
          event_type: ev.event_type || "",
        });
        // 세팅일 옵션 복원
        if (ev.setup_date === ev.start_date) setSetupOption("same");
        else if (ev.setup_date) {
          const d = new Date(ev.start_date);
          d.setDate(d.getDate() - 1);
          if (ev.setup_date === d.toISOString().split("T")[0]) setSetupOption("prev");
        }

        setUsers(sortUsers(u || []));
        setRegions(regionData || []);
        setHist({
          company: uniq((evAll || []).map((x) => x.company_name)),
          product: uniq((evAll || []).map((x) => x.product_name)),
          region: uniq((evAll || []).map((x) => x.region)),
          venue: uniq((evAll || []).map((x) => x.venue)),
        });

        // 지원 인력 복원
        const grouped = {};
        (sp || []).forEach((s) => {
          if (!grouped[s.user_id]) {
            grouped[s.user_id] = {
              user_id: s.user_id,
              name: s.users?.name || "",
              department: s.users?.department,
              position: s.users?.position,
              dates: [],
            };
          }
          grouped[s.user_id].dates.push(s.support_date);
        });

        const eventDays = eachDayOfInterval({
          start: parseISO(ev.start_date),
          end: parseISO(ev.end_date),
        }).map((d) => formatISO(d, { representation: "date" }));

        const mergedSupports = Object.values(grouped).map((g) => {
          const start = g.dates.reduce((a, b) => (a < b ? a : b));
          const end = g.dates.reduce((a, b) => (a > b ? a : b));
          const coversAll = eventDays.every((d) => g.dates.includes(d));
          return {
            user_id: g.user_id,
            name: g.name,
            department: g.department,
            position: g.position,
            partial: !coversAll,
            start_date: start,
            end_date: end,
            showDropdown: false,
          };
        });

        setSupports(mergedSupports);
      } catch (err) {
        console.error(err);
        setMsg("데이터 로드 중 오류 발생");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  // start_date, setupOption 따라 setup_date 자동 반영
  useEffect(() => {
    if (!form?.start_date) return;
    if (setupOption === "prev") {
      const d = new Date(form.start_date);
      d.setDate(d.getDate() - 1);
      setForm((f) => ({ ...f, setup_date: d.toISOString().split("T")[0] }));
    } else if (setupOption === "same") {
      setForm((f) => ({ ...f, setup_date: f.start_date }));
    } else {
      setForm((f) => ({ ...f, setup_date: "" }));
    }
  }, [form?.start_date, setupOption]);

  const hostCandidates = useMemo(() => {
    if (!form?.department) return [];
    const list = (users || []).filter((u) => u.department === form.department);
    return Array.from(new Set(list.map((u) => u.name))).sort((a, b) =>
      a.localeCompare(b, "ko")
    );
  }, [users, form?.department]);

  useEffect(() => {
    if (!form) return;
    if (form.host && !hostCandidates.includes(form.host)) {
      setForm((f) => ({ ...f, host: "" }));
    }
  }, [form?.department, hostCandidates]);

  if (loading) return <div className="p-8">불러오는 중...</div>;
  if (!form) return <div className="p-8">데이터 없음</div>;

  const invalidEnd = form.start_date && form.end_date && form.end_date < form.start_date;
  const requiredOk = form.event_name && form.start_date && form.end_date && form.department && form.host && form.event_type;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const addSupport = () => setSupports((s) => [...s, { user_id: "", name: "", partial: false, start_date: form.start_date, end_date: form.end_date, showDropdown: false }]);
  const updateSupport = (idx, key, value) => setSupports((s) => s.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));
  const removeSupport = (idx) => setSupports((s) => s.filter((_, i) => i !== idx));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.is_admin) {
      showToast("권한이 없습니다. 관리자만 행사를 수정할 수 있습니다.", "error", 3000);
      return;
    }
    if (!requiredOk) return setMsg("필수 항목을 입력해 주세요.");
    if (invalidEnd) return setMsg("종료일은 시작일보다 빠를 수 없습니다.");

    try {
      const hostUser = users.find((u) => u.name === form.host);
      const regionMatch = regions.find((r) => r.name === form.region);
      const region_id = regionMatch ? regionMatch.id : null;

      const payload = {
        ...form,
        host_id: hostUser ? hostUser.id : null,
        region_id,
        setup_date: form.setup_date || null,
      };

      const { error } = await supabase.from("events").update(payload).eq("id", id);
      if (error) throw error;

      await supabase.from("event_supports").delete().eq("event_id", id);

      let supportPayloads = [];
      supports.forEach((s) => {
        if (!s.user_id) return;
        const start = s.partial ? s.start_date : form.start_date;
        const end = s.partial ? s.end_date : form.end_date;
        if (!start || !end) return;
        const dates = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
        dates.forEach((d) => {
          supportPayloads.push({
            event_id: id,
            user_id: s.user_id,
            support_date: formatISO(d, { representation: "date" }),
          });
        });
      });

      if (supportPayloads.length > 0) {
        const { error: spErr } = await supabase.from("event_supports").insert(supportPayloads);
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

        <form onSubmit={onSubmit} className="bg-white rounded-xl border p-6 space-y-5">
          {/* 행사명 */}
          <div>
            <label className="block text-sm mb-1">행사명 *</label>
            <input name="event_name" value={form.event_name} onChange={onChange} className="w-full border rounded px-3 py-2" required />
          </div>

          {/* 기간 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">시작일 *</label>
              <input type="date" name="start_date" value={form.start_date} onChange={onChange} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm mb-1">종료일 *</label>
              <input type="date" name="end_date" value={form.end_date} onChange={onChange} className="w-full border rounded px-3 py-2" required min={form.start_date || undefined} />
            </div>
          </div>

          {/* 세팅일 체크박스 */}
          <div>
            <label className="block text-sm mb-1">세팅일</label>
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={setupOption === "prev"} onChange={() => setSetupOption(setupOption === "prev" ? "" : "prev")} />
                전날 세팅
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={setupOption === "same"} onChange={() => setSetupOption(setupOption === "same" ? "" : "same")} />
                당일 세팅
              </label>
            </div>
          </div>

          {/* 부서 / 담당자 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">부서 *</label>
              <select name="department" value={form.department} onChange={onChange} className="w-full border rounded px-3 py-2 bg-white" required>
                <option value="">선택</option>
                {DEPT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">담당자 *</label>
              <select name="host" value={form.host} onChange={onChange} className="w-full border rounded px-3 py-2 bg-white" required disabled={!form.department || hostCandidates.length === 0}>
                <option value="">{!form.department ? "부서를 먼저 선택하세요" : "담당자 선택"}</option>
                {hostCandidates.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* 행사 유형 */}
          <div>
            <label className="block text-sm mb-1">행사 유형 *</label>
            <select name="event_type" value={form.event_type} onChange={onChange} className="w-full border rounded px-3 py-2 bg-white" required>
              <option value="">선택</option>
              {EVENT_TYPE_OPTIONS.map((et) => <option key={et} value={et}>{et}</option>)}
            </select>
          </div>

          {/* 클라이언트 / 제품 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">클라이언트</label>
              <input name="company_name" value={form.company_name} onChange={onChange} className="w-full border rounded px-3 py-2" list="companyOptions" />
              <datalist id="companyOptions">{hist.company.map((v) => <option key={v} value={v} />)}</datalist>
            </div>
            <div>
              <label className="block text-sm mb-1">제품</label>
              <input name="product_name" value={form.product_name} onChange={onChange} className="w-full border rounded px-3 py-2" list="productOptions" />
              <datalist id="productOptions">{hist.product.map((v) => <option key={v} value={v} />)}</datalist>
            </div>
          </div>

          {/* 지역 / 장소 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">지역</label>
              <input name="region" value={form.region} onChange={onChange} className="w-full border rounded px-3 py-2" list="regionOptions" />
              <datalist id="regionOptions">{hist.region.map((v) => <option key={v} value={v} />)}</datalist>
            </div>
            <div>
              <label className="block text-sm mb-1">장소</label>
              <input name="venue" value={form.venue} onChange={onChange} className="w-full border rounded px-3 py-2" list="venueOptions" />
              <datalist id="venueOptions">{hist.venue.map((v) => <option key={v} value={v} />)}</datalist>
            </div>
          </div>

          {/* 지원 인력 */}
          <div>
            <label className="block text-sm mb-1">지원 인력</label>
            <div className="space-y-2">
              {supports.map((s, idx) => {
                const filteredUsers = users.filter(
                  (u) =>
                    u.name !== form.host &&
                    u.department !== "디자인팀" &&
                    !supports.some((sp, i) => i !== idx && sp.user_id === u.id) &&
                    u.name.includes(s.name || "")
                );
                return (
                  <div key={idx} className="flex flex-col gap-2 border p-2 rounded relative">
                    <div className="flex gap-2 relative">
                      <input type="text" value={s.name} onChange={(e) => { updateSupport(idx, "name", e.target.value); updateSupport(idx, "showDropdown", true); }} onFocus={() => updateSupport(idx, "showDropdown", true)} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="직원 이름 검색" />
                      {s.showDropdown && filteredUsers.length > 0 && (
                        <ul className="absolute top-9 left-0 w-full bg-white border rounded shadow z-10 max-h-40 overflow-y-auto text-sm">
                          {filteredUsers.map((u) => (
                            <li key={u.id} onClick={() => { updateSupport(idx, "user_id", u.id); updateSupport(idx, "name", u.name); updateSupport(idx, "showDropdown", false); }} className="px-2 py-1 hover:bg-blue-100 cursor-pointer">{u.name} ({u.department}/{u.position})</li>
                          ))}
                        </ul>
                      )}
                      <label className="flex items-center gap-1 text-xs text-gray-600">
                        <input type="checkbox" checked={s.partial} onChange={(e) => updateSupport(idx, "partial", e.target.checked)} />
                        부분 지원
                      </label>
                      <button type="button" onClick={() => removeSupport(idx)} className="px-2 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600">삭제</button>
                    </div>
                    {s.partial && (
                      <div className="flex gap-2">
                        <input type="date" value={s.start_date || ""} onChange={(e) => updateSupport(idx, "start_date", e.target.value)} className="border rounded px-2 py-1 text-sm" min={form.start_date} max={form.end_date} />
                        <input type="date" value={s.end_date || ""} onChange={(e) => updateSupport(idx, "end_date", e.target.value)} className="border rounded px-2 py-1 text-sm" min={form.start_date} max={form.end_date} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={addSupport} className="mt-2 px-3 py-1 rounded bg-blue-500 text-white text-sm hover:bg-blue-600">+ 지원 인력 추가</button>
          </div>

          {msg && <p className="text-sm text-red-600">{msg}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={!requiredOk || invalidEnd} className="px-4 py-2 bg-black text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed">저장</button>
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded">취소</button>
          </div>
        </form>
      </div>
    </div>
  );
}
