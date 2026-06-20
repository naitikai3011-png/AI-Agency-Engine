import { ReactNode } from "react";
import { Link } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { useGetMe, getGetMeQueryKey, useGetChsCurrent, getGetChsCurrentQueryKey } from "@workspace/api-client-react";
import { Shield, Zap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CHSAvatar } from "@/components/chs-avatar";
import type { ChsBand } from "@/components/chs-avatar";

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

export default function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: me, isLoading: isLoadingMe } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: chs, isLoading: isLoadingChs } = useGetChsCurrent({ query: { queryKey: getGetChsCurrentQueryKey() } });

  const band: ChsBand = (chs?.band as ChsBand) ?? "fair";
  const borderClass = HEALTH_BORDER[band];
  const textClass = HEALTH_TEXT[band];

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

          <div className="flex items-center gap-4 sm:gap-6">
            {/* GA Balance */}
            <Link
              href="/earn"
              className="flex items-center gap-2 px-3 py-1.5 border-2 border-primary/50 bg-primary/5 hover:bg-primary/20 hover:border-primary transition-all rounded-none outline-none"
            >
              <Zap className="w-4 h-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-[10px] text-primary/70 uppercase leading-none">GA Balance</span>
                <span className="font-bold text-primary leading-tight">
                  {isLoadingMe ? <Skeleton className="h-4 w-12 bg-primary/20" /> : (me?.gaBalance?.toLocaleString() ?? 0)}
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

            <div className="flex items-center gap-4 border-l-2 border-border pl-4 sm:pl-6">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-muted-foreground uppercase">{user?.emailAddresses[0]?.emailAddress}</span>
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
    </div>
  );
}
