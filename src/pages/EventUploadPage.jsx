// src/pages/EventUploadPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";   // ✅ 엑셀 처리 라이브러리

// 부서 옵션 (행사를 직접 진행하는 4개 팀만)
const DEPT_OPTIONS = [
  "MK팀",
  "제약 1팀", "제약 2팀",
  "학회 1팀", "학회 2팀"
];

export default function EventUploadPage({ user, onCreated, showToast }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // 폼 (단일 등록)
  const [form, setForm] = useState({
    event_name: "",
    start_date: "",
    end_date: "",
    department: user?.department || "",
    host: user?.name || "",
    company_name: "",
    product_name: "",
    region: "",
    venue: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const [users, setUsers] = useState([]);
  const [hist, setHist] = useState({ company: [], product: [], region: [], venue: [] });

  const [bulkData, setBulkData] = useState([]);
  const [fileName, setFileName] = useState("");

  // ✅ 지원 인력 state
  const [supportUser, setSupportUser] = useState("");
  const [supportDate, setSupportDate] = useState("");
  const [supports, setSupports] = useState([]); // { user_id, name, department, date }

  // 최초 로딩
  useEffect(() => {
    const run = async () => {
      try {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, name, department, position");

        const { data: evData } = await supabase
          .from("events")
          .select("company_name, product_name, region, venue");

        const uniq = (arr) =>
          Array.from(new Set((arr || []).filter(Boolean)))
            .map((v) => (typeof v === "string" ? v.trim() : v))
            .filter((v) => !!v && v !== "-")
            .sort((a, b) => String(a).localeCompare(String(b), "ko"));

        setUsers(usersData || []);
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

  // ✅ 부서별 담당자 후보
  const hostCandidates = useMemo(() => {
    const dept = form.department;
    if (!dept) return [];
    const list = (users || []).filter((u) => u.department === dept);
    return Array.from(new Set(list.map((u) => u.name))).sort((a, b) =>
      a.localeCompare(b, "ko")
    );
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
    () =>
      form.event_name &&
      form.start_date &&
      form.end_date &&
      form.department &&
      form.host,
    [form]
  );

  const invalidEnd =
    form.start_date && form.end_date && form.end_date < form.start_date;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // ✅ 엑셀 템플릿 다운로드
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["event_name", "start_date", "end_date", "department", "host", "company_name", "product_name", "region", "venue"],
      ["예시 행사", "2025-01-01", "2025-01-02", "학회 1팀", "홍길동", "ABC제약", "항암제", "서울", "COEX"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EventsTemplate");
    XLSX.writeFile(wb, "event_upload_template.xlsx");
  };

  // ✅ 엑셀 파일 업로드
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      setBulkData(rows);
      setFileName(file.name);
      showToast(`${rows.length}건의 데이터가 업로드 준비되었습니다.`, "success");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCancelFile = () => {
    setBulkData([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    showToast("엑셀 업로드가 취소되었습니다.", "info");
  };

  const toDateStr = (val) => {
    if (!val) return null;
    if (typeof val === "number") {
      const d = XLSX.SSF.parse_date_code(val);
      if (!d) return null;
      const yyyy = d.y;
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return String(val);
  };

  // ✅ 지원 인력 추가/삭제
  const addSupport = () => {
    if (!supportUser || !supportDate) {
      showToast("지원자와 날짜를 선택하세요", "error");
      return;
    }
    const u = users.find((x) => x.id === supportUser);
    if (!u) return;
    const exists = supports.find((s) => s.user_id === u.id && s.date === supportDate);
    if (exists) {
      showToast("이미 추가된 지원자/날짜입니다.", "error");
      return;
    }
    setSupports([...supports, { user_id: u.id, name: u.name, department: u.department, date: supportDate }]);
    setSupportUser("");
    setSupportDate("");
  };

  const removeSupport = (user_id, date) => {
    setSupports(supports.filter((s) => !(s.user_id === user_id && s.date === date)));
  };

  // ✅ 등록
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.is_admin) {
      showToast("권한이 없습니다. 관리자만 행사를 업로드할 수 있습니다.", "error", 3000);
      return;
    }
    setLoading(true);
    setMsg(null);

    try {
      if (bulkData.length > 0) {
        // 📦 엑셀 업로드는 지원 인력 미지원
        const payloads = bulkData.map((row) => {
          const hostUser = users.find((u) => u.name === row.host);
          return {
            event_name: row.event_name?.trim(),
            start_date: toDateStr(row.start_date),
            end_date: toDateStr(row.end_date),
            department: row.department,
            host: row.host,
            host_id: hostUser ? hostUser.id : null,
            company_name: row.company_name || null,
            product_name: row.product_name || null,
            region: row.region || null,
            venue: row.venue || null,
          };
        }).filter(p => p.event_name && p.start_date && p.end_date && p.department && p.host);

        const { error } = await supabase.from("events").insert(payloads);
        if (error) throw error;
        if (typeof onCreated === "function") await onCreated();
        showToast(`총 ${payloads.length}건 업로드 완료`, "success");
      } else {
        if (!requiredOk) {
          setMsg("필수 항목을 입력해 주세요.");
          return;
        }
        if (invalidEnd) {
          setMsg("종료일은 시작일보다 빠를 수 없습니다.");
          return;
        }

        const hostUser = users.find((u) => u.name === form.host);
        const eventPayload = {
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

        const { data: newEvent, error: e1 } = await supabase.from("events").insert(eventPayload).select("id").single();
        if (e1) throw e1;

        if (supports.length > 0) {
          const supportPayloads = supports.map((s) => ({
            event_id: newEvent.id,
            user_id: s.user_id,
            support_date: s.date,
          }));
          const { error: e2 } = await supabase.from("event_supports").insert(supportPayloads);
          if (e2) throw e2;
        }

        if (typeof onCreated === "function") await onCreated();
        showToast("등록되었습니다.", "success");
      }

      setTimeout(() => navigate("/main", { replace: true }), 2000);
    } catch (err) {
      console.error(err);
      showToast(err.message || "등록 중 오류가 발생했습니다.", "error", 3000);
    } finally {
      setLoading(false);
      setBulkData([]);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
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
            {/* 📂 엑셀 업로드 */}
            <div className="flex items-center gap-4">
              <button type="button" onClick={downloadTemplate} className="px-3 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 text-sm">
                양식 다운로드
              </button>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} ref={fileInputRef} className="text-sm" />
              {bulkData.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-sm">{fileName} ({bulkData.length}건 준비됨)</span>
                  <button type="button" onClick={handleCancelFile} className="px-2 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600">
                    삭제
                  </button>
                </div>
              )}
            </div>

            <hr className="my-4" />

            {bulkData.length === 0 && (
              <>
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

                {/* 지원 인력 */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-sm font-medium mb-2">지원 인력 추가</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <select value={supportUser} onChange={(e) => setSupportUser(e.target.value)} className="border px-2 py-1 rounded bg-white text-sm">
                      <option value="">지원자 선택</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.department})</option>
                      ))}
                    </select>
                    <input type="date" value={supportDate} onChange={(e) => setSupportDate(e.target.value)} className="border px-2 py-1 rounded text-sm" min={form.start_date} max={form.end_date} />
                    <button type="button" onClick={addSupport} className="px-3 py-1 rounded bg-blue-500 text-white text-sm">추가</button>
                  </div>
                  {supports.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {supports.map((s, idx) => (
                        <li key={idx} className="flex justify-between items-center">
                          <span>{s.name} [{s.department}] · {s.date}</span>
                          <button type="button" onClick={() => removeSupport(s.user_id, s.date)} className="text-red-500 hover:underline text-xs">삭제</button>
                        </li>
                      ))}
                    </ul>
                  )}
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
              </>
            )}

            {msg && <p className="text-sm text-gray-600">{msg}</p>}

            <div className="flex gap-3">
              <button type="submit" disabled={loading || invalidEnd} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
                {loading ? "등록 중..." : bulkData.length > 0 ? "엑셀 등록" : "등록"}
              </button>
              <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded border">취소</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
