import { Link } from "wouter";
import { Shield, Lock, Brain, Key, TerminalSquare, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-mono selection:bg-primary selection:text-background">
      <header className="border-b-2 border-border p-4 flex justify-between items-center bg-card/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(251,191,36,0.3)]">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-bold tracking-widest uppercase hidden sm:block">Agency Engine</span>
        </div>
        <div className="flex gap-4">
          <Link href="/sign-in" className="text-sm tracking-widest uppercase px-4 py-2 border-2 border-transparent hover:border-border transition-colors">
            Access Terminal
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        {/* Background Grid & Noise */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

        <div className="max-w-3xl w-full relative z-10 space-y-12">
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center justify-center px-3 py-1 border-2 border-red-500/50 bg-red-500/10 text-red-500 text-xs font-bold tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <Lock className="w-3 h-3 mr-2" /> System Locked
            </div>
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter leading-none text-foreground drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              Cognitive Atrophy <br/>
              <span className="text-primary">Detected.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed border-l-2 border-primary/50 pl-4 text-left">
              AI dependency makes you weak. The Agency Engine is a hostile environment designed to force you to prove your humanity before unlocking computational assistance.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="border-2 border-border bg-card p-6 flex flex-col items-center text-center space-y-4 hover:border-primary/50 transition-colors">
              <TerminalSquare className="w-8 h-8 text-primary" />
              <h3 className="font-bold uppercase tracking-widest">Prove Work</h3>
              <p className="text-xs text-muted-foreground">Complete mandatory creative labor to earn Generation Allowance (GA) tokens.</p>
            </div>
            <div className="border-2 border-border bg-card p-6 flex flex-col items-center text-center space-y-4 hover:border-primary/50 transition-colors">
              <Brain className="w-8 h-8 text-primary" />
              <h3 className="font-bold uppercase tracking-widest">Monitor CHS</h3>
              <p className="text-xs text-muted-foreground">Track your Cognitive Health Score to ensure you are not outsourcing your intellect.</p>
            </div>
            <div className="border-2 border-border bg-card p-6 flex flex-col items-center text-center space-y-4 hover:border-primary/50 transition-colors">
              <Key className="w-8 h-8 text-primary" />
              <h3 className="font-bold uppercase tracking-widest">Unlock AI</h3>
              <p className="text-xs text-muted-foreground">Spend earned tokens through the Gateway to access advanced AI models.</p>
            </div>
          </div>

          <div className="flex justify-center pt-8">
            <Link href="/sign-up" className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-background bg-primary uppercase tracking-widest overflow-hidden outline-none">
              <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
              <span className="relative flex items-center">
                Initiate Protocol
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
