import { randomBytes, createHash } from 'crypto';

export interface HTLCOrder {
  id: string;
  ethereumTxHash?: string;
  ethereumSender: string;
  ethereumToken: string;
  ethereumAmount: string;
  stellarReceiver: string;
  stellarAsset: string;
  stellarAmount: string;
  secret: string;
  hashlock: string;
  timelock: number;
  status: 'created' | 'ethereum_deposited' | 'stellar_transferred' | 'completed' | 'expired' | 'refunded';
  stellarTxId?: string;
  createdAt: number;
  completedAt?: number;
}

class HTLCTracker {
  private orders: Map<string, HTLCOrder> = new Map();

  generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  generateHashlock(secret: string): string {
    return createHash('sha256').update(secret, 'hex').digest('hex');
  }

  createOrder(params: {
    ethereumSender: string;
    ethereumToken: string;
    ethereumAmount: string;
    stellarReceiver: string;
    stellarAsset: string;
    stellarAmount: string;
  }): HTLCOrder {
    const secret = this.generateSecret();
    const hashlock = this.generateHashlock(secret);
    const timelock = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours

    const order: HTLCOrder = {
      id: randomBytes(16).toString('hex'),
      ...params,
      secret,
      hashlock,
      timelock,
      status: 'created',
      createdAt: Date.now()
    };

    this.orders.set(order.id, order);
    return order;
  }

  getOrder(id: string): HTLCOrder | undefined {
    return this.orders.get(id);
  }

  updateOrder(id: string, updates: Partial<HTLCOrder>): HTLCOrder | undefined {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updatedOrder = { ...order, ...updates };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  getAllOrders(): HTLCOrder[] {
    return Array.from(this.orders.values());
  }

  completeOrder(id: string): HTLCOrder | undefined {
    return this.updateOrder(id, {
      status: 'completed',
      completedAt: Date.now()
    });
  }
}

export const htlcTracker = new HTLCTracker();
