import type { ServerSocketInstance } from ".";
import { CHUNK_SIZE, ChunkManager } from "./chunk";
import type { ServerSocketClient } from "./events";

import { GameTimer } from "./GameTimer";

export class WorldMan {
    chunkMan = new ChunkManager();
    timer = new GameTimer(20, this.onTick.bind(this));

    worldInstanceId = crypto.randomUUID();

    handleConBind = this.handleConnection.bind(this);

    constructor(public io: ServerSocketInstance) {
        this.timer.start();

        io.on("connection", this.handleConBind);
    }

    dispose() {
        this.timer.stop();
        this.io.off("connection", this.handleConBind);
        for (const sock of this.io.sockets.sockets.values()) {
            sock.data.dispose?.forEach((cb) => cb());
            sock.data.input_buffer = [];
            sock.data.onTick = [];
            sock.disconnect();
        }
    }

    async onTick() {
        const tick = this.timer.tick;

        // Every 5 ticks
        if (tick % 5 === 0) {
            this.io.emit("tick_sync", tick);
        }
        const socks = await this.io.fetchSockets();
        for (const sock of socks) {
            const data = sock.data;
            if (!data || !sock.data?.onTick) {
                continue;
            }
            for (const cb of sock.data?.onTick) {
                cb();
            }
        }
    }

    async handleConnection(socket: ServerSocketClient) {
        let clientOk = false;
        console.log("New connection from", socket.id);

        await new Promise<void>((resolve) => {
            let cleanUp = () => {
                socket.off("clientOk", cOkHandler);
                socket.off("disconnect", disconnectHandler);
                clearTimeout(okTimeout);
            };

            let cOkHandler = () => {
                clientOk = true;
                resolve();
                cleanUp();
            };

            let disconnectHandler = () => {
                resolve();
                cleanUp();
            };

            const okTimeout = setTimeout(() => {
                if (!clientOk) {
                    resolve();
                    cleanUp();
                    socket.disconnect();
                    console.log("Client", socket.id, "did not respond in time");
                }
            }, 5000);

            socket.on("clientOk", cOkHandler);
            socket.on("disconnect", disconnectHandler);
        });
        if (socket.disconnected) {
            console.log("Failed to connect to client", socket.id);
            return;
        }
        console.log("Client", socket.id, "is ready");

        // Remove player on disconnect
        socket.on("disconnect", () => {
            console.log("Player disconnected", socket.id);
            this.io.emit("player_disconnected", socket.id);

            socket.data.dispose?.forEach((cb) => cb());
        });

        // Let other clients know about this player
        socket.data.playerInfo = {
            playerId: socket.id,
            username: "player",
            x: 0,
            y: 0,
        };

        socket.data.input_buffer = [];
        socket.data.onTick = [];
        socket.data.dispose = [];

        // Let client know about all players
        for (const socks of await this.io.fetchSockets()) {
            if (socks.id === socket.id) {
                continue;
            }
            const info = socks.data.playerInfo;
            if (!info) {
                continue;
            }
            socket.emit("player_info_announce", info);
        }

        this.io.emit("player_info_announce", socket.data.playerInfo);

        // Start player chunk loading loop
        const chunkLoadEvent = () => {
            const activeChunks = new Set<string>();

            return {
                onTick: async () => {
                    // Get the player's position
                    const player = socket.data.playerInfo;

                    if (!player) {
                        return;
                    }

                    // Calculate the chunk coordinates
                    const chunkX = Math.floor(player.x / CHUNK_SIZE);
                    const chunkY = Math.floor(player.y / CHUNK_SIZE);

                    const chunkRange = 5;
                    const chunkPromises: Promise<void>[] = [];
                    for (let i = -chunkRange; i < chunkRange; i++) {
                        for (let j = -chunkRange; j < chunkRange; j++) {
                            const alreadyLoaded = activeChunks.has(
                                `${chunkX + i},${chunkY + j}`
                            );

                            if (alreadyLoaded) {
                                continue;
                            }

                            const chunk = this.chunkMan
                                .getChunk(chunkX + i, chunkY + j)
                                .then(async (chunk) => {
                                    socket.emit(
                                        "load_chunk",
                                        chunkX + i,
                                        chunkY + j,
                                        chunk.to2DArray()
                                    );
                                });
                            chunkPromises.push(chunk);
                            activeChunks.add(`${chunkX + i},${chunkY + j}`);
                        }
                    }
                    await Promise.all(chunkPromises);

                    // Remove chunks that are out of range
                    for (const [key, _] of activeChunks.entries()) {
                        const [x, y] = key.split(",");
                        const chunkX = parseInt(x);
                        const chunkY = parseInt(y);
                        const [playerChunkX, playerChunkY] = [
                            Math.floor(player.x / CHUNK_SIZE),
                            Math.floor(player.y / CHUNK_SIZE),
                        ];
                        if (
                            Math.abs(chunkX - playerChunkX) > chunkRange ||
                            Math.abs(chunkY - playerChunkY) > chunkRange
                        ) {
                            socket.emit("unload_chunk", chunkX, chunkY);
                            activeChunks.delete(key);
                        }
                    }
                },
            };
        };

        const moveEvent = () => {
            const input_buffer = socket.data.input_buffer ?? [];
            socket.data.input_buffer = input_buffer;
            socket.on("moveRequest", (x: number, y: number) => {
                input_buffer.push({ cmd: "move", x, y });
            });

            const player = socket.data.playerInfo!;
            const playerSpeed = 0.1;
            return {
                onTick: async () => {
                    if (input_buffer.length === 0) {
                        return;
                    }

                    const cmd = input_buffer.shift()!;

                    if (cmd.cmd === "move") {
                        let moveX = cmd.x;
                        let moveY = cmd.y;

                        const length = Math.sqrt(moveX * moveX + moveY * moveY);

                        if (length > 10) {
                            console.log(
                                "Player",
                                player.playerId,
                                "is cheating"
                            );
                        }

                        if (length > 0) {
                            moveX /= length;
                            moveY /= length;
                        }
                        // endregion

                        // region Move X
                        const predictedX =
                            player.x + moveX * playerSpeed * this.timer.delta;
                        const tile = await this.chunkMan.getTile(
                            predictedX,
                            player.y
                        );
                        if (tile === 0) {
                            moveX = 0;
                        }
                        player.x += moveX * playerSpeed * this.timer.delta;
                        // endregion

                        // region Move Y

                        const predictedY =
                            player.y + moveY * playerSpeed * this.timer.delta;
                        const tile2 = await this.chunkMan?.getTile(
                            player.x,
                            predictedY
                        );
                        if (tile2 === 0) {
                            moveY = 0;
                        }

                        player.y += moveY * playerSpeed * this.timer.delta;
                        // endregion

                        // region Water reconsiliation fallback
                        const tile3 = await this.chunkMan?.getTile(
                            player.x,
                            player.y
                        );
                        if (tile3 === 0) {
                            player.y -= 50 * this.timer.delta;
                        }
                    }

                    // Emit the new position to all clients
                    this.io.emit("player_info_announce", player);
                },
            };
        };

        const chunkLoadEv = chunkLoadEvent();
        socket.data.onTick.push(chunkLoadEv.onTick);
        const moveEv = moveEvent();
        socket.data.onTick.push(moveEv.onTick);
        // this.addPlayerEvent(uuid, chunkLoadEv);
    }

    // CLIENT_PLAYER_MOVE: async (event) => {
    //     const { x, y } = event;
    //     const player = scene.players.get(id);
    //     if (!player) {
    //         return;
    //     }

    //     const playerSpeed = 5;

    //     let moveX = x;
    //     let moveY = y;

    //     const length = Math.sqrt(moveX * moveX + moveY * moveY);
    //     if (length > 0) {
    //         moveX /= length;
    //         moveY /= length;
    //     }
    //     // endregion

    //     if (!this.inputQueue.has(player.playerId)) {
    //         this.inputQueue.set(player.playerId, []);
    //     }
    //     this.inputQueue.get(player.playerId)?.push([x, y]);

    // region Move X
    // const predictedX = player.x + moveX * playerSpeed * deltaTime;
    // const tile = this.tileMan?.getTile(predictedX, player.y);
    // if (tile === 0) {
    //     moveX = 0;
    // }
    // this.gp.player.x += moveX * playerSpeed * deltaTime;
    // // endregion

    // // region Move Y

    // const predictedY =
    //     this.gp.player.y + moveY * playerSpeed * deltaTime;
    // const tile2 = this.tileMan?.getTile(
    //     this.gp.player.x,
    //     predictedY
    // );
    // if (tile2 === 0) {
    //     moveY = 0;
    // }

    // this.gp.player.y += moveY * playerSpeed * deltaTime;
    // // endregion

    // // region Water reconsiliation fallback
    // const tile3 = this.tileMan?.getTile(
    //     this.gp.player.x,
    //     this.gp.player.y
    // );
    // if (tile3 === 0) {
    //     this.gp.player.y -= 50 * playerSpeed * deltaTime;
    // }
    // endregion

    // Try move the player

    //     if (player) {
    //         player.x = x;
    //         player.y = y;
    //     }

    //     for (const [ip, cb] of scene.playerCb.entries()) {
    //         this.rpc(ip, "SERVER_PLAYER_MOVE", {
    //             playerId: id,
    //             x,
    //             y,
    //         });
    //     }
    // },

    // CLIENT_PLAYER_MOVE(event) {
    //     const { x, y } = event.data;
    //     const player = scene.playerVars.get(id);
    //     if (player) {
    //         player.x = x;
    //         player.y = y;
    //     }
    //     const moveEvent: ServerEvent = {
    //         type: "SERVER_PLAYER_MOVE",
    //         data: {
    //             playerId: id,
    //             x,
    //             y,
    //         },
    //     };
    //     for (const [ip, cb] of scene.playerCb.entries()) {
    //         cb(moveEvent);
    //     }
    // },
    // };
}
