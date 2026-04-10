import { createContext, useContext, useState, type ReactNode } from "react";

interface TickerContextType {
  ticker: string;
  setTicker: (t: string) => void;
  range: string;
  setRange: (r: string) => void;
}

const TickerContext = createContext<TickerContextType>({
  ticker: "LLY",
  setTicker: () => {},
  range: "1y",
  setRange: () => {},
});

export function TickerProvider({ children }: { children: ReactNode }) {
  const [ticker, setTicker] = useState("LLY");
  const [range, setRange] = useState("1y");
  return (
    <TickerContext.Provider value={{ ticker, setTicker, range, setRange }}>
      {children}
    </TickerContext.Provider>
  );
}

export function useTicker() {
  return useContext(TickerContext);
}
