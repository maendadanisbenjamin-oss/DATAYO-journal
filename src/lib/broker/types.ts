export type BrokerPlatform = "mt4" | "mt5";

export type BrokerConnectionStatus =
  | "pending"
  | "connected"
  | "disconnected"
  | "error"
  | "disabled";

export type BrokerOrderSide = "buy" | "sell";

export type BrokerOrderStatus =
  | "pending"
  | "placed"
  | "partially_filled"
  | "filled"
  | "cancelled"
  | "rejected"
  | "expired";

export type BrokerDealType =
  | "entry"
  | "exit"
  | "balance"
  | "credit"
  | "other";

export type BrokerPositionStatus =
  | "open"
  | "closed";

export type BrokerCommandStatus =
  | "pending"
  | "sent"
  | "acknowledged"
  | "completed"
  | "failed"
  | "cancelled";

export type BrokerSyncMode =
  | "initial"
  | "historical"
  | "realtime"
  | "manual";

export type BrokerSyncStatus =
  | "running"
  | "completed"
  | "failed"
  | "partial";

export type BrokerOrder = {
  brokerOrderId: string;
  symbol: string;
  side: BrokerOrderSide;
  orderType: string;
  volume: number;
  price: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  status: BrokerOrderStatus;
  openedAt: Date | null;
  updatedAt: Date | null;
  closedAt: Date | null;
  magicNumber: number | null;
  comment: string | null;
  rawData?: unknown;
};

export type BrokerDeal = {
  brokerDealId: string;
  brokerOrderId: string | null;
  brokerPositionId: string | null;
  symbol: string;
  dealType: BrokerDealType;
  side: BrokerOrderSide | null;
  volume: number;
  price: number;
  commission: number;
  swap: number;
  profit: number;
  fee: number;
  executedAt: Date;
  magicNumber: number | null;
  comment: string | null;
  rawData?: unknown;
};

export type BrokerPosition = {
  brokerPositionId: string;
  symbol: string;
  direction: BrokerOrderSide;
  volume: number;
  entryPrice: number;
  currentPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  profit: number;
  swap: number;
  commission: number;
  openedAt: Date;
  closedAt: Date | null;
  status: BrokerPositionStatus;
  magicNumber: number | null;
  comment: string | null;
  rawData?: unknown;
};

export type BrokerAccountSnapshot = {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number | null;
  currency: string;
  capturedAt: Date;
};

export type BrokerExecutionEvent =
  | {
      type: "order";
      order: BrokerOrder;
    }
  | {
      type: "deal";
      deal: BrokerDeal;
    }
  | {
      type: "position";
      position: BrokerPosition;
    }
  | {
      type: "account";
      snapshot: BrokerAccountSnapshot;
    };

export type BrokerCommand = {
  id: string;
  type: string;
  symbol: string | null;
  side: BrokerOrderSide | null;
  volume: number | null;
  price: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  status: BrokerCommandStatus;
  brokerOrderId: string | null;
  brokerPositionId: string | null;
  payload?: unknown;
};

export type BrokerSyncRequest = {
  connectionId: string;
  mode: BrokerSyncMode;
  from: Date | null;
  to: Date | null;
};

export type BrokerSyncResult = {
  orders: BrokerOrder[];
  deals: BrokerDeal[];
  positions: BrokerPosition[];
  account: BrokerAccountSnapshot | null;
};
