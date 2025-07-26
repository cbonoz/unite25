import { TipJarConfig } from '../utils/storage';

// Shared in-memory storage for demo
// In production, this would be replaced with a database
class InMemoryStore {
  private tipJars = new Map<string, TipJarConfig>();

  saveTipJar(tipJar: TipJarConfig): void {
    this.tipJars.set(tipJar.id, tipJar);
  }

  getTipJar(id: string): TipJarConfig | null {
    return this.tipJars.get(id) || null;
  }

  getAllTipJars(): TipJarConfig[] {
    return Array.from(this.tipJars.values());
  }

  updateTipJar(id: string, updates: Partial<TipJarConfig>): TipJarConfig | null {
    const existing = this.tipJars.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    this.tipJars.set(id, updated);
    return updated;
  }

  tipJarExists(id: string): boolean {
    return this.tipJars.has(id);
  }
}

// Export singleton instance
export const tipJarStore = new InMemoryStore();
