import { useState, useMemo } from "react";
import { useTicker } from "@/lib/tickerContext";
import { useTrials } from "@/lib/useStockData";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { computeRNPV, sensitivityAnalysis, PHASES, INDICATIONS, type Phase, type Indication, type RNPVInput } from "@/lib/rnpv";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line } from "recharts";
import { ChevronDown, ChevronRight } from "lucide-react";

export function PipelineTab() {
  const { ticker } = useTicker();
  const { data: trialsData, isLoading } = useTrials(ticker);
  const trials = trialsData?.trials || [];

  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rnpvOpen, setRnpvOpen] = useState(false);

  // rNPV state
  const [rnpvInput, setRnpvInput] = useState<RNPVInput>({
    assetName: "Drug Candidate",
    indication: "Oncology",
    currentPhase: "Phase II",
    peakSales: 2000,
    yearsToPeak: 7,
    discountRate: 0.10,
    cogs: 0.15,
    sgna: 0.25,
  });

  const filteredTrials = useMemo(() => {
    return trials.filter(t => {
      if (phaseFilter !== "all" && !t.phase?.toLowerCase().includes(phaseFilter.toLowerCase())) return false;
      if (statusFilter !== "all") {
        const ts = t.status?.toUpperCase().replace(/\s/g, "_") || "";
        if (statusFilter === "active" && !["RECRUITING", "ACTIVE_NOT_RECRUITING", "ENROLLING_BY_INVITATION", "NOT_YET_RECRUITING", "ACTIVE, NOT RECRUITING"].some(s => ts.includes(s.replace(/\s/g, "_").replace(",", "")))) return false;
        if (statusFilter === "completed" && !ts.includes("COMPLETED")) return false;
        if (statusFilter === "terminated" && !["TERMINATED", "WITHDRAWN", "SUSPENDED"].some(s => ts.includes(s))) return false;
      }
      return true;
    });
  }, [trials, phaseFilter, statusFilter]);

  const phaseDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    trials.forEach(t => {
      const phase = t.phase || "N/A";
      counts[phase] = (counts[phase] || 0) + 1;
    });
    return Object.entries(counts).map(([phase, count]) => ({ phase, count }));
  }, [trials]);

  const rnpvResult = useMemo(() => computeRNPV(rnpvInput), [rnpvInput]);

  const sensitivityData = useMemo(() => {
    const peakRange = [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000];
    const drRange = [0.08, 0.10, 0.12, 0.15];
    return sensitivityAnalysis(rnpvInput, peakRange, drRange);
  }, [rnpvInput]);

  return (
    <div className="space-y-3 p-2" data-testid="pipeline-tab">
      {/* Filters */}
      <div className="flex gap-2 items-center">
        <div className="text-[10px] text-term-gray uppercase">Filter:</div>
        <select
          className="bg-[#0A0A0A] border border-[#1A1A1A] text-white text-[11px] px-2 py-1 rounded-sm"
          value={phaseFilter}
          onChange={e => setPhaseFilter(e.target.value)}
          data-testid="phase-filter"
        >
          <option value="all">All Phases</option>
          <option value="1">Phase 1</option>
          <option value="2">Phase 2</option>
          <option value="3">Phase 3</option>
          <option value="4">Phase 4</option>
        </select>
        <select
          className="bg-[#0A0A0A] border border-[#1A1A1A] text-white text-[11px] px-2 py-1 rounded-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          data-testid="status-filter"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="terminated">Terminated</option>
        </select>
        <div className="text-[10px] text-term-gray ml-auto">
          {filteredTrials.length} of {trials.length} trials
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Trials table */}
        <div className="col-span-2 terminal-card p-2 max-h-[280px] overflow-y-auto overscroll-contain">
          <div className="text-[10px] text-amber uppercase tracking-wider mb-1">CLINICAL TRIALS — {ticker}</div>
          {isLoading ? (
            <Skeleton className="h-[200px] bg-[#1A1A1A]" />
          ) : filteredTrials.length > 0 ? (
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-[#0A0A0A] z-10">
                <tr className="text-term-gray uppercase">
                  <th className="text-left py-1 px-1">NCT ID</th>
                  <th className="text-left py-1 px-1">Title</th>
                  <th className="text-left py-1 px-1">Phase</th>
                  <th className="text-left py-1 px-1">Status</th>
                  <th className="text-right py-1 px-1">Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrials.slice(0, 30).map((t, i) => (
                  <tr key={t.nctId || i} className="border-t border-[#1A1A1A] hover:bg-[#111]">
                    <td className="py-1 px-1 text-term-blue">{t.nctId}</td>
                    <td className="py-1 px-1 text-white max-w-[300px] truncate">{t.title}</td>
                    <td className="py-1 px-1 text-amber">{t.phase}</td>
                    <td className="py-1 px-1">
                      <span className={
                        t.status?.includes("RECRUIT") || t.status?.includes("Active") ? "text-gain" :
                        t.status?.includes("COMPLET") ? "text-term-blue" :
                        t.status?.includes("TERMINAT") || t.status?.includes("WITHDRAWN") ? "text-loss" :
                        "text-term-gray"
                      }>{t.status}</span>
                    </td>
                    <td className="py-1 px-1 text-right text-white">{t.enrollment ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-term-gray text-xs">No trials found</div>
          )}
        </div>

        {/* Phase distribution */}
        <div className="terminal-card p-2">
          <div className="text-[10px] text-amber uppercase tracking-wider mb-1">PHASE DISTRIBUTION</div>
          {phaseDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={phaseDistribution} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis type="number" tick={{ fill: "#888", fontSize: 9 }} />
                <YAxis type="category" dataKey="phase" tick={{ fill: "#888", fontSize: 9 }} width={80} />
                <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: 10, color: "#fff" }} />
                <Bar dataKey="count" fill="#FF9F1C" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-term-gray text-xs">No data</div>
          )}
        </div>
      </div>

      {/* rNPV Calculator */}
      <Collapsible open={rnpvOpen} onOpenChange={setRnpvOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-amber text-[11px] uppercase tracking-wider hover:text-white transition-colors w-full terminal-card p-2" data-testid="rnpv-toggle">
          {rnpvOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          rNPV CALCULATOR
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="terminal-card p-3 mt-1 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-term-gray uppercase block mb-1">Indication</label>
                <select
                  className="w-full bg-[#0A0A0A] border border-[#1A1A1A] text-white text-[11px] px-2 py-1 rounded-sm"
                  value={rnpvInput.indication}
                  onChange={e => setRnpvInput(p => ({ ...p, indication: e.target.value as Indication }))}
                  data-testid="rnpv-indication"
                >
                  {INDICATIONS.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-term-gray uppercase block mb-1">Current Phase</label>
                <select
                  className="w-full bg-[#0A0A0A] border border-[#1A1A1A] text-white text-[11px] px-2 py-1 rounded-sm"
                  value={rnpvInput.currentPhase}
                  onChange={e => setRnpvInput(p => ({ ...p, currentPhase: e.target.value as Phase }))}
                  data-testid="rnpv-phase"
                >
                  {PHASES.map(ph => <option key={ph} value={ph}>{ph}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-term-gray uppercase block mb-1">Peak Sales ($M): {rnpvInput.peakSales}</label>
                <Slider
                  value={[rnpvInput.peakSales]}
                  onValueChange={([v]) => setRnpvInput(p => ({ ...p, peakSales: v }))}
                  min={100} max={10000} step={100}
                  className="mt-2"
                  data-testid="rnpv-peak-sales"
                />
              </div>
              <div>
                <label className="text-[10px] text-term-gray uppercase block mb-1">Discount Rate: {(rnpvInput.discountRate * 100).toFixed(0)}%</label>
                <Slider
                  value={[rnpvInput.discountRate * 100]}
                  onValueChange={([v]) => setRnpvInput(p => ({ ...p, discountRate: v / 100 }))}
                  min={5} max={20} step={1}
                  className="mt-2"
                  data-testid="rnpv-discount-rate"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-term-gray uppercase block mb-1">Years to Peak: {rnpvInput.yearsToPeak}</label>
                <Slider
                  value={[rnpvInput.yearsToPeak]}
                  onValueChange={([v]) => setRnpvInput(p => ({ ...p, yearsToPeak: v }))}
                  min={3} max={15} step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-[10px] text-term-gray uppercase block mb-1">COGS: {(rnpvInput.cogs * 100).toFixed(0)}%</label>
                <Slider
                  value={[rnpvInput.cogs * 100]}
                  onValueChange={([v]) => setRnpvInput(p => ({ ...p, cogs: v / 100 }))}
                  min={5} max={50} step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-[10px] text-term-gray uppercase block mb-1">SG&A: {(rnpvInput.sgna * 100).toFixed(0)}%</label>
                <Slider
                  value={[rnpvInput.sgna * 100]}
                  onValueChange={([v]) => setRnpvInput(p => ({ ...p, sgna: v / 100 }))}
                  min={10} max={50} step={1}
                  className="mt-2"
                />
              </div>
              <div className="flex flex-col justify-center">
                <div className="text-[10px] text-term-gray uppercase">Cumul. PoS</div>
                <div className="text-lg font-bold text-amber">{(rnpvResult.cumulativePoS * 100).toFixed(1)}%</div>
              </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-3 gap-2">
              <div className="terminal-card p-2 text-center">
                <div className="text-[10px] text-term-gray uppercase">rNPV</div>
                <div className="text-lg font-bold text-gain" data-testid="rnpv-value">${rnpvResult.rnpv.toLocaleString()}M</div>
              </div>
              <div className="terminal-card p-2 text-center">
                <div className="text-[10px] text-term-gray uppercase">Unadjusted NPV</div>
                <div className="text-lg font-bold text-white">${rnpvResult.unadjustedNPV.toLocaleString()}M</div>
              </div>
              <div className="terminal-card p-2 text-center">
                <div className="text-[10px] text-term-gray uppercase">Risk Discount</div>
                <div className="text-lg font-bold text-loss">
                  {rnpvResult.unadjustedNPV > 0 ? `-${((1 - rnpvResult.rnpv / rnpvResult.unadjustedNPV) * 100).toFixed(0)}%` : "—"}
                </div>
              </div>
            </div>

            {/* Cash flow projection */}
            <div className="terminal-card p-2">
              <div className="text-[10px] text-amber uppercase tracking-wider mb-1">CASH FLOW PROJECTION</div>
              <ResponsiveContainer width="100%" height={150}>
                <ComposedChart data={rnpvResult.cashFlows} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                  <XAxis dataKey="year" tick={{ fill: "#888", fontSize: 9 }} />
                  <YAxis tick={{ fill: "#888", fontSize: 9 }} width={55} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: 10, color: "#fff" }} />
                  <Bar dataKey="revenue" fill="#536DFE" opacity={0.3} name="Revenue ($M)" />
                  <Line type="monotone" dataKey="riskAdjusted" stroke="#FF9F1C" dot={false} strokeWidth={1.5} name="Risk-Adj CF" />
                  <Line type="monotone" dataKey="discounted" stroke="#00C853" dot={false} strokeWidth={1} name="Discounted CF" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Sensitivity heatmap as table */}
            <div className="terminal-card p-2">
              <div className="text-[10px] text-amber uppercase tracking-wider mb-1">SENSITIVITY: PEAK SALES × DISCOUNT RATE</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-term-gray">
                      <th className="py-1 px-1 text-left">Peak / DR</th>
                      {[8, 10, 12, 15].map(dr => (
                        <th key={dr} className="py-1 px-1 text-right">{dr}%</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[500, 1000, 1500, 2000, 2500, 3000, 4000, 5000].map(ps => (
                      <tr key={ps} className="border-t border-[#1A1A1A]">
                        <td className="py-1 px-1 text-amber">${ps.toLocaleString()}M</td>
                        {[0.08, 0.10, 0.12, 0.15].map(dr => {
                          const cell = sensitivityData.find(d => d.peakSales === ps && d.discountRate === dr);
                          const val = cell?.rnpv || 0;
                          const intensity = Math.min(val / 3000, 1);
                          return (
                            <td key={dr} className="py-1 px-1 text-right"
                              style={{ backgroundColor: `rgba(0, 200, 83, ${intensity * 0.3})` }}>
                              ${val.toLocaleString()}M
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
