import { catBlueprint } from "@catfish/common/data/cat.ts";
import {
    mixinPlayerSocketControlled,
    PlayerControlledSchema,
    positionMixin,
    renderSpriteMixin,
} from "@catfish/common/data/entity.ts";
import {
    entityQuery,
    newECSWorld,
    type ECSWorld,
} from "@catfish/common/ecs.ts";
import { Server } from "socket.io";

import { CHUNK_SIZE, WORLD_ZONE_DIM } from "@catfish/common/constants.ts";
import { newFishSpot } from "@catfish/common/data/fishing.ts";
import { newPrimitiveObject } from "@catfish/common/data/objectData.ts";

import { movementSystem } from "@catfish/common/systems/movementSystem.ts";
import { Ticker } from "@catfish/common/Ticker.ts";
import { effect } from "@preact/signals";
import { is } from "valibot";
import {
    emitAddEntityWithRetry,
    emitRemoveEntityWithRetry,
    emitUpdateEntityWithRetry,
    type EmitAddEntityResult,
} from "./emits";
import { addChunkDisplacements } from "./system/chunkSystem";
import { mutateDesireDirSystem } from "./system/mutateDesireDirSystem";
import type {
    ServerSocketInstance,
    ServerClientSocket,
} from "@catfish/common/events/index.js";

export function baseServer() {
    const io = new Server({
        // 10MB max buffer size
        maxHttpBufferSize: 1e8,
        cors: {
            origin: "*",
        },
        path: "/ws",
    }) as ServerSocketInstance;

    const socketLifecycleCallbacks = new Set<
        (socket: ServerClientSocket) => () => void
    >();
    const obj = {
        io,
        socketLifeCycle: (cb: (socket: ServerClientSocket) => () => void) => {
            socketLifecycleCallbacks.add(cb);
            return () => {
                socketLifecycleCallbacks.delete(cb);
            };
        },
    };

    io.on("connection", (socket) => {
        const toRemove: (() => void)[] = [];
        socketLifecycleCallbacks.forEach((cb) => {
            const remove = cb(socket);
            toRemove.push(remove);
        });

        socket.on("disconnect", () => {
            toRemove.forEach((cb) => {
                cb();
            });
        });
    });
    return obj;
}

export async function newGameServer() {
    const server = baseServer();
    await createServerWorld(server);
    return server;
}

export async function addBaseSystems(ecs: ECSWorld) {
    const cleanUpMovementSystem = movementSystem(ecs);
    const cleanUpChunks = await addChunkDisplacements(ecs);
    return () => {
        cleanUpChunks();
        cleanUpMovementSystem();
    };
}

export async function createServerWorld(server: ReturnType<typeof baseServer>) {
    let ticker = new Ticker();

    let socket_entity_map = new Map<ServerClientSocket, number>();
    let loggedIn = new Set<number>();
    const ecs = newECSWorld();
    const cleanupSystems = await addBaseSystems(ecs);

    const player_entity_query = entityQuery(ecs.onWorldLifecycle, (entity) => {
        return is(PlayerControlledSchema, entity);
    });

    const fishingSpot = newFishSpot(10);
    fishingSpot.dim = CHUNK_SIZE * WORLD_ZONE_DIM;
    fishingSpot.x = 0;
    fishingSpot.y = 0;
    fishingSpot.z = 0;
    ecs.addEntity(fishingSpot);

    effect(() => {
        ticker.currentTick.value;
        ecs.tick();
        const mutated = ecs.getMutated();
        for (let entity_id of mutated.values()) {
            const entity = ecs.getEntity(entity_id)!;
            for (let [sock, id] of socket_entity_map) {
                if (loggedIn.has(id)) {
                    emitUpdateEntityWithRetry({
                        socket: sock,
                        entity,
                        maxRetries: 5,
                        timeout: 500,
                    });
                }
            }
        }
    });

    const socket_lifecycle = server.socketLifeCycle((sock) => {
        let player = mixinPlayerSocketControlled(catBlueprint());
        player.y = 0.5;
        socket_entity_map.set(sock, player.id);
        let last_ping = Date.now();
        let onDisconnect: (() => void)[] = [];

        // region Handle login
        sock.on("login", (username, cb) => {
            console.log("### Login request", username);
            // Look up player entity to see if username is taken
            for (let entity of player_entity_query.entities) {
                if (entity.name === username) {
                    cb({ success: false, message: "Username taken" });
                    return;
                }
            }
            loggedIn.add(player.id);

            // Initialize player entity
            player.name = username;

            // 233.20
            // 79.78
            player.x = 255.62;
            player.y = 0.5;
            player.z = 128.12;

            const playerEntityCleanup = ecs.addEntity(player);
            onDisconnect.push(playerEntityCleanup);

            let requestedSpawn = false;
            sock.on("spawn", async (doneSpawnCb) => {
                console.log("### Spawn request");
                if (requestedSpawn) {
                    console.error("User", username, "requested spawn twice");
                    return doneSpawnCb();
                }

                requestedSpawn = true;

                console.log("### Sending all entities");

                const addPromises: Promise<EmitAddEntityResult>[] = [];
                for (let entity of ecs.iter()) {
                    const addResult = emitAddEntityWithRetry({
                        socket: sock,
                        entity,
                        maxRetries: 5,
                        timeout: 2000,
                    });
                    addPromises.push(addResult);
                }

                const resolved = await Promise.all(addPromises);
                const allAcked = resolved.every((res) => res.success);
                if (allAcked) {
                    doneSpawnCb();
                }

                // region Handle ECS sync
                const lifecycleCleanup = ecs.onWorldLifecycle((entity) => {
                    // TODO: Handle if we miss an ack

                    emitAddEntityWithRetry({
                        socket: sock,
                        entity,
                        maxRetries: 5,
                        timeout: 200,
                    });

                    return () => {
                        emitRemoveEntityWithRetry({
                            socket: sock,
                            id: entity.id,
                            maxRetries: 5,
                            timeout: 200,
                        });
                    };
                });
                onDisconnect.push(lifecycleCleanup);

                const cleanUpDesireDirSystem = mutateDesireDirSystem(
                    ecs,
                    player,
                    sock
                );
                onDisconnect.push(cleanUpDesireDirSystem);

                // region Handle use
                sock.on("action_use", (shouldUse) => {
                    if (shouldUse) {
                        const entity = renderSpriteMixin(
                            positionMixin(newPrimitiveObject())
                        );
                        entity.spriteSrc = "bobber";
                        entity.x = player.x;
                        entity.y = player.y;
                        entity.z = player.z;
                        entity.spriteScale = 0.25;
                        ecs.addEntity(entity);
                    }
                });

                // endregion
            });

            return cb({ success: true, message: "Logged in" });
        });
        // endregion

        // region Handle ping
        sock.on("ping", (timestamp, cb) => {
            const serverTime = Date.now();
            last_ping = serverTime;
            cb({ timestamp: serverTime });
        });
        // endregion

        return () => {
            // Remove player entity
            onDisconnect.forEach((cb) => cb());
            sock.removeAllListeners();
            sock.disconnect();
        };
    });

    return {
        ecs,
        dispose: () => {
            socket_lifecycle();
            cleanupSystems();
        },
    };
}

const gameServer = await newGameServer();
gameServer.io.listen(3000);
