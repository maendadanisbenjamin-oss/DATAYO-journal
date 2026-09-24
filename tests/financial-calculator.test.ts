import { describe, expect, it } from "vitest";
import { calculateFinancialResult } from "../src/lib/financial-calculator";

describe("financial calculator", () => {
  it("calculates risk, P&L, R and risk percentage for a long trade", () => {
    const result = calculateFinancialResult({
      direction: "long",
      entryPrice: 1.1,
      stopLoss: 1.098,
      exitPrice: 1.104,
      lotSize: 1,
      accountBalance: 10000,
      valuePerPriceUnit: 100000,
      quoteCurrency: "USD",
      accountCurrency: "USD",
      conversionRate: null,
    });

    expect(result).toMatchObject({
      riskAmountQuote: 200,
      pnlQuote: 400,
      riskAmountAccount: 200,
      pnlAccount: 400,
      riskPct: 2,
      rMultiple: 2,
      conversionRate: 1,
      status: "calculated",
    });
  });

  it("calculates a short trade correctly", () => {
    const result = calculateFinancialResult({
      direction: "short",
      entryPrice: 1.1,
      stopLoss: 1.102,
      exitPrice: 1.096,
      lotSize: 1,
      accountBalance: 10000,
      valuePerPriceUnit: 100000,
      quoteCurrency: "USD",
      accountCurrency: "USD",
      conversionRate: null,
    });

    expect(result.riskAmountQuote).toBe(200);
    expect(result.pnlQuote).toBe(400);
    expect(result.rMultiple).toBe(2);
    expect(result.riskPct).toBe(2);
  });

  it("calculates risk while the trade is still open", () => {
    const result = calculateFinancialResult({
      direction: "long",
      entryPrice: 1.1,
      stopLoss: 1.098,
      exitPrice: null,
      lotSize: 1,
      accountBalance: 10000,
      valuePerPriceUnit: 100000,
      quoteCurrency: "USD",
      accountCurrency: "USD",
      conversionRate: null,
    });

    expect(result.riskAmountQuote).toBe(200);
    expect(result.riskAmountAccount).toBe(200);
    expect(result.pnlQuote).toBeNull();
    expect(result.pnlAccount).toBeNull();
    expect(result.rMultiple).toBeNull();
    expect(result.riskPct).toBe(2);
    expect(result.status).toBe("missing_exit_price");
  });

  it("calculates P&L but leaves risk and R unavailable without a stop loss", () => {
    const result = calculateFinancialResult({
      direction: "long",
      entryPrice: 1.1,
      stopLoss: null,
      exitPrice: 1.104,
      lotSize: 1,
      accountBalance: 10000,
      valuePerPriceUnit: 100000,
      quoteCurrency: "USD",
      accountCurrency: "USD",
      conversionRate: null,
    });

    expect(result.riskAmountQuote).toBeNull();
    expect(result.pnlQuote).toBe(400);
    expect(result.riskAmountAccount).toBeNull();
    expect(result.pnlAccount).toBe(400);
    expect(result.rMultiple).toBeNull();
    expect(result.riskPct).toBeNull();
    expect(result.status).toBe("missing_stop_loss");
  });

  it("scales risk and P&L with the lot size", () => {
    const result = calculateFinancialResult({
      direction: "long",
      entryPrice: 1.1,
      stopLoss: 1.098,
      exitPrice: 1.104,
      lotSize: 0.5,
      accountBalance: 10000,
      valuePerPriceUnit: 100000,
      quoteCurrency: "USD",
      accountCurrency: "USD",
      conversionRate: null,
    });

    expect(result.riskAmountQuote).toBe(100);
    expect(result.pnlQuote).toBe(200);
    expect(result.rMultiple).toBe(2);
    expect(result.riskPct).toBe(1);
  });

  it("converts quote-currency amounts into account currency", () => {
    const result = calculateFinancialResult({
      direction: "long",
      entryPrice: 1.1,
      stopLoss: 1.098,
      exitPrice: 1.104,
      lotSize: 1,
      accountBalance: 10000,
      valuePerPriceUnit: 100000,
      quoteCurrency: "USD",
      accountCurrency: "EUR",
      conversionRate: 0.9,
    });

    expect(result.riskAmountQuote).toBe(200);
    expect(result.pnlQuote).toBe(400);
    expect(result.riskAmountAccount).toBe(180);
    expect(result.pnlAccount).toBe(360);
    expect(result.riskPct).toBe(1.8);
    expect(result.rMultiple).toBe(2);
    expect(result.conversionRate).toBe(0.9);
    expect(result.status).toBe("calculated");
  });

  it("keeps quote amounts when conversion is required but unavailable", () => {
    const result = calculateFinancialResult({
      direction: "long",
      entryPrice: 1.1,
      stopLoss: 1.098,
      exitPrice: 1.104,
      lotSize: 1,
      accountBalance: 10000,
      valuePerPriceUnit: 100000,
      quoteCurrency: "USD",
      accountCurrency: "EUR",
      conversionRate: null,
    });

    expect(result.riskAmountQuote).toBe(200);
    expect(result.pnlQuote).toBe(400);
    expect(result.riskAmountAccount).toBeNull();
    expect(result.pnlAccount).toBeNull();
    expect(result.riskPct).toBeNull();
    expect(result.rMultiple).toBe(2);
    expect(result.status).toBe("conversion_required");
  });

  it("rejects invalid financial inputs", () => {
    const result = calculateFinancialResult({
      direction: "long",
      entryPrice: 1.1,
      stopLoss: 1.098,
      exitPrice: 1.104,
      lotSize: 0,
      accountBalance: 10000,
      valuePerPriceUnit: 100000,
      quoteCurrency: "USD",
      accountCurrency: "USD",
      conversionRate: null,
    });

    expect(result.status).toBe("invalid_input");
    expect(result.riskAmountQuote).toBeNull();
    expect(result.pnlQuote).toBeNull();
    expect(result.rMultiple).toBeNull();
  });
});
