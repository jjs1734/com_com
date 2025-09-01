import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function MonthlyEventLineChart({ data, onSelect }) {
  const sortedData = [...data].sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="bg-white shadow rounded-2xl p-4">
      <h2 className="text-lg font-semibold mb-4">월별 행사 추이</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={sortedData}
          onClick={(e) => {
            if (e && e.activeLabel) onSelect({ type: "month", value: e.activeLabel });
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            isAnimationActive={false}   // ✅ 애니메이션 끔
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
