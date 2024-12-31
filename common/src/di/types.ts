// A constructor that takes no arguments and returns an instance of T
export type ArglessConstructor<T = any> = new () => T;

export type InjectToken<T = any> = ArglessConstructor<T> | Symbol;

// Provider interface to define how to provide a dependency
export interface Provider<T> {
    provide: InjectToken<T>;
    useClass?: ArglessConstructor<T>;
    useValue?: T;
}
