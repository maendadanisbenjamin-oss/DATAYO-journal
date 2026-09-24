ALTER TABLE "trade_accounts" ALTER COLUMN "r_multiple" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "trade_accounts" ALTER COLUMN "r_multiple" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_accounts" ALTER COLUMN "pnl" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "trade_accounts" ALTER COLUMN "pnl" DROP NOT NULL;