ALTER TABLE "trades" ALTER COLUMN "plan_respect" SET DATA TYPE integer USING (
  CASE "plan_respect"
    WHEN 'Oui' THEN 5
    WHEN 'Partiel' THEN 3
    WHEN 'Non' THEN 1
    ELSE 5
  END
);--> statement-breakpoint
ALTER TABLE "trades" ALTER COLUMN "plan_respect" SET DEFAULT 5;
