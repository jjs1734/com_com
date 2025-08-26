// src/pages/EventUploadPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

// 부서 옵션 (행사를 직접 진행하는 4개 팀만)
const DEPT_OPTIONS = [
  "MK팀",
  "제약 1팀", "제약 2팀",
  "학회 1팀", "학회 2팀"
];

export default function EventUploadPage({ user, onCreated, showToast }) {
  const navigate = useNavigate();

  // 폼
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

  // DB에서 불러올 마스터들
  const [users, setUsers] = useState([]);
  const [hist, setHist] = useState({
    company: [],
    product: [],
    region: [],
    venue: [],
  });

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
            .filter((v) => !!v && v !== "미지정")
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

  // ✅ 부서 변경 시 후보에 없는 담당자면 초기화
  useEffect(() => {
    if (!form.department) {
      if (form.host) setForm((f) => ({ ...f, host: "" }));
      return;
    }
    if (form.host && !hostCandidates.includes(form.host)) {
      setForm((f) => ({ ...f, host: "" }));
    }
  }, [form.department, hostCandidates]);

  // ✅ 필수조건
  const requiredOk = useMemo(
    () =>
      form.event_name &&
      form.start_date &&
      form.end_date &&
      form.department &&
      form.host,
    [form]
  );

  // 종료일 검증
  const invalidEnd =
    form.start_date && form.end_date && form.end_date < form.start_date;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // ✅ 관리자 권한 확인 (도메인 직접 접근 차단)
    if (!user?.is_admin) {
      showToast("권한이 없습니다. 관리자만 행사를 업로드할 수 있습니다.", "error", 3000);
      return;
    }

    if (!requiredOk) {
      setMsg("필수 항목을 입력해 주세요.");
      return;
    }
    if (invalidEnd) {
      setMsg("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const payload = {
        event_name: form.event_name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        department: form.department,
        host: form.host,
        company_name: form.company_name || null,
        product_name: form.product_name || null,
        region: form.region || null,
        venue: form.venue || null,
      };

      const { error } = await supabase.from("events").insert(payload);
      if (error) throw error;

      if (typeof onCreated === "function") {
        await onCreated();
      }

      // ✅ 성공 토스트
      showToast("등록되었습니다.", "success");
      setTimeout(() => {
        navigate("/main", { replace: true });
      }, 1500);
    } catch (err) {
      console.error(err);
      // ✅ 실패 토스트
      showToast(err.message || "등록 중 오류가 발생했습니다.", "error", 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">행사 업로드</h1>

        {/* ✅ 관리자만 업로드 가능 */}
        {!user?.is_admin ? (
          <p className="text-red-600 text-sm">
            권한이 없습니다. 관리자만 행사를 업로드할 수 있습니다.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="bg-white rounded-xl border p-6 space-y-5">
            {/* 행사명 */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">행사명 *</label>
              <input
                name="event_name"
                value={form.event_name}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="예: Regional TTM Summit in Busan"
                required
              />
            </div>

            {/* 기간 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">시작일 *</label>
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
                <label className="block text-sm text-gray-700 mb-1">종료일 *</label>
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
                  <p className="mt-1 text-xs text-red-600">
                    종료일은 시작일보다 빠를 수 없습니다.
                  </p>
                )}
              </div>
            </div>

            {/* 부서 / 담당자 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">부서 *</label>
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
                <label className="block text-sm text-gray-700 mb-1">담당자 *</label>
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
                  {hostCandidates.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 클라이언트 / 제품 / 지역 / 장소 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">클라이언트</label>
                <input
                  name="company_name"
                  value={form.company_name}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  list="companyOptions"
                />
                <datalist id="companyOptions">
                  {hist.company.map((v) => <option key={v} value={v} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">제품</label>
                <input
                  name="product_name"
                  value={form.product_name}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  list="productOptions"
                />
                <datalist id="productOptions">
                  {hist.product.map((v) => <option key={v} value={v} />)}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">지역</label>
                <input
                  name="region"
                  value={form.region}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  list="regionOptions"
                />
                <datalist id="regionOptions">
                  {hist.region.map((v) => <option key={v} value={v} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">장소</label>
                <input
                  name="venue"
                  value={form.venue}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  list="venueOptions"
                />
                <datalist id="venueOptions">
                  {hist.venue.map((v) => <option key={v} value={v} />)}
                </datalist>
              </div>
            </div>

            {msg && <p className="text-sm text-gray-600">{msg}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !requiredOk || invalidEnd}
                className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
              >
                {loading ? "등록 중..." : "등록"}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded border"
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
