// src/pages/EventUploadPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function EventUploadPage({ user, onCreated, showToast }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    event_name: "",
    start_date: "",
    end_date: "",
    setup_date: "",
    department: user?.department || "",
    host: user?.name || "",
    company_name: "",
    product_name: "",
    region: "",
    venue: "",
    event_type: "",
  });
  const [setupOption, setSetupOption] = useState(""); // "prev" | "same" | ""

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [users, setUsers] = useState([]);
  const [hist, setHist] = useState({ company: [], product: [], region: [], venue: [] });
  const [regions, setRegions] = useState([]);

  const [supports, setSupports] = useState([]);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: usersData } = await supabase.from("users").select("id, name, department, position");
        const { data: evData } = await supabase.from("events").select("company_name, product_name, region, venue");
        const { data: regionData } = await supabase.from("regions").select("id, name");

        const uniq = (arr) =>
  Array.from(
    new Set(
      (arr || [])
        .filter(Boolean)
        .map((v) => (typeof v === "string" ? v.trim() : v))  // 먼저 trim
    )
  )
    .filter((v) => !!v && v !== "-")
    .sort((a, b) => String(a).localeCompare(String(b), "ko"));

        setUsers(usersData || []);
        setRegions(regionData || []);
        setHist({
          company: uniq((evData || []).map((x) => x.company_name)),
          product: uniq((evData || []).map((x) => x.product_name)),
          region: uniq((evData || []).map((x) => x.region)),
          venue: uniq((evData || []).map((x) => x.venue)),
        });
      } catch (err) {
        console.error(err);
        setMsg("초기 데이터 불러오기 중 오류가 발생했습니다.");
      }
    };
    run();
  }, []);

  // setupOption 변화 시 setup_date 자동 반영
  useEffect(() => {
    if (!form.start_date) {
      setForm((f) => ({ ...f, setup_date: "" }));
      return;
    }
    if (setupOption === "prev") {
      const d = new Date(form.start_date);
      d.setDate(d.getDate() - 1);
      setForm((f) => ({ ...f, setup_date: d.toISOString().split("T")[0] }));
    } else if (setupOption === "same") {
      setForm((f) => ({ ...f, setup_date: form.start_date }));
    } else {
      setForm((f) => ({ ...f, setup_date: "" }));
    }
  }, [form.start_date, setupOption]);

  const hostCandidates = useMemo(() => {
    const dept = form.department;
    if (!dept) return [];
    const list = (users || []).filter((u) => u.department === dept);
    return Array.from(new Set(list.map((u) => u.name))).sort((a, b) => a.localeCompare(b, "ko"));
  }, [users, form.department]);

  useEffect(() => {
    if (!form.department) {
      if (form.host) setForm((f) => ({ ...f, host: "" }));
      return;
    }
    if (form.host && !hostCandidates.includes(form.host)) {
      setForm((f) => ({ ...f, host: "" }));
    }
  }, [form.department, hostCandidates]);

  const requiredOk = useMemo(
    () => form.event_name && form.start_date && form.end_date && form.department && form.host && form.event_type,
    [form]
  );

  const invalidEnd = form.start_date && form.end_date && form.end_date < form.start_date;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const addSupport = () => {
    setSupports((s) => [
      ...s,
      { user_id: "", name: "", partial: false, start_date: form.start_date, end_date: form.end_date, showDropdown: false },
    ]);
  };
  const updateSupport = (idx, key, value) => setSupports((s) => s.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));
  const removeSupport = (idx) => setSupports((s) => s.filter((_, i) => i !== idx));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.is_admin) {
      showToast("권한이 없습니다. 관리자만 행사를 업로드할 수 있습니다.", "error", 3000);
      return;
    }
    setLoading(true);
    setMsg(null);

    try {
      if (!requiredOk) {
        setMsg("필수 항목을 입력해 주세요.");
        return;
      }
      if (invalidEnd) {
        setMsg("종료일은 시작일보다 빠를 수 없습니다.");
        return;
      }

      const hostUser = users.find((u) => u.name === form.host);
      const regionMatch = regions.find((r) => r.name === form.region);
      const region_id = regionMatch ? regionMatch.id : null;

      const eventPayload = {
        ...form,
        host_id: hostUser ? hostUser.id : null,
        region_id,
        setup_date: form.setup_date || null,
      };

      const { data: newEvent, error: e1 } = await supabase.from("events").insert(eventPayload).select("id").single();
      if (e1) throw e1;

      let supportPayloads = [];
      supports.forEach((s) => {
        if (!s.user_id) return;
        const u = users.find((uu) => uu.id === s.user_id);
        if (!u || u.name === form.host || u.department === "디자인팀") return;

        const start = s.partial ? s.start_date : form.start_date;
        const end = s.partial ? s.end_date : form.end_date;
        if (!start || !end) return;
        const dates = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
        dates.forEach((d) => {
          supportPayloads.push({
            event_id: newEvent.id,
            user_id: s.user_id,
            support_date: formatISO(d, { representation: "date" }),
          });
        });
      });
      if (supportPayloads.length > 0) {
        const { error: e2 } = await supabase.from("event_supports").insert(supportPayloads);
        if (e2) throw e2;
      }

      if (typeof onCreated === "function") await onCreated();
      showToast("등록되었습니다.", "success");
      setTimeout(() => navigate("/main", { replace: true }), 2000);
    } catch (err) {
      console.error(err);
      showToast(err.message || "등록 중 오류가 발생했습니다.", "error", 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">행사 업로드</h1>

        {!user?.is_admin ? (
          <p className="text-red-600 text-sm">권한이 없습니다. 관리자만 행사를 업로드할 수 있습니다.</p>
        ) : (
          <form onSubmit={onSubmit} className="bg-white rounded-xl border p-6 space-y-5">
            {/* 행사명 */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">행사명 *</label>
              <input name="event_name" value={form.event_name} onChange={onChange} className="w-full border rounded px-3 py-2" />
            </div>

            {/* 기간 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">시작일 *</label>
                <input type="date" name="start_date" value={form.start_date} onChange={onChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">종료일 *</label>
                <input type="date" name="end_date" value={form.end_date} onChange={onChange} className="w-full border rounded px-3 py-2" min={form.start_date || undefined} />
              </div>
            </div>

            {/* 세팅일 선택 */}
<div>
  <label className="block text-sm mb-1">세팅일</label>
  <div className="flex gap-4 items-center">
    <label className="flex items-center gap-1">
      <input
        type="checkbox"
        checked={setupOption === "prev"}
        onChange={() => setSetupOption(setupOption === "prev" ? "" : "prev")}
      />
      전날 세팅
    </label>
    <label className="flex items-center gap-1">
      <input
        type="checkbox"
        checked={setupOption === "same"}
        onChange={() => setSetupOption(setupOption === "same" ? "" : "same")}
      />
      당일 세팅
    </label>
  </div>
</div>


            {/* 부서 / 담당자 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">부서 *</label>
                <select name="department" value={form.department} onChange={onChange} className="w-full border rounded px-3 py-2 bg-white">
                  <option value="">선택</option>
                  {DEPT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">담당자 *</label>
                <select name="host" value={form.host} onChange={onChange} className="w-full border rounded px-3 py-2 bg-white" disabled={!form.department || hostCandidates.length === 0}>
                  <option value="">{!form.department ? "부서를 먼저 선택하세요" : "담당자 선택"}</option>
                  {hostCandidates.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>

            {/* 행사 유형 */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">행사 유형 *</label>
              <select name="event_type" value={form.event_type} onChange={onChange} className="w-full border rounded px-3 py-2 bg-white">
                <option value="">선택</option>
                {EVENT_TYPE_OPTIONS.map((et) => <option key={et} value={et}>{et}</option>)}
              </select>
            </div>

            {/* 지원 인력 */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-medium mb-2">지원 인력</h3>
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

            {/* 클라이언트 / 제품 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">클라이언트</label>
                <input name="company_name" value={form.company_name} onChange={onChange} className="w-full border rounded px-3 py-2" list="companyOptions" />
                <datalist id="companyOptions">
                  {hist.company.map((v) => <option key={v} value={v} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">제품</label>
                <input name="product_name" value={form.product_name} onChange={onChange} className="w-full border rounded px-3 py-2" list="productOptions" />
                <datalist id="productOptions">
                  {hist.product.map((v) => <option key={v} value={v} />)}
                </datalist>
              </div>
            </div>

            {/* 지역 / 장소 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">지역</label>
                <input name="region" value={form.region} onChange={onChange} className="w-full border rounded px-3 py-2" list="regionOptions" />
                <datalist id="regionOptions">
                  {hist.region.map((v) => <option key={v} value={v} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">장소</label>
                <input name="venue" value={form.venue} onChange={onChange} className="w-full border rounded px-3 py-2" list="venueOptions" />
                <datalist id="venueOptions">
                  {hist.venue.map((v) => <option key={v} value={v} />)}
                </datalist>
              </div>
            </div>

            {msg && <p className="text-sm text-red-600">{msg}</p>}

            <div className="flex gap-3">
              <button type="submit" disabled={!requiredOk || invalidEnd} className="px-4 py-2 bg-black text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed">등록</button>
              <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded border">취소</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
