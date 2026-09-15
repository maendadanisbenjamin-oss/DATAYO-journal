import "dotenv/config";
import pg from "pg";
import { randomBytes, scryptSync } from "node:crypto";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const salt = randomBytes(16).toString("hex");
const hash = `${salt}:${scryptSync("demo1234", salt, 64).toString("hex")}`;

await client.query(
  `insert into profiles (id, display_name, email, password_hash, title, bio, member_since)
   values ('me','Yowel Kanezi','yowel.kanezi@email.com',$1,'Trader Indépendant','Price action & liquidité institutionnelle. Rigueur et discipline avant tout.',2024)
   on conflict (id) do nothing`,
  [hash]
);

// Check if trades have already been updated with ICT models
const { rows: testTrades } = await client.query("select ict_model from trades limit 1");
if (testTrades.length && testTrades[0].ict_model && testTrades[0].ict_model !== "Silver Bullet") {
  console.log("seed: already enriched with ICT models");
  await client.end();
  process.exit(0);
}

// Clean and re-seed accounts and trades for Yowel
await client.query("delete from accounts where profile_id='me'");

const accs = [
  ["FTMO 100K", "FTMO", "USD", 100000, "#d8b56d"],
  ["Compte Perso", "IC Markets", "USD", 10000, "#7aa2f7"],
];
const ids = [];
for (const a of accs) {
  const r = await client.query(
    "insert into accounts (profile_id,name,broker,currency,initial_balance,color) values ('me',$1,$2,$3,$4,$5) returning id",
    a
  );
  ids.push(r.rows[0].id);
}

const symbols = ["EURUSD", "GBPUSD", "XAUUSD", "NAS100", "US30", "USDJPY", "BTCUSD"];
const ictModels = [
  "Silver Bullet",
  "2022 Mentorship Model",
  "Turtle Soup",
  "Judas Swing",
  "MMTR (Market Maker Trend Reversal)",
  "Order Block Entry",
  "FVG Retest",
];
const poiZones = [
  "Order Block (OB)",
  "Fair Value Gap (FVG)",
  "Liquidity Pool / Sweep",
  "Breaker Block",
  "Mitigation Block",
  "Rejection Block",
];
const structures = [
  "Bullish Trend",
  "Bearish Trend",
  "Range / Consolidation",
  "CHoCH (Change of Character)",
  "BOS (Break of Structure)",
];
const emotionalStates = ["Calme & Patient", "Confiant", "FOMO", "Stressé", "Impatient"];
const tradingTypes = ["Day Trade", "Scalp", "Swing"];
const sessions = ["asia", "london", "newyork"];
const timeframes = ["M5", "M15", "H1"];

let seed = 42;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const start = new Date();
start.setDate(start.getDate() - 110);

for (let i = 0; i < 76; i++) {
  const d = new Date(start);
  d.setDate(start.getDate() + Math.floor(i * 1.4));
  if (d.getDay() === 0 || d.getDay() === 6) continue;

  const acc = rnd() < 0.68 ? 0 : 1;
  const isWin = rnd() < 0.58;
  const r = isWin ? +(0.9 + rnd() * 2.5).toFixed(2) : +(-(0.6 + rnd() * 0.6)).toFixed(2);
  const risk = 1;
  const pnl = +((r * risk) / 100 * accs[acc][3]).toFixed(2);

  const sym = symbols[Math.floor(rnd() * symbols.length)];
  const dir = rnd() < 0.52 ? "long" : "short";
  const sess = sessions[Math.floor(rnd() * sessions.length)];
  const model = ictModels[Math.floor(rnd() * ictModels.length)];
  const poi = poiZones[Math.floor(rnd() * poiZones.length)];
  const struct = structures[Math.floor(rnd() * structures.length)];
  const tType = tradingTypes[Math.floor(rnd() * tradingTypes.length)];
  const tf = timeframes[Math.floor(rnd() * timeframes.length)];
  const emotion = emotionalStates[Math.floor(rnd() * emotionalStates.length)];
  const plan = isWin ? "Oui" : rnd() < 0.25 ? "Partiel" : "Oui";
  const outcome = isWin ? "TP touché" : "SL touché";

  const entry = sym === "XAUUSD" ? 2350 + Math.round(rnd() * 100) : 1.085 + rnd() * 0.02;
  const sl = dir === "long" ? entry - 0.003 : entry + 0.003;
  const tp = dir === "long" ? entry + 0.0075 : entry - 0.0075;

  await client.query(
    `insert into trades (
      account_id, date, symbol, direction, session, setup, risk_pct, r_multiple, pnl, notes,
      trading_type, timeframe, entry_price, stop_loss, take_profit, lot_size, exit_price, rr_ratio,
      ict_model, market_structure, htf_timeframe, poi_zone, setup_notes,
      emotional_state, htf_bias, management_notes, plan_respect, trade_outcome,
      screenshots, lessons_learned
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23,
      $24, $25, $26, $27, $28,
      $29, $30
    )`,
    [
      ids[acc],
      d.toISOString().slice(0, 10),
      sym,
      dir,
      sess,
      model,
      risk,
      r,
      pnl,
      isWin ? "Trade exécuté avec discipline." : "Sortie au stop loss sans regret.",
      tType,
      tf,
      entry,
      sl,
      tp,
      1.0,
      isWin ? tp : sl,
      2.5,
      model,
      struct,
      "H4",
      poi,
      "Confluence HTF avec rejet net et sweep de liquidité.",
      emotion,
      "Biais haussier soutenu par la structure D1.",
      "Gestion au plan, SL déplacé à BE après le premier target.",
      plan,
      outcome,
      "{}",
      isWin
        ? "Excellente patience à l'open, target atteinte sans hésitation."
        : "Respect strict du stop loss, perte maîtrisée.",
    ]
  );
}

console.log("seed: enriched trades seeded successfully");
await client.end();
