import { Link } from "wouter";
import { useGetStats, getGetStatsQueryKey } from "@workspace/api-client-react";
import { Zap, Brain, Target, ShieldAlert, Terminal, ChevronRight, Activity, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats({ query: { queryKey: getGetStatsQueryKey() } });

  const getHealthBand = (score: number | undefined) => {
    if (score === undefined) return { label: "UNKNOWN", color: "text-muted-foreground" };
    if (score < 40) return { label: "CRITICAL", color: "text-red-500", border: "border-red-500", bg: "bg-red-500/10" };
    if (score < 60) return { label: "POOR", color: "text-orange-500", border: "border-orange-500", bg: "bg-orange-500/10" };
    if (score < 75) return { label: "FAIR", color: "text-yellow-500", border: "border-yellow-500", bg: "bg-yellow-500/10" };
    if (score < 90) return { label: "GOOD", color: "text-blue-500", border: "border-blue-500", bg: "bg-blue-500/10" };
    return { label: "THRIVING", color: "text-green-500", border: "border-green-500", bg: "bg-green-500/10" };
  };

  const health = getHealthBand(stats?.chsScore);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between border-b-2 border-border pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-foreground">Terminal Overview</h1>
          <p className="text-muted-foreground mt-1 uppercase text-xs tracking-wider">System metrics and operational status</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold bg-card border-2 border-border px-3 py-1.5 uppercase tracking-widest">
          <div className="w-2 h-2 bg-green-500 animate-pulse" />
          System Online
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GA Balance Card */}
        <div className="col-span-1 md:col-span-2 border-2 border-primary bg-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-32 h-32 text-primary" />
          </div>
          <div className="p-6 relative z-10 flex flex-col h-full justify-between">
            <div>
              <h2 className="text-sm text-primary uppercase font-bold tracking-widest flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4" /> Available Generation Allowance
              </h2>
              <div className="text-6xl font-black text-foreground mt-2 tracking-tighter">
                {isLoading ? <Skeleton className="h-16 w-32 bg-primary/20" /> : stats?.gaBalance.toLocaleString()}
                <span className="text-2xl text-muted-foreground ml-2 tracking-normal font-bold">GA</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t-2 border-border">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Earned Today</div>
                <div className="text-xl font-bold text-green-500">+{isLoading ? <Skeleton className="h-6 w-16" /> : stats?.gaEarnedToday}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Spent Today</div>
                <div className="text-xl font-bold text-red-500">-{isLoading ? <Skeleton className="h-6 w-16" /> : stats?.gaSpentToday}</div>
              </div>
            </div>
          </div>
        </div>

        {/* CHS Score Card */}
        <div className={`col-span-1 border-2 bg-card p-6 flex flex-col items-center justify-center text-center ${health.border || "border-border"} transition-colors`}>
          <Activity className={`w-8 h-8 mb-4 ${health.color}`} />
          <h2 className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-2">Cognitive Health</h2>
          <div className={`text-6xl font-black mb-2 ${health.color}`}>
            {isLoading ? <Skeleton className="h-16 w-24 mx-auto" /> : stats?.chsScore}
          </div>
          <div className={`px-4 py-1 border-2 text-sm font-bold tracking-widest uppercase ${health.border} ${health.bg} ${health.color}`}>
            {health.label}
          </div>
          {stats?.chsTrend && (
            <div className="mt-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1 text-muted-foreground">
              Trend: 
              <span className={stats.chsTrend === "up" ? "text-green-500" : stats.chsTrend === "down" ? "text-red-500" : "text-yellow-500"}>
                {stats.chsTrend}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-2 border-border bg-card p-6">
          <h3 className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-6 flex items-center gap-2">
            <Target className="w-4 h-4" /> Operational Stats
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b-2 border-border pb-2">
              <span className="text-sm uppercase tracking-wider">Total Tasks Completed</span>
              <span className="font-bold text-lg">{isLoading ? <Skeleton className="h-6 w-8" /> : stats?.tasksCompletedTotal}</span>
            </div>
            <div className="flex justify-between items-center border-b-2 border-border pb-2">
              <span className="text-sm uppercase tracking-wider">Human Tasks (Proof)</span>
              <span className="font-bold text-lg text-primary">{isLoading ? <Skeleton className="h-6 w-8" /> : stats?.humanTasksCompletedTotal}</span>
            </div>
            <div className="flex justify-between items-center border-b-2 border-border pb-2">
              <span className="text-sm uppercase tracking-wider">Current Streak</span>
              <span className="font-bold text-lg">{isLoading ? <Skeleton className="h-6 w-8" /> : `${stats?.streakDays} DAYS`}</span>
            </div>
          </div>
        </div>

        <div className="border-2 border-border bg-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Required Actions
            </h3>
            <p className="text-sm text-foreground/80 mb-6 leading-relaxed">
              Your cognitive health requires continuous maintenance. Proceed to the Earn terminal to complete proof-of-humanity tasks.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/earn" className="w-full">
              <Button className="w-full rounded-none border-2 border-primary bg-primary/10 hover:bg-primary text-primary hover:text-background font-bold uppercase tracking-widest h-12">
                Initiate Creative Labor
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/gateway" className="w-full">
              <Button variant="outline" className="w-full rounded-none border-2 border-border hover:border-foreground hover:bg-foreground/5 font-bold uppercase tracking-widest h-12">
                Access Gateway
                <ShieldAlert className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}