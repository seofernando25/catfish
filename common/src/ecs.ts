import type { PrimitiveObject } from "./data/objectData";

export function entityQuery<T>(
    inWorldLifecycle: (cb: (e: {}) => () => void) => () => void,
    discriminator: (entity: unknown) => entity is T
) {
    const entities = new Set<T>();
    const lifeCycleHandlers = new Set<(e: T) => () => void>();

    // Initialize entities
    const dispose = inWorldLifecycle((entity) => {
        const isEntity = discriminator(entity);
        let onRemoves: (() => void)[] = [];
        if (isEntity) {
            entities.add(entity);
            lifeCycleHandlers.forEach((cb) => {
                const onRemove = cb(entity);
                onRemoves.push(onRemove);
            });
        }

        return () => {
            if (isEntity) {
                entities.delete(entity);
                onRemoves.forEach((cb) => cb());
            }
        };
    });

    return {
        entities: entities,
        dispose,
        entityLifeCycle: (cb: (entity: T) => () => void) => {
            lifeCycleHandlers.add(cb);
            return () => {
                lifeCycleHandlers.delete(cb);
            };
        },
    };
}

export function newScheduler() {
    const systems = new Set<() => void>();

    return {
        addSystem: (system: () => void) => {
            systems.add(system);
            return () => {
                systems.delete(system);
            };
        },
        tick: () => {
            systems.forEach((system) => {
                system();
            });
        },
    };
}

export function newECSWorld() {
    const entities = new Map<number, PrimitiveObject>();
    const removeHandlers = new Map<number, (() => void)[]>();
    const mutated = new Set<number>();
    const systems = new Set<() => void>();

    const obj = {
        _lifeCycleHandlers: new Set<(e: PrimitiveObject) => () => void>(),
        onWorldLifecycle: (cb: (e: PrimitiveObject) => () => void) => {
            obj._lifeCycleHandlers.add(cb);
            return () => {
                obj._lifeCycleHandlers.delete(cb);
            };
        },
        iter: () => {
            return entities.values();
        },
        markAsMutated: (entity: PrimitiveObject) => {
            mutated.add(entity.id);
        },
        getMutated: () => {
            return mutated;
        },
        getEntity: (id: number) => {
            return entities.get(id);
        },
        patchEntity: (patch: PrimitiveObject) => {
            const existing = entities.get(patch.id);
            if (!existing) {
                obj.addEntity(patch);
                return;
            }
            Object.assign(existing, patch);
            obj.markAsMutated(existing);
        },
        addEntity: (entity: PrimitiveObject) => {
            let onRemoves: (() => void)[] = [];
            entities.set(entity.id, entity);
            obj._lifeCycleHandlers.forEach((cb) => {
                const onRemove = cb(entity);
                onRemoves.push(onRemove);
            });
            removeHandlers.set(entity.id, onRemoves);

            return () => {
                entities.delete(entity.id);

                // Run remove handlers
                const onRemoves = removeHandlers.get(entity.id);
                if (onRemoves) {
                    onRemoves.forEach((cb) => cb());
                }
                removeHandlers.delete(entity.id);
            };
        },
        removeEntity: (id: number) => {
            const exists = entities.has(id);
            if (!exists) {
                return;
            }
            entities.delete(id);

            // Run remove handlers
            const onRemoves = removeHandlers.get(id);
            if (onRemoves) {
                onRemoves.forEach((cb) => cb());
            }
            removeHandlers.delete(id);
        },

        addSystem: <T>(
            filter: ReturnType<typeof entityQuery<T>>,
            process: (entity: Iterable<T>) => void
        ) => {
            const fn = () => {
                process(filter.entities.values());
            };

            systems.add(fn);
            return () => {
                systems.delete(fn);
            };
        },
        tick: () => {
            mutated.clear();
            systems.forEach((system) => {
                system();
            });
        },
    };
    return obj;
}
