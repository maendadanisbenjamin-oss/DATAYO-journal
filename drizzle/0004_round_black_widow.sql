CREATE TABLE "instrument_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"broker" text NOT NULL,
	"calculation_model" text DEFAULT 'price_delta_value' NOT NULL,
	"quantity_unit" text DEFAULT 'lot' NOT NULL,
	"value_per_price_unit" real NOT NULL,
	"price_increment" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instrument_specs" ADD CONSTRAINT "instrument_specs_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "instrument_specs_instrument_broker_uidx" ON "instrument_specs" USING btree ("instrument_id","broker");--> statement-breakpoint
CREATE INDEX "instrument_specs_instrument_idx" ON "instrument_specs" USING btree ("instrument_id");