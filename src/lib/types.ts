export type Profile = {
  id: string;
  displayName: string;
  email: string;
  title: string;
  bio: string;
  memberSince: number;
  avatarUrl: string | null;
  role?: "admin" | "member";
  createdAt: string;
};

export type Account = {
  id: string;
  profileId: string;
  name: string;
  broker: string;
  currency: string;
  initialBalance: number;
  color: string;
  createdAt: string;
};

export type Direction = "long" | "short";
export type Session = "asia" | "london" | "newyork";
export type TradingType = "Day Trade" | "Scalp" | "Swing";
export type PlanRespect = "Oui" | "Non" | "Partiel";
export type TradeOutcome = "TP touché" | "SL touché" | "BE" | "Sortie manuelle";
export type TradingMode = "live" | "replay" | "backtest";

export type Screenshots = {
  entry?: string;
  management?: string;
  result?: string;
};

export type Trade = {
  id: string;
  accountId: string;
  date: string;
  openedAt?: string | null;
  closedAt?: string | null;
  mode?: TradingMode;
  sourceRunId?: string | null;
  symbol: string;
  direction: Direction;
  session: Session;
  setup: string;
  riskPct: number;
  rMultiple: number;
  pnl: number;
  notes: string;

  // ICT & execution
  tradingType: TradingType;
  timeframe: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  lotSize: number | null;
  exitPrice: number | null;
  rrRatio: number | null;

  // Market structure & POI
  ictModel: string;
  marketStructure: string;
  htfTimeframe: string;
  poiZone: string;
  setupNotes: string;

  // Management & psychology
  emotionalState: string;
  htfBias: string;
  managementNotes: string;
  planRespect: PlanRespect;
  tradeOutcome: TradeOutcome;

  // Screenshots & conclusion
  screenshots: string;
  lessonsLearned: string;
  createdAt: string;
};

export type TradeInput = Omit<Trade, "id" | "createdAt">;
export type AccountInput = Omit<Account, "id" | "profileId" | "createdAt">;

export type SessionRow = {
  id: string;
  device: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

export type Bootstrap = {
  profile: Profile | null;
  accounts: Account[];
  trades: Trade[];
  devMode: boolean;
};

export type Tab =
  | "profile_accounts"
  | "evolution_performance"
  | "journal_trades"
  | "analysis_stats"
  | "market_replay"
  | "backtesting"
  | "economic_calendar"
  | "admin";

// ---------------------------------------------------------------------------
// Market data & economic calendar transport types.
// ---------------------------------------------------------------------------
export type Instrument = {
  id: string;
  symbol: string;
  displayName: string;
  assetClass: "forex" | "metal" | "crypto" | "index" | "commodity" | "equity" | string;
  baseCurrency: string;
  quoteCurrency: string;
  providerSymbols: string;
  marketHours: "weekday" | "continuous" | "custom" | string;
  availableFrom: string | null;
  availableTo: string | null;
  availableResolutions: string;
  qualityNotes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MarketCandle = {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isFinal: boolean;
  quality: "validated" | "provisional" | "recovered" | string;
};

export type MarketDataGap = {
  id: string;
  instrumentId: string;
  sourceId: string;
  timeframe: string;
  gapStart: string;
  gapEnd: string;
  expectedBars: number;
  status: "detected" | "recovering" | "resolved" | "ignored" | string;
  attempts: number;
  reason: string;
  lastAttemptAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type EconomicImportance = "low" | "medium" | "high";
export type EconomicEventStatus = "scheduled" | "released" | "revised" | "cancelled";

export type EconomicEvent = {
  id: string;
  sourceId: string;
  externalId: string;
  scheduledAt: string;
  knownAt: string;
  publishedAt: string | null;
  timezone: string;
  country: string;
  region: string;
  currency: string;
  title: string;
  category: string;
  importance: EconomicImportance;
  previous: string | null;
  forecast: string | null;
  actual: string | null;
  revision: string | null;
  status: EconomicEventStatus;
  sourceUrl: string;
  metadata: string;
  retrievedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type EconomicEventRevision = {
  id: string;
  eventId: string;
  knownAt: string;
  previous: string | null;
  forecast: string | null;
  actual: string | null;
  revision: string | null;
  status: EconomicEventStatus;
  rawPayload: string;
  createdAt: string;
};

export type Strategy = {
  id: string;
  profileId: string;
  name: string;
  description: string;
  rules: string;
  newsRules: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReplaySession = {
  id: string;
  profileId: string;
  accountId: string | null;
  instrumentId: string;
  strategyId: string | null;
  timeframe: string;
  startAt: string;
  simulatedAt: string;
  status: "paused" | "playing" | "completed";
  speed: number;
  initialCapital: number;
  currentEquity: number;
  config: string;
  createdAt: string;
  updatedAt: string;
};

export type ReplayTrade = {
  id: string;
  replaySessionId: string;
  instrumentId: string;
  direction: Direction;
  status: "open" | "closed" | "stopped" | "target";
  openedAt: string;
  closedAt: string | null;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  exitPrice: number | null;
  quantity: number;
  riskAmount: number;
  commission: number;
  pnl: number;
  rMultiple: number;
  notes: string;
  createdAt: string;
};

export type Backtest = {
  id: string;
  profileId: string;
  accountId: string | null;
  instrumentId: string;
  strategyId: string | null;
  name: string;
  timeframe: string;
  startAt: string;
  endAt: string;
  status: "draft" | "running" | "completed" | "failed";
  initialCapital: number;
  riskPct: number;
  commissionPerOrder: number;
  config: string;
  summary: string;
  createdAt: string;
  completedAt: string | null;
};

export type BacktestTrade = {
  id: string;
  backtestId: string;
  instrumentId: string;
  direction: Direction;
  session: string;
  timeframe: string;
  strategyLabel: string;
  openedAt: string;
  closedAt: string | null;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  exitPrice: number | null;
  quantity: number;
  commission: number;
  pnl: number;
  rMultiple: number;
  newsContext: string;
  createdAt: string;
};

export const ACCOUNT_COLORS = ["#d8b56d", "#7aa2f7", "#34d399", "#f472b6", "#fb923c", "#a78bfa"];

export const ICT_MODELS = [
  "Silver Bullet",
  "2022 Mentorship Model",
  "Turtle Soup",
  "Judas Swing",
  "MMTR (Market Maker Trend Reversal)",
  "Breakout",
  "Order Block Entry",
  "FVG Retest",
  "Liquidity Sweep",
  "Breaker Block",
];

export const POI_ZONES = [
  "Order Block (OB)",
  "Fair Value Gap (FVG)",
  "Liquidity Pool / Sweep",
  "Breaker Block",
  "Mitigation Block",
  "Rejection Block",
  "Volume Imbalance",
];

export const MARKET_STRUCTURES = [
  "Bullish Trend",
  "Bearish Trend",
  "Range / Consolidation",
  "CHoCH (Change of Character)",
  "BOS (Break of Structure)",
];

export const EMOTIONAL_STATES = [
  "Calme & Patient",
  "Confiant",
  "FOMO",
  "Stressé",
  "Impatient",
  "Revanchard / Frustré",
];

// Kept as form suggestions only; instruments are never limited to this list.
export const SYMBOLS_LIST = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "USDCHF",
  "NZDUSD",
  "XAUUSD",
  "XAGUSD",
  "NAS100",
  "US30",
  "SPX500",
  "DXY",
  "BTCUSD",
  "ETHUSD",
];
