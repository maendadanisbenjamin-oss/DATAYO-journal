import type { Direction } from "./types";

export type PriceCandle = {
  ts: Date | string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type SimulatedPosition = {
  direction: Direction;
  openedAt: Date;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  quantity: number;
  riskAmount: number;
  commission: number;
  status: "open" | "closed" | "stopped" | "target";
  closedAt: Date | null;
  exitPrice: number | null;
  pnl: number;
  rMultiple: number;
};

export type PositionRequest = {
  direction: Direction;
  openedAt: Date | string;
  entryPrice: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  quantity: number;
  riskAmount?: number;
  commission?: number;
};

export function openPosition(input: PositionRequest): SimulatedPosition {
  const entryPrice = Number(input.entryPrice);
  const quantity = Number(input.quantity);
  const stopLoss = input.stopLoss === undefined || input.stopLoss === null ? null : Number(input.stopLoss);
  const takeProfit = input.takeProfit === undefined || input.takeProfit === null ? null : Number(input.takeProfit);
  const commission = Number(input.commission ?? 0);
  if (!Number.isFinite(entryPrice) || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Entrée et taille de position invalides");
  }
  if (stopLoss !== null && (!Number.isFinite(stopLoss) || stopLoss === entryPrice)) {
    throw new Error("Stop Loss invalide");
  }
  if (takeProfit !== null && !Number.isFinite(takeProfit)) {
    throw new Error("Take Profit invalide");
  }
  if (!Number.isFinite(commission) || commission < 0) {
    throw new Error("Commission invalide");
  }
  if (input.direction === "long" && stopLoss !== null && stopLoss >= entryPrice) {
    throw new Error("Un Long doit avoir un Stop Loss inférieur à l'entrée");
  }
  if (input.direction === "short" && stopLoss !== null && stopLoss <= entryPrice) {
    throw new Error("Un Short doit avoir un Stop Loss supérieur à l'entrée");
  }
  if (input.direction === "long" && takeProfit !== null && takeProfit <= entryPrice) {
    throw new Error("Un Long doit avoir un Take Profit supérieur à l'entrée");
  }
  if (input.direction === "short" && takeProfit !== null && takeProfit >= entryPrice) {
    throw new Error("Un Short doit avoir un Take Profit inférieur à l'entrée");
  }
  const derivedRisk = stopLoss === null ? 0 : Math.abs(entryPrice - stopLoss) * quantity;
  const riskAmount = Number(input.riskAmount ?? derivedRisk);
  if (!Number.isFinite(riskAmount) || riskAmount < 0) {
    throw new Error("Risque invalide");
  }
  const openedAt = new Date(input.openedAt);
  if (Number.isNaN(openedAt.getTime())) throw new Error("Date d'ouverture invalide");
  return {
    direction: input.direction,
    openedAt,
    entryPrice,
    stopLoss,
    takeProfit,
    quantity,
    riskAmount: Math.max(0, riskAmount),
    commission: Math.max(0, commission),
    status: "open",
    closedAt: null,
    exitPrice: null,
    pnl: 0,
    rMultiple: 0,
  };
}

export function markPosition(position: SimulatedPosition, candle: PriceCandle): SimulatedPosition {
  if (position.status !== "open") return position;
  const ts = new Date(candle.ts);
  if (Number.isNaN(ts.getTime())) throw new Error("Timestamp de bougie invalide");

  const stopHit =
    position.stopLoss !== null &&
    (position.direction === "long" ? candle.low <= position.stopLoss : candle.high >= position.stopLoss);
  const targetHit =
    position.takeProfit !== null &&
    (position.direction === "long" ? candle.high >= position.takeProfit : candle.low <= position.takeProfit);

  // Intrabar price order is unknown for OHLC bars. Conservative policy: stop has priority.
  if (stopHit) return closePosition(position, position.stopLoss!, ts, "stopped");
  if (targetHit) return closePosition(position, position.takeProfit!, ts, "target");
  return position;
}

export function closePosition(
  position: SimulatedPosition,
  exitPrice: number,
  closedAt: Date | string,
  status: "closed" | "stopped" | "target" = "closed"
): SimulatedPosition {
  if (position.status !== "open") { throw new Error("La position est déjà clôturée"); }
  const closeTime = new Date(closedAt);
  if (!Number.isFinite(exitPrice) || Number.isNaN(closeTime.getTime())) throw new Error("Clôture invalide");
  const raw = position.direction === "long" ? (exitPrice - position.entryPrice) * position.quantity : (position.entryPrice - exitPrice) * position.quantity;
  const pnl = raw - position.commission;
  const rMultiple = position.riskAmount > 0 ? pnl / position.riskAmount : 0;
  return { ...position, status, closedAt: closeTime, exitPrice, pnl, rMultiple };
}

export function updateStops(position: SimulatedPosition, patch: { stopLoss?: number | null; takeProfit?: number | null }) {
  if (position.status !== "open") throw new Error("La position est déjà clôturée");
  const stopLoss = patch.stopLoss === undefined ? position.stopLoss : patch.stopLoss;
  const takeProfit = patch.takeProfit === undefined ? position.takeProfit : patch.takeProfit;

  if (stopLoss !== null && !Number.isFinite(stopLoss)) {
    throw new Error("Stop Loss invalide");
  }
  if (takeProfit !== null && !Number.isFinite(takeProfit)) {
    throw new Error("Take Profit invalide");
  }
  if (position.direction === "long" && stopLoss !== null && stopLoss >= position.entryPrice) {
    throw new Error("Un Long doit avoir un Stop Loss inférieur à l'entrée");
  }
  if (position.direction === "short" && stopLoss !== null && stopLoss <= position.entryPrice) {
    throw new Error("Un Short doit avoir un Stop Loss supérieur à l'entrée");
  }
  if (position.direction === "long" && takeProfit !== null && takeProfit <= position.entryPrice) {
    throw new Error("Un Long doit avoir un Take Profit supérieur à l'entrée");
  }
  if (position.direction === "short" && takeProfit !== null && takeProfit >= position.entryPrice) {
    throw new Error("Un Short doit avoir un Take Profit inférieur à l'entrée");
  }

  return {
    ...position,
    stopLoss,
    takeProfit,
    riskAmount: stopLoss === null ? position.riskAmount : Math.abs(position.entryPrice - stopLoss) * position.quantity,
  };
}

export function positionEquity(initialCapital: number, positions: SimulatedPosition[]) {
  const closed = positions.filter((p) => p.status !== "open");
  let equity = initialCapital;
  let peak = initialCapital;
  let maxDrawdown = 0;
  const points = closed
    .sort((a, b) => (a.closedAt?.getTime() ?? 0) - (b.closedAt?.getTime() ?? 0))
    .map((p) => {
      equity += p.pnl;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
      return { ts: p.closedAt!, equity, drawdown: peak - equity };
    });
  return { equity, maxDrawdown, points };
}
