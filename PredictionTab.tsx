import { useMemo, useState } from "react";
import { useTicker } from "@/lib/tickerContext";
import { useStockHistory } from "@/lib/useStockData";
import { getIndicators, getPrediction } from "@/lib/technicalAnalysis";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

export function PredictionTab() {
  const { ticker, range } = useTicker();
  const { data: history, isLoading } = useStockHistory(ticker, range);
  const bars = history?.bars || [];
  const [devilOpen, setDevilOpen] = useState(false);

  const prediction = useMemo(() => {
    if (bars.length < 50) return null;
    const indicators = getIndicators(bars);
    return getPrediction(bars, indicators);
  }, [bars]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        <Skeleton className="h-[150px] bg-[#1A1A1A]" />
        <Skeleton className="h-[200px] bg-[#1A1A1A]" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="p-4 flex items-center justify-center text-term-gray text-sm" data-testid="prediction-tab">
        Insufficient price data for prediction analysis. Need at least 50 data points.
      </div>
    );
  }

  const dirColor = prediction.direction === "BULLISH" ? "text-gain" : prediction.direction === "BEARISH" ? "text-loss" : "text-amber";
  const dirBg = prediction.direction === "BULLISH" ? "border-[#00C853]" : prediction.direction === "BEARISH" ? "border-[#FF1744]" : "border-[#FF9F1C]";
  const DirIcon = prediction.direction === "BULLISH" ? TrendingUp : prediction.direction === "BEARISH" ? TrendingDown : Minus;

  const featureData = prediction.factors.map(f => ({
    name: f.name,
    contribution: parseFloat(f.contribution.toFixed(1)),
    score: f.score,
  }));

  return (
    <div className="space-y-3 p-2" data-testid="prediction-tab">
      {/* Main signal */}
      <div className={`terminal-card p-4 border-l-2 ${dirBg}`}>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <DirIcon className={`w-8 h-8 ${dirColor}`} />
            <div className={`text-2xl font-bold ${dirColor} mt-1`} data-testid="prediction-direction">
              {prediction.direction}
            </div>
            <div className="text-xs text-term-gray">Score: {prediction.score.toFixed(0)}/100</div>
          </div>
          <div className="border-l border-[#1A1A1A] pl-4 flex-1">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] text-term-gray uppercase">Expected Return (Ann.)</div>
                <div className={`text-lg font-bold ${prediction.expectedReturn > 0 ? "text-gain" : "text-loss"}`}>
                  {prediction.expectedReturn > 0 ? "+" : ""}{prediction.expectedReturn.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-term-gray uppercase">95% CI Low</div>
                <div className="text-lg font-bold text-loss">{prediction.confidenceLow.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-term-gray uppercase">95% CI High</div>
                <div className="text-lg font-bold text-gain">+{prediction.confidenceHigh.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Reasoning */}
        <div className="terminal-card p-2">
          <div className="text-[10px] text-amber uppercase tracking-wider mb-2">FACTOR ANALYSIS</div>
          <div className="space-y-1">
            {prediction.factors.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <div className={`w-1 h-1 rounded-full mt-1.5 ${
                  f.score > 60 ? "bg-[#00C853]" : f.score < 40 ? "bg-[#FF1744]" : "bg-[#FF9F1C]"
                }`} />
                <div>
                  <span className="text-white font-medium">{f.name}</span>
                  <span className="text-term-gray"> ({f.weight * 100}%w) — </span>
                  <span className="text-term-gray">{f.reasoning}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature importance */}
        <div className="terminal-card p-2">
          <div className="text-[10px] text-amber uppercase tracking-wider mb-1">SIGNAL CONTRIBUTION</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={featureData} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
              <XAxis type="number" tick={{ fill: "#888", fontSize: 9 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#888", fontSize: 9 }} width={80} />
              <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: 10, color: "#fff" }} />
              <Bar dataKey="contribution" radius={[0, 2, 2, 0]}>
                {featureData.map((f, i) => (
                  <Cell key={i} fill={f.score > 60 ? "#00C853" : f.score < 40 ? "#FF1744" : "#FF9F1C"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Devil's Advocate */}
      <Collapsible open={devilOpen} onOpenChange={setDevilOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-amber text-[11px] uppercase tracking-wider hover:text-white transition-colors w-full terminal-card p-2" data-testid="devils-advocate-toggle">
          {devilOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          DEVIL'S ADVOCATE PANEL
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="terminal-card p-3 mt-1 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-gain uppercase tracking-wider mb-2">BULL CASE</div>
              <ul className="space-y-1">
                {prediction.bullCase.map((item, i) => (
                  <li key={i} className="text-[11px] text-white flex gap-1">
                    <span className="text-gain">+</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] text-loss uppercase tracking-wider mb-2">BEAR CASE</div>
              <ul className="space-y-1">
                {prediction.bearCase.map((item, i) => (
                  <li key={i} className="text-[11px] text-white flex gap-1">
                    <span className="text-loss">−</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] text-amber uppercase tracking-wider mb-2">KEY RISKS</div>
              <ul className="space-y-1">
                {prediction.risks.map((item, i) => (
                  <li key={i} className="text-[11px] text-term-gray flex gap-1">
                    <span className="text-amber">!</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] text-term-blue uppercase tracking-wider mb-2">COMMITTEE VERDICT</div>
              <p className="text-[11px] text-white leading-relaxed">{prediction.verdict}</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
