import type {
  BrokerAccountSnapshot,
  BrokerCommand,
  BrokerConnectionStatus,
  BrokerDeal,
  BrokerOrder,
  BrokerPlatform,
  BrokerPosition,
} from "./types";

export type BrokerConnectionContext = {
  connectionId: string;
  platform: BrokerPlatform;
  brokerName: string;
  brokerAccountId: string;
  serverName: string;
  bridgeId: string;
};

export type BrokerConnectionState = {
  status: BrokerConnectionStatus;
  lastSeenAt: Date | null;
  lastError: string | null;
};

export type BrokerHistoryRange = {
  from: Date;
  to: Date;
};

export type BrokerAdapterCapabilities = {
  supportsHistoricalOrders: boolean;
  supportsHistoricalDeals: boolean;
  supportsHistoricalPositions: boolean;
  supportsRealtime: boolean;
  supportsCommands: boolean;
};

export interface BrokerAdapter {
  readonly platform: BrokerPlatform;
  readonly capabilities: BrokerAdapterCapabilities;

  connect(context: BrokerConnectionContext): Promise<void>;

  disconnect(): Promise<void>;

  getConnectionState(): Promise<BrokerConnectionState>;

  getAccountSnapshot(): Promise<BrokerAccountSnapshot>;

  getOpenOrders(): Promise<BrokerOrder[]>;

  getOpenPositions(): Promise<BrokerPosition[]>;

  getHistoricalOrders(range: BrokerHistoryRange): Promise<BrokerOrder[]>;

  getHistoricalDeals(range: BrokerHistoryRange): Promise<BrokerDeal[]>;

  executeCommand(command: BrokerCommand): Promise<BrokerCommand>;
}
