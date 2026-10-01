import type {
  BrokerCommandStatus,
  BrokerConnectionStatus,
  BrokerPlatform,
  BrokerSyncMode,
  BrokerSyncStatus,
} from "./types";

export const BROKER_PLATFORMS: readonly BrokerPlatform[] = [
  "mt4",
  "mt5",
];

export const BROKER_CONNECTION_STATUSES: readonly BrokerConnectionStatus[] = [
  "pending",
  "connected",
  "disconnected",
  "error",
  "disabled",
];

export const BROKER_SYNC_MODES: readonly BrokerSyncMode[] = [
  "initial",
  "historical",
  "realtime",
  "manual",
];

export const BROKER_SYNC_STATUSES: readonly BrokerSyncStatus[] = [
  "running",
  "completed",
  "failed",
  "partial",
];

export const BROKER_COMMAND_STATUSES: readonly BrokerCommandStatus[] = [
  "pending",
  "sent",
  "acknowledged",
  "completed",
  "failed",
  "cancelled",
];

export const BROKER_COMMAND_TYPES = {
  OPEN_POSITION: "open_position",
  CLOSE_POSITION: "close_position",
  MODIFY_POSITION: "modify_position",
  CANCEL_ORDER: "cancel_order",
  MODIFY_ORDER: "modify_order",
  SYNC: "sync",
} as const;

export const BROKER_DEFAULTS = {
  HEARTBEAT_TIMEOUT_SECONDS: 90,
  SYNC_BATCH_SIZE: 500,
  REALTIME_POLL_INTERVAL_SECONDS: 2,
} as const;
