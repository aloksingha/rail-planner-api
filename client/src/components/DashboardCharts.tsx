import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  date: string;
  transactions: number;
  amount: number;
}

interface RevenueChartProps {
  data: ChartDataPoint[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} opacity={0.5} />
        <XAxis dataKey="date" stroke="currentColor" className="text-slate-500 dark:text-slate-600" tick={{ fontSize: 10, fontWeight: 800 }} tickLine={false} axisLine={false} />
        <YAxis stroke="currentColor" className="text-slate-500 dark:text-slate-600" tick={{ fontSize: 10, fontWeight: 800 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `₹${v.toLocaleString()}`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
          itemStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#f8fafc' }}
          cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
        />
        <Area type="monotone" name="Amount" dataKey="amount" stroke="#0D9488" strokeWidth={4} fill="url(#colorAmount)" activeDot={{ r: 6, fill: '#0D9488', strokeWidth: 0 }} />
        <Area type="monotone" name="Transactions" dataKey="transactions" stroke="#0EA5E9" strokeWidth={4} fill="url(#colorTransactions)" activeDot={{ r: 6, fill: '#0EA5E9', strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
