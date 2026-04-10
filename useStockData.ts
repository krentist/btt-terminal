import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import type { PriceHistory, StockQuote, Fundamentals, ClinicalTrial, NewsItem } from "@shared/schema";

export function useStockHistory(ticker: string, range = "1y") {
  return useQuery<PriceHistory>({
    queryKey: ["/api/stock", ticker, range],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stock/${ticker}?range=${range}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useQuote(ticker: string) {
  return useQuery<StockQuote>({
    queryKey: ["/api/quote", ticker],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quote/${ticker}`);
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

export function useFundamentals(ticker: string) {
  return useQuery<Fundamentals>({
    queryKey: ["/api/fundamentals", ticker],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/fundamentals/${ticker}`);
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useTrials(ticker: string) {
  return useQuery<{ ticker: string; trials: ClinicalTrial[] }>({
    queryKey: ["/api/trials", ticker],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/trials/${ticker}`);
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useNews(ticker: string) {
  return useQuery<{ ticker: string; news: (NewsItem & { sentiment?: string })[] }>({
    queryKey: ["/api/news", ticker],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/news/${ticker}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
