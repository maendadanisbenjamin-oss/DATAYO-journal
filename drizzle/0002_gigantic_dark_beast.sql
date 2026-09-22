ALTER TABLE "invitations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "invitations" CASCADE;--> statement-breakpoint
ALTER TABLE "trades" ALTER COLUMN "trade_outcome" SET DEFAULT 'TP touché';
