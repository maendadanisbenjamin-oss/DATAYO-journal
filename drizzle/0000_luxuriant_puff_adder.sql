CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" text NOT NULL,
	"name" text NOT NULL,
	"broker" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"initial_balance" real DEFAULT 10000 NOT NULL,
	"color" text DEFAULT '#d8b56d' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backtest_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"backtest_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"session" text DEFAULT '' NOT NULL,
	"timeframe" text NOT NULL,
	"strategy_label" text DEFAULT '' NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"entry_price" real NOT NULL,
	"stop_loss" real,
	"take_profit" real,
	"exit_price" real,
	"quantity" real DEFAULT 1 NOT NULL,
	"commission" real DEFAULT 0 NOT NULL,
	"pnl" real DEFAULT 0 NOT NULL,
	"r_multiple" real DEFAULT 0 NOT NULL,
	"news_context" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backtests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" text NOT NULL,
	"account_id" uuid,
	"instrument_id" uuid NOT NULL,
	"strategy_id" uuid,
	"name" text NOT NULL,
	"timeframe" text DEFAULT '15m' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"initial_capital" real DEFAULT 10000 NOT NULL,
	"risk_pct" real DEFAULT 1 NOT NULL,
	"commission_per_order" real DEFAULT 0 NOT NULL,
	"config" text DEFAULT '{}' NOT NULL,
	"summary" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "candles_m1" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"import_id" uuid,
	"ts" timestamp with time zone NOT NULL,
	"open" real NOT NULL,
	"high" real NOT NULL,
	"low" real NOT NULL,
	"close" real NOT NULL,
	"volume" real DEFAULT 0 NOT NULL,
	"provider_timestamp" timestamp with time zone,
	"is_final" boolean DEFAULT true NOT NULL,
	"quality" text DEFAULT 'validated' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"provider_kind" text NOT NULL,
	"license_status" text DEFAULT 'unverified' NOT NULL,
	"license_notes" text DEFAULT '' NOT NULL,
	"retention_policy" text DEFAULT '25_year_rolling' NOT NULL,
	"config_env_key" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_calendar_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" text NOT NULL,
	"source_id" uuid NOT NULL,
	"mode" text DEFAULT 'historical' NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"requested_from" timestamp with time zone,
	"requested_to" timestamp with time zone,
	"rows_received" integer DEFAULT 0 NOT NULL,
	"rows_accepted" integer DEFAULT 0 NOT NULL,
	"rows_rejected" integer DEFAULT 0 NOT NULL,
	"error_log" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_event_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"known_at" timestamp with time zone NOT NULL,
	"previous" text,
	"forecast" text,
	"actual" text,
	"revision" text,
	"status" text DEFAULT 'released' NOT NULL,
	"raw_payload" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"known_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"region" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"importance" text DEFAULT 'medium' NOT NULL,
	"previous" text,
	"forecast" text,
	"actual" text,
	"revision" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"metadata" text DEFAULT '{}' NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"display_name" text NOT NULL,
	"asset_class" text NOT NULL,
	"base_currency" text DEFAULT '' NOT NULL,
	"quote_currency" text DEFAULT 'USD' NOT NULL,
	"provider_symbols" text DEFAULT '{}' NOT NULL,
	"market_hours" text DEFAULT 'weekday' NOT NULL,
	"available_from" timestamp with time zone,
	"available_to" timestamp with time zone,
	"available_resolutions" text DEFAULT '["1m"]' NOT NULL,
	"quality_notes" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_data_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"timeframe" text DEFAULT '1m' NOT NULL,
	"gap_start" timestamp with time zone NOT NULL,
	"gap_end" timestamp with time zone NOT NULL,
	"expected_bars" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'detected' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"reason" text DEFAULT 'missing_m1_interval' NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_data_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" text NOT NULL,
	"source_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"mode" text DEFAULT 'historical' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"requested_from" timestamp with time zone,
	"requested_to" timestamp with time zone,
	"rows_received" integer DEFAULT 0 NOT NULL,
	"rows_accepted" integer DEFAULT 0 NOT NULL,
	"rows_rejected" integer DEFAULT 0 NOT NULL,
	"rows_deduplicated" integer DEFAULT 0 NOT NULL,
	"error_log" text DEFAULT '' NOT NULL,
	"metadata" text DEFAULT '{}' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_engine_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"instrument_id" uuid,
	"level" text DEFAULT 'info' NOT NULL,
	"event_type" text NOT NULL,
	"message" text NOT NULL,
	"context" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"title" text DEFAULT 'Trader' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"member_since" integer DEFAULT 2024 NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replay_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"replay_session_id" uuid NOT NULL,
	"replay_trade_id" uuid,
	"simulated_at" timestamp with time zone NOT NULL,
	"action_type" text NOT NULL,
	"payload" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replay_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" text NOT NULL,
	"account_id" uuid,
	"instrument_id" uuid NOT NULL,
	"strategy_id" uuid,
	"timeframe" text DEFAULT '15m' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"simulated_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'paused' NOT NULL,
	"speed" real DEFAULT 1 NOT NULL,
	"initial_capital" real DEFAULT 10000 NOT NULL,
	"current_equity" real DEFAULT 10000 NOT NULL,
	"config" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replay_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"replay_session_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"entry_price" real NOT NULL,
	"stop_loss" real,
	"take_profit" real,
	"exit_price" real,
	"quantity" real DEFAULT 1 NOT NULL,
	"risk_amount" real DEFAULT 0 NOT NULL,
	"commission" real DEFAULT 0 NOT NULL,
	"pnl" real DEFAULT 0 NOT NULL,
	"r_multiple" real DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"device" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"rules" text DEFAULT '{}' NOT NULL,
	"news_rules" text DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_economic_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"relation" text NOT NULL,
	"minutes_from_entry" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"date" text NOT NULL,
	"opened_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"mode" text DEFAULT 'live' NOT NULL,
	"source_run_id" uuid,
	"symbol" text NOT NULL,
	"direction" text DEFAULT 'long' NOT NULL,
	"session" text DEFAULT 'london' NOT NULL,
	"setup" text DEFAULT '' NOT NULL,
	"risk_pct" real DEFAULT 1 NOT NULL,
	"r_multiple" real DEFAULT 0 NOT NULL,
	"pnl" real DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"trading_type" text DEFAULT 'Day Trade' NOT NULL,
	"timeframe" text DEFAULT 'M15' NOT NULL,
	"entry_price" real,
	"stop_loss" real,
	"take_profit" real,
	"lot_size" real,
	"exit_price" real,
	"rr_ratio" real,
	"ict_model" text DEFAULT 'Silver Bullet' NOT NULL,
	"market_structure" text DEFAULT 'Bullish' NOT NULL,
	"htf_timeframe" text DEFAULT 'H4' NOT NULL,
	"poi_zone" text DEFAULT 'Order Block' NOT NULL,
	"setup_notes" text DEFAULT '' NOT NULL,
	"emotional_state" text DEFAULT 'Calme' NOT NULL,
	"htf_bias" text DEFAULT '' NOT NULL,
	"management_notes" text DEFAULT '' NOT NULL,
	"plan_respect" text DEFAULT 'Oui' NOT NULL,
	"trade_outcome" text DEFAULT 'TP touché' NOT NULL,
	"screenshots" text DEFAULT '{}' NOT NULL,
	"lessons_learned" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backtest_trades" ADD CONSTRAINT "backtest_trades_backtest_id_backtests_id_fk" FOREIGN KEY ("backtest_id") REFERENCES "public"."backtests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backtest_trades" ADD CONSTRAINT "backtest_trades_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backtests" ADD CONSTRAINT "backtests_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backtests" ADD CONSTRAINT "backtests_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backtests" ADD CONSTRAINT "backtests_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backtests" ADD CONSTRAINT "backtests_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candles_m1" ADD CONSTRAINT "candles_m1_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candles_m1" ADD CONSTRAINT "candles_m1_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candles_m1" ADD CONSTRAINT "candles_m1_import_id_market_data_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."market_data_imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_calendar_imports" ADD CONSTRAINT "economic_calendar_imports_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_calendar_imports" ADD CONSTRAINT "economic_calendar_imports_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_event_revisions" ADD CONSTRAINT "economic_event_revisions_event_id_economic_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."economic_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_events" ADD CONSTRAINT "economic_events_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_profiles_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_data_gaps" ADD CONSTRAINT "market_data_gaps_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_data_gaps" ADD CONSTRAINT "market_data_gaps_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_data_imports" ADD CONSTRAINT "market_data_imports_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_data_imports" ADD CONSTRAINT "market_data_imports_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_data_imports" ADD CONSTRAINT "market_data_imports_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_engine_events" ADD CONSTRAINT "market_engine_events_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_engine_events" ADD CONSTRAINT "market_engine_events_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_actions" ADD CONSTRAINT "replay_actions_replay_session_id_replay_sessions_id_fk" FOREIGN KEY ("replay_session_id") REFERENCES "public"."replay_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_actions" ADD CONSTRAINT "replay_actions_replay_trade_id_replay_trades_id_fk" FOREIGN KEY ("replay_trade_id") REFERENCES "public"."replay_trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_sessions" ADD CONSTRAINT "replay_sessions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_sessions" ADD CONSTRAINT "replay_sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_sessions" ADD CONSTRAINT "replay_sessions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_sessions" ADD CONSTRAINT "replay_sessions_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_trades" ADD CONSTRAINT "replay_trades_replay_session_id_replay_sessions_id_fk" FOREIGN KEY ("replay_session_id") REFERENCES "public"."replay_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_trades" ADD CONSTRAINT "replay_trades_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_economic_events" ADD CONSTRAINT "trade_economic_events_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_economic_events" ADD CONSTRAINT "trade_economic_events_event_id_economic_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."economic_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_profile_idx" ON "accounts" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "backtest_trades_backtest_idx" ON "backtest_trades" USING btree ("backtest_id");--> statement-breakpoint
CREATE INDEX "backtest_trades_opened_idx" ON "backtest_trades" USING btree ("opened_at");--> statement-breakpoint
CREATE INDEX "backtests_profile_idx" ON "backtests" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "backtests_instrument_idx" ON "backtests" USING btree ("instrument_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candles_m1_source_instrument_ts_idx" ON "candles_m1" USING btree ("source_id","instrument_id","ts");--> statement-breakpoint
CREATE INDEX "candles_m1_instrument_ts_idx" ON "candles_m1" USING btree ("instrument_id","ts");--> statement-breakpoint
CREATE UNIQUE INDEX "data_sources_key_idx" ON "data_sources" USING btree ("key");--> statement-breakpoint
CREATE INDEX "economic_imports_profile_idx" ON "economic_calendar_imports" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "economic_revisions_event_known_idx" ON "economic_event_revisions" USING btree ("event_id","known_at");--> statement-breakpoint
CREATE UNIQUE INDEX "economic_events_source_external_idx" ON "economic_events" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "economic_events_scheduled_idx" ON "economic_events" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "economic_events_currency_idx" ON "economic_events" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "economic_events_importance_idx" ON "economic_events" USING btree ("importance");--> statement-breakpoint
CREATE UNIQUE INDEX "instruments_symbol_idx" ON "instruments" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "instruments_asset_class_idx" ON "instruments" USING btree ("asset_class");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitations_status_idx" ON "invitations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "market_gaps_source_instrument_window_idx" ON "market_data_gaps" USING btree ("source_id","instrument_id","gap_start","gap_end");--> statement-breakpoint
CREATE INDEX "market_gaps_status_idx" ON "market_data_gaps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "market_gaps_instrument_idx" ON "market_data_gaps" USING btree ("instrument_id");--> statement-breakpoint
CREATE INDEX "market_imports_instrument_idx" ON "market_data_imports" USING btree ("instrument_id");--> statement-breakpoint
CREATE INDEX "market_imports_profile_idx" ON "market_data_imports" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "market_engine_events_created_idx" ON "market_engine_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_idx" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "replay_actions_session_time_idx" ON "replay_actions" USING btree ("replay_session_id","simulated_at");--> statement-breakpoint
CREATE INDEX "replay_sessions_profile_idx" ON "replay_sessions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "replay_sessions_time_idx" ON "replay_sessions" USING btree ("simulated_at");--> statement-breakpoint
CREATE INDEX "replay_trades_session_idx" ON "replay_trades" USING btree ("replay_session_id");--> statement-breakpoint
CREATE INDEX "replay_trades_status_idx" ON "replay_trades" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_profile_idx" ON "sessions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "strategies_profile_idx" ON "strategies" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_economic_events_unique_idx" ON "trade_economic_events" USING btree ("trade_id","event_id");--> statement-breakpoint
CREATE INDEX "trade_economic_events_event_idx" ON "trade_economic_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "trades_account_idx" ON "trades" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "trades_date_idx" ON "trades" USING btree ("date");--> statement-breakpoint
CREATE INDEX "trades_mode_idx" ON "trades" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "trades_opened_at_idx" ON "trades" USING btree ("opened_at");