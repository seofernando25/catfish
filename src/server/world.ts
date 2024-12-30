import { effect } from "@preact/signals";
import type { ServerSocketInstance } from ".";
import { PLAYER_RADIUS, PLAYER_SPEED } from "../common/player";
import { Ticker } from "../common/ticker/Ticker";
import { CHUNK_SIZE, ChunkManager } from "./chunk";
import type { ServerSocketClient } from "./events";

export class WorldMan {
    chunkMan = new ChunkManager();
    ticker = new Ticker();

    worldInstanceId = crypto.randomUUID();

    handleConBind = this.handleConnection.bind(this);

    constructor(public io: ServerSocketInstance) {
        let count = 0;

        this.ticker.tickrate.value = 60;

        effect(() => {
            this.ticker.currentTick.value;
            count++;
            (async () => {
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
            })();
        });

        // this.ticker.addListener(async (ticker) => {
        // });
        // this.ticker.start();

        io.on("connection", this.handleConBind);
    }

    dispose() {
        this.io.off("connection", this.handleConBind);
        for (const sock of this.io.sockets.sockets.values()) {
            sock.data.dispose?.forEach((cb) => cb());
            sock.data.input_buffer = [];
            sock.data.onTick = [];
            sock.disconnect();
        }
    }

    async handleConnection(socket: ServerSocketClient) {
        let clientOk = false;
        console.log("New connection from", socket.id);

        // Wait for clientOk event
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

        // Send tick info
        socket.emit("tick_sync", {
            server_tick: this.ticker.currentTick.value,
            start_t: this.ticker.startTime.value,
            tickrate: this.ticker.tickrate.value,
        });

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

                    // Calculate the player's current chunk coordinates
                    const playerChunkX = Math.floor(player.x / CHUNK_SIZE);
                    const playerChunkY = Math.floor(player.y / CHUNK_SIZE);

                    const chunkRange = 5;

                    // STEP 1: Gather all chunk coords within the range into an array
                    const chunkCoords: [number, number][] = [];
                    for (let i = -chunkRange; i <= chunkRange; i++) {
                        for (let j = -chunkRange; j <= chunkRange; j++) {
                            chunkCoords.push([
                                playerChunkX + i,
                                playerChunkY + j,
                            ]);
                        }
                    }

                    // STEP 2: Sort the chunk coords by distance from the player's chunk
                    chunkCoords.sort(([cxA, cyA], [cxB, cyB]) => {
                        const distA =
                            (cxA - playerChunkX) ** 2 +
                            (cyA - playerChunkY) ** 2;
                        const distB =
                            (cxB - playerChunkX) ** 2 +
                            (cyB - playerChunkY) ** 2;
                        return distA - distB;
                    });

                    // STEP 3: Iterate in the sorted order, loading nearest chunks first
                    const chunkPromises: Promise<void>[] = [];
                    for (const [cx, cy] of chunkCoords) {
                        // Check if we already loaded this chunk
                        const key = `${cx},${cy}`;
                        if (activeChunks.has(key)) {
                            continue;
                        }

                        // Retrieve the chunk and send it to the client
                        const chunkPromise = this.chunkMan
                            .getChunk(cx, cy)
                            .then((chunk) => {
                                const chunkData = chunk.to2DArray();
                                const chunkHeightData = chunk.toHeight2DArray();
                                socket.emit(
                                    "load_chunk",
                                    cx,
                                    cy,
                                    chunkData,
                                    chunkHeightData
                                );
                            });

                        chunkPromises.push(chunkPromise);
                        activeChunks.add(key);
                    }

                    await Promise.all(chunkPromises);

                    // STEP 4: Unload chunks that are now out of range
                    for (const key of activeChunks) {
                        const [x, y] = key.split(",");
                        const chunkX = parseInt(x, 10);
                        const chunkY = parseInt(y, 10);

                        // If outside the chunkRange, unload
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
            let lastTick = 0;
            return {
                onTick: async () => {
                    const bufSize = 2;
                    // strip input_buffer to last 1
                    input_buffer.splice(0, input_buffer.length - bufSize);

                    const cmd = input_buffer.shift();

                    // region Water reconsiliation fallback
                    const tile3 = await this.chunkMan?.getTile(
                        player.x,
                        player.y
                    );

                    if (tile3 === 0 || tile3 === undefined) {
                        console.log("on water");
                        // let onWater = true;
                        // onWater =
                        //     (await this.chunkMan?.getTile(
                        //         player.x,
                        //         player.y
                        //     )) !== 0;
                        // player.y -= this.timer.delta * 0.2;
                        // console.log("off water");
                    }

                    if (cmd && cmd.cmd === "move") {
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

                        const isCollision = async (x, y) => {
                            const offsets = [
                                [PLAYER_RADIUS, 0],
                                [-PLAYER_RADIUS, 0],
                                [0, PLAYER_RADIUS],
                                [0, -PLAYER_RADIUS],
                            ];
                            for (const [dx, dy] of offsets) {
                                const tile = await this.chunkMan?.getTile(
                                    x + dx,
                                    y + dy
                                );
                                if (tile === 0) {
                                    return true;
                                }
                            }
                            return false;
                        };

                        // region Move X
                        const predictedX =
                            player.x +
                            moveX * PLAYER_SPEED * this.ticker.deltaTime.value;
                        if (await isCollision(predictedX, player.y)) {
                            console.log("hit wall x");
                            moveX = 0; // Stop X movement if collision
                        }
                        player.x +=
                            moveX * PLAYER_SPEED * this.ticker.deltaTime.value;

                        // endregion

                        // region Move Y

                        // const predictedY =
                        //     player.y +
                        //     moveY * PLAYER_SPEED * this.ticker.deltaTime.value;
                        // const tile2 = await this.chunkMan?.getTile(
                        //     player.x,
                        //     predictedY
                        // );
                        // if (tile2 === 0) {
                        //     moveY = 0;
                        //     console.log("hit wall y");
                        // }

                        // player.y +=
                        //     moveY * PLAYER_SPEED * this.ticker.deltaTime.value;

                        const predictedY =
                            player.y +
                            moveY * PLAYER_SPEED * this.ticker.deltaTime.value;

                        if (await isCollision(player.x, predictedY)) {
                            console.log("hit wall y");
                            moveY = 0; // Stop Y movement if collision
                        }

                        player.y +=
                            moveY * PLAYER_SPEED * this.ticker.deltaTime.value;

                        // endregion
                        // console.log("Player position", player.x, player.y);
                    }

                    // Emit the new position to all clients
                    this.io.emit("player_info_announce", player);

                    // console.log(player);
                },
            };
        };

        const chunkLoadEv = chunkLoadEvent();
        socket.data.onTick.push(chunkLoadEv.onTick);
        const moveEv = moveEvent();
        socket.data.onTick.push(moveEv.onTick);

        let playerPing = 0;
        socket.on("ping", (num, cb) => {
            const now = Date.now();
            const delta = now - num;
            if (delta < 0) {
                console.log("Client", socket.id, "sent ping in the future"); // Could it happen in different timezones?
            } else {
                playerPing = delta;
            }

            cb(now);
        });

        // this.addPlayerEvent(uuid, chunkLoadEv);
    }
}
