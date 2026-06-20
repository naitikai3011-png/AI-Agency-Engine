import { ReactNode, useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import {
  useGetMe, getGetMeQueryKey,
  useGetChsCurrent, getGetChsCurrentQueryKey,
  useGetGatewayStatus, getGetGatewayStatusQueryKey,
  useSubmitGateway,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Zap, LogOut, Lock, Unlock, Eye, Timer, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CHSAvatar } from "@/components/chs-avatar";
import type { ChsBand } from "@/components/chs-avatar";
import { Textarea } from "@/components/ui/textarea";

const HEALTH_BORDER: Record<ChsBand, string> = {
  critical: "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
  poor: "border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]",
  fair: "border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]",
  good: "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]",
  thriving: "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]",
};

const HEALTH_TEXT: Record<ChsBand, string> = {
  critical: "text-red-500",
  poor: "text-orange-500",
  fair: "text-yellow-500",
  good: "text-blue-500",
  thriving: "text-green-500",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function GatewayModal({ onUnlock }: { onUnlock: () => void }) {
  const queryClient = useQueryClient();
  const { data: status } = useGetGatewayStatus({
    query: {
      queryKey: getGetGatewayStatusQueryKey(),
      refetchInterval: 30_000,
    },
  });

  const { mutate: submit, isPending } = useSubmitGateway();

  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [gaBonus, setGaBonus] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerDone, setTimerDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const task = status?.currentTask;
  const timedSeconds = task?.timedSeconds ?? null;

  // Start countdown when task type is mindful_pause
  useEffect(() => {
    if (timedSeconds && timedSeconds > 0) {
      setTimeLeft(timedSeconds);
      setTimerDone(false);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimerDone(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimerDone(true);
    }
    setResponse("");
    setFeedback(null);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [task?.type, timedSeconds]);

  if (!status?.locked) return null;

  const canSubmit = timerDone && response.trim().length >= 20 && !isPending;

  function handleSubmit() {
    setFeedback(null);
    submit(
      { data: { response: response.trim() } },
      {
        onSuccess: (result) => {
          if (result.passed) {
            setGaBonus(result.gaBonus ?? 0);
            setUnlocked(true);
            queryClient.invalidateQueries({ queryKey: getGetGatewayStatusQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
            setTimeout(() => {
              setUnlocked(false);
              onUnlock();
            }, 3500);
          } else {
            setFeedback(result.verdict ?? "Response rejected. Try again with more detail.");
          }
        },
        onError: () => {
          setFeedback("Evaluation failed. Please try again.");
        },
      }
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background/97 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Scanline overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.06)_50%)] bg-[length:100%_4px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef44441a_1px,transparent_1px),linear-gradient(to_bottom,#ef44441a_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative w-full max-w-2xl border-4 border-red-500 bg-card shadow-[0_0_60px_rgba(239,68,68,0.3)] flex flex-col">
        {/* Header */}
        <div className="border-b-4 border-red-500 bg-red-500/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-red-500 animate-pulse" />
            <div>
              <div className="text-xs uppercase tracking-widest text-red-400 font-bold">Gateway Locked</div>
              <div className="text-lg font-black uppercase tracking-widest text-red-500">
                Proof of Humanity Required
              </div>
            </div>
          </div>
          <ShieldAlert className="w-10 h-10 text-red-500 opacity-60" />
        </div>

        {unlocked ? (
          /* Unlock celebration */
          <div className="p-12 flex flex-col items-center gap-6 text-center">
            <div className="w-24 h-24 border-4 border-green-500 rounded-full flex items-center justify-center bg-green-500/10 shadow-[0_0_40px_rgba(34,197,94,0.5)]">
              <Unlock className="w-12 h-12 text-green-500" />
            </div>
            <div>
              <div className="text-4xl font-black uppercase tracking-widest text-green-500 mb-2">Gateway Unlocked</div>
              <div className="text-muted-foreground uppercase text-xs tracking-wider">
                30-minute open access granted · +{gaBonus} GA tokens awarded
              </div>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500 animate-pulse" />
          </div>
        ) : (
          /* Task UI */
          <div className="p-6 flex flex-col gap-6">
            {/* Task header */}
            <div className="border-2 border-border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">
                    Assigned Task
                  </div>
                  <div className="text-lg font-black uppercase tracking-widest text-primary mb-1">
                    {task?.title ?? "Human Task"}
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {task?.description}
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="border-l-4 border-primary/50 pl-4 py-2">
              <p className="text-sm leading-relaxed text-foreground/90">
                {task?.instructions}
              </p>
            </div>

            {/* Countdown timer (mindful_pause) */}
            {timedSeconds && timedSeconds > 0 && (
              <div className={`border-2 p-4 text-center transition-colors duration-500 ${timerDone ? "border-green-500 bg-green-500/10" : "border-primary bg-primary/5"}`}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Timer className={`w-5 h-5 ${timerDone ? "text-green-500" : "text-primary animate-pulse"}`} />
                  <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                    {timerDone ? "Pause complete" : "Breath focus timer"}
                  </span>
                </div>
                <div className={`text-5xl font-black font-mono transition-colors duration-500 ${timerDone ? "text-green-500" : "text-primary"}`}>
                  {timerDone ? "✓" : formatTime(timeLeft ?? 0)}
                </div>
                {!timerDone && (
                  <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
                    Focus on your breathing until the timer ends
                  </p>
                )}
              </div>
            )}

            {/* Response input */}
            <div>
              <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">
                Your Response
              </div>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder={task?.placeholder ?? "Write your response here..."}
                disabled={!timerDone}
                className="min-h-[120px] font-mono text-sm rounded-none border-2 border-border focus:border-primary resize-none bg-background disabled:opacity-40 disabled:cursor-not-allowed"
                rows={5}
              />
              <div className={`text-xs mt-1 text-right font-mono ${response.trim().length >= 20 ? "text-muted-foreground" : "text-red-500"}`}>
                {response.trim().length} / 20 min chars
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className="border-2 border-orange-500 bg-orange-500/10 p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs uppercase font-bold tracking-widest text-orange-400 mb-1">
                    Response Rejected
                  </div>
                  <p className="text-sm text-orange-300">{feedback}</p>
                  <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
                    Add more specific, genuine detail and try again.
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex flex-col gap-3">
              <Button
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="h-14 text-base font-bold tracking-widest uppercase rounded-none border-2 border-primary bg-primary/10 text-primary hover:bg-primary hover:text-background transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-pulse">Evaluating...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Submit Proof of Humanity · +{task?.gaBonus} GA
                  </span>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground uppercase tracking-wider">
                This gateway cannot be bypassed. AI access requires genuine human engagement.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: me, isLoading: isLoadingMe } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: chs, isLoading: isLoadingChs } = useGetChsCurrent({ query: { queryKey: getGetChsCurrentQueryKey() } });
  const { data: gateway } = useGetGatewayStatus({
    query: { queryKey: getGetGatewayStatusQueryKey(), refetchInterval: 30_000 },
  });

  const band: ChsBand = (chs?.band as ChsBand) ?? "fair";
  const borderClass = HEALTH_BORDER[band];
  const textClass = HEALTH_TEXT[band];

  const isLocked = gateway?.locked === true;
  const hasUnlockWindow = !isLocked && gateway?.minutesRemaining && gateway.minutesRemaining > 0;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-mono">
      <header className="border-b-2 border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group outline-none">
            <div className="w-8 h-8 border-2 border-primary bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background transition-colors shadow-[0_0_15px_rgba(251,191,36,0.3)]">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold tracking-widest uppercase hidden sm:block">Agency Engine</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Gateway status widget */}
            <Link
              href="/gateway"
              className={`flex items-center gap-2 px-2 py-1 border-2 bg-card transition-all rounded-none outline-none ${isLocked ? "border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse" : hasUnlockWindow ? "border-green-500" : "border-border"}`}
              title={isLocked ? "Gateway LOCKED — click to complete human task" : hasUnlockWindow ? `Access open: ${gateway?.minutesRemaining}m remaining` : "Gateway"}
            >
              {isLocked ? (
                <Lock className="w-4 h-4 text-red-500" />
              ) : (
                <Unlock className={`w-4 h-4 ${hasUnlockWindow ? "text-green-500" : "text-muted-foreground"}`} />
              )}
              <div className="hidden sm:flex flex-col">
                <span className={`text-[10px] uppercase leading-none font-bold ${isLocked ? "text-red-400" : hasUnlockWindow ? "text-green-400" : "text-muted-foreground"}`}>
                  {isLocked ? "Locked" : hasUnlockWindow ? `${gateway?.minutesRemaining}m left` : "Gateway"}
                </span>
              </div>
            </Link>

            {/* GA Balance */}
            <Link
              href="/earn"
              className="flex items-center gap-2 px-3 py-1.5 border-2 border-primary/50 bg-primary/5 hover:bg-primary/20 hover:border-primary transition-all rounded-none outline-none"
            >
              <Zap className="w-4 h-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-[10px] text-primary/70 uppercase leading-none">GA</span>
                <span className="font-bold text-primary leading-tight">
                  {isLoadingMe ? <Skeleton className="h-4 w-10 bg-primary/20" /> : (me?.gaBalance?.toLocaleString() ?? 0)}
                </span>
              </div>
            </Link>

            {/* CHS mini avatar widget */}
            <Link
              href="/mirror"
              className={`flex items-center gap-2 px-2 py-1 border-2 bg-card transition-all rounded-none outline-none ${borderClass}`}
              title={`Cognitive Health Score: ${chs?.score ?? "..."} (${band})`}
            >
              {isLoadingChs ? (
                <Skeleton className="w-7 h-7" />
              ) : (
                <CHSAvatar band={band} mini />
              )}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase leading-none opacity-60">CHS</span>
                <span className={`font-bold leading-tight text-sm ${textClass}`}>
                  {isLoadingChs ? <Skeleton className="h-4 w-8 bg-current opacity-20" /> : (chs?.score ?? 0)}
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4 border-l-2 border-border pl-2 sm:pl-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-muted-foreground uppercase truncate max-w-[140px]">
                  {user?.emailAddresses[0]?.emailAddress}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="rounded-none border-2 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-colors"
                onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" })}
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Gateway modal — full-screen, blocks all access when locked */}
      {isLocked && (
        <GatewayModal
          onUnlock={() => {
            queryClient.invalidateQueries({ queryKey: getGetGatewayStatusQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          }}
        />
      )}
    </div>
  );
}
