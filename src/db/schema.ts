import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Existing journal domain - preserved and only extended where needed.
// ---------------------------------------------------------------------------
export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("member"), // admin | member
    status: text("status").notNull().default("active"), // pending | active | rejected | suspended
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by").references((): AnyPgColumn => profiles.id, { onDelete: "set null" }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by").references((): AnyPgColumn => profiles.id, { onDelete: "set null" }),
    rejectionReason: text("rejection_reason"),
    title: text("title").notNull().default("Trader"),
    bio: text("bio").notNull().default(""),
    memberSince: integer("member_since").notNull().default(2024),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("profiles_email_idx").on(t.email),
    index("profiles_role_idx").on(t.role),
    index("profiles_status_idx").on(t.status),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the token
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    device: text("device").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_profile_idx").on(t.profileId)]
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    broker: text("broker").notNull().default(""),
    currency: text("currency").notNull().default("USD"),
    initialBalance: real("initial_balance").notNull().default(10000),
    color: text("color").notNull().default("#d8b56d"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("accounts_profile_idx").on(t.profileId)]
);

export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD, retained for journal/calendar compatibility
    openedAt: timestamp("opened_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    mode: text("mode").notNull().default("live"), // live | replay | backtest
    sourceRunId: uuid("source_run_id"), // replay/backtest run id when applicable
    symbol: text("symbol").notNull(),
    direction: text("direction").notNull().default("long"),
    session: text("session").notNull().default("london"),
    setup: text("setup").notNull().default(""),
    riskPct: real("risk_pct").notNull().default(1),
    rMultiple: real("r_multiple").notNull().default(0),
    pnl: real("pnl").notNull().default(0),
    notes: text("notes").notNull().default(""),

    // ICT and execution details
    tradingType: text("trading_type").notNull().default("Day Trade"),
    timeframe: text("timeframe").notNull().default("M15"),
    entryPrice: real("entry_price"),
    stopLoss: real("stop_loss"),
    takeProfit: real("take_profit"),
    lotSize: real("lot_size"),
    exitPrice: real("exit_price"),
    rrRatio: real("rr_ratio"),

    // Market structure & POI
    ictModel: text("ict_model").notNull().default("Silver Bullet"),
    marketStructure: text("market_structure").notNull().default("Bullish"),
    htfTimeframe: text("htf_timeframe").notNull().default("H4"),
    poiZone: text("poi_zone").notNull().default("Order Block"),
    setupNotes: text("setup_notes").notNull().default(""),

    // Management & psychology
    emotionalState: text("emotional_state").notNull().default("Calme"),
    htfBias: text("htf_bias").notNull().default(""),
    managementNotes: text("management_notes").notNull().default(""),
    planRespect: integer("plan_respect").notNull().default(5),
    tradeOutcome: text("trade_outcome").notNull().default("TP touché"),

    // Screenshots and conclusions
    screenshots: text("screenshots").notNull().default("{}"),
    lessonsLearned: text("lessons_learned").notNull().default(""),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("trades_account_idx").on(t.accountId),
    index("trades_date_idx").on(t.date),
    index("trades_mode_idx").on(t.mode),
    index("trades_opened_at_idx").on(t.openedAt),
  ]
);

export const tradeAccounts = pgTable(
  "trade_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    lotSize: real("lot_size"),
    riskPct: real("risk_pct"),
    riskAmount: real("risk_amount"),
    rMultiple: real("r_multiple"),
    pnl: real("pnl"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("trade_accounts_trade_idx").on(t.tradeId),
    index("trade_accounts_account_idx").on(t.accountId),
    uniqueIndex("trade_accounts_trade_account_uidx").on(t.tradeId, t.accountId),
  ]
);

// ---------------------------------------------------------------------------
// Market data engine - provider-neutral, M1 canonical storage.
// ---------------------------------------------------------------------------
export const instruments = pgTable(
  "instruments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symbol: text("symbol").notNull(), // normalized canonical symbol, e.g. EURUSD / DXY
    displayName: text("display_name").notNull(),
    assetClass: text("asset_class").notNull(), // forex | metal | crypto | index | commodity | equity
    baseCurrency: text("base_currency").notNull().default(""),
    quoteCurrency: text("quote_currency").notNull().default("USD"),
    providerSymbols: text("provider_symbols").notNull().default("{}"),
    marketHours: text("market_hours").notNull().default("weekday"), // weekday | continuous | custom
    availableFrom: timestamp("available_from", { withTimezone: true }),
    availableTo: timestamp("available_to", { withTimezone: true }),
    availableResolutions: text("available_resolutions").notNull().default("[\"1m\"]"),
    qualityNotes: text("quality_notes").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("instruments_symbol_idx").on(t.symbol), index("instruments_asset_class_idx").on(t.assetClass)]
);

export const instrumentSpecs = pgTable(
  "instrument_specs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    broker: text("broker").notNull(),
    calculationModel: text("calculation_model").notNull().default("price_delta_value"),
    quantityUnit: text("quantity_unit").notNull().default("lot"),
    valuePerPriceUnit: real("value_per_price_unit").notNull(),
    priceIncrement: real("price_increment").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("instrument_specs_instrument_broker_uidx").on(t.instrumentId, t.broker),
    index("instrument_specs_instrument_idx").on(t.instrumentId),
  ]
);
export const dataSources = pgTable(
  "data_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(), // manual-csv | twelve-data | trading-economics | ...
    name: text("name").notNull(),
    providerKind: text("provider_kind").notNull(), // market | economic | hybrid
    licenseStatus: text("license_status").notNull().default("unverified"), // verified_internal | unverified | blocked
    licenseNotes: text("license_notes").notNull().default(""),
    retentionPolicy: text("retention_policy").notNull().default("15_year_rolling"),
    configEnvKey: text("config_env_key").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("data_sources_key_idx").on(t.key)]
);

export const marketDataImports = pgTable(
  "market_data_imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "restrict" }),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    mode: text("mode").notNull().default("historical"), // historical | live | gap_recovery
    status: text("status").notNull().default("queued"), // queued | running | completed | partial | failed
    requestedFrom: timestamp("requested_from", { withTimezone: true }),
    requestedTo: timestamp("requested_to", { withTimezone: true }),
    rowsReceived: integer("rows_received").notNull().default(0),
    rowsAccepted: integer("rows_accepted").notNull().default(0),
    rowsRejected: integer("rows_rejected").notNull().default(0),
    rowsDeduplicated: integer("rows_deduplicated").notNull().default(0),
    errorLog: text("error_log").notNull().default(""),
    metadata: text("metadata").notNull().default("{}"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("market_imports_instrument_idx").on(t.instrumentId), index("market_imports_profile_idx").on(t.profileId)]
);

export const candlesM1 = pgTable(
  "candles_m1",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "restrict" }),
    importId: uuid("import_id").references(() => marketDataImports.id, { onDelete: "set null" }),
    ts: timestamp("ts", { withTimezone: true }).notNull(), // opening time of canonical M1 candle
    open: real("open").notNull(),
    high: real("high").notNull(),
    low: real("low").notNull(),
    close: real("close").notNull(),
    volume: real("volume").notNull().default(0),
    providerTimestamp: timestamp("provider_timestamp", { withTimezone: true }),
    isFinal: boolean("is_final").notNull().default(true),
    quality: text("quality").notNull().default("validated"), // validated | provisional | recovered
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("candles_m1_source_instrument_ts_idx").on(t.sourceId, t.instrumentId, t.ts),
    index("candles_m1_instrument_ts_idx").on(t.instrumentId, t.ts),
  ]
);

export const marketDataGaps = pgTable(
  "market_data_gaps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "restrict" }),
    timeframe: text("timeframe").notNull().default("1m"),
    gapStart: timestamp("gap_start", { withTimezone: true }).notNull(),
    gapEnd: timestamp("gap_end", { withTimezone: true }).notNull(),
    expectedBars: integer("expected_bars").notNull().default(0),
    status: text("status").notNull().default("detected"), // detected | recovering | resolved | ignored
    attempts: integer("attempts").notNull().default(0),
    reason: text("reason").notNull().default("missing_m1_interval"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("market_gaps_source_instrument_window_idx").on(t.sourceId, t.instrumentId, t.gapStart, t.gapEnd),
    index("market_gaps_status_idx").on(t.status),
    index("market_gaps_instrument_idx").on(t.instrumentId),
  ]
);

export const marketEngineEvents = pgTable(
  "market_engine_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id").references(() => dataSources.id, { onDelete: "set null" }),
    instrumentId: uuid("instrument_id").references(() => instruments.id, { onDelete: "set null" }),
    level: text("level").notNull().default("info"), // info | warning | error
    eventType: text("event_type").notNull(),
    message: text("message").notNull(),
    context: text("context").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("market_engine_events_created_idx").on(t.createdAt)]
);

// ---------------------------------------------------------------------------
// Economic calendar engine - time-aware publication and revision history.
// ---------------------------------------------------------------------------
export const economicEvents = pgTable(
  "economic_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "restrict" }),
    externalId: text("external_id").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    knownAt: timestamp("known_at", { withTimezone: true }).notNull(), // earliest time this event was known to the provider
    publishedAt: timestamp("published_at", { withTimezone: true }), // actual release timestamp
    timezone: text("timezone").notNull().default("UTC"),
    country: text("country").notNull().default(""),
    region: text("region").notNull().default(""),
    currency: text("currency").notNull().default(""),
    title: text("title").notNull(),
    category: text("category").notNull().default(""),
    importance: text("importance").notNull().default("medium"), // low | medium | high
    previous: text("previous"),
    forecast: text("forecast"),
    actual: text("actual"),
    revision: text("revision"),
    status: text("status").notNull().default("scheduled"), // scheduled | released | revised | cancelled
    sourceUrl: text("source_url").notNull().default(""),
    metadata: text("metadata").notNull().default("{}"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("economic_events_source_external_idx").on(t.sourceId, t.externalId),
    index("economic_events_scheduled_idx").on(t.scheduledAt),
    index("economic_events_currency_idx").on(t.currency),
    index("economic_events_importance_idx").on(t.importance),
  ]
);

export const economicEventRevisions = pgTable(
  "economic_event_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => economicEvents.id, { onDelete: "cascade" }),
    knownAt: timestamp("known_at", { withTimezone: true }).notNull(), // visibility gate for replay/backtest
    previous: text("previous"),
    forecast: text("forecast"),
    actual: text("actual"),
    revision: text("revision"),
    status: text("status").notNull().default("released"),
    rawPayload: text("raw_payload").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("economic_revisions_event_known_idx").on(t.eventId, t.knownAt)]
);

export const economicCalendarImports = pgTable(
  "economic_calendar_imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "restrict" }),
    mode: text("mode").notNull().default("historical"),
    status: text("status").notNull().default("completed"),
    requestedFrom: timestamp("requested_from", { withTimezone: true }),
    requestedTo: timestamp("requested_to", { withTimezone: true }),
    rowsReceived: integer("rows_received").notNull().default(0),
    rowsAccepted: integer("rows_accepted").notNull().default(0),
    rowsRejected: integer("rows_rejected").notNull().default(0),
    errorLog: text("error_log").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("economic_imports_profile_idx").on(t.profileId)]
);

export const tradeEconomicEvents = pgTable(
  "trade_economic_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => economicEvents.id, { onDelete: "cascade" }),
    relation: text("relation").notNull(), // before_entry | near_entry | during | after_exit
    minutesFromEntry: integer("minutes_from_entry"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("trade_economic_events_unique_idx").on(t.tradeId, t.eventId), index("trade_economic_events_event_idx").on(t.eventId)]
);

// ---------------------------------------------------------------------------
// Strategy / replay / backtest - distinct run data, never mixed with LIVE.
// ---------------------------------------------------------------------------
export const strategies = pgTable(
  "strategies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    rules: text("rules").notNull().default("{}"),
    newsRules: text("news_rules").notNull().default("{}"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("strategies_profile_idx").on(t.profileId)]
);

export const replaySessions = pgTable(
  "replay_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    strategyId: uuid("strategy_id").references(() => strategies.id, { onDelete: "set null" }),
    timeframe: text("timeframe").notNull().default("15m"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    simulatedAt: timestamp("simulated_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("paused"), // paused | playing | completed
    speed: real("speed").notNull().default(1),
    initialCapital: real("initial_capital").notNull().default(10000),
    currentEquity: real("current_equity").notNull().default(10000),
    config: text("config").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("replay_sessions_profile_idx").on(t.profileId), index("replay_sessions_time_idx").on(t.simulatedAt)]
);

export const replayTrades = pgTable(
  "replay_trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    replaySessionId: uuid("replay_session_id")
      .notNull()
      .references(() => replaySessions.id, { onDelete: "cascade" }),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    direction: text("direction").notNull(),
    status: text("status").notNull().default("open"), // open | closed | stopped | target
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    entryPrice: real("entry_price").notNull(),
    stopLoss: real("stop_loss"),
    takeProfit: real("take_profit"),
    exitPrice: real("exit_price"),
    quantity: real("quantity").notNull().default(1),
    riskAmount: real("risk_amount").notNull().default(0),
    commission: real("commission").notNull().default(0),
    pnl: real("pnl").notNull().default(0),
    rMultiple: real("r_multiple").notNull().default(0),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("replay_trades_session_idx").on(t.replaySessionId), index("replay_trades_status_idx").on(t.status)]
);

export const replayActions = pgTable(
  "replay_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    replaySessionId: uuid("replay_session_id")
      .notNull()
      .references(() => replaySessions.id, { onDelete: "cascade" }),
    replayTradeId: uuid("replay_trade_id").references(() => replayTrades.id, { onDelete: "cascade" }),
    simulatedAt: timestamp("simulated_at", { withTimezone: true }).notNull(),
    actionType: text("action_type").notNull(), // buy | sell | move_sl | move_tp | close | play | pause | next_candle
    payload: text("payload").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("replay_actions_session_time_idx").on(t.replaySessionId, t.simulatedAt)]
);

export const backtests = pgTable(
  "backtests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    strategyId: uuid("strategy_id").references(() => strategies.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    timeframe: text("timeframe").notNull().default("15m"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("draft"), // draft | running | completed | failed
    initialCapital: real("initial_capital").notNull().default(10000),
    riskPct: real("risk_pct").notNull().default(1),
    commissionPerOrder: real("commission_per_order").notNull().default(0),
    config: text("config").notNull().default("{}"),
    summary: text("summary").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("backtests_profile_idx").on(t.profileId), index("backtests_instrument_idx").on(t.instrumentId)]
);

export const backtestTrades = pgTable(
  "backtest_trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    backtestId: uuid("backtest_id")
      .notNull()
      .references(() => backtests.id, { onDelete: "cascade" }),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    direction: text("direction").notNull(),
    session: text("session").notNull().default(""),
    timeframe: text("timeframe").notNull(),
    strategyLabel: text("strategy_label").notNull().default(""),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    entryPrice: real("entry_price").notNull(),
    stopLoss: real("stop_loss"),
    takeProfit: real("take_profit"),
    exitPrice: real("exit_price"),
    quantity: real("quantity").notNull().default(1),
    commission: real("commission").notNull().default(0),
    pnl: real("pnl").notNull().default(0),
    rMultiple: real("r_multiple").notNull().default(0),
    newsContext: text("news_context").notNull().default("[]"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("backtest_trades_backtest_idx").on(t.backtestId), index("backtest_trades_opened_idx").on(t.openedAt)]
);
