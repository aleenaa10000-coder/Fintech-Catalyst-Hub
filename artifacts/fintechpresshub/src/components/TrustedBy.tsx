import { Landmark, CircleDollarSign, Bitcoin, Wallet, ShieldCheck, LineChart } from "lucide-react";

const logos = [
  { name: "NorthVault", Icon: Landmark },
  { name: "PaySphere", Icon: CircleDollarSign },
  { name: "ChainBlock", Icon: Bitcoin },
  { name: "Walletly", Icon: Wallet },
  { name: "SafeFi", Icon: ShieldCheck },
  { name: "QuantEdge", Icon: LineChart },
];

export function TrustedBy() {
  return (
    <section className="py-14 border-b" style={{ backgroundColor: "#f8f9fa" }}>
      <div className="container mx-auto px-4">
        <p className="text-center text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-8">
          Trusted by leading fintech teams
        </p>
        <div className="overflow-hidden relative">
          <div
            className="flex gap-16 items-center w-max animate-[trusted-scroll_30s_linear_infinite]"
            style={{
              animationName: "trusted-scroll",
            }}
          >
            {[...logos, ...logos].map(({ name, Icon }, i) => (
              <div
                key={`${name}-${i}`}
                className="flex items-center gap-3 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300 shrink-0"
              >
                <Icon className="w-7 h-7 text-blue-600" />
                <span className="text-xl font-semibold tracking-tight text-slate-700 whitespace-nowrap">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes trusted-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
