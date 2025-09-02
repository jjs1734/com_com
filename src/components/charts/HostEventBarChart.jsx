import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

const DEPT_COLORS = {
  "제약 1팀": "#0369a1",
  "제약 2팀": "#9333ea",
  "학회 1팀": "#b45309",
  "학회 2팀": "#be185d",
};

export default function HostEventBarChart({ data, onSelect }) {
  const [showAll, setShowAll] = useState(false);

  const sortedData = useMemo(
    () => [...data].sort((a, b) => b.total - a.total),
    [data]
  );

  const topData = useMemo(() => sortedData.slice(0, 10), [sortedData]);

  return (
    <div className="bg-white shadow rounded-2xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">주최자별 행사 통계</h2>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200"
        >
          {showAll ? "차트로 보기" : "전체 보기"}
        </button>
      </div>

      {!showAll ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topData} layout="vertical" margin={{ left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="host" width={120} interval={0} />
            <Tooltip />
            <Bar
              dataKey="total"
              radius={[0, 6, 6, 0]}
              isAnimationActive={false}
              onClick={(data) =>
                onSelect && onSelect({ type: "host", value: data.host })
              }
            >
              {topData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={DEPT_COLORS[entry.department] || "#9ca3af"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] overflow-y-auto border rounded">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="px-3 py-2 text-left">주최자</th>
                <th className="px-3 py-2 text-left">부서</th>
                <th className="px-3 py-2 text-center">행사 개수</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((h, idx) => (
                <tr
                  key={idx}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    onSelect && onSelect({ type: "host", value: h.host })
                  }
                >
                  <td className="px-3 py-2">{h.host}</td>
                  <td className="px-3 py-2">
                    <span
                      className="px-2 py-1 rounded text-white text-xs"
                      style={{ backgroundColor: DEPT_COLORS[h.department] || "#6b7280" }}
                    >
                      {h.department}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">{h.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
