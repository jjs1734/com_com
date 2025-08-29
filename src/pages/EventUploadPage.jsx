import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { eachDayOfInterval, parseISO, formatISO } from "date-fns";

// 부서 옵션
const DEPT_OPTIONS = [
  "MK팀",
  "제약 1팀", "제약 2팀",
  "학회 1팀", "학회 2팀"
];

export default function EventUploadPage({ user, onCreated, showToast }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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

  // ✅ 지원 인력 state { user_id, name, partial, start_date, end_date, showDropdown }
  const [supports, setSupports] = useState([]);

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

  // 담당자 후보
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

  // 엑셀 템플릿
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "event_name", "start_date", "end_date",
        "department", "host", "company_name",
        "product_name", "region", "venue",
        "support_name", "support_start_date", "support_end_date"
      ],
      [
        "예시 행사", "2025-01-01", "2025-01-03",
        "학회 1팀", "홍길동", "ABC제약",
        "항암제", "서울", "COEX",
        "이몽룡", "2025-01-02", "2025-01-03"
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EventsTemplate");
    XLSX.writeFile(wb, "event_upload_template.xlsx");
  };

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

  // 지원 인력 수동 추가
  const addSupport = () => {
    setSupports((s) => [
      ...s,
      { user_id: "", name: "", partial: false, start_date: form.start_date, end_date: form.end_date, showDropdown: false }
    ]);
  };

  const updateSupport = (idx, key, value) => {
    setSupports((s) =>
      s.map((item, i) => (i === idx ? { ...item, [key]: value } : item))
    );
  };

  const removeSupport = (idx) => {
    setSupports((s) => s.filter((_, i) => i !== idx));
  };

  // 등록
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
        // 📦 엑셀 업로드
        for (const row of bulkData) {
          const hostUser = users.find((u) => u.name === row.host);

          const eventPayload = {
            event_name: row.event_name?.trim(),
            start_date: row.start_date,
            end_date: row.end_date,
            department: row.department,
            host: row.host,
            host_id: hostUser ? hostUser.id : null,
            company_name: row.company_name || null,
            product_name: row.product_name || null,
            region: row.region || null,
            venue: row.venue || null,
          };

          const { data: newEvent, error: e1 } = await supabase
            .from("events")
            .insert(eventPayload)
            .select("id")
            .single();
          if (e1) throw e1;

          // 지원 인력 있으면 처리 (host/디자인팀 제외)
          if (row.support_name) {
            const supportUser = users.find(
              (u) =>
                u.name === row.support_name &&
                u.name !== row.host &&
                u.department !== "디자인팀"
            );
            if (supportUser) {
              const start = row.support_start_date || row.start_date;
              const end = row.support_end_date || row.end_date;
              const dates = eachDayOfInterval({
                start: parseISO(start),
                end: parseISO(end),
              });
              const supportPayloads = dates.map((d) => ({
                event_id: newEvent.id,
                user_id: supportUser.id,
                support_date: formatISO(d, { representation: "date" }),
              }));
              const { error: e2 } = await supabase
                .from("event_supports")
                .insert(supportPayloads);
              if (e2) throw e2;
            }
          }
        }
        if (typeof onCreated === "function") await onCreated();
        showToast(`총 ${bulkData.length}건 업로드 완료`, "success");
      } else {
        // 단일 입력
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

        const { data: newEvent, error: e1 } = await supabase
          .from("events")
          .insert(eventPayload)
          .select("id")
          .single();
        if (e1) throw e1;

        // 지원 인력 저장 (host/디자인팀 제외)
        let supportPayloads = [];
        supports.forEach((s) => {
          if (!s.user_id) return;
          const u = users.find((uu) => uu.id === s.user_id);
          if (!u || u.name === form.host || u.department === "디자인팀") return;

          const start = s.partial ? s.start_date : form.start_date;
          const end = s.partial ? s.end_date : form.end_date;
          if (!start || !end) return;
          const dates = eachDayOfInterval({
            start: parseISO(start),
            end: parseISO(end),
          });
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
            {/* 엑셀 업로드 */}
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

                {/* 지원 인력 수동 추가 */}
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
                            <input
                              type="text"
                              value={s.name}
                              onChange={(e) => {
                                updateSupport(idx, "name", e.target.value);
                                updateSupport(idx, "showDropdown", true);
                              }}
                              onFocus={() => updateSupport(idx, "showDropdown", true)}
                              className="flex-1 border rounded px-2 py-1 text-sm"
                              placeholder="직원 이름 검색"
                            />
                            {s.showDropdown && filteredUsers.length > 0 && (
                              <ul className="absolute top-9 left-0 w-full bg-white border rounded shadow z-10 max-h-40 overflow-y-auto text-sm">
                                {filteredUsers.map((u) => (
                                  <li
                                    key={u.id}
                                    onClick={() => {
                                      updateSupport(idx, "user_id", u.id);
                                      updateSupport(idx, "name", u.name);
                                      updateSupport(idx, "showDropdown", false);
                                    }}
                                    className="px-2 py-1 hover:bg-blue-100 cursor-pointer"
                                  >
                                    {u.name} ({u.department}/{u.position})
                                  </li>
                                ))}
                              </ul>
                            )}

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
                                min={form.start_date}
                                max={form.end_date}
                              />
                              <input
                                type="date"
                                value={s.end_date || ""}
                                onChange={(e) => updateSupport(idx, "end_date", e.target.value)}
                                className="border rounded px-2 py-1 text-sm"
                                min={form.start_date}
                                max={form.end_date}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={addSupport}
                    className="mt-2 px-3 py-1 rounded bg-blue-500 text-white text-sm hover:bg-blue-600"
                  >
                    + 지원 인력 추가
                  </button>
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
