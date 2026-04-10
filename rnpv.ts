// rNPV Calculator for pharmaceutical pipeline assets

export type Phase = "Preclinical" | "Phase I" | "Phase II" | "Phase III" | "NDA/BLA";
export type Indication = "Oncology" | "Rare Disease" | "Neurology" | "Immunology" | "Other";

// Phase transition success probabilities
const PHASE_POS: Record<Phase, number> = {
  "Preclinical": 0.60,
  "Phase I": 0.52,
  "Phase II": 0.29,
  "Phase III": 0.58,
  "NDA/BLA": 0.88,
};

// Indication-specific multipliers
const INDICATION_MULT: Record<Indication, number> = {
  "Oncology": 0.75,
  "Rare Disease": 1.40,
  "Neurology": 0.85,
  "Immunology": 1.10,
  "Other": 1.00,
};

const PHASES_ORDERED: Phase[] = ["Preclinical", "Phase I", "Phase II", "Phase III", "NDA/BLA"];

export interface RNPVInput {
  assetName: string;
  indication: Indication;
  currentPhase: Phase;
  peakSales: number; // $M
  yearsToPeak: number;
  discountRate: number; // decimal, e.g. 0.10
  cogs: number; // decimal
  sgna: number; // decimal
}

export interface RNPVOutput {
  rnpv: number;
  unadjustedNPV: number;
  cumulativePoS: number;
  cashFlows: { year: number; revenue: number; netCF: number; discounted: number; riskAdjusted: number }[];
}

export function computeCumulativePoS(currentPhase: Phase, indication: Indication): number {
  const startIdx = PHASES_ORDERED.indexOf(currentPhase);
  let cumPoS = 1;
  for (let i = startIdx; i < PHASES_ORDERED.length; i++) {
    cumPoS *= PHASE_POS[PHASES_ORDERED[i]];
  }
  cumPoS *= INDICATION_MULT[indication];
  return Math.min(cumPoS, 1);
}

export function computeRNPV(input: RNPVInput): RNPVOutput {
  const { peakSales, yearsToPeak, discountRate, cogs, sgna, indication, currentPhase } = input;
  const cumulativePoS = computeCumulativePoS(currentPhase, indication);

  // Revenue curve: S-curve ramp, plateau, then generic erosion
  const totalYears = yearsToPeak + 5 + 5; // ramp + plateau + erosion
  const cashFlows: RNPVOutput["cashFlows"] = [];
  let unadjustedNPV = 0;
  let rnpv = 0;

  for (let y = 1; y <= totalYears; y++) {
    let revenue: number;
    if (y <= yearsToPeak) {
      // S-curve: use logistic
      const x = (y / yearsToPeak) * 6 - 3; // map to [-3, 3]
      const sigmoid = 1 / (1 + Math.exp(-x));
      revenue = peakSales * sigmoid;
    } else if (y <= yearsToPeak + 5) {
      // Plateau
      revenue = peakSales;
    } else {
      // Generic erosion: 40% per year decline
      const yearsOfErosion = y - yearsToPeak - 5;
      revenue = peakSales * Math.pow(0.6, yearsOfErosion);
    }

    const netCF = revenue * (1 - cogs - sgna);
    const discountFactor = 1 / Math.pow(1 + discountRate, y);
    const discounted = netCF * discountFactor;
    const riskAdjusted = discounted * cumulativePoS;

    unadjustedNPV += discounted;
    rnpv += riskAdjusted;

    cashFlows.push({
      year: y,
      revenue: Math.round(revenue),
      netCF: Math.round(netCF),
      discounted: Math.round(discounted),
      riskAdjusted: Math.round(riskAdjusted),
    });
  }

  return {
    rnpv: Math.round(rnpv),
    unadjustedNPV: Math.round(unadjustedNPV),
    cumulativePoS,
    cashFlows,
  };
}

export function sensitivityAnalysis(
  baseInput: RNPVInput,
  peakSalesRange: number[],
  discountRateRange: number[]
): { peakSales: number; discountRate: number; rnpv: number }[] {
  const results: { peakSales: number; discountRate: number; rnpv: number }[] = [];
  for (const ps of peakSalesRange) {
    for (const dr of discountRateRange) {
      const out = computeRNPV({ ...baseInput, peakSales: ps, discountRate: dr });
      results.push({ peakSales: ps, discountRate: dr, rnpv: out.rnpv });
    }
  }
  return results;
}

export const PHASES = PHASES_ORDERED;
export const INDICATIONS: Indication[] = ["Oncology", "Rare Disease", "Neurology", "Immunology", "Other"];
