import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuote } from "@/lib/useStockData";
import { useTicker } from "@/lib/tickerContext";
import { BIOTECH_TICKERS, TICKER_TO_NAME } from "@shared/constants";
import type { Watchlist } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, RefreshCw } from "lucide-react";

function WatchlistRow({ ticker, onRemove }: { ticker: string; onRemove: () => void }) {
  const { data: quote, isLoading } = useQuote(ticker);
  const { setTicker } = useTicker();

  return (
    <tr className="border-t border-[#1A1A1A] hover:bg-[#111] cursor-pointer" onClick={() => setTicker(ticker)} data-testid={`watchlist-row-${ticker}`}>
      <td className="py-1.5 px-2 text-amber font-bold text-[11px]">{ticker}</td>
      <td className="py-1.5 px-2 text-white text-[11px]">{TICKER_TO_NAME[ticker] || ticker}</td>
      <td className="py-1.5 px-2 text-right text-white text-[11px]">
        {isLoading ? <Skeleton className="h-4 w-16 bg-[#1A1A1A] inline-block" /> : quote?.price ? `$${quote.price.toFixed(2)}` : "—"}
      </td>
      <td className={`py-1.5 px-2 text-right text-[11px] ${(quote?.changePercent || 0) >= 0 ? "text-gain" : "text-loss"}`}>
        {isLoading ? <Skeleton className="h-4 w-14 bg-[#1A1A1A] inline-block" /> :
          quote?.changePercent != null ? `${quote.changePercent > 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%` : "—"
        }
      </td>
      <td className={`py-1.5 px-2 text-right text-[11px] ${(quote?.change || 0) >= 0 ? "text-gain" : "text-loss"}`}>
        {isLoading ? <Skeleton className="h-4 w-14 bg-[#1A1A1A] inline-block" /> :
          quote?.change != null ? `${quote.change > 0 ? "+" : ""}${quote.change.toFixed(2)}` : "—"
        }
      </td>
      <td className="py-1.5 px-2 text-right text-[11px] text-term-gray">
        {isLoading ? <Skeleton className="h-4 w-16 bg-[#1A1A1A] inline-block" /> :
          quote?.volume ? `${(quote.volume / 1e6).toFixed(1)}M` : "—"
        }
      </td>
      <td className="py-1.5 px-2 text-right">
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-term-gray hover:text-loss transition-colors"
          data-testid={`remove-watchlist-${ticker}`}
        >
          <X className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}

export function WatchlistTab() {
  const [addTicker, setAddTicker] = useState("");

  const { data: watchlist = [], isLoading } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  const addMutation = useMutation({
    mutationFn: async (ticker: string) => {
      await apiRequest("POST", "/api/watchlist", { ticker });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      setAddTicker("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (ticker: string) => {
      await apiRequest("DELETE", `/api/watchlist/${ticker}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  const handleAdd = () => {
    const t = addTicker.toUpperCase().trim();
    if (t && BIOTECH_TICKERS.includes(t as any)) {
      addMutation.mutate(t);
    }
  };

  return (
    <div className="space-y-3 p-2" data-testid="watchlist-tab">
      {/* Add ticker */}
      <div className="flex gap-2 items-center">
        <select
          className="bg-[#0A0A0A] border border-[#1A1A1A] text-white text-[11px] px-2 py-1.5 rounded-sm flex-1 max-w-[200px]"
          value={addTicker}
          onChange={e => setAddTicker(e.target.value)}
          data-testid="watchlist-ticker-select"
        >
          <option value="">Add ticker...</option>
          {BIOTECH_TICKERS.filter(t => !watchlist.some(w => w.ticker === t)).map(t => (
            <option key={t} value={t}>{t} — {TICKER_TO_NAME[t]}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!addTicker || addMutation.isPending}
          className="flex items-center gap-1 bg-amber text-black text-[11px] px-3 py-1.5 rounded-sm hover:bg-[#E08C18] transition-colors disabled:opacity-50"
          data-testid="add-to-watchlist"
        >
          <Plus className="w-3 h-3" /> ADD
        </button>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] })}
          className="text-term-gray hover:text-white transition-colors p-1"
          data-testid="refresh-watchlist"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Watchlist table */}
      <div className="terminal-card p-2">
        <div className="text-[10px] text-amber uppercase tracking-wider mb-1">WATCHLIST</div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 bg-[#1A1A1A]" />)}
          </div>
        ) : watchlist.length > 0 ? (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-term-gray uppercase text-[10px]">
                <th className="text-left py-1 px-2">Ticker</th>
                <th className="text-left py-1 px-2">Name</th>
                <th className="text-right py-1 px-2">Price</th>
                <th className="text-right py-1 px-2">Chg%</th>
                <th className="text-right py-1 px-2">Change</th>
                <th className="text-right py-1 px-2">Volume</th>
                <th className="text-right py-1 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map(w => (
                <WatchlistRow
                  key={w.ticker}
                  ticker={w.ticker}
                  onRemove={() => removeMutation.mutate(w.ticker)}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-8 text-center">
            <div className="text-term-gray text-xs mb-2">No tickers in watchlist</div>
            <div className="text-[10px] text-term-gray">Use the selector above to add tickers</div>
          </div>
        )}
      </div>
    </div>
  );
}
