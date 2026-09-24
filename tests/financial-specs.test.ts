import { describe, expect, it } from "vitest";
import { getFinancialInstrumentSpec } from "@/lib/financial-specs";

describe("financial instrument specs", () => {
  it("retourne null lorsqu'aucune spécification financière n'existe", async () => {
    const result = await getFinancialInstrumentSpec(
      "00000000-0000-0000-0000-000000000000",
      {
        id: "00000000-0000-0000-0000-000000000001",
        profileId: "test-profile",
        name: "Test Account",
        broker: "Test Broker",
        currency: "USD",
        initialBalance: 10000,
        color: "#000000",
        createdAt: new Date().toISOString(),
      }
    );

    expect(result).toBeNull();
  });
});
