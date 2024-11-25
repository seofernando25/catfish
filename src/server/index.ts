import type { ServerWebSocket } from "bun";
import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { cors } from "hono/cors";
import type { WSContext } from "hono/ws";
import { WorldMan } from "./chunk";
import { sample } from "./world";

const players = new Map<string, { x: number; y: number }>();
const activeClients = new Map<string, WSContext<ServerWebSocket>>();
const worldMan = new WorldMan();
const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

const app = new Hono()
    .use(cors())
    //
    .get("/", (c) => {
        return c.text("Hello Hono!");
    })
    //

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
                    let message = JSON.parse(event.data.toString());

                    if (message.type === "player") {
                        message = {
                            type: "player",
                            id,
                            x: message.x,
                            y: message.y,
                        };
                        const player = players.get(message.id);
                        if (player) {
                            player.x = message.x;
                            player.y = message.y;
                        }
                        for (const [ip, client] of activeClients.entries()) {
                            client.send(JSON.stringify(message));
                        }
                    }
                    // Chunk request { type: 'chunk', x: 0, y: 0 }
                    if (message.type === "chunk") {
                        const { x, y } = message;
                        const chunk = await worldMan.getChunk(x, y);
                        ws.send(
                            JSON.stringify({
                                type: "chunk",
                                x,
                                y,
                                data: chunk.toCSV(),
                            })
                        );
                    }
                },
                onClose: (e, ws) => {
                    activeClients.delete(id);
                    players.delete(id);

                    console.log("Connection closed");

                    for (const [ip, client] of activeClients.entries()) {
                        client.send(
                            JSON.stringify({ type: "player", id, x: 0, y: 0 })
                        );
                    }
                },
                onOpen: (e, ws) => {
                    console.log("Connection opened", id);

                    activeClients.set(id, ws);
                    console.log(
                        `There are ${activeClients.size} active clients`
                    );
                    players.set(id, { x: 0, y: 0 });
                    // Send all player positions
                    // TODO: sync player position cause might lose some messages
                    setTimeout(() => {
                        for (const [id, { x, y }] of players.entries()) {
                            ws.send(
                                JSON.stringify({ type: "player", id, x, y })
                            );
                        }
                    }, 100);
                },
            };
        })
    );

export type AppType = typeof app;

export default {
    fetch: app.fetch,
    websocket,
};
