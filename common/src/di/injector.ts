import type { InjectToken, Provider } from "./types";

export class Injector {
    private providers = new Map<InjectToken, Provider<any>>();
    private instances = new Map<InjectToken, any>();

    provide<T>(provider: Provider<T>): void {
        if (provider.useValue) {
            this.instances.set(provider.provide, provider.useValue);
        } else {
            this.providers.set(provider.provide, provider);
        }
    }

    get<T>(token: InjectToken<T>): T | undefined {
        if (this.instances.has(token)) {
            return this.instances.get(token);
        }

        const provider = this.providers.get(token);

        if (!provider) {
            let s = "";
            if (token instanceof Symbol) {
                s = token.toString();
            } else {
                s = token.name;
            }
            return undefined;
        }

        const instance = new provider.useClass();
        this.instances.set(token, instance);

        return instance;
    }
}
