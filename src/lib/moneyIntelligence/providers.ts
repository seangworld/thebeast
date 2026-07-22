import type { ConnectedAccountProvider } from "./types";

export class ConnectedAccountProviderRegistry {
  private readonly providers = new Map<string, ConnectedAccountProvider>();

  register(provider: ConnectedAccountProvider) {
    if (!provider.id.trim()) throw new Error("Connected account provider id is required.");
    if (this.providers.has(provider.id)) throw new Error(`Connected account provider ${provider.id} is already registered.`);
    this.providers.set(provider.id, provider);
    return provider;
  }

  get(providerId: string) {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Connected account provider ${providerId} is not registered.`);
    return provider;
  }

  list() {
    return Array.from(this.providers.values());
  }
}
