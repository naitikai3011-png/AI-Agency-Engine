import { useQueryClient } from "@tanstack/react-query";
import {
  useGetChsCurrent,
  getGetChsCurrentQueryKey,
  useGetChsHistory,
  getGetChsHistoryQueryKey,
} from "@workspace/api-client-react";
import { Activity, BrainCircuit, Sparkles, Layers, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { CHSAvatar } from "@/components/chs-avatar";
import type { ChsBand } from "@/components/chs-avatar";

const HEALTH = {
  critical: { label: "CRITICAL", color: "text-red-500", border: "border-red-500", bg: "bg-red-500/10", stroke: "#ef4444" },
  poor: { label: "POOR", color: "text-orange-500", border: "border-orange-500", bg: "bg-orange-500/10", stroke: "#f97316" },
  fair: { label: "FAIR", color: "text-yellow-500", border: "border-yellow-500", bg: "bg-yellow-500/10", stroke: "#eab308" },
  good: { label: "GOOD", color: "text-blue-500", border: "border-blue-500", bg: "bg-blue-500/10", stroke: "#3b82f6" },
  thriving: { label: "THRIVING", color: "text-green-500", border: "border-green-500", bg: "bg-green-500/10", stroke: "#22c55e" },
} as const;

const FACTORS = [
  { key: "complexity" as const, label: "Complexity", icon: BrainCircuit, color: "bg-blue-500" },
  { key: "originality" as const, label: "Originality", icon: Sparkles, color: "bg-purple-500" },
  { key: "depth" as const, label: "Depth", icon: Layers, color: "bg-emerald-500" },
  { key: "effort" as const, label: "Effort (Proof of Work)", icon: ShieldCheck, color: "bg-orange-500" },
];

export default function Mirror() {
  const queryClient = useQueryClient();
  const { data: chs, isLoading: isLoadingCurrent } = useGetChsCurrent({
    query: { queryKey: getGetChsCurrentQueryKey() },
  });
  const { data: history, isLoading: isLoadingHistory } = useGetChsHistory({
    query: { queryKey: getGetChsHistoryQueryKey() },
  });

  const band: ChsBand = (chs?.band as ChsBand) ?? "fair";
  const health = HEALTH[band];

  // History comes back ordered by date ASC (oldest→newest) — correct order for a chart
  const chartData = (history ?? []).map((h) => ({
    date: format(new Date(h.date), "MMM d"),
    score: h.averageScore,
  }));

  async function handleRecordSample() {
    await fetch("/api/chs/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "I'm reflecting on my cognitive engagement patterns and why I rely on AI versus thinking independently.",
        context: "Manual reflection",
      }),
    });
    await queryClient.invalidateQueries({ queryKey: getGetChsCurrentQueryKey() });
    await queryClient.invalidateQueries({ queryKey: getGetChsHistoryQueryKey() });
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between border-b-2 border-border pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-foreground flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-primary" /> Atrophy Mirror
          </h1>
          <p className="text-muted-foreground mt-1 uppercase text-xs tracking-wider">
            Reflecting your true cognitive independence
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Avatar & score column */}
        <div className="lg:col-span-1 flex flex-col items-center space-y-6">

          {/* Animated Avatar */}
          <div className={`relative w-64 h-64 border-4 ${health.border} bg-card flex items-center justify-center overflow-visible transition-colors duration-700`}>
            <div className={`absolute inset-0 opacity-10 ${health.bg} transition-colors duration-700`} />
            {/* Scanlines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.07)_50%)] bg-[length:100%_4px] pointer-events-none z-10" />
            {isLoadingCurrent ? (
              <Skeleton className="w-40 h-40 rounded-none" />
            ) : (
              <div className="relative z-0">
                <CHSAvatar band={band} score={chs?.score} />
              </div>
            )}
          </div>

          {/* Score card */}
          <div className={`w-full border-2 ${health.border} bg-card p-6 text-center transition-colors duration-700`}>
            <div className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-2">
              Cognitive Health Score
            </div>
            <div className={`text-7xl font-black tracking-tighter mb-4 ${health.color} transition-colors duration-700`}>
              {isLoadingCurrent ? <Skeleton className="h-20 w-32 mx-auto" /> : chs?.score}
            </div>
            <div className={`inline-block px-4 py-1 border-2 text-sm font-bold tracking-widest uppercase transition-colors duration-700 ${health.border} ${health.bg} ${health.color}`}>
              {health.label} STATUS
            </div>
          </div>

          {/* Band legend */}
          <div className="w-full border-2 border-border bg-card p-4 space-y-2">
            <div className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-3">
              Health Bands
            </div>
            {(Object.entries(HEALTH) as [ChsBand, typeof HEALTH[ChsBand]][]).map(([b, h]) => (
              <div key={b} className={`flex items-center justify-between text-xs font-mono ${band === b ? h.color : "text-muted-foreground"}`}>
                <span className={`font-bold ${band === b ? "" : "opacity-50"}`}>{h.label}</span>
                <span className={band === b ? "font-black" : "opacity-40"}>
                  {b === "critical" ? "0–20" : b === "poor" ? "21–40" : b === "fair" ? "41–60" : b === "good" ? "61–80" : "81–100"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Factors & chart column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Factor breakdown */}
          <div className="border-2 border-border bg-card p-6">
            <h2 className="text-sm uppercase font-bold tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Factor Analysis
            </h2>
            <div className="space-y-6">
              {FACTORS.map((f) => {
                const val = chs?.factors[f.key] ?? 0;
                return (
                  <div key={f.key}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 text-sm uppercase tracking-widest font-bold">
                        <f.icon className="w-4 h-4 text-muted-foreground" />
                        {f.label}
                      </div>
                      <span className="font-black font-mono">
                        {isLoadingCurrent ? <Skeleton className="h-4 w-10" /> : `${val}%`}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${f.color} transition-all duration-1000 ease-out`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend chart */}
          <div className="border-2 border-border bg-card p-6">
            <h2 className="text-sm uppercase font-bold tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" /> 30-Day Trend
            </h2>
            <div className="h-64 w-full">
              {isLoadingHistory ? (
                <Skeleton className="h-full w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "2px solid hsl(var(--border))",
                        borderRadius: 0,
                        fontFamily: "monospace",
                      }}
                      itemStyle={{ color: health.stroke, fontWeight: "bold" }}
                    />
                    <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" opacity={0.4} label={{ value: "Critical", fill: "#ef4444", fontSize: 10, dx: 4 }} />
                    <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" opacity={0.4} label={{ value: "Thriving", fill: "#22c55e", fontSize: 10, dx: 4 }} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={health.stroke}
                      strokeWidth={3}
                      dot={{ r: 3, fill: health.stroke, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: health.stroke, stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <p className="text-muted-foreground uppercase tracking-widest text-xs">
                    No trend data yet — complete creative labor tasks to build your history.
                  </p>
                  <button
                    onClick={handleRecordSample}
                    className="text-xs uppercase tracking-widest font-bold text-primary border border-primary px-4 py-2 hover:bg-primary/10 transition-colors"
                  >
                    Record a reflection to start
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
