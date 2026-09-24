export type FinancialCalculationInput = {
  direction: "long" | "short";
  entryPrice: number;
  stopLoss: number | null;
  exitPrice: number | null;
  lotSize: number;
  accountBalance: number;
  valuePerPriceUnit: number;
  quoteCurrency: string;
  accountCurrency: string;
  conversionRate: number | null;
};

export type FinancialCalculationResult = {
  riskAmountQuote: number | null;
  pnlQuote: number | null;
  riskAmountAccount: number | null;
  pnlAccount: number | null;
  riskPct: number | null;
  rMultiple: number | null;
  conversionRate: number | null;
  status:
    | "calculated"
    | "missing_stop_loss"
    | "missing_exit_price"
    | "missing_spec"
    | "conversion_required"
    | "invalid_input";
};

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function roundFinancial(value: number): number {
  return Number(value.toFixed(10));
}

export function calculateFinancialResult(
  input: FinancialCalculationInput
): FinancialCalculationResult {
  const {
    direction,
    entryPrice,
    stopLoss,
    exitPrice,
    lotSize,
    accountBalance,
    valuePerPriceUnit,
    quoteCurrency,
    accountCurrency,
    conversionRate,
  } = input;

  if (
    (direction !== "long" && direction !== "short") ||
    !isFiniteNumber(entryPrice) ||
    !isFiniteNumber(lotSize) ||
    !isFiniteNumber(accountBalance) ||
    !isFiniteNumber(valuePerPriceUnit) ||
    lotSize <= 0 ||
    accountBalance <= 0 ||
    valuePerPriceUnit <= 0
  ) {
    return {
      riskAmountQuote: null,
      pnlQuote: null,
      riskAmountAccount: null,
      pnlAccount: null,
      riskPct: null,
      rMultiple: null,
      conversionRate: null,
      status: "invalid_input",
    };
  }

  if (quoteCurrency !== accountCurrency && conversionRate !== null) {
    if (!isFiniteNumber(conversionRate) || conversionRate <= 0) {
      return {
        riskAmountQuote: null,
        pnlQuote: null,
        riskAmountAccount: null,
        pnlAccount: null,
        riskPct: null,
        rMultiple: null,
        conversionRate: null,
        status: "invalid_input",
      };
    }
  }

  const riskAmountQuote =
    stopLoss !== null &&
    isFiniteNumber(stopLoss)
      ? roundFinancial(Math.abs(entryPrice - stopLoss) * lotSize * valuePerPriceUnit)
      : null;

  const pnlQuote =
    exitPrice !== null && isFiniteNumber(exitPrice)
      ? roundFinancial(
          (direction === "long"
            ? exitPrice - entryPrice
            : entryPrice - exitPrice) *
            lotSize *
            valuePerPriceUnit
        )
      : null;

  const hasDifferentCurrencies = quoteCurrency !== accountCurrency;

  if (hasDifferentCurrencies && conversionRate === null) {
    return {
      riskAmountQuote,
      pnlQuote,
      riskAmountAccount: null,
      pnlAccount: null,
      riskPct: null,
      rMultiple:
        riskAmountQuote !== null && riskAmountQuote > 0 && pnlQuote !== null
          ? pnlQuote / riskAmountQuote
          : null,
      conversionRate: null,
      status:
        stopLoss === null
          ? "missing_stop_loss"
          : exitPrice === null
            ? "missing_exit_price"
            : "conversion_required",
    };
  }

  const effectiveConversionRate =
    quoteCurrency === accountCurrency ? 1 : conversionRate;

  const riskAmountAccount =
    riskAmountQuote !== null && effectiveConversionRate !== null
      ? roundFinancial(riskAmountQuote * effectiveConversionRate)
      : null;

  const pnlAccount =
    pnlQuote !== null && effectiveConversionRate !== null
      ? roundFinancial(pnlQuote * effectiveConversionRate)
      : null;

  const rMultiple =
    riskAmountQuote !== null && riskAmountQuote > 0 && pnlQuote !== null
      ? roundFinancial(pnlQuote / riskAmountQuote)
      : null;

  const riskPct =
    riskAmountAccount !== null
      ? roundFinancial((riskAmountAccount / accountBalance) * 100)
      : null;

  let status: FinancialCalculationResult["status"] = "calculated";

  if (stopLoss === null) {
    status = "missing_stop_loss";
  } else if (exitPrice === null) {
    status = "missing_exit_price";
  }

  return {
    riskAmountQuote,
    pnlQuote,
    riskAmountAccount,
    pnlAccount,
    riskPct,
    rMultiple,
    conversionRate: effectiveConversionRate ?? null,
    status,
  };
}
