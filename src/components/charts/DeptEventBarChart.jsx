// src/components/charts/DeptEventBarChart.jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";

const COLORS = {
  "제약 1팀": "#0369a1",  // 파랑
  "제약 2팀": "#9333ea",  // 보라
  "학회 1팀": "#b45309",  // 주황
  "학회 2팀": "#be185d",  // 핑크
};

export default function DeptEventBarChart({ data, onSelect }) {
  return (
    <div className="bg-white shadow rounded-2xl p-4">
      <h2 className="text-lg font-semibold mb-4">부서별 행사 개수</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="department" />
          <YAxis />
          <Tooltip />
          <Bar
            dataKey="total"
            radius={[6, 6, 0, 0]}
            onClick={(entry) => onSelect({ type: "department", value: entry.department })}
          >
            {data.map((entry) => (
              <Cell key={entry.department} fill={COLORS[entry.department]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
