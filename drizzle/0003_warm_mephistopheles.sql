CREATE TABLE "trade_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"lot_size" real,
	"risk_pct" real,
	"risk_amount" real,
	"r_multiple" real DEFAULT 0 NOT NULL,
	"pnl" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD CONSTRAINT "trade_accounts_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD CONSTRAINT "trade_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trade_accounts_trade_idx" ON "trade_accounts" USING btree ("trade_id");--> statement-breakpoint
CREATE INDEX "trade_accounts_account_idx" ON "trade_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_accounts_trade_account_uidx" ON "trade_accounts" USING btree ("trade_id","account_id");
--> statement-breakpoint
INSERT INTO "trade_accounts" (
        "trade_id",
        "account_id",
        "lot_size",
        "risk_pct",
        "r_multiple",
        "pnl"
)
SELECT
        "id",
        "account_id",
        "lot_size",
        "risk_pct",
        "r_multiple",
        "pnl"
FROM "trades";