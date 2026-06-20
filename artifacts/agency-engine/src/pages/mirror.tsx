import { useGetChsCurrent, getGetChsCurrentQueryKey, useGetChsHistory, getGetChsHistoryQueryKey } from "@workspace/api-client-react";
import { Activity, BrainCircuit, ActivitySquare, Sparkles, Layers, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { format } from "date-fns";

export default function Mirror() {
  const { data: chs, isLoading: isLoadingCurrent } = useGetChsCurrent({ query: { queryKey: getGetChsCurrentQueryKey() } });
  const { data: history, isLoading: isLoadingHistory } = useGetChsHistory({ query: { queryKey: getGetChsHistoryQueryKey() } });

  const getHealthBand = (score: number | undefined, band: string | undefined) => {
    if (score === undefined || !band) return { label: "UNKNOWN", color: "text-muted-foreground", stroke: "#64748b" };
    if (band === "critical") return { label: "CRITICAL", color: "text-red-500", border: "border-red-500", bg: "bg-red-500/10", stroke: "#ef4444" };
    if (band === "poor") return { label: "POOR", color: "text-orange-500", border: "border-orange-500", bg: "bg-orange-500/10", stroke: "#f97316" };
    if (band === "fair") return { label: "FAIR", color: "text-yellow-500", border: "border-yellow-500", bg: "bg-yellow-500/10", stroke: "#eab308" };
    if (band === "good") return { label: "GOOD", color: "text-blue-500", border: "border-blue-500", bg: "bg-blue-500/10", stroke: "#3b82f6" };
    return { label: "THRIVING", color: "text-green-500", border: "border-green-500", bg: "bg-green-500/10", stroke: "#22c55e" };
  };

  const health = getHealthBand(chs?.score, chs?.band);

  const chartData = history?.map(h => ({
    date: format(new Date(h.date), "MMM d"),
    score: h.averageScore
  })).reverse() || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between border-b-2 border-border pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-foreground flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-primary" /> Atrophy Mirror
          </h1>
          <p className="text-muted-foreground mt-1 uppercase text-xs tracking-wider">Reflecting your true cognitive independence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Avatar & Main Score Area */}
        <div className="lg:col-span-1 flex flex-col items-center space-y-6">
          <div className="relative w-64 h-64 border-4 border-border bg-card flex items-center justify-center overflow-hidden">
            {/* Placeholder Pulsing Avatar */}
            <div className={`absolute inset-0 opacity-20 ${health.bg}`} />
            <div className={`w-32 h-32 rounded-full border-4 ${health.border} flex items-center justify-center animate-pulse`}>
              <ActivitySquare className={`w-12 h-12 ${health.color}`} />
            </div>
            {/* Scanlines overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none" />
          </div>

          <div className={`w-full border-2 ${health.border} bg-card p-6 text-center`}>
            <div className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-2">Cognitive Health Score</div>
            <div className={`text-7xl font-black tracking-tighter mb-4 ${health.color}`}>
              {isLoadingCurrent ? <Skeleton className="h-20 w-32 mx-auto" /> : chs?.score}
            </div>
            <div className={`inline-block px-4 py-1 border-2 text-sm font-bold tracking-widest uppercase ${health.border} ${health.bg} ${health.color}`}>
              {health.label} STATUS
            </div>
          </div>
        </div>

        {/* Factors & Chart */}
        <div className="lg:col-span-2 space-y-8">
          {/* Factor Breakdown */}
          <div className="border-2 border-border bg-card p-6">
            <h2 className="text-sm uppercase font-bold tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Factor Analysis
            </h2>
            <div className="space-y-6">
              {[
                { key: "complexity", label: "Complexity", icon: BrainCircuit, val: chs?.factors.complexity, color: "bg-blue-500" },
                { key: "originality", label: "Originality", icon: Sparkles, val: chs?.factors.originality, color: "bg-purple-500" },
                { key: "depth", label: "Depth", icon: Layers, val: chs?.factors.depth, color: "bg-emerald-500" },
                { key: "effort", label: "Effort (Proof of Work)", icon: ShieldCheck, val: chs?.factors.effort, color: "bg-orange-500" },
              ].map((factor) => (
                <div key={factor.key}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-widest font-bold">
                      <factor.icon className="w-4 h-4 text-muted-foreground" />
                      {factor.label}
                    </div>
                    <span className="font-black font-mono">
                      {isLoadingCurrent ? <Skeleton className="h-4 w-8" /> : `${factor.val}%`}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted overflow-hidden">
                    <div 
                      className={`h-full ${factor.color} transition-all duration-1000 ease-out`}
                      style={{ width: `${factor.val || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend Chart */}
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
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '2px solid hsl(var(--border))', borderRadius: 0 }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                    />
                    <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
                    <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" opacity={0.5} />
                    <Line 
                      type="stepAfter" 
                      dataKey="score" 
                      stroke={health.stroke} 
                      strokeWidth={3} 
                      dot={{ r: 3, fill: health.stroke, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: health.stroke, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground uppercase tracking-widest text-xs">
                  Insufficient data for trend analysis
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}