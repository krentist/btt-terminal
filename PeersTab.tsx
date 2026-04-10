import { useState, useMemo, useEffect } from "react";
import { useTicker } from "@/lib/tickerContext";
import { useQuote, useStockHistory } from "@/lib/useStockData";
import { BIOTECH_TICKERS, TICKER_TO_NAME } from "@shared/constants";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ScatterChart, Scatter, Cell, ZAxis } from "recharts";
import type { PriceHistory, StockQuote, Fundamentals } from "@shared/schema";

const PEER_COLORS = ["#FF9F1C", "#00C853", "#536DFE", "#FF1744", "#888888", "#E040FB"];

export function PeersTab() {
  const { ticker } = useTicker();
  const [selectedPeers, setSelectedPeers] = useState<string[]>([]);
  const allTickers = [ticker, ...selectedPeers];

  // Fetch ALL peer data in a single query per type
  const { data: quotesData } = useQuery<Record<string, StockQuote>>({
    queryKey: ["/api/peer-quotes", ...allTickers],
    queryFn: async () => {
      const results: Record<string, StockQuote> = {};
      await Promise.all(
        allTickers.map(async (t) => {
          try {
            const res = await apiRequest("GET", `/api/quote/${t}`);
            results[t] = await res.json();
          } catch {}
        })
      );
      return results;
    },
    staleTime: 60000,
  });

  const { data: fundData } = useQuery<Record<string, Fundamentals>>({
    queryKey: ["/api/peer-fundamentals", ...allTickers],
    queryFn: async () => {
      const results: Record<string, Fundamentals> = {};
      await Promise.all(
        allTickers.map(async (t) => {
          try {
            const res = await apiRequest("GET", `/api/fundamentals/${t}`);
            results[t] = await res.json();
          } catch {}
        })
      );
      return results;
    },
    staleTime: 600000,
  });

  const { data: histData } = useQuery<Record<string, PriceHistory>>({
    queryKey: ["/api/peer-history", ...allTickers],
    queryFn: async () => {
      const results: Record<string, PriceHistory> = {};
      await Promise.all(
        allTickers.map(async (t) => {
          try {
            const res = await apiRequest("GET", `/api/stock/${t}?range=1y`);
            results[t] = await res.json();
          } catch {}
        })
      );
      return results;
    },
    staleTime: 300000,
  });

  const normalizedData = useMemo(() => {
    if (!histData) return [];
    const allBars = allTickers
      .map(t => ({ ticker: t, bars: histData[t]?.bars || [] }))
      .filter(q => q.bars.length > 0);
    if (allBars.length === 0) return [];

    const minLen = Math.min(...allBars.map(q => q.bars.length));
    const step = Math.max(1, Math.floor(minLen / 100));
    const result: any[] = [];
    for (let i = 0; i < minLen; i += step) {
      const point: any = { time: allBars[0].bars[i].time };
      for (const q of allBars) {
        const basePrice = q.bars[0].close;
        if (basePrice > 0) {
          point[q.ticker] = parseFloat(((q.bars[i].close / basePrice) * 100).toFixed(1));
        }
      }
      result.push(point);
    }
    return result;
  }, [histData, allTickers.join(",")]);

  const scatterData = useMemo(() => {
    if (!fundData) return [];
    return allTickers.map(t => {
      const f = fundData[t];
      if (!f) return null;
      return {
        ticker: t,
        pe: f.forwardPE || f.trailingPE || 0,
        growth: (f.revenueGrowth || 0) * 100,
        mcap: f.marketCap || 0,
      };
    }).filter(Boolean);
  }, [fundData, allTickers.join(",")]);

  const togglePeer = (t: string) => {
    if (t === ticker) return;
    setSelectedPeers(prev =>
      prev.includes(t) ? prev.filter(p => p !== t) : prev.length < 5 ? [...prev, t] : prev
    );
  };

  return (
    <div className="space-y-3 p-2" data-testid="peers-tab">
      {/* Peer selector */}
      <div className="terminal-card p-2">
        <div className="text-[10px] text-amber uppercase tracking-wider mb-1">SELECT PEERS (max 5)</div>
        <div className="flex flex-wrap gap-1">
          {BIOTECH_TICKERS.filter(t => t !== ticker).slice(0, 25).map(t => (
            <button
              key={t}
              onClick={() => togglePeer(t)}
              className={`text-[10px] px-1.5 py-0.5 border rounded-sm transition-colors ${
                selectedPeers.includes(t)
                  ? "border-[#FF9F1C] text-amber bg-[#FF9F1C10]"
                  : "border-[#1A1A1A] text-term-gray hover:text-white hover:border-[#333]"
              }`}
              data-testid={`peer-btn-${t}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Peer comparison table */}
      <div className="terminal-card p-2">
        <div className="text-[10px] text-amber uppercase tracking-wider mb-1">PEER COMPARISON</div>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-term-gray uppercase">
              <th className="text-left py-1 px-1">Ticker</th>
              <th className="text-left py-1 px-1">Name</th>
              <th className="text-right py-1 px-1">Price</th>
              <th className="text-right py-1 px-1">Chg%</th>
              <th className="text-right py-1 px-1">Mkt Cap</th>
              <th className="text-right py-1 px-1">Fwd P/E</th>
              <th className="text-right py-1 px-1">Beta</th>
            </tr>
          </thead>
          <tbody>
            {allTickers.map((t, i) => {
              const quote = quotesData?.[t];
              const fund = fundData?.[t];
              const isBase = t === ticker;
              return (
                <tr key={t} className={`border-t border-[#1A1A1A] ${isBase ? "bg-[#111]" : ""}`}>
                  <td className="py-1 px-1 font-bold" style={{ color: PEER_COLORS[i] || "#fff" }}>{t}</td>
                  <td className="py-1 px-1 text-white">{TICKER_TO_NAME[t] || t}</td>
                  <td className="py-1 px-1 text-right text-white">{quote?.price ? `$${quote.price.toFixed(2)}` : "—"}</td>
                  <td className={`py-1 px-1 text-right ${(quote?.changePercent || 0) >= 0 ? "text-gain" : "text-loss"}`}>
                    {quote?.changePercent != null ? `${quote.changePercent > 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%` : "—"}
                  </td>
                  <td className="py-1 px-1 text-right text-white">
                    {fund?.marketCap ? (fund.marketCap >= 1e12 ? `$${(fund.marketCap / 1e12).toFixed(1)}T` : fund.marketCap >= 1e9 ? `$${(fund.marketCap / 1e9).toFixed(1)}B` : `$${(fund.marketCap / 1e6).toFixed(0)}M`) : "—"}
                  </td>
                  <td className="py-1 px-1 text-right text-white">{fund?.forwardPE?.toFixed(1) || "—"}</td>
                  <td className="py-1 px-1 text-right text-white">{fund?.beta?.toFixed(2) || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Normalized performance */}
        <div className="terminal-card p-2">
          <div className="text-[10px] text-amber uppercase tracking-wider mb-1">NORMALIZED PERFORMANCE (BASE=100)</div>
          {normalizedData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={normalizedData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis dataKey="time" tick={{ fill: "#888", fontSize: 9 }} tickFormatter={v => v?.slice(5) || ""} interval={Math.floor(normalizedData.length / 5)} />
                <YAxis tick={{ fill: "#888", fontSize: 9 }} width={40} />
                <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: 10, color: "#fff" }} />
                {allTickers.map((t, i) => (
                  <Line key={t} type="monotone" dataKey={t} stroke={PEER_COLORS[i] || "#fff"} dot={false} strokeWidth={1.5} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-term-gray text-xs">Loading performance data...</div>
          )}
        </div>

        {/* Valuation scatter */}
        <div className="terminal-card p-2">
          <div className="text-[10px] text-amber uppercase tracking-wider mb-1">VALUATION: P/E vs REVENUE GROWTH</div>
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis type="number" dataKey="growth" name="Rev Growth %" tick={{ fill: "#888", fontSize: 9 }} label={{ value: "Rev Growth %", fill: "#888", fontSize: 9, position: "bottom" }} />
                <YAxis type="number" dataKey="pe" name="P/E" tick={{ fill: "#888", fontSize: 9 }} width={40} />
                <ZAxis type="number" dataKey="mcap" range={[20, 200]} />
                <Tooltip
                  contentStyle={{ background: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: 10, color: "#fff" }}
                  formatter={(v: any, name: string) => [typeof v === 'number' ? v.toFixed(1) : v, name]}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((d: any, i: number) => (
                    <Cell key={i} fill={d.ticker === ticker ? "#FF9F1C" : PEER_COLORS[(allTickers.indexOf(d.ticker)) % PEER_COLORS.length] || "#888"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-term-gray text-xs">Loading fundamentals...</div>
          )}
        </div>
      </div>
    </div>
  );
}
