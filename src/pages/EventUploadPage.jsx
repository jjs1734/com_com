// src/pages/EventUploadPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

// 부서 옵션 (원하는 순서로)
const DEPT_OPTIONS = [
  "대표이사","관리부","MK팀",
  "제약 1팀","제약 2팀",
  "학회 1팀","학회 2팀",
  "디지털마케팅팀","디자인팀"
];

export default function EventUploadPage({ user, onCreated }) {
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
  const [toast, setToast] = useState(""); // ✅ 토스트 메시지

  // DB에서 불러올 마스터들
  const [users, setUsers] = useState([]); // {id, name, department, position}
  const [hist, setHist] = useState({
    company: [],
    product: [],
    region: [],
    venue: [],
  });

  // 최초 로딩: 사용자 목록 + 기존 이벤트 값들(중복 제거)
  useEffect(() => {
    const run = async () => {
      try {
        const { data: usersData, error: uerr } = await supabase
          .from("users")
          .select("id, name, department, position");
        if (uerr) throw uerr;

        const { data: evData, error: eerr } = await supabase
          .from("events")
          .select("company_name, product_name, region, venue");
        if (eerr) throw eerr;

        const uniq = (arr) =>
          Array.from(
            new Set(
              (arr || [])
                .map((v) => (typeof v === "string" ? v.trim() : v))
                .filter((v) => !!v && v !== "미지정")
            )
          ).sort((a, b) => String(a).localeCompare(String(b), "ko"));

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

  // 부서별 담당자 후보 (부서 선택시 필터링)
  const hostCandidates = useMemo(() => {
    const dept = form.department;
    const list = (users || []).filter((u) =>
      dept ? u.department === dept : true
    );
    return Array.from(new Set(list.map((u) => u.name))).sort((a, b) =>
      a.localeCompare(b, "ko")
    );
  }, [users, form.department]);

  const requiredOk = useMemo(
    () => form.event_name && form.start_date && form.end_date && form.department,
    [form]
  );

  // ✅ 종료일 검증: 시작일보다 빠르면 invalid
  const invalidEnd =
    form.start_date && form.end_date && form.end_date < form.start_date;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!requiredOk) {
      setMsg("필수 항목을 입력해 주세요.");
      return;
    }
    // ✅ 제출 차단
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
        department: form.department || null,
        host: form.host || null, // 문자열(담당자 이름)
        company_name: form.company_name || null,
        product_name: form.product_name || null,
        region: form.region || null,
        venue: form.venue || null,
      };

      const { error } = await supabase.from("events").insert(payload);
      if (error) throw error;

      // ✅ 저장 후 전체 목록 즉시 갱신
      if (typeof onCreated === "function") {
        await onCreated();
      }

      // ✅ 토스트 표시 후 메인으로 이동
      setToast("등록되었습니다.");
      setTimeout(() => {
        navigate("/main", { replace: true });
      }, 1200);
    } catch (err) {
      console.error(err);
      setMsg(err.message || "등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">행사 업로드</h1>

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
                // ✅ 브라우저 단에서 시작일 이전 날짜 선택 불가
                min={form.start_date || undefined}
              />
              {/* ✅ 에러 메시지 */}
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
                onChange={(e) => {
                  const nextDept = e.target.value;
                  setForm((f) => {
                    const keep =
                      f.host && hostCandidates.includes(f.host) && nextDept === f.department
                        ? f.host
                        : "";
                    return { ...f, department: nextDept, host: keep };
                  });
                }}
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
              <label className="block text-sm text-gray-700 mb-1">
                담당자 <span className="text-gray-400">(선택 또는 직접 입력)</span>
              </label>
              <input
                name="host"
                value={form.host}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                list="hostOptions"
                placeholder="예: 정진수"
              />
              <datalist id="hostOptions">
                {hostCandidates.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 클라이언트 / 제품 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                클라이언트 <span className="text-gray-400">(선택 또는 입력)</span>
              </label>
              <input
                name="company_name"
                value={form.company_name}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                list="companyOptions"
                placeholder="예: BD Korea"
              />
              <datalist id="companyOptions">
                {hist.company.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                제품 <span className="text-gray-400">(선택 또는 입력)</span>
              </label>
              <input
                name="product_name"
                value={form.product_name}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                list="productOptions"
                placeholder="예: 미지정"
              />
              <datalist id="productOptions">
                {hist.product.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 지역 / 장소 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                지역 <span className="text-gray-400">(선택 또는 입력)</span>
              </label>
              <input
                name="region"
                value={form.region}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                list="regionOptions"
                placeholder="예: 부산"
              />
              <datalist id="regionOptions">
                {hist.region.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                장소 <span className="text-gray-400">(선택 또는 입력)</span>
              </label>
              <input
                name="venue"
                value={form.venue}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                list="venueOptions"
                placeholder="예: 그랜드조선 부산"
              />
              <datalist id="venueOptions">
                {hist.venue.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
          </div>

          {msg && <p className="text-sm text-gray-600">{msg}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              // ✅ 비활성 조건에 invalidEnd 추가
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
      </div>

      {/* ✅ 토스트 */}
      {toast && (
        <div
          role="status"
          className="fixed left-1/2 bottom-8 -translate-x-1/2 px-4 py-2 rounded-lg bg-black text-white text-sm shadow-lg animate-fadein"
        >
          {toast}
        </div>
      )}

      <style>{`
        @keyframes fadein {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fadein { animation: fadein .24s ease-out; }
      `}</style>
    </div>
  );
}
