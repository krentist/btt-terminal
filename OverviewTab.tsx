import { useMemo } from "react";
import { useTicker } from "@/lib/tickerContext";
import { useStockHistory, useQuote, useFundamentals, useTrials } from "@/lib/useStockData";
import { getIndicators, getPrediction } from "@/lib/technicalAnalysis";
import { MetricCard } from "./MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

function formatLargeNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

function formatNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return "—";
  return n.toFixed(decimals);
}

export function OverviewTab() {
  const { ticker, range } = useTicker();
  const { data: history, isLoading: histLoading } = useStockHistory(ticker, range);
  const { data: quote, isLoading: quoteLoading } = useQuote(ticker);
  const { data: fundamentals, isLoading: fundLoading } = useFundamentals(ticker);
  const { data: trialsData } = useTrials(ticker);

  const bars = history?.bars || [];

  const chartData = useMemo(() => {
    if (bars.length === 0) return [];
    // Compute SMA50 and SMA200 inline
    const closes = bars.map(b => b.close);
    const sma = (period: number) => {
      const result: (number | null)[] = [];
      for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) { result.push(null); continue; }
        let sum = 0;
        for (let j = 0; j < period; j++) sum += closes[i - j];
        result.push(sum / period);
      }
      return result;
    };
    const sma50 = sma(50);
    const sma200 = sma(200);
    // Thin out data for display
    const step = Math.max(1, Math.floor(bars.length / 250));
    return bars.filter((_, i) => i % step === 0 || i === bars.length - 1).map((b, idx) => {
      const origIdx = Math.min(idx * step, bars.length - 1);
      return {
        time: b.time,
        close: b.close,
        volume: b.volume,
        sma50: sma50[origIdx],
        sma200: sma200[origIdx],
      };
    });
  }, [bars]);

  const prediction = useMemo(() => {
    if (bars.length < 50) return null;
    const ind = getIndicators(bars);
    return getPrediction(bars, ind);
  }, [bars]);

  const activeTrials = trialsData?.trials?.filter(
    t => ["RECRUITING", "ACTIVE_NOT_RECRUITING", "ENROLLING_BY_INVITATION", "NOT_YET_RECRUITING"].includes(t.status?.toUpperCase().replace(/,\s*/g, "_").replace(/ /g, "_"))
  ).length || 0;

  const loading = histLoading || quoteLoading || fundLoading;

  return (
    <div className="space-y-3 p-2" data-testid="overview-tab">
      {/* Metric cards row */}
      <div className="grid grid-cols-6 gap-2">
        <MetricCard
          label="Price"
          value={quote?.price ? `$${quote.price.toFixed(2)}` : null}
          delta={quote?.changePercent}
          loading={quoteLoading}
        />
        <MetricCard
          label="Market Cap"
          value={fundamentals?.marketCap ? formatLargeNum(fundamentals.marketCap) : null}
          loading={fundLoading}
        />
        <MetricCard
          label="Fwd P/E"
          value={formatNum(fundamentals?.forwardPE)}
          loading={fundLoading}
        />
        <MetricCard
          label="EV/Revenue"
          value={formatNum(fundamentals?.evToRevenue)}
          loading={fundLoading}
        />
        <MetricCard
          label="Beta"
          value={formatNum(fundamentals?.beta)}
          loading={fundLoading}
        />
        <MetricCard
          label="Pipeline"
          value={activeTrials > 0 ? `${activeTrials} active` : "—"}
          loading={false}
        />
      </div>

      {/* Price chart */}
      <div className="terminal-card p-2">
        <div className="text-[10px] text-amber uppercase tracking-wider mb-1">
          PRICE HISTORY — {ticker} — {range.toUpperCase()}
        </div>
        {histLoading ? (
          <Skeleton className="h-[260px] w-full bg-[#1A1A1A]" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#888", fontSize: 9 }}
                tickFormatter={(v) => v.slice(5)}
                interval={Math.floor(chartData.length / 6)}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#888", fontSize: 9 }}
                width={55}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{ background: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: 11, color: "#fff" }}
                labelStyle={{ color: "#FF9F1C" }}
              />
              <Line type="monotone" dataKey="close" stroke="#FF9F1C" dot={false} strokeWidth={1.5} name="Close" />
              <Line type="monotone" dataKey="sma50" stroke="#536DFE" dot={false} strokeWidth={1} strokeDasharray="4 2" name="SMA50" />
              <Line type="monotone" dataKey="sma200" stroke="#888" dot={false} strokeWidth={1} strokeDasharray="4 2" name="SMA200" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-term-gray text-xs">No data available</div>
        )}
      </div>

      {/* Volume + Signal row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 terminal-card p-2">
          <div className="text-[10px] text-amber uppercase tracking-wider mb-1">VOLUME</div>
          {histLoading ? (
            <Skeleton className="h-[100px] w-full bg-[#1A1A1A]" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={100}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                <XAxis dataKey="time" tick={false} />
                <YAxis tick={{ fill: "#888", fontSize: 9 }} width={55} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                <Bar dataKey="volume" fill="#536DFE" opacity={0.6} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : null}
        </div>
        <div className="terminal-card p-2">
          <div className="text-[10px] text-amber uppercase tracking-wider mb-1">SIGNAL</div>
          {prediction ? (
            <div className="flex flex-col items-center justify-center h-[100px]">
              <div className={`text-xl font-bold ${
                prediction.direction === "BULLISH" ? "text-gain" :
                prediction.direction === "BEARISH" ? "text-loss" : "text-amber"
              }`} data-testid="signal-direction">
                {prediction.direction}
              </div>
              <div className="text-xs text-term-gray mt-1">Score: {prediction.score.toFixed(0)}/100</div>
              <div className="text-[10px] text-term-gray mt-1">
                E[R]: {prediction.expectedReturn > 0 ? "+" : ""}{prediction.expectedReturn.toFixed(1)}% ann.
              </div>
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center text-term-gray text-xs">Insufficient data</div>
          )}
        </div>
      </div>
    </div>
  );
}
