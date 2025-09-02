import { useMemo } from "react";
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

export default function DeptEventBarChart({ data, onSelect }) {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => b.total - a.total),
    [data]
  );

  return (
    <div className="bg-white shadow rounded-2xl p-4">
      <h2 className="text-lg font-semibold mb-4">부서별 행사 개수</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sortedData} layout="vertical" margin={{ left: 50 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="department" width={100} interval={0} />
          <Tooltip />
          <Bar
            dataKey="total"
            radius={[0, 6, 6, 0]}
            isAnimationActive={false}
            onClick={(data) =>
              onSelect && onSelect({ type: "department", value: data.department })
            }
          >
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={DEPT_COLORS[entry.department] || "#9ca3af"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
