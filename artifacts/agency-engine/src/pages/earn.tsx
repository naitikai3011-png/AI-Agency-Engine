import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetGaBalance,
  getGetGaBalanceQueryKey,
  useGetGaHistory,
  getGetGaHistoryQueryKey,
  useGetCreativeLaborTasks,
  getGetCreativeLaborTasksQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import type { CreativeLaborTask, CreativeLaborVerdict } from "@workspace/api-client-react";
import { Zap, Clock, Code, PenTool, Lightbulb, History, ChevronRight, ChevronLeft, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const TASK_ICONS: Record<string, typeof PenTool> = {
  writing: PenTool,
  logic: Code,
  brainstorming: Lightbulb,
};

type Phase = "list" | "submitting" | "result";

export default function Earn() {
  const queryClient = useQueryClient();

  const { data: balance, isLoading: isLoadingBalance } = useGetGaBalance({
    query: { queryKey: getGetGaBalanceQueryKey() },
  });
  const { data: history, isLoading: isLoadingHistory } = useGetGaHistory({
    query: { queryKey: getGetGaHistoryQueryKey() },
  });
  const { data: tasks, isLoading: isLoadingTasks } = useGetCreativeLaborTasks({
    query: { queryKey: getGetCreativeLaborTasksQueryKey() },
  });

  const [phase, setPhase] = useState<Phase>("list");
  const [activeTask, setActiveTask] = useState<CreativeLaborTask | null>(null);
  const [submission, setSubmission] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [verdict, setVerdict] = useState<CreativeLaborVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startTask(task: CreativeLaborTask) {
    setActiveTask(task);
    setSubmission("");
    setVerdict(null);
    setError(null);
    setPhase("submitting");
  }

  function backToList() {
    setPhase("list");
    setActiveTask(null);
    setSubmission("");
    setVerdict(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!activeTask || submission.trim().length < 10) return;
    setIsEvaluating(true);
    setError(null);

    try {
      const res = await fetch("/api/creative-labor/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskSlug: activeTask.slug, content: submission }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Submission failed");
      }

      const result = (await res.json()) as CreativeLaborVerdict;
      setVerdict(result);
      setPhase("result");

      if (result.passed && result.gaRewarded > 0) {
        await queryClient.invalidateQueries({ queryKey: getGetGaBalanceQueryKey() });
        await queryClient.invalidateQueries({ queryKey: getGetGaHistoryQueryKey() });
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsEvaluating(false);
    }
  }

  const Icon = activeTask ? (TASK_ICONS[activeTask.type] ?? Lightbulb) : Lightbulb;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between border-b-2 border-border pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-foreground flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" /> Earn GA Tokens
          </h1>
          <p className="text-muted-foreground mt-1 uppercase text-xs tracking-wider">
            Complete human labor to unlock computational power
          </p>
        </div>
        <div className="bg-card border-2 border-primary p-4 min-w-[200px]">
          <div className="text-xs text-primary font-bold uppercase tracking-widest mb-1">Current Balance</div>
          <div className="text-3xl font-black text-foreground">
            {isLoadingBalance ? (
              <Skeleton className="h-8 w-24 bg-primary/20" />
            ) : (
              <span>{balance?.balance ?? 0} <span className="text-primary text-xl">GA</span></span>
            )}
          </div>
        </div>
      </div>

      {phase === "list" && (
        <>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" /> Available Labor Tasks
            </h2>

            {isLoadingTasks ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : tasks && tasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tasks.map((task) => {
                  const TaskIcon = TASK_ICONS[task.type] ?? Lightbulb;
                  return (
                    <button
                      key={task.id}
                      onClick={() => startTask(task)}
                      className="border-2 border-border bg-card p-6 text-left hover:border-primary hover:bg-card/80 transition-all group cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 border-2 border-border bg-background group-hover:border-primary transition-colors">
                          <TaskIcon className="w-6 h-6 text-foreground" />
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Reward</div>
                          <div className="text-xl font-black text-primary">+{task.gaReward} GA</div>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-2 uppercase tracking-wide">{task.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                      <div className="mt-4 flex items-center gap-1 text-xs uppercase font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Begin Task <ChevronRight className="w-3 h-3" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="border-2 border-border bg-card p-12 text-center text-muted-foreground uppercase tracking-widest text-sm">
                No tasks available. Check back soon.
              </div>
            )}
          </div>

          <div className="pt-4">
            <h2 className="text-xl font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" /> Transaction Ledger
            </h2>
            <div className="border-2 border-border bg-card">
              {isLoadingHistory ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : history && history.length > 0 ? (
                <div className="divide-y-2 divide-border">
                  {history.map((entry) => (
                    <div key={entry.id} className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors">
                      <div>
                        <div className="font-bold text-sm tracking-wider uppercase">{entry.reason}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(entry.createdAt), "MMM d, yyyy • HH:mm")}
                        </div>
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
        </>
      )}

      {phase === "submitting" && activeTask && (
        <div className="space-y-6">
          <button
            onClick={backToList}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider font-bold"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Tasks
          </button>

          <div className="border-2 border-primary bg-card p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 border-2 border-primary bg-background">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-xs uppercase font-bold text-muted-foreground tracking-widest">{activeTask.type}</div>
                  <h2 className="text-xl font-black uppercase tracking-wide">{activeTask.title}</h2>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Max Reward</div>
                <div className="text-2xl font-black text-primary">+{activeTask.gaReward} GA</div>
              </div>
            </div>

            <div className="border-l-2 border-primary/50 pl-4 mb-6">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {activeTask.instructions}
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase font-bold text-muted-foreground tracking-widest block">
                Your Submission
              </label>
              <textarea
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
                disabled={isEvaluating}
                placeholder="Write your response here..."
                rows={12}
                className="w-full bg-background border-2 border-border focus:border-primary outline-none p-4 text-sm font-mono text-foreground placeholder-muted-foreground resize-none transition-colors disabled:opacity-50"
              />
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  {submission.trim().length} characters
                  {submission.trim().length < 10 && (
                    <span className="text-destructive ml-2">(minimum 10)</span>
                  )}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isEvaluating || submission.trim().length < 10}
                  className="flex items-center gap-2 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm px-6 py-3 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      Submit for Evaluation <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 border-2 border-destructive bg-destructive/10 p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-mono">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === "result" && verdict && activeTask && (
        <div className="space-y-6">
          <div className={`border-2 p-8 text-center ${verdict.passed ? "border-green-500 bg-green-500/5" : "border-destructive bg-destructive/5"}`}>
            <div className="flex justify-center mb-4">
              {verdict.passed ? (
                <CheckCircle className="w-16 h-16 text-green-500" />
              ) : (
                <XCircle className="w-16 h-16 text-destructive" />
              )}
            </div>
            <div className={`text-3xl font-black uppercase tracking-widest mb-2 ${verdict.passed ? "text-green-500" : "text-destructive"}`}>
              {verdict.passed ? "Submission Accepted" : "Submission Rejected"}
            </div>
            {verdict.passed && verdict.gaRewarded > 0 && (
              <div className="text-5xl font-black text-primary mt-2 mb-4">
                +{verdict.gaRewarded} GA
              </div>
            )}
            <div className="text-sm text-muted-foreground uppercase tracking-widest mb-6">
              New Balance: <span className="text-foreground font-bold">{verdict.newBalance} GA</span>
            </div>
          </div>

          <div className="border-2 border-border bg-card p-6">
            <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-widest mb-3">
              Evaluator Feedback
            </h3>
            <p className="text-sm leading-relaxed font-mono text-foreground">{verdict.qualityNotes}</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={backToList}
              className="flex-1 border-2 border-border bg-card font-black uppercase tracking-widest text-sm px-6 py-3 hover:border-primary hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4 inline mr-2" />
              Back to Tasks
            </button>
            {!verdict.passed && (
              <button
                onClick={() => setPhase("submitting")}
                className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm px-6 py-3 hover:bg-primary/90 transition-colors"
              >
                Try Again <ChevronRight className="w-4 h-4 inline ml-2" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
