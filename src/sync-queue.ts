import { getApiUrl } from './utils';

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  method: string;
  body?: unknown;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
}

type Listener = (queue: PendingOperation[]) => void;

const STORAGE_KEY = 'iamobil_sync_queue';

class SyncQueueManager {
  private queue: PendingOperation[] = [];
  private processing = false;
  private listeners: Listener[] = [];
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.load();
    window.addEventListener('online', () => {
      this.process();
    });
  }

  private load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch {
      this.queue = [];
    }
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    this.notify();
  }

  private notify() {
    this.listeners.forEach(fn => fn([...this.queue]));
  }

  enqueue(op: Omit<PendingOperation, 'id' | 'createdAt' | 'retryCount' | 'maxRetries'>) {
    this.queue.push({
      ...op,
      id: crypto.randomUUID?.() ?? Math.random().toString(36).substring(2),
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 10,
    });
    this.save();
    if (navigator.onLine) this.process();
  }

  remove(id: string) {
    this.queue = this.queue.filter(op => op.id !== id);
    this.save();
  }

  clear() {
    this.queue = [];
    this.save();
  }

  getQueue(): PendingOperation[] {
    return [...this.queue];
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  onChange(fn: Listener) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const API_BASE = getApiUrl();
    if (!API_BASE) {
      this.processing = false;
      return;
    }

    const batch = [...this.queue];

    for (const op of batch) {
      try {
        const res = await fetch(`${API_BASE}${op.endpoint}`, {
          method: op.method,
          headers: { 'Content-Type': 'application/json' },
          body: op.body ? JSON.stringify(op.body) : undefined,
        });

        if (res.ok) {
          this.remove(op.id);
        } else if (res.status >= 400 && res.status < 500) {
          this.remove(op.id);
        } else {
          op.retryCount++;
          if (op.retryCount >= op.maxRetries) {
            this.remove(op.id);
          } else {
            this.save();
          }
        }
      } catch {
        op.retryCount++;
        if (op.retryCount >= op.maxRetries) {
          this.remove(op.id);
        } else {
          this.save();
        }
      }
    }

    this.processing = false;

    if (this.queue.length > 0 && navigator.onLine) {
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => this.process(), 5000);
    }
  }
}

export const syncQueue = new SyncQueueManager();
