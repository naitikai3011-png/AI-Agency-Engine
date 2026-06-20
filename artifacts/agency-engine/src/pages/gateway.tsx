import { useQueryClient } from "@tanstack/react-query";
import {
  useGetGatewayStatus,
  getGetGatewayStatusQueryKey,
  useTriggerGateway,
} from "@workspace/api-client-react";
import {
  ShieldAlert, Lock, Unlock, Timer, Zap, Activity,
  ChevronRight, AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export default function Gateway() {
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useGetGatewayStatus({
    query: {
      queryKey: getGetGatewayStatusQueryKey(),
      refetchInterval: 15_000,
    },
  });

  const { mutate: trigger, isPending: isTriggering } = useTriggerGateway();

  const isLocked = status?.locked === true;
  const hasUnlockWindow = !isLocked && status?.minutesRemaining && status.minutesRemaining > 0;
  const spendPct = Math.min(100, ((status?.sessionSpend ?? 0) / (status?.sessionSpendThreshold ?? 50)) * 100);
  const timePct = Math.min(100, ((status?.sessionMinutesElapsed ?? 0) / (status?.sessionMinutesLimit ?? 60)) * 100);
  const nearLimit = spendPct >= 80 || timePct >= 80;

  function handleTrigger() {
    trigger(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGatewayStatusQueryKey() });
      },
    });
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between border-b-2 border-border pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-foreground flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-primary" /> The Gateway
          </h1>
          <p className="text-muted-foreground mt-1 uppercase text-xs tracking-wider">
            Proof of Humanity Authorization Protocol
          </p>
        </div>
      </div>

      {/* Current status card */}
      <div className={`border-4 p-8 relative overflow-hidden transition-colors duration-700 ${isLocked ? "border-red-500" : hasUnlockWindow ? "border-green-500" : "border-border"}`}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#fbbf2408_1px,transparent_1px),linear-gradient(to_bottom,#fbbf2408_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center gap-6">
          {isLoading ? (
            <Skeleton className="w-24 h-24 rounded-full" />
          ) : (
            <div className={`w-24 h-24 rounded-none border-4 flex items-center justify-center transition-all duration-700 ${isLocked ? "border-red-500 bg-red-500/10 shadow-[0_0_40px_rgba(239,68,68,0.3)]" : hasUnlockWindow ? "border-green-500 bg-green-500/10 shadow-[0_0_40px_rgba(34,197,94,0.2)]" : "border-border bg-card"}`}>
              {isLocked ? (
                <Lock className="w-10 h-10 text-red-500 animate-pulse" />
              ) : (
                <Unlock className={`w-10 h-10 ${hasUnlockWindow ? "text-green-500" : "text-muted-foreground"}`} />
              )}
            </div>
          )}

          {isLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <div>
              <h2 className={`text-3xl font-black uppercase tracking-widest mb-2 ${isLocked ? "text-red-500" : hasUnlockWindow ? "text-green-500" : "text-foreground"}`}>
                {isLocked ? "Gateway Locked" : hasUnlockWindow ? "Access Open" : "Monitoring"}
              </h2>
              <p className="text-muted-foreground text-sm uppercase tracking-wider">
                {isLocked
                  ? `Assigned task: ${status?.currentTask?.title ?? "Unknown"}`
                  : hasUnlockWindow
                  ? `${status?.minutesRemaining} minutes of open access remaining`
                  : "Session within normal parameters"}
              </p>
              {status?.unlockExpiresAt && hasUnlockWindow && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Expires {formatDistanceToNow(new Date(status.unlockExpiresAt), { addSuffix: true })}
                </p>
              )}
            </div>
          )}

          {isLocked && (
            <div className="border-2 border-red-500/50 bg-red-500/10 px-6 py-3 text-sm text-red-400 uppercase tracking-widest font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Complete the human task to unlock AI access
            </div>
          )}
        </div>
      </div>

      {/* Session progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Session spend meter */}
        <div className={`border-2 bg-card p-6 transition-colors duration-500 ${nearLimit && spendPct >= 80 ? "border-orange-500" : "border-border"}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-widest font-bold">Session Spend</span>
            </div>
            <span className="font-black font-mono text-sm">
              {isLoading ? <Skeleton className="h-4 w-16" /> : `${status?.sessionSpend ?? 0} / ${status?.sessionSpendThreshold ?? 50} GA`}
            </span>
          </div>
          <div className="h-3 w-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${spendPct >= 80 ? "bg-orange-500" : "bg-primary"}`}
              style={{ width: `${spendPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
            {spendPct >= 80 ? "⚠ Approaching spend limit" : "Tokens spent this session"}
          </p>
        </div>

        {/* Session time meter */}
        <div className={`border-2 bg-card p-6 transition-colors duration-500 ${nearLimit && timePct >= 80 ? "border-orange-500" : "border-border"}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-widest font-bold">Session Time</span>
            </div>
            <span className="font-black font-mono text-sm">
              {isLoading ? <Skeleton className="h-4 w-16" /> : `${status?.sessionMinutesElapsed ?? 0} / ${status?.sessionMinutesLimit ?? 60} min`}
            </span>
          </div>
          <div className="h-3 w-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${timePct >= 80 ? "bg-orange-500" : "bg-primary"}`}
              style={{ width: `${timePct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
            {timePct >= 80 ? "⚠ Approaching time limit" : "Minutes since last session reset"}
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="border-2 border-border bg-card p-6">
        <h3 className="text-sm uppercase font-bold tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" /> How the Gateway Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: "01",
              title: "Threshold Crossed",
              desc: `After ${status?.sessionSpendThreshold ?? 50} GA tokens spent or ${status?.sessionMinutesLimit ?? 60} minutes of continuous AI use, the gateway activates.`,
            },
            {
              step: "02",
              title: "Human Task Assigned",
              desc: "A sensory observation, close-focus exercise, or mindful pause is assigned. No AI shortcuts exist.",
            },
            {
              step: "03",
              title: "Access Restored",
              desc: `A genuine response unlocks 30 minutes of open access and awards bonus GA tokens.`,
            },
          ].map((item) => (
            <div key={item.step} className="border border-border bg-muted/20 p-4">
              <div className="text-2xl font-black text-primary/40 font-mono mb-2">{item.step}</div>
              <div className="text-sm font-bold uppercase tracking-widest mb-2">{item.title}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Available tasks */}
      <div className="border-2 border-border bg-card p-6">
        <h3 className="text-sm uppercase font-bold tracking-widest text-muted-foreground mb-4">
          Human Task Library
        </h3>
        <div className="space-y-3">
          {[
            { title: "Sensory Scan", desc: "Identify and describe 5 distinct sounds in your environment.", bonus: 10, timed: false },
            { title: "Close Observation", desc: "Describe a nearby object in 5+ sentences of specific physical detail.", bonus: 10, timed: false },
            { title: "Mindful Pause", desc: "Complete a 2-minute breath focus, then write about what you noticed.", bonus: 8, timed: true },
          ].map((task) => (
            <div key={task.title} className="flex items-center justify-between border border-border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm uppercase tracking-widest">{task.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{task.desc}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {task.timed && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                    <Timer className="w-3 h-3" /> 2min
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs font-bold text-primary font-mono">
                  <Zap className="w-3 h-3" /> +{task.bonus}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual trigger (dev/test) */}
      {!isLocked && (
        <div className="border-2 border-dashed border-border bg-card/50 p-6">
          <h3 className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-3">
            Developer Controls
          </h3>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleTrigger}
              disabled={isTriggering}
              className="rounded-none border-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500 uppercase tracking-widest text-xs font-bold"
            >
              <Lock className="w-4 h-4 mr-2" />
              {isTriggering ? "Triggering..." : "Manually Trigger Gateway"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Simulates the automatic circuit-breaker for testing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
