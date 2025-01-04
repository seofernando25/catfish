import { effect } from "@preact/signals";
import type { ServerSocketInstance } from "./main";
import { PLAYER_RADIUS, PLAYER_SPEED } from "../../common/src/player";
import { Ticker } from "../../common/src/Ticker";
import { ChunkManager } from "./chunk";

import { genWorldHeightMapsFromImage } from "./gen";
import {
    WORLD_ZONE_DIM,
    CHUNK_SIZE,
    CHUNK_RANGE,
} from "@catfish/common/constants.js";

const heightMaps = await genWorldHeightMapsFromImage();
console.log("heightmap generated");
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

    async handleConnection(socket: ServerClientSocket) {
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
            tick: this.ticker.currentTick.value,
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
            x: (WORLD_ZONE_DIM * CHUNK_SIZE) / 2,
            y: (WORLD_ZONE_DIM * CHUNK_SIZE) / 2,
            // x: 0,
            // y: 0,
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

        const vertexDisplacementsRequest = () => {
            const fn = async (
                chunkX: number,
                chunkY: number,
                cb: (vertexDisplacements: number[][]) => void
            ) => {
                // Calculate the index for the current zone
                const currentZoneIdx = chunkY * WORLD_ZONE_DIM + chunkX;
                const heightMapZone = heightMaps[currentZoneIdx];

                const vertexDisplacements: number[][] = Array.from(
                    { length: CHUNK_SIZE * CHUNK_SIZE },
                    () => [0, 0, 0, 0]
                );

                // Helper function to fetch tile height with boundary checks
                const getTileHeight = (x: number, y: number): number => {
                    if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_SIZE) {
                        // Within the current chunk
                        return heightMapZone[y * CHUNK_SIZE + x];
                    } else {
                        // Outside the current chunk, fetch from adjacent chunks
                        let adjacentChunkX = chunkX;
                        let adjacentChunkY = chunkY;
                        let adjX = x;
                        let adjY = y;

                        // Adjust coordinates and determine adjacent chunk
                        if (x < 0) {
                            adjacentChunkX = chunkX - 1;
                            adjX = CHUNK_SIZE - 1;
                        } else if (x >= CHUNK_SIZE) {
                            adjacentChunkX = chunkX + 1;
                            adjX = 0;
                        }

                        if (y < 0) {
                            adjacentChunkY = chunkY - 1;
                            adjY = CHUNK_SIZE - 1;
                        } else if (y >= CHUNK_SIZE) {
                            adjacentChunkY = chunkY + 1;
                            adjY = 0;
                        }

                        // Fetch the adjacent chunk's height map
                        const adjacentZoneIdx =
                            adjacentChunkY * WORLD_ZONE_DIM + adjacentChunkX;

                        const outOfBounds =
                            adjacentChunkX < 0 ||
                            adjacentChunkY < 0 ||
                            adjacentChunkX >= WORLD_ZONE_DIM ||
                            adjacentChunkY >= WORLD_ZONE_DIM;

                        const adjacentZone = heightMaps[adjacentZoneIdx];

                        if (adjacentZone && !outOfBounds) {
                            const adjIdx = adjY * CHUNK_SIZE + adjX;
                            return adjacentZone[adjIdx];
                        } else {
                            return -99;
                        }
                    }
                };

                // Iterate over each vertex in the (CHUNK_SIZE +1) x (CHUNK_SIZE +1) grid
                for (let y = 0; y < CHUNK_SIZE; y++) {
                    for (let x = 0; x < CHUNK_SIZE; x++) {
                        const tileValue = getTileHeight(x, y);
                        const tileTopValue = getTileHeight(x, y - 1);
                        const tileBottomValue = getTileHeight(x, y + 1);
                        const tileLeftValue = getTileHeight(x - 1, y);

                        const tileRightValue = getTileHeight(x + 1, y);

                        const tileTopLeft = getTileHeight(x - 1, y - 1);
                        const tileTopRight = getTileHeight(x + 1, y - 1);
                        const tileBottomLeft = getTileHeight(x - 1, y + 1);
                        const tileBottomRight = getTileHeight(x + 1, y + 1);

                        const tlVertexValue =
                            (tileValue +
                                tileTopValue +
                                tileLeftValue +
                                tileTopLeft) /
                            4;
                        const trVertexValue =
                            (tileValue +
                                tileTopValue +
                                tileRightValue +
                                tileTopRight) /
                            4;
                        const blVertexValue =
                            (tileValue +
                                tileBottomValue +
                                tileLeftValue +
                                tileBottomLeft) /
                            4;
                        const brVertexValue =
                            (tileValue +
                                tileBottomValue +
                                tileRightValue +
                                tileBottomRight) /
                            4;

                        // Assign to the vertexDisplacements 2D array
                        const idx = y * CHUNK_SIZE + x;
                        if (vertexDisplacements[idx] === undefined) {
                            console.error("Undefined index at", y, x);
                            console.error(
                                "Size was",
                                vertexDisplacements.length
                            );
                            continue;
                        }
                        vertexDisplacements[idx][0] = tlVertexValue;
                        vertexDisplacements[idx][1] = trVertexValue;
                        vertexDisplacements[idx][2] = blVertexValue;
                        vertexDisplacements[idx][3] = brVertexValue;
                    }
                }

                const v = vertexDisplacements.map((v) => v[0]);

                cb(vertexDisplacements);
            };

            // Register the event listener
            socket.on("getVertexDisplacements", fn);

            return {
                dispose: () => {
                    socket.off("getVertexDisplacements", fn);
                },
            };
        };
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

                    // Calculate the current chunk coordinates (integers)
                    const currentChunkX = Math.floor(player.x / CHUNK_SIZE);
                    const currentChunkY = Math.floor(player.y / CHUNK_SIZE);

                    const chunkPromises: Promise<void>[] = [];

                    // Load new chunks within the range
                    for (let i = -CHUNK_RANGE; i <= CHUNK_RANGE; i++) {
                        for (let j = -CHUNK_RANGE; j <= CHUNK_RANGE; j++) {
                            const targetChunkX = currentChunkX + i;
                            const targetChunkY = currentChunkY + j;
                            const inBounds =
                                targetChunkX >= 0 &&
                                targetChunkY >= 0 &&
                                targetChunkX < WORLD_ZONE_DIM &&
                                targetChunkY < WORLD_ZONE_DIM;

                            if (!inBounds) {
                                continue;
                            }

                            const chunkKey = `${targetChunkX},${targetChunkY}`;

                            if (activeChunks.has(chunkKey)) {
                                continue; // Chunk already loaded
                            }

                            // If chunk between 0 and WORLD_ZONE_DIM use heightMaps
                            const zoneIdx =
                                targetChunkX * WORLD_ZONE_DIM + targetChunkY;
                            const m = heightMaps[zoneIdx]; // The CHUNK_SIZE * CHUNK_SIZE heightmap

                            if (m === undefined) {
                                console.error(
                                    "Undefined chunk at :",
                                    targetChunkX,
                                    targetChunkY
                                );
                                continue;
                            }

                            // 2d array full of zeroes
                            const chunkData = [];
                            for (let row = 0; row < CHUNK_SIZE; row++) {
                                const rowArray = new Array(CHUNK_SIZE).fill(0);
                                chunkData.push(rowArray);
                            }

                            socket.emit(
                                "load_chunk",
                                targetChunkX,
                                targetChunkY,
                                chunkData
                            );
                            activeChunks.add(chunkKey);
                            // else {
                            //     const chunkPromise = this.chunkMan
                            //         .getChunk(targetChunkX, targetChunkY)
                            //         .then((chunk) => {
                            //             const chunkData = chunk.to2DArray();
                            //             socket.emit(
                            //                 "load_chunk",
                            //                 targetChunkX,
                            //                 targetChunkY,
                            //                 chunkData
                            //             );
                            //         })
                            //         .catch((error) => {
                            //             console.error(
                            //                 `Failed to load chunk (${targetChunkX}, ${targetChunkY}):`,
                            //                 error
                            //             );
                            //         });

                            //     chunkPromises.push(chunkPromise);
                            // }
                        }
                    }

                    // Await all chunk loading promises
                    await Promise.all(chunkPromises);

                    // Unload chunks that are out of range
                    for (const chunkKey of activeChunks) {
                        const [xStr, yStr] = chunkKey.split(",");
                        const chunkX = parseInt(xStr, 10);
                        const chunkY = parseInt(yStr, 10);

                        const deltaX = Math.abs(chunkX - currentChunkX);
                        const deltaY = Math.abs(chunkY - currentChunkY);

                        if (deltaX > CHUNK_RANGE || deltaY > CHUNK_RANGE) {
                            socket.emit("unload_chunk", chunkX, chunkY);
                            activeChunks.delete(chunkKey);
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
                        // console.log("on water");
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
                            return false;
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
        const getHeightmapEv = vertexDisplacementsRequest();
        socket.data.onTick.push(chunkLoadEv.onTick);
        const moveEv = moveEvent();
        socket.data.onTick.push(moveEv.onTick);
        socket.data.dispose.push(getHeightmapEv.dispose);

        // this.addPlayerEvent(uuid, chunkLoadEv);
    }
}
