import type { PriceBar } from "@shared/schema";

export interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number; position: number };
  sma50: number;
  sma200: number;
  smaSignal: "golden_cross" | "death_cross" | "above" | "below" | "neutral";
  volumeRatio: number;
  momentum: number;
  atr: number;
}

export interface PredictionResult {
  score: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  expectedReturn: number;
  confidenceLow: number;
  confidenceHigh: number;
  factors: {
    name: string;
    weight: number;
    score: number;
    contribution: number;
    reasoning: string;
  }[];
  bullCase: string[];
  bearCase: string[];
  risks: string[];
  verdict: string;
}

function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j];
    result.push(sum / period);
  }
  return result;
}

function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { result.push(data[0]); continue; }
    result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
  }
  return result;
}

export function computeRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { rsi.push(50); continue; }
    const change = closes[i] - closes[i - 1];
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      if (i < period) { rsi.push(50); continue; }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }
  return rsi;
}

export function computeMACD(closes: number[]) {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

export function computeBollingerBands(closes: number[], period = 20, stdDev = 2) {
  const middle = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(NaN); lower.push(NaN); continue; }
    let sumSq = 0;
    for (let j = 0; j < period; j++) sumSq += Math.pow(closes[i - j] - middle[i], 2);
    const sd = Math.sqrt(sumSq / period);
    upper.push(middle[i] + stdDev * sd);
    lower.push(middle[i] - stdDev * sd);
  }
  return { upper, middle, lower };
}

export function computeSMA(closes: number[], period: number): number[] {
  return sma(closes, period);
}

export function computeATR(bars: PriceBar[], period = 14): number[] {
  const tr: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) { tr.push(bars[i].high - bars[i].low); continue; }
    const hl = bars[i].high - bars[i].low;
    const hc = Math.abs(bars[i].high - bars[i - 1].close);
    const lc = Math.abs(bars[i].low - bars[i - 1].close);
    tr.push(Math.max(hl, hc, lc));
  }
  return sma(tr, period);
}

export function getIndicators(bars: PriceBar[]): TechnicalIndicators {
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);
  const n = closes.length;
  if (n < 50) {
    return {
      rsi: 50, macd: { value: 0, signal: 0, histogram: 0 },
      bollingerBands: { upper: 0, middle: 0, lower: 0, position: 0.5 },
      sma50: 0, sma200: 0, smaSignal: "neutral",
      volumeRatio: 1, momentum: 0, atr: 0,
    };
  }

  const rsiArr = computeRSI(closes);
  const currentRSI = rsiArr[n - 1];
  
  const { macdLine, signalLine, histogram } = computeMACD(closes);
  const currentMACD = { value: macdLine[n - 1], signal: signalLine[n - 1], histogram: histogram[n - 1] };

  const bb = computeBollingerBands(closes);
  const bbUpper = bb.upper[n - 1];
  const bbMiddle = bb.middle[n - 1];
  const bbLower = bb.lower[n - 1];
  const bbRange = bbUpper - bbLower;
  const bbPosition = bbRange > 0 ? (closes[n - 1] - bbLower) / bbRange : 0.5;

  const sma50Arr = sma(closes, 50);
  const sma200Arr = sma(closes, 200);
  const sma50Val = sma50Arr[n - 1] || 0;
  const sma200Val = sma200Arr[n - 1] || 0;

  let smaSignal: TechnicalIndicators["smaSignal"] = "neutral";
  if (n > 200 && !isNaN(sma50Val) && !isNaN(sma200Val)) {
    const prev50 = sma50Arr[n - 2];
    const prev200 = sma200Arr[n - 2];
    if (prev50 <= prev200 && sma50Val > sma200Val) smaSignal = "golden_cross";
    else if (prev50 >= prev200 && sma50Val < sma200Val) smaSignal = "death_cross";
    else if (closes[n - 1] > sma50Val) smaSignal = "above";
    else smaSignal = "below";
  }

  const recentVol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volumeRatio = avgVol > 0 ? recentVol / avgVol : 1;

  const mom20 = n > 20 ? (closes[n - 1] / closes[n - 21] - 1) * 100 : 0;

  const atrArr = computeATR(bars);
  const atrVal = atrArr[n - 1] || 0;

  return {
    rsi: currentRSI,
    macd: currentMACD,
    bollingerBands: { upper: bbUpper, middle: bbMiddle, lower: bbLower, position: bbPosition },
    sma50: sma50Val,
    sma200: sma200Val,
    smaSignal,
    volumeRatio,
    momentum: mom20,
    atr: atrVal,
  };
}

export function getPrediction(bars: PriceBar[], indicators: TechnicalIndicators): PredictionResult {
  const closes = bars.map(b => b.close);
  const n = closes.length;
  const currentPrice = closes[n - 1] || 0;

  // RSI Score (20% weight)
  let rsiScore: number;
  let rsiReasoning: string;
  if (indicators.rsi < 30) { rsiScore = 85; rsiReasoning = `RSI at ${indicators.rsi.toFixed(1)} — oversold territory, potential bounce`; }
  else if (indicators.rsi < 40) { rsiScore = 70; rsiReasoning = `RSI at ${indicators.rsi.toFixed(1)} — approaching oversold`; }
  else if (indicators.rsi > 70) { rsiScore = 15; rsiReasoning = `RSI at ${indicators.rsi.toFixed(1)} — overbought territory, pullback risk`; }
  else if (indicators.rsi > 60) { rsiScore = 35; rsiReasoning = `RSI at ${indicators.rsi.toFixed(1)} — approaching overbought`; }
  else { rsiScore = 50; rsiReasoning = `RSI at ${indicators.rsi.toFixed(1)} — neutral zone`; }

  // MACD Score (20% weight)
  let macdScore: number;
  let macdReasoning: string;
  if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
    macdScore = 75;
    macdReasoning = "MACD bullish crossover — momentum is positive";
  } else if (indicators.macd.histogram < 0 && indicators.macd.value < indicators.macd.signal) {
    macdScore = 25;
    macdReasoning = "MACD bearish crossover — momentum is negative";
  } else {
    macdScore = 50;
    macdReasoning = "MACD transitioning — no clear signal";
  }

  // Bollinger Bands Score (15% weight)
  let bbScore: number;
  let bbReasoning: string;
  if (indicators.bollingerBands.position < 0.1) { bbScore = 80; bbReasoning = "Price near lower Bollinger Band — mean reversion likely"; }
  else if (indicators.bollingerBands.position > 0.9) { bbScore = 20; bbReasoning = "Price near upper Bollinger Band — potential pullback"; }
  else if (indicators.bollingerBands.position > 0.5) { bbScore = 60; bbReasoning = "Price above BB midline — slight bullish bias"; }
  else { bbScore = 40; bbReasoning = "Price below BB midline — slight bearish bias"; }

  // Trend Score (25% weight)
  let trendScore: number;
  let trendReasoning: string;
  if (indicators.smaSignal === "golden_cross") { trendScore = 90; trendReasoning = "Golden cross detected — strong bullish trend signal"; }
  else if (indicators.smaSignal === "death_cross") { trendScore = 10; trendReasoning = "Death cross detected — strong bearish trend signal"; }
  else if (indicators.smaSignal === "above") { trendScore = 65; trendReasoning = "Price above SMA50 — uptrend intact"; }
  else if (indicators.smaSignal === "below") { trendScore = 35; trendReasoning = "Price below SMA50 — downtrend pressure"; }
  else { trendScore = 50; trendReasoning = "No clear trend signal — insufficient data"; }

  // Volume Score (10% weight)
  let volScore: number;
  let volReasoning: string;
  if (indicators.volumeRatio > 1.5) { volScore = 70; volReasoning = `Volume ${indicators.volumeRatio.toFixed(1)}x average — strong participation`; }
  else if (indicators.volumeRatio < 0.6) { volScore = 30; volReasoning = `Volume ${indicators.volumeRatio.toFixed(1)}x average — low conviction`; }
  else { volScore = 50; volReasoning = `Volume ${indicators.volumeRatio.toFixed(1)}x average — normal activity`; }

  // Momentum Score (10% weight)
  let momScore: number;
  let momReasoning: string;
  if (indicators.momentum > 10) { momScore = 80; momReasoning = `20-day momentum +${indicators.momentum.toFixed(1)}% — strong upward momentum`; }
  else if (indicators.momentum > 3) { momScore = 65; momReasoning = `20-day momentum +${indicators.momentum.toFixed(1)}% — positive momentum`; }
  else if (indicators.momentum < -10) { momScore = 20; momReasoning = `20-day momentum ${indicators.momentum.toFixed(1)}% — strong downward momentum`; }
  else if (indicators.momentum < -3) { momScore = 35; momReasoning = `20-day momentum ${indicators.momentum.toFixed(1)}% — negative momentum`; }
  else { momScore = 50; momReasoning = `20-day momentum ${indicators.momentum.toFixed(1)}% — flat`; }

  const factors = [
    { name: "RSI Zone", weight: 0.20, score: rsiScore, contribution: rsiScore * 0.20, reasoning: rsiReasoning },
    { name: "MACD Signal", weight: 0.20, score: macdScore, contribution: macdScore * 0.20, reasoning: macdReasoning },
    { name: "Bollinger Position", weight: 0.15, score: bbScore, contribution: bbScore * 0.15, reasoning: bbReasoning },
    { name: "Trend (SMA)", weight: 0.25, score: trendScore, contribution: trendScore * 0.25, reasoning: trendReasoning },
    { name: "Volume", weight: 0.10, score: volScore, contribution: volScore * 0.10, reasoning: volReasoning },
    { name: "Momentum", weight: 0.10, score: momScore, contribution: momScore * 0.10, reasoning: momReasoning },
  ];

  const compositeScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  const direction = compositeScore > 60 ? "BULLISH" : compositeScore < 40 ? "BEARISH" : "NEUTRAL";

  // Expected return from historical volatility
  const dailyReturns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
  const dailyVol = Math.sqrt(variance);
  const annualVol = dailyVol * Math.sqrt(252);
  const biasMultiplier = direction === "BULLISH" ? 1.2 : direction === "BEARISH" ? 0.8 : 1.0;
  const expectedReturn = avgReturn * 252 * 100 * biasMultiplier;
  const ci95 = 1.96 * annualVol * 100;

  const bullCase = [
    indicators.rsi < 50 ? "RSI suggests room for upside before overbought" : "RSI momentum is strong",
    indicators.smaSignal === "above" || indicators.smaSignal === "golden_cross" ? "Positive trend structure with price above key moving averages" : "Moving averages could provide support",
    "Pipeline catalysts provide asymmetric upside potential",
    indicators.volumeRatio > 1 ? "Volume confirms current price action" : "Low volume suggests potential for volume-driven move up",
  ];

  const bearCase = [
    indicators.rsi > 50 ? "RSI nearing overbought — limited near-term upside" : "RSI shows weak buying pressure",
    "Clinical trial binary risk creates significant downside scenarios",
    "Sector rotation risk — biotech can underperform during risk-off periods",
    indicators.momentum < 0 ? "Negative momentum suggests continued selling pressure" : "Momentum may be fading near term",
  ];

  const risks = [
    "FDA regulatory decision risk",
    "Clinical trial failure — binary event",
    "Patent cliff / generic competition",
    "Macroeconomic headwinds affecting risk assets",
  ];

  const verdict = direction === "BULLISH"
    ? `Probability-weighted outlook is constructive. Composite score ${compositeScore.toFixed(0)}/100 suggests tactical long positioning with ${(annualVol * 100).toFixed(0)}% annual vol.`
    : direction === "BEARISH"
    ? `Probability-weighted outlook is cautious. Composite score ${compositeScore.toFixed(0)}/100 suggests reducing exposure or hedging. Elevated vol at ${(annualVol * 100).toFixed(0)}%.`
    : `Mixed signals result in neutral stance. Composite score ${compositeScore.toFixed(0)}/100. Wait for clearer directional confirmation before committing capital.`;

  return {
    score: compositeScore,
    direction,
    expectedReturn,
    confidenceLow: expectedReturn - ci95,
    confidenceHigh: expectedReturn + ci95,
    factors,
    bullCase,
    bearCase,
    risks,
    verdict,
  };
}
