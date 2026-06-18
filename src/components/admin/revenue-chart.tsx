"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";

interface RevenueChartProps {
  data: { date: string; amount: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  // Riempiamo i giorni vuoti per gli ultimi 14 giorni
  const chartData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }).map((_, i) => {
      const d = subDays(new Date(), 13 - i);
      return format(d, "yyyy-MM-dd");
    });

    return last14Days.map((dateStr) => {
      const found = data.find((d) => d.date.startsWith(dateStr));
      return {
        date: format(parseISO(dateStr), "dd MMM", { locale: it }),
        amount: found ? found.amount : 0,
      };
    });
  }, [data]);

  if (!mounted) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center rounded-3xl bg-slate-900/10 border border-slate-800/40">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-500" />
          <p className="text-xs text-slate-500 font-medium tracking-wide">Caricamento grafico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
          <XAxis 
            dataKey="date" 
            stroke="#64748b" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `€${value}`}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: "#0f172a", 
              border: "1px solid #1e293b",
              borderRadius: "12px",
              color: "#f8fafc",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
            }}
            itemStyle={{ color: "#22d3ee", fontWeight: 600 }}
            formatter={(value: any) => [`€${Number(value).toFixed(2)}`, "Incasso"]}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#06b6d4"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorAmount)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
