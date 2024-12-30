import { Injector } from "./injector";
import { InjectToken, Provider } from "./types";

type InjectionContextCallback<T> = () => T;

let globalInjector = new Injector();

const injectorStack: Injector[] = [];

export function runInInjectionContext<T>(
    injector: Injector,
    callback: InjectionContextCallback<T>
): T {
    injectorStack.push(injector);
    const previousInjector = globalInjector;
    globalInjector = injector;
    try {
        return callback();
    } finally {
        globalInjector = previousInjector;
        injectorStack.pop();
    }
}

export function inject<T>(token: InjectToken<T>): T {
    return globalInjector.get(token);
}

export function provide<T>(provider: Provider<T>): void {
    globalInjector.provide(provider);
}
