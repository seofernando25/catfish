import type { ServerWebSocket } from "bun";
import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { cors } from "hono/cors";
import type { WSContext } from "hono/ws";
import { WorldMan } from "./chunk";
import { sample } from "./world";
import type {
    ServerEvent,
    PlayerJoinEvent,
    ClientEvent,
    ServerEventHandlerMap,
    ClientEventHandlerMap,
} from "./state";

type PlayerInfo = {
    x: number;
    y: number;
    username: string;
    id: string;
    ws: WSContext<ServerWebSocket>;
};

const activeClients = new Map<string, PlayerInfo>();

const worldMan = new WorldMan();
const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

const app = new Hono()
    .use(cors())
    .get("/", (c) => {
        return c.text("Hello Hono!");
    })
    //
    .get("/chunk/:x/:y", async (c) => {
        const offsetX = c.req.param("x");
        const offsetY = c.req.param("y");

        const offsetXNum = Number(offsetX);
        const offsetYNum = Number(offsetY);

        const csv = (await worldMan.getChunk(offsetXNum, offsetYNum)).toCSV();

        return c.text(csv);
    })

    .get(
        "/ws",
        upgradeWebSocket((c) => {
            console.log("Upgrading to websocket");
            let id = crypto.randomUUID();

            return {
                async onMessage(event, ws) {
                    let message = JSON.parse(
                        event.data.toString()
                    ) as ClientEvent;

                    const handlers: ClientEventHandlerMap = {
                        CLIENT_PLAYER_LIST_REQUEST: (event) => {
                            for (const [
                                ip,
                                playerInfo,
                            ] of activeClients.entries()) {
                                console.log("Sending player info", playerInfo);
                                const playerInfoEvent: ServerEvent = {
                                    type: "PLAYER_INFO_ANNOUNCE",
                                    data: {
                                        playerId: playerInfo.id,
                                        username: playerInfo.username,
                                        x: playerInfo.x,
                                        y: playerInfo.y,
                                    },
                                };
                                ws.send(JSON.stringify(playerInfoEvent));
                            }
                        },
                        CLIENT_CHUNK_LOAD_REQUEST: async (event) => {
                            const { x, y } = event.data;
                            const chunk = await worldMan.getChunk(x, y);
                            const chunkLoadEvent: ServerEvent = {
                                type: "CHUNK_LOAD",
                                data: {
                                    x,
                                    y,
                                    csv: chunk.toCSV(),
                                },
                            };
                            ws.send(JSON.stringify(chunkLoadEvent));
                        },
                        CLIENT_PLAYER_USERNAME_CHANGE: (event) => {
                            const { username } = event.data;
                            const player = activeClients.get(id);
                            if (player) {
                                player.username = username;
                            }
                            const usernameChangeEvent: ServerEvent = {
                                type: "PLAYER_USERNAME_CHANGE",
                                data: {
                                    playerId: id,
                                    username,
                                },
                            };
                            const serialized =
                                JSON.stringify(usernameChangeEvent);
                            for (const [
                                ip,
                                playerInfo,
                            ] of activeClients.entries()) {
                                playerInfo.ws.send(serialized);
                            }
                        },
                        CLIENT_PLAYER_MOVE(event) {
                            const { x, y } = event.data;
                            const player = activeClients.get(id);
                            if (player) {
                                player.x = x;
                                player.y = y;
                            }
                            const moveEvent: ServerEvent = {
                                type: "PLAYER_MOVE",
                                data: {
                                    playerId: id,
                                    x,
                                    y,
                                },
                            };
                            const serialized = JSON.stringify(moveEvent);
                            for (const [
                                ip,
                                playerInfo,
                            ] of activeClients.entries()) {
                                playerInfo.ws.send(serialized);
                            }
                        },
                    };

                    const handler = handlers[message.type];
                    if (handler) {
                        handler(message as any);
                    } else {
                        const maybeType = message?.type ?? "Unknown";
                        console.log("Unhandled message", maybeType);
                    }

                    // if (message.type === "player") {
                    //     message = {
                    //         type: "player",
                    //         id,
                    //         username: players.get(id)?.username || "unknown",
                    //         x: message.x,
                    //         y: message.y,
                    //     };
                    //     const player = players.get(message.id);
                    //     if (player) {
                    //         player.x = message.x;
                    //         player.y = message.y;
                    //     }
                    //     for (const [ip, client] of activeClients.entries()) {
                    //         if (ip !== id) {
                    //             client.send(JSON.stringify(message));
                    //         }
                    //     }
                    // }
                    // // Chunk request { type: 'chunk', x: 0, y: 0 }
                    // if (message.type === "chunk") {
                    //     const { x, y } = message;
                    //     const chunk = await worldMan.getChunk(x, y);
                    //     ws.send(
                    //         JSON.stringify({
                    //             type: "chunk",
                    //             x,
                    //             y,
                    //             data: chunk.toCSV(),
                    //         })
                    //     );
                    // }

                    // if (message.type === "username_announce") {
                    //     const username = message.username;
                    //     const player = players.get(id);
                    //     if (player) {
                    //         player.username = username.substring(0, 16);
                    //     }
                    // }
                },
                onClose: (e, ws) => {
                    activeClients.delete(id);

                    console.log("Connection closed");

                    const leaveEvent: ServerEvent = {
                        type: "PLAYER_LEAVE",
                        data: {
                            playerId: id,
                        },
                    };

                    const serialized = JSON.stringify(leaveEvent);

                    for (const [ip, playerInfo] of activeClients.entries()) {
                        playerInfo.ws.send(serialized);
                    }
                },
                onOpen: (e, ws) => {
                    console.log("Connection opened ", id);

                    const joinEvent: ServerEvent = {
                        type: "PLAYER_JOIN",
                        data: {
                            playerId: id,
                        },
                    };

                    const serialized = JSON.stringify(joinEvent);

                    for (const [ip, playerInfo] of activeClients.entries()) {
                        playerInfo.ws.send(serialized);
                    }

                    // Assign player its id

                    const selfIdAssignEvent: ServerEvent = {
                        type: "PLAYER_SELF_ID_ASSIGN",
                        data: {
                            playerId: id,
                        },
                    };

                    ws.send(JSON.stringify(selfIdAssignEvent));

                    activeClients.set(id, {
                        id,
                        username: "unknown",
                        ws,
                        x: 950,
                        y: 500,
                    });

                    console.log(
                        `There are ${activeClients.size} active clients`
                    );
                },
            };
        })
    );

export type AppType = typeof app;

export default {
    fetch: app.fetch,
    websocket,
};
