import { Server, Socket } from "socket.io";

import { catBlueprint } from "@catfish/common/data/cat.ts";
import {
    DesiredDirectionSchema,
    mixinPlayerSocketControlled,
    PlayerControlledSchema,
    PositionSchema,
} from "@catfish/common/data/entity.ts";
import { entityQuery, newECSWorld } from "@catfish/common/ecs.ts";

import { PrimitiveObjectSchema } from "@catfish/common/data/objectData.ts";
import type { ClientToServerEvents } from "@catfish/common/events/client.ts";
import type {
    InterServerEvents,
    ServerClientSocket,
    ServerSocketInstance,
    ServerToClientEvents,
    SocketData,
} from "@catfish/common/events/server.ts";
import { Ticker } from "@catfish/common/Ticker.ts";
import { effect } from "@preact/signals";
import { is } from "valibot";

export function baseServer() {
    const io = new Server<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
    >({
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

export function newGameServer() {
    const server = baseServer();
    createServerWorld(server);
    return server;
}

export function createWorld() {
    const ecs = newECSWorld();

    // region Queries
    const player_entity_query = entityQuery(ecs.onWorldLifecycle, (entity) => {
        return is(PlayerControlledSchema, entity);
    });
    const movement_query = entityQuery(ecs.onWorldLifecycle, (entity) => {
        return (
            is(PositionSchema, entity) &&
            is(DesiredDirectionSchema, entity) &&
            is(PrimitiveObjectSchema, entity)
        );
    });
    // endregion

    // region Systems
    const movement_system = ecs.addSystem(movement_query, (entities) => {
        for (let entity of entities) {
            const dirX = entity.desireDir.x;
            const dirY = entity.desireDir.y;

            entity.x += dirX;
            entity.z += dirY;
            if (dirX !== 0 || dirY !== 0) {
                ecs.markAsMutated(entity);
            }
        }
    });
    // endregion

    return {
        ecs,
        queries: {
            player_entity_query,
            movement_query,
        },
        systems: {
            movement_system,
        },
    };
}

export function createServerWorld(server: ReturnType<typeof baseServer>) {
    let ticker = new Ticker();
    ticker.tickrate.value = 60;

    let socket_entity_map = new Map<Socket, number>();
    let loggedIn = new Set<number>();
    let { ecs, queries } = createWorld();

    effect(() => {
        ticker.currentTick.value;
        ecs.tick();
        const mutated = ecs.getMutated();
        for (let entity_id of mutated.values()) {
            const entity = ecs.getEntity(entity_id);
            for (let [sock, id] of socket_entity_map) {
                if (loggedIn.has(id)) {
                    console.log("Telling", sock.id, "to update entity", entity);
                    sock.emit("update_entity", entity);
                }
            }
        }
    });

    const socket_lifecycle = server.socketLifeCycle((sock) => {
        let player = mixinPlayerSocketControlled(catBlueprint());
        socket_entity_map.set(sock, player.id);
        let last_ping = Date.now();
        let onDisconnect: (() => void)[] = [];

        // region Handle login
        sock.on("login", (username, cb) => {
            console.log("### Login request", username);
            // Look up player entity to see if username is taken
            for (let entity of queries.player_entity_query.entities) {
                if (entity.name === username) {
                    cb({ success: false, message: "Username taken" });
                    return;
                }
            }
            loggedIn.add(player.id);

            // Initialize player entity
            player.name = username;

            const playerEntityCleanup = ecs.addEntity(player);
            onDisconnect.push(playerEntityCleanup);

            // Initial add of all entities
            for (let entity of ecs.iter()) {
                sock.emit("add_entity", entity);
            }

            // region Handle ECS sync
            const lifecycleCleanup = ecs.onWorldLifecycle((entity) => {
                console.log("### Adding entity", entity);
                sock.emit("add_entity", entity);

                return () => {
                    console.log(
                        "Telling",
                        sock.id,
                        "to remove entity",
                        entity.id
                    );
                    sock.emit("remove_entity", entity.id);
                };
            });
            onDisconnect.push(lifecycleCleanup);
            // endregion

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

        // region Handle Move
        sock.on("action_move", (dir: { x: number; y: number }) => {
            player.desireDir = dir;
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
        },
    };
}

const gameServer = newGameServer();
gameServer.io.listen(3000);
