import { MT4Adapter } from "./mt4-adapter";
import { MT5Adapter } from "./mt5-adapter";
import type { BrokerAdapter } from "./adapter";
import type { BrokerPlatform } from "./types";

const adapters: Record<BrokerPlatform, BrokerAdapter> = {
  mt4: new MT4Adapter(),
  mt5: new MT5Adapter(),
};

export function getBrokerAdapter(platform: BrokerPlatform): BrokerAdapter {
  return adapters[platform];
}
