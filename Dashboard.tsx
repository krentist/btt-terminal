import { useState, useEffect } from "react";
import { useTicker } from "@/lib/tickerContext";
import { useQuote } from "@/lib/useStockData";
import { BIOTECH_TICKERS, TICKER_TO_NAME } from "@shared/constants";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/OverviewTab";
import { TechnicalTab } from "@/components/TechnicalTab";
import { PipelineTab } from "@/components/PipelineTab";
import { PredictionTab } from "@/components/PredictionTab";
import { PeersTab } from "@/components/PeersTab";
import { NewsTab } from "@/components/NewsTab";
import { WatchlistTab } from "@/components/WatchlistTab";
import { RefreshCw, Search } from "lucide-react";

const RANGES = ["1mo", "3mo", "6mo", "1y", "2y", "5y"];

export default function Dashboard() {
  const { ticker, setTicker, range, setRange } = useTicker();
  const { data: quote } = useQuote(ticker);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const filteredTickers = searchQuery
    ? BIOTECH_TICKERS.filter(t =>
        t.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (TICKER_TO_NAME[t] || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : BIOTECH_TICKERS;

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  // Force dark class on mount
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="h-full flex flex-col bg-black" data-testid="dashboard">
      {/* Top header bar */}
      <header className="flex items-center justify-between px-3 py-1.5 border-b border-[#1A1A1A] bg-black shrink-0" data-testid="header">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="BioTerminal" className="text-amber">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
          </svg>
          <span className="text-amber font-bold text-sm tracking-wider">BIOTERMINAL</span>
        </div>
        <div className="flex items-center gap-3">
          {quote && (
            <div className="flex items-center gap-2 text-xs" data-testid="header-quote">
              <span className="text-amber font-bold">{ticker}</span>
              <span className="text-white">${quote.price?.toFixed(2)}</span>
              <span className={quote.changePercent >= 0 ? "text-gain" : "text-loss"}>
                {quote.changePercent >= 0 ? "+" : ""}{quote.changePercent?.toFixed(2)}%
              </span>
            </div>
          )}
          <div className="text-[10px] text-term-gray">
            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-[180px] border-r border-[#1A1A1A] bg-black flex flex-col shrink-0 overflow-y-auto overscroll-contain" data-testid="sidebar">
          {/* Search */}
          <div className="p-2 border-b border-[#1A1A1A]">
            <div className="relative">
              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-term-gray" />
              <input
                type="text"
                placeholder="Search ticker..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#1A1A1A] text-white text-[11px] pl-6 pr-2 py-1 rounded-sm placeholder:text-[#555] focus:outline-none focus:border-amber"
                data-testid="ticker-search"
              />
            </div>
          </div>

          {/* Ticker list */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-1">
            <div className="text-[9px] text-term-gray uppercase tracking-wider px-1 py-1">TICKERS</div>
            {filteredTickers.map(t => (
              <button
                key={t}
                onClick={() => { setTicker(t); setSearchQuery(""); }}
                className={`w-full text-left text-[11px] px-2 py-1 rounded-sm transition-colors ${
                  t === ticker ? "bg-[#FF9F1C20] text-amber" : "text-white hover:bg-[#111]"
                }`}
                data-testid={`ticker-${t}`}
              >
                <span className="font-bold">{t}</span>
                <span className="text-[9px] text-term-gray ml-1 truncate">
                  {TICKER_TO_NAME[t]?.split(" ")[0] || ""}
                </span>
              </button>
            ))}
          </div>

          {/* Period selector */}
          <div className="p-2 border-t border-[#1A1A1A]">
            <div className="text-[9px] text-term-gray uppercase tracking-wider mb-1">PERIOD</div>
            <div className="grid grid-cols-3 gap-1">
              {RANGES.map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`text-[10px] py-0.5 rounded-sm transition-colors ${
                    r === range ? "bg-amber text-black font-bold" : "bg-[#0A0A0A] text-term-gray hover:text-white border border-[#1A1A1A]"
                  }`}
                  data-testid={`range-${r}`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Refresh */}
          <div className="p-2 border-t border-[#1A1A1A]">
            <button
              onClick={handleRefresh}
              className="w-full flex items-center justify-center gap-1 bg-[#0A0A0A] border border-[#1A1A1A] text-term-gray hover:text-amber text-[10px] py-1.5 rounded-sm transition-colors"
              data-testid="refresh-btn"
            >
              <RefreshCw className="w-3 h-3" /> REFRESH
            </button>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto overscroll-contain bg-black" data-testid="main-content">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="bg-black border-b border-[#1A1A1A] rounded-none px-2 shrink-0 h-auto py-0 justify-start gap-0">
              {[
                { value: "overview", label: "OVERVIEW" },
                { value: "technical", label: "TECHNICAL" },
                { value: "pipeline", label: "PIPELINE" },
                { value: "prediction", label: "PREDICTION" },
                { value: "peers", label: "PEERS" },
                { value: "news", label: "NEWS" },
                { value: "watchlist", label: "WATCHLIST" },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-[10px] tracking-wider px-3 py-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-amber data-[state=active]:text-amber text-term-gray hover:text-white data-[state=active]:bg-transparent bg-transparent transition-colors"
                  data-testid={`tab-${tab.value}`}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <TabsContent value="overview" className="mt-0 h-full"><OverviewTab /></TabsContent>
              <TabsContent value="technical" className="mt-0 h-full"><TechnicalTab /></TabsContent>
              <TabsContent value="pipeline" className="mt-0 h-full"><PipelineTab /></TabsContent>
              <TabsContent value="prediction" className="mt-0 h-full"><PredictionTab /></TabsContent>
              <TabsContent value="peers" className="mt-0 h-full"><PeersTab /></TabsContent>
              <TabsContent value="news" className="mt-0 h-full"><NewsTab /></TabsContent>
              <TabsContent value="watchlist" className="mt-0 h-full"><WatchlistTab /></TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
