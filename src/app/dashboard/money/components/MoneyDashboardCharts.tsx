"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

type ChartPoint = {
  name: string;
  value: number;
  secondary?: number;
};

type ChartCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const chartColors = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa"];

function useChartReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return ready;
}

function ChartLoadingState() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-[#2a3242] bg-[#111827] text-sm text-[#7f8da3]">
      Preparing chart...
    </div>
  );
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <section className="beast-card">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[#7f8da3]">{subtitle}</p>
      </div>
      <div className="mt-4 h-64 min-w-0">{children}</div>
    </section>
  );
}

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3 text-xs text-[#c7cfdb] shadow-xl">
      <div className="font-semibold text-white">{label}</div>
      {payload.map((item) => (
        <div key={item.name} className="mt-1">
          {item.name}: {formatCurrency(Number(item.value || 0))}
        </div>
      ))}
    </div>
  );
}

function SnapshotBarChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#2a3242" vertical={false} />
        <XAxis dataKey="name" stroke="#7f8da3" tick={{ fontSize: 12 }} />
        <YAxis
          stroke="#7f8da3"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${Number(value)}`}
          width={54}
        />
        <Tooltip content={<MoneyTooltip />} />
        <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function MoneyPieChart({ data }: { data: ChartPoint[] }) {
  const filtered = data.filter((point) => point.value > 0);

  if (filtered.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-[#2a3242] bg-[#111827] text-sm text-[#7f8da3]">
        No current values available yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={3}
        >
          {filtered.map((entry, index) => (
            <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
          ))}
        </Pie>
        <Tooltip content={<MoneyTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CashFlowTrendChart({ data }: { data: ChartPoint[] }) {
  const ready = useChartReady();

  return (
    <ChartCard
      title="Cash Flow Trend"
      subtitle="Current cycle snapshot until historical cashflow trend data is available."
    >
      {ready ? <SnapshotBarChart data={data} /> : <ChartLoadingState />}
    </ChartCard>
  );
}

export function DebtPayoffProgressChart({
  remainingDebt,
}: {
  remainingDebt: number;
}) {
  const ready = useChartReady();

  return (
    <ChartCard
      title="Debt Payoff Progress"
      subtitle="Active remaining debt balance. Historical payoff progress will attach here later."
    >
      {ready ? (
        <SnapshotBarChart data={[{ name: "Remaining", value: remainingDebt }]} />
      ) : (
        <ChartLoadingState />
      )}
    </ChartCard>
  );
}

export function IncomeVsExpensesChart({ data }: { data: ChartPoint[] }) {
  const ready = useChartReady();

  return (
    <ChartCard
      title="Income vs Expenses"
      subtitle="Current monthly income compared with known bills and debt obligations."
    >
      {ready ? <SnapshotBarChart data={data} /> : <ChartLoadingState />}
    </ChartCard>
  );
}

export function CreditUtilizationChart({
  used,
  available,
}: {
  used: number;
  available: number;
}) {
  const ready = useChartReady();

  return (
    <ChartCard
      title="Credit Utilization"
      subtitle="Known credit balances compared with available tracked credit."
    >
      {ready ? (
        <MoneyPieChart
          data={[
            { name: "Used", value: used },
            { name: "Available", value: available },
          ]}
        />
      ) : (
        <ChartLoadingState />
      )}
    </ChartCard>
  );
}

export function MonthlySpendingOverviewChart({ data }: { data: ChartPoint[] }) {
  const ready = useChartReady();

  return (
    <ChartCard
      title="Monthly Spending Overview"
      subtitle="Known monthly outflow categories from current Money records."
    >
      {ready ? <MoneyPieChart data={data} /> : <ChartLoadingState />}
    </ChartCard>
  );
}
