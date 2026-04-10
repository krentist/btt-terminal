import { useMemo } from "react";
import { useTicker } from "@/lib/tickerContext";
import { useNews } from "@/lib/useStockData";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function NewsTab() {
  const { ticker } = useTicker();
  const { data: newsData, isLoading } = useNews(ticker);
  const news = newsData?.news || [];

  const aggregateSentiment = useMemo(() => {
    if (news.length === 0) return { score: 0, label: "N/A", positive: 0, negative: 0, neutral: 0 };
    let pos = 0, neg = 0, neu = 0;
    news.forEach((n: any) => {
      if (n.sentiment === "positive") pos++;
      else if (n.sentiment === "negative") neg++;
      else neu++;
    });
    const score = ((pos - neg) / news.length) * 100;
    const label = score > 20 ? "BULLISH" : score < -20 ? "BEARISH" : "MIXED";
    return { score, label, positive: pos, negative: neg, neutral: neu };
  }, [news]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 bg-[#1A1A1A]" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2" data-testid="news-tab">
      {/* Sentiment summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="terminal-card p-2 text-center">
          <div className="text-[10px] text-term-gray uppercase">Aggregate Sentiment</div>
          <div className={`text-lg font-bold ${
            aggregateSentiment.label === "BULLISH" ? "text-gain" :
            aggregateSentiment.label === "BEARISH" ? "text-loss" : "text-amber"
          }`} data-testid="aggregate-sentiment">
            {aggregateSentiment.label}
          </div>
        </div>
        <div className="terminal-card p-2 text-center">
          <div className="text-[10px] text-term-gray uppercase">Positive</div>
          <div className="text-lg font-bold text-gain">{aggregateSentiment.positive}</div>
        </div>
        <div className="terminal-card p-2 text-center">
          <div className="text-[10px] text-term-gray uppercase">Negative</div>
          <div className="text-lg font-bold text-loss">{aggregateSentiment.negative}</div>
        </div>
        <div className="terminal-card p-2 text-center">
          <div className="text-[10px] text-term-gray uppercase">Neutral</div>
          <div className="text-lg font-bold text-term-gray">{aggregateSentiment.neutral}</div>
        </div>
      </div>

      {/* News list */}
      <div className="terminal-card p-2">
        <div className="text-[10px] text-amber uppercase tracking-wider mb-2">NEWS & HEADLINES — {ticker}</div>
        <div className="space-y-1">
          {news.length > 0 ? news.map((n: any, i: number) => (
            <div key={i} className="flex items-start gap-2 py-1.5 border-b border-[#1A1A1A] last:border-0" data-testid={`news-item-${i}`}>
              <div className="mt-0.5">
                {n.sentiment === "positive" ? <TrendingUp className="w-3 h-3 text-gain" /> :
                 n.sentiment === "negative" ? <TrendingDown className="w-3 h-3 text-loss" /> :
                 <Minus className="w-3 h-3 text-term-gray" />}
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-white hover:text-amber transition-colors block truncate"
                >
                  {n.title}
                </a>
                <div className="flex gap-2 text-[9px] text-term-gray mt-0.5">
                  <span className="text-term-blue">{n.publisher}</span>
                  <span>{n.publishedAt ? format(new Date(n.publishedAt), "MMM d, h:mm a") : ""}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-term-gray text-xs text-center py-4">No news available</div>
          )}
        </div>
      </div>
    </div>
  );
}
