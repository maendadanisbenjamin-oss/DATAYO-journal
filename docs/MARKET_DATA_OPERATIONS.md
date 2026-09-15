# Market Data & Economic Calendar Operations

## Scope and ownership

The `instruments`, `candles_m1`, `economic_events`, and provider tables are shared internal reference data. Journal data remains isolated by `profiles → accounts → trades`. Replay sessions, replay trades, backtests, backtest trades, strategies, imports, and invitations are always owned by a profile.

## Canonical storage

- The canonical market resolution is **M1** in UTC (`candles_m1.ts`).
- M5, M15, M30, H1, H4, D1, W1 and MN are reconstructed on demand by `aggregateCandles`.
- The API applies hard range/row limits; a browser must never load a multi-year M1 history.
- Every stored candle carries a provider source and a validation quality state.

## Provider licensing gate

No public/free trial feed is automatically enabled.

- **Twelve Data**: current published terms distinguish Free Trial, internal use and redistribution. A paid plan and appropriate exchange/data entitlements must be verified before enabling storage or display to internal users. The exact subscription must also allow the required cache/storage window.
- **Trading Economics**: the calendar API supplies historical and near-real-time releases, but a paid API agreement must be selected that permits internal application display, storage and replay/backtest use.
- **Manual CSV**: available immediately; the importing operator is responsible for proving the source licence permits internal use and storage.

Store the licence approval, contract reference, asset classes, regions, maximum retention, and internal user scope in `data_sources.license_notes` before enabling a live provider.

## Required secrets

Use server-only environment variables, never client variables:

```text
TWELVE_DATA_API_KEY=
TRADING_ECONOMICS_API_KEY=
MARKET_ADMIN_TOKEN=           # for scheduled jobs/internal calls
```

## Retention

`runRetention()` deletes only:

- `candles_m1` older than the rolling 25-year cutoff;
- `economic_events` older than that cutoff (their revisions cascade).

It never deletes profiles, accounts, trades, screenshots, strategies, replay data, backtests or analytics. Invoke it after successful imports and once daily through an authenticated scheduler calling `/api/market-data/maintenance`.

## Gaps

Imports validate OHLCV then upsert with a source/instrument/timestamp uniqueness key. Candidate gaps are identified on canonical M1 intervals. Weekends are excluded for weekday instruments; exchange holidays are never blindly reconstructed. Gaps move through `detected → recovering → resolved` only after a valid recovery import.

## Anti-future-leak requirement

Replay and backtest requests must use `timestamp <= simulatedAt` for candles. Economic event visibility requires:

1. `knownAt <= simulation time` to show an upcoming event;
2. `publishedAt <= simulation time` to reveal Actual;
3. latest economic revision where `revision.knownAt <= simulation time`.

Do not substitute current values when an as-of revision does not exist.

## Backup policy

- Daily PostgreSQL logical backup, encrypted, 35-day retention.
- Weekly snapshot retained for 12 weeks.
- Monthly snapshot retained for 25 months.
- Restore drills quarterly.
- Before enabling a deletion job, test its cutoff in a staging database and log the deleted market/event row counts.

## Capacity planning

M1 data volume depends materially on asset universe, provider history and whether markets are continuous. Start with the requested 250 GB NVMe volume only after estimating the actual row count and indexes. Partition `candles_m1` by calendar month/year before onboarding high-volume datasets or approaching 50 active users; retain the same API contract.
