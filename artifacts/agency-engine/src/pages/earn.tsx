import { useGetGaBalance, getGetGaBalanceQueryKey, useGetGaHistory, getGetGaHistoryQueryKey } from "@workspace/api-client-react";
import { Zap, Clock, Code, PenTool, Lightbulb, Lock, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Earn() {
  const { data: balance, isLoading: isLoadingBalance } = useGetGaBalance({ query: { queryKey: getGetGaBalanceQueryKey() } });
  const { data: history, isLoading: isLoadingHistory } = useGetGaHistory({ query: { queryKey: getGetGaHistoryQueryKey() } });

  const tasks = [
    { id: 1, title: "Writing Challenge", desc: "Compose a 500-word essay without AI assistance.", reward: 50, icon: PenTool },
    { id: 2, title: "Logic Puzzle", desc: "Solve a multi-step algorithmic problem.", reward: 75, icon: Code },
    { id: 3, title: "Brainstorming", desc: "Generate 10 unique product concepts.", reward: 30, icon: Lightbulb },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between border-b-2 border-border pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-foreground flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" /> Earn GA Tokens
          </h1>
          <p className="text-muted-foreground mt-1 uppercase text-xs tracking-wider">Complete human labor to unlock computational power</p>
        </div>
        <div className="bg-card border-2 border-primary p-4 min-w-[200px]">
          <div className="text-xs text-primary font-bold uppercase tracking-widest mb-1">Current Balance</div>
          <div className="text-3xl font-black text-foreground">
            {isLoadingBalance ? <Skeleton className="h-8 w-24 bg-primary/20" /> : balance?.balance.toLocaleString()}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" /> Available Labor (Coming Soon)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tasks.map((task) => {
            const Icon = task.icon;
            return (
              <div key={task.id} className="border-2 border-border bg-card p-6 relative overflow-hidden group opacity-70 grayscale">
                <div className="absolute inset-0 bg-background/50 z-10 flex flex-col items-center justify-center backdrop-blur-[2px]">
                  <Lock className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="font-bold tracking-widest uppercase text-sm text-muted-foreground">Locked</span>
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 border-2 border-border bg-background">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Reward</div>
                    <div className="text-xl font-black text-primary">+{task.reward} GA</div>
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-2">{task.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{task.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-8">
        <h2 className="text-xl font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
          <History className="w-5 h-5 text-muted-foreground" /> Transaction Ledger
        </h2>
        <div className="border-2 border-border bg-card">
          {isLoadingHistory ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : history && history.length > 0 ? (
            <div className="divide-y-2 divide-border">
              {history.map((entry) => (
                <div key={entry.id} className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors">
                  <div>
                    <div className="font-bold text-sm tracking-wider uppercase">{entry.reason}</div>
                    <div className="text-xs text-muted-foreground mt-1">{format(new Date(entry.createdAt), "MMM d, yyyy • HH:mm")}</div>
                  </div>
                  <div className={`font-black text-lg ${entry.delta >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {entry.delta > 0 ? "+" : ""}{entry.delta}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground uppercase tracking-widest text-sm">
              No transactions recorded in ledger.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}