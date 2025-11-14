// Reconnecting WebSocket client for voice chat
export type WSMessageHandler = (data: any) => void;

class WSClient {
  private socket: WebSocket | null = null;
  private handlers: WSMessageHandler[] = [];
  private readonly url: string;
  private reconnectInterval = 2000;
  private shouldReconnect = true;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;

    this.socket = new WebSocket(this.url);

    this.socket.addEventListener('open', () => {
      console.debug('[WS] Connected', this.url);
    });

    this.socket.addEventListener('message', (ev) => {
      try {
        const data = JSON.parse(ev.data);
        this.handlers.forEach((h) => h(data));
      } catch (err) {
        console.warn('[WS] Failed to parse message', err);
      }
    });

    this.socket.addEventListener('close', () => {
      console.debug('[WS] Closed, attempting reconnect', this.url);
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    });

    this.socket.addEventListener('error', (ev) => {
      console.debug('[WS] Error', ev);
      // socket will close and reconnect via close handler
    });
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  onMessage(handler: WSMessageHandler) {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) this.handlers.splice(idx, 1);
    };
  }

  send(data: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    try {
      this.socket.send(JSON.stringify(data));
    } catch (err) {
      console.warn('[WS] Failed to send', err);
    }
  }
}

const instances: Record<string, WSClient> = {};
export function getWSClient(url: string) {
  if (!instances[url]) {
    instances[url] = new WSClient(url);
    instances[url].connect();
  }
  return instances[url];
}

export default WSClient;
