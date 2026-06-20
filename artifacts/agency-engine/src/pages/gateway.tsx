import { ShieldAlert, Lock, Unlock, Cpu, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Gateway() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between border-b-2 border-border pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-foreground flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-primary" /> The Gateway
          </h1>
          <p className="text-muted-foreground mt-1 uppercase text-xs tracking-wider">Proof of Humanity Authorization Protocol</p>
        </div>
      </div>

      <div className="border-4 border-primary bg-card/50 p-8 md:p-16 flex flex-col items-center text-center relative overflow-hidden">
        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#fbbf2410_1px,transparent_1px),linear-gradient(to_bottom,#fbbf2410_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        
        <div className="relative z-10 w-32 h-32 border-4 border-primary rounded-full flex items-center justify-center bg-background shadow-[0_0_30px_rgba(251,191,36,0.2)] mb-8">
          <Lock className="w-12 h-12 text-primary" />
        </div>

        <h2 className="text-3xl font-black uppercase tracking-widest mb-4">Gateway Active</h2>
        
        <div className="max-w-2xl mx-auto space-y-6">
          <p className="text-lg text-muted-foreground leading-relaxed">
            Direct access to AI assistance is currently blocked by the Agency Engine.
            To unlock computational generation capabilities, you must expend earned GA tokens.
          </p>

          <div className="bg-background border-2 border-border p-6 text-left grid gap-4">
            <div className="flex items-start gap-4">
              <Cpu className="w-6 h-6 text-primary shrink-0 mt-1" />
              <div>
                <h3 className="font-bold tracking-widest uppercase text-sm">Automated Request Intercepted</h3>
                <p className="text-xs text-muted-foreground mt-1">The system blocks blind requests to external AI models. All usage must be deliberate and earned.</p>
              </div>
            </div>
            <div className="h-px bg-border w-full" />
            <div className="flex items-start gap-4">
              <KeyRound className="w-6 h-6 text-primary shrink-0 mt-1" />
              <div>
                <h3 className="font-bold tracking-widest uppercase text-sm">Required: 100 GA Tokens</h3>
                <p className="text-xs text-muted-foreground mt-1">Spend your earned generation allowance to temporarily lift the restriction.</p>
              </div>
            </div>
          </div>

          <Button disabled className="w-full h-16 text-lg font-bold tracking-widest uppercase rounded-none border-2 border-primary bg-primary/20 text-primary opacity-50 cursor-not-allowed">
            <Lock className="w-5 h-5 mr-3" /> Unlock Gateway (Coming Soon)
          </Button>
          
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
            Status: Insufficient implementation. Feature pending.
          </p>
        </div>
      </div>
    </div>
  );
}