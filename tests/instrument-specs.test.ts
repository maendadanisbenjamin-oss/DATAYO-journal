import { describe, expect, it } from "vitest";
import { getInstrumentSpec } from "@/lib/instrument-specs";

describe("instrument specs", () => {
  it("retourne null lorsqu'aucune sp?cification n'existe", async () => {
    const result = await getInstrumentSpec(
      "00000000-0000-0000-0000-000000000000",
      "Test Broker"
    );

    expect(result).toBeNull();
  });
});
