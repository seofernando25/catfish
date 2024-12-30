import { ArglessConstructor, InjectToken, Provider } from "./types";

export class Injector {
    private providers = new WeakMap<InjectToken, Provider<any>>();
    private instances = new WeakMap<InjectToken, any>();

    provide<T>(provider: Provider<T>): void {
        if (provider.useValue) {
            this.instances.set(provider.provide, provider.useValue);
        } else {
            this.providers.set(provider.provide, provider);
        }
    }

    get<T>(token: InjectToken<T>): T {
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
            throw new Error(`No provider found for ${s}`);
        }

        const instance = new provider.useClass();
        this.instances.set(token, instance);

        return instance;
    }
}
