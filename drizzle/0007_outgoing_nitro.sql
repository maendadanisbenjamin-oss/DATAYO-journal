CREATE TABLE "broker_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"command_type" text NOT NULL,
	"symbol" text DEFAULT '' NOT NULL,
	"direction" text DEFAULT '' NOT NULL,
	"volume" real DEFAULT 0 NOT NULL,
	"price" real,
	"stop_loss" real,
	"take_profit" real,
	"broker_order_id" text,
	"broker_position_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text DEFAULT '' NOT NULL,
	"payload" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broker_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"broker_name" text DEFAULT '' NOT NULL,
	"broker_account_id" text NOT NULL,
	"server_name" text DEFAULT '' NOT NULL,
	"bridge_id" text NOT NULL,
	"bridge_token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"last_error" text DEFAULT '' NOT NULL,
	"metadata" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broker_deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"broker_deal_id" text NOT NULL,
	"broker_order_id" text,
	"broker_position_id" text,
	"symbol" text NOT NULL,
	"deal_type" text DEFAULT '' NOT NULL,
	"side" text DEFAULT '' NOT NULL,
	"volume" real DEFAULT 0 NOT NULL,
	"price" real DEFAULT 0 NOT NULL,
	"commission" real DEFAULT 0 NOT NULL,
	"swap" real DEFAULT 0 NOT NULL,
	"profit" real DEFAULT 0 NOT NULL,
	"fee" real DEFAULT 0 NOT NULL,
	"executed_at" timestamp with time zone NOT NULL,
	"magic_number" text DEFAULT '' NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"raw_data" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broker_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"broker_order_id" text NOT NULL,
	"symbol" text NOT NULL,
	"order_type" text DEFAULT '' NOT NULL,
	"side" text DEFAULT '' NOT NULL,
	"volume" real DEFAULT 0 NOT NULL,
	"price" real,
	"stop_loss" real,
	"take_profit" real,
	"status" text DEFAULT '' NOT NULL,
	"opened_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"magic_number" text DEFAULT '' NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"raw_data" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broker_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"broker_position_id" text NOT NULL,
	"symbol" text NOT NULL,
	"direction" text NOT NULL,
	"volume" real DEFAULT 0 NOT NULL,
	"entry_price" real DEFAULT 0 NOT NULL,
	"current_price" real DEFAULT 0 NOT NULL,
	"stop_loss" real,
	"take_profit" real,
	"profit" real DEFAULT 0 NOT NULL,
	"swap" real DEFAULT 0 NOT NULL,
	"commission" real DEFAULT 0 NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"status" text DEFAULT 'open' NOT NULL,
	"magic_number" text DEFAULT '' NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"raw_data" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broker_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"requested_from" timestamp with time zone,
	"requested_to" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"orders_received" integer DEFAULT 0 NOT NULL,
	"orders_created" integer DEFAULT 0 NOT NULL,
	"orders_updated" integer DEFAULT 0 NOT NULL,
	"deals_received" integer DEFAULT 0 NOT NULL,
	"deals_created" integer DEFAULT 0 NOT NULL,
	"deals_updated" integer DEFAULT 0 NOT NULL,
	"positions_received" integer DEFAULT 0 NOT NULL,
	"positions_created" integer DEFAULT 0 NOT NULL,
	"positions_updated" integer DEFAULT 0 NOT NULL,
	"error_log" text DEFAULT '' NOT NULL,
	"metadata" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_broker_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"broker_order_id" text,
	"broker_deal_id" text,
	"broker_position_id" text,
	"relation_type" text DEFAULT 'primary' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "broker_commands" ADD CONSTRAINT "broker_commands_connection_id_broker_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_connections" ADD CONSTRAINT "broker_connections_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_deals" ADD CONSTRAINT "broker_deals_connection_id_broker_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_orders" ADD CONSTRAINT "broker_orders_connection_id_broker_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_positions" ADD CONSTRAINT "broker_positions_connection_id_broker_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_sync_runs" ADD CONSTRAINT "broker_sync_runs_connection_id_broker_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_broker_links" ADD CONSTRAINT "trade_broker_links_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_broker_links" ADD CONSTRAINT "trade_broker_links_connection_id_broker_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "broker_commands_connection_idx" ON "broker_commands" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "broker_commands_status_idx" ON "broker_commands" USING btree ("status");--> statement-breakpoint
CREATE INDEX "broker_commands_requested_idx" ON "broker_commands" USING btree ("requested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "broker_connections_bridge_id_idx" ON "broker_connections" USING btree ("bridge_id");--> statement-breakpoint
CREATE INDEX "broker_connections_account_idx" ON "broker_connections" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "broker_connections_status_idx" ON "broker_connections" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "broker_deals_connection_deal_idx" ON "broker_deals" USING btree ("connection_id","broker_deal_id");--> statement-breakpoint
CREATE INDEX "broker_deals_connection_idx" ON "broker_deals" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "broker_deals_order_idx" ON "broker_deals" USING btree ("connection_id","broker_order_id");--> statement-breakpoint
CREATE INDEX "broker_deals_position_idx" ON "broker_deals" USING btree ("connection_id","broker_position_id");--> statement-breakpoint
CREATE INDEX "broker_deals_executed_idx" ON "broker_deals" USING btree ("executed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "broker_orders_connection_order_idx" ON "broker_orders" USING btree ("connection_id","broker_order_id");--> statement-breakpoint
CREATE INDEX "broker_orders_connection_idx" ON "broker_orders" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "broker_orders_symbol_idx" ON "broker_orders" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "broker_orders_updated_idx" ON "broker_orders" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "broker_positions_connection_position_idx" ON "broker_positions" USING btree ("connection_id","broker_position_id");--> statement-breakpoint
CREATE INDEX "broker_positions_connection_idx" ON "broker_positions" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "broker_positions_symbol_idx" ON "broker_positions" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "broker_positions_status_idx" ON "broker_positions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "broker_positions_synced_idx" ON "broker_positions" USING btree ("synced_at");--> statement-breakpoint
CREATE INDEX "broker_sync_runs_connection_idx" ON "broker_sync_runs" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "broker_sync_runs_started_idx" ON "broker_sync_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "broker_sync_runs_status_idx" ON "broker_sync_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trade_broker_links_trade_idx" ON "trade_broker_links" USING btree ("trade_id");--> statement-breakpoint
CREATE INDEX "trade_broker_links_connection_idx" ON "trade_broker_links" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "trade_broker_links_order_idx" ON "trade_broker_links" USING btree ("connection_id","broker_order_id");--> statement-breakpoint
CREATE INDEX "trade_broker_links_deal_idx" ON "trade_broker_links" USING btree ("connection_id","broker_deal_id");--> statement-breakpoint
CREATE INDEX "trade_broker_links_position_idx" ON "trade_broker_links" USING btree ("connection_id","broker_position_id");