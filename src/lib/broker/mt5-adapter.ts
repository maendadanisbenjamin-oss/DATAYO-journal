import type {
  BrokerAccountSnapshot,
  BrokerCommand,
  BrokerDeal,
  BrokerOrder,
  BrokerPlatform,
  BrokerPosition,
} from "./types";
import type {
  BrokerAdapter,
  BrokerAdapterCapabilities,
  BrokerConnectionContext,
  BrokerConnectionState,
  BrokerHistoryRange,
} from "./adapter";

export class MT5Adapter implements BrokerAdapter {
  readonly platform: BrokerPlatform = "mt5";

  readonly capabilities: BrokerAdapterCapabilities = {
    supportsHistoricalOrders: true,
    supportsHistoricalDeals: true,
    supportsHistoricalPositions: true,
    supportsRealtime: true,
    supportsCommands: true,
  };

  private context: BrokerConnectionContext | null = null;

  private state: BrokerConnectionState = {
    status: "pending",
    lastSeenAt: null,
    lastError: null,
  };

  async connect(context: BrokerConnectionContext): Promise<void> {
    this.context = context;

    this.state = {
      status: "connected",
      lastSeenAt: new Date(),
      lastError: null,
    };
  }

  async disconnect(): Promise<void> {
    this.context = null;

    this.state = {
      status: "disconnected",
      lastSeenAt: this.state.lastSeenAt,
      lastError: null,
    };
  }

  async getConnectionState(): Promise<BrokerConnectionState> {
    return this.state;
  }

  async getAccountSnapshot(): Promise<BrokerAccountSnapshot> {
    this.ensureConnected();

    throw new Error(
      "MT5 account snapshot is not implemented until the bridge is connected.",
    );
  }

  async getOpenOrders(): Promise<BrokerOrder[]> {
    this.ensureConnected();

    throw new Error(
      "MT5 open orders are not implemented until the bridge is connected.",
    );
  }

  async getOpenPositions(): Promise<BrokerPosition[]> {
    this.ensureConnected();

    throw new Error(
      "MT5 open positions are not implemented until the bridge is connected.",
    );
  }

  async getHistoricalOrders(
    range: BrokerHistoryRange,
  ): Promise<BrokerOrder[]> {
    this.ensureConnected();
    this.validateRange(range);

    throw new Error(
      "MT5 historical orders are not implemented until the bridge is connected.",
    );
  }

  async getHistoricalDeals(
    range: BrokerHistoryRange,
  ): Promise<BrokerDeal[]> {
    this.ensureConnected();
    this.validateRange(range);

    throw new Error(
      "MT5 historical deals are not implemented until the bridge is connected.",
    );
  }

  async executeCommand(command: BrokerCommand): Promise<BrokerCommand> {
    this.ensureConnected();

    throw new Error(
      `MT5 command "${command.type}" is not implemented until the bridge is connected.`,
    );
  }

  private ensureConnected(): void {
    if (!this.context || this.state.status !== "connected") {
      throw new Error("La connexion MT5 n'est pas active.");
    }
  }

  private validateRange(range: BrokerHistoryRange): void {
    if (range.from > range.to) {
      throw new Error(
        "La date de début de l'historique MT5 doit être antérieure à la date de fin.",
      );
    }
  }
}
