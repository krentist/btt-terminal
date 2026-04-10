import { useMemo } from "react";
import { useTicker } from "@/lib/tickerContext";
import { useStockHistory } from "@/lib/useStockData";
import { getIndicators, computeRSI, computeMACD, computeBollingerBands, computeSMA } from "@/lib/technicalAnalysis";
import { MetricCard } from "./MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Area, ReferenceLine,
} from "recharts";

export function TechnicalTab() {
  const { ticker, range } = useTicker();
  const { data: history, isLoading } = useStockHistory(ticker, range);
  const bars = history?.bars || [];

  const indicators = useMemo(() => {
    if (bars.length < 50) return null;
    return getIndicators(bars);
  }, [bars]);

  const rsiData = useMemo(() => {
    if (bars.length < 20) return [];
    const closes = bars.map(b => b.close);
    const rsi = computeRSI(closes);
    const step = Math.max(1, Math.floor(bars.length / 200));
    return bars.filter((_, i) => i % step === 0).map((b, idx) => ({
      time: b.time,
      rsi: rsi[Math.min(idx * step, rsi.length - 1)],
    }));
  }, [bars]);

  const macdData = useMemo(() => {
    if (bars.length < 30) return [];
    const closes = bars.map(b => b.close);
    const { macdLine, signalLine, histogram } = computeMACD(closes);
    const step = Math.max(1, Math.floor(bars.length / 200));
    return bars.filter((_, i) => i % step === 0).map((b, idx) => {
      const oi = Math.min(idx * step, bars.length - 1);
      return {
        time: b.time,
        macd: macdLine[oi],
        signal: signalLine[oi],
        histogram: histogram[oi],
      };
    });
  }, [bars]);

  const bbData = useMemo(() => {
    if (bars.length < 30) return [];
    const closes = bars.map(b => b.close);
    const bb = computeBollingerBands(closes);
    const step = Math.max(1, Math.floor(bars.length / 200));
    return bars.filter((_, i) => i % step === 0).map((b, idx) => {
      const oi = Math.min(idx * step, bars.length - 1);
      return {
        time: b.time,
        close: b.close,
        upper: bb.upper[oi],
        middle: bb.middle[oi],
        lower: bb.lower[oi],
      };
    });
  }, [bars]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 bg-[#1A1A1A]" />)}
        </div>
        <Skeleton className="h-[200px] bg-[#1A1A1A]" />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2" data-testid="technical-tab">
      {/* Indicator cards */}
      <div className="grid grid-cols-4 gap-2">
        <MetricCard label="RSI (14)" value={indicators?.rsi?.toFixed(1) || "—"} />
        <MetricCard
          label="MACD"
          value={indicators?.macd?.value?.toFixed(3) || "—"}
        />
        <MetricCard
          label="BB Position"
          value={indicators ? `${(indicators.bollingerBands.position * 100).toFixed(0)}%` : "—"}
        />
        <MetricCard
          label="SMA Signal"
          value={indicators?.smaSignal?.replace("_", " ").toUpperCase() || "—"}
        />
      </div>

      {/* RSI chart */}
      <div className="terminal-card p-2">
        <div className="text-[10px] text-amber uppercase tracking-wider mb-1">RSI (14)</div>
        {rsiData.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={rsiData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
              <XAxis dataKey="time" tick={{ fill: "#888", fontSize: 9 }} tickFormatter={(v) => v.slice(5)} interval={Math.floor(rsiData.length / 5)} />
              <YAxis domain={[0, 100]} tick={{ fill: "#888", fontSize: 9 }} width={30} />
              <ReferenceLine y={70} stroke="#FF1744" strokeDasharray="3 3" strokeWidth={0.5} />
              <ReferenceLine y={30} stroke="#00C853" strokeDasharray="3 3" strokeWidth={0.5} />
              <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: 10, color: "#fff" }} />
              <Line type="monotone" dataKey="rsi" stroke="#FF9F1C" dot={false} strokeWidth={1.5} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[140px] flex items-center justify-center text-term-gray text-xs">Insufficient data</div>
        )}
      </div>

      {/* MACD chart */}
      <div className="terminal-card p-2">
        <div className="text-[10px] text-amber uppercase tracking-wider mb-1">MACD (12, 26, 9)</div>
        {macdData.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={macdData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
              <XAxis dataKey="time" tick={{ fill: "#888", fontSize: 9 }} tickFormatter={(v) => v.slice(5)} interval={Math.floor(macdData.length / 5)} />
              <YAxis tick={{ fill: "#888", fontSize: 9 }} width={45} />
              <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: 10, color: "#fff" }} />
              <Bar dataKey="histogram" fill="#536DFE" opacity={0.5} />
              <Line type="monotone" dataKey="macd" stroke="#FF9F1C" dot={false} strokeWidth={1.5} name="MACD" />
              <Line type="monotone" dataKey="signal" stroke="#FF1744" dot={false} strokeWidth={1} name="Signal" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[140px] flex items-center justify-center text-term-gray text-xs">Insufficient data</div>
        )}
      </div>

      {/* Bollinger Bands */}
      <div className="terminal-card p-2">
        <div className="text-[10px] text-amber uppercase tracking-wider mb-1">BOLLINGER BANDS (20, 2)</div>
        {bbData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={bbData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
              <XAxis dataKey="time" tick={{ fill: "#888", fontSize: 9 }} tickFormatter={(v) => v.slice(5)} interval={Math.floor(bbData.length / 5)} />
              <YAxis domain={["auto", "auto"]} tick={{ fill: "#888", fontSize: 9 }} width={55} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: 10, color: "#fff" }} />
              <Line type="monotone" dataKey="upper" stroke="#555" dot={false} strokeWidth={1} strokeDasharray="3 2" name="Upper" />
              <Line type="monotone" dataKey="middle" stroke="#536DFE" dot={false} strokeWidth={1} strokeDasharray="3 2" name="Middle" />
              <Line type="monotone" dataKey="lower" stroke="#555" dot={false} strokeWidth={1} strokeDasharray="3 2" name="Lower" />
              <Line type="monotone" dataKey="close" stroke="#FF9F1C" dot={false} strokeWidth={1.5} name="Close" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-term-gray text-xs">Insufficient data</div>
        )}
      </div>
    </div>
  );
}
