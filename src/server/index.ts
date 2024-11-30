import { type ServerWebSocket } from "bun";
import type { WSContext } from "hono/ws";
import { Server } from "socket.io";
import type {
    ClientToServerEvents,
    InterServerEvents,
    ServerToClientEvents,
    SocketData,
} from "./events";
import { WorldMan } from "./world";

type PlayerInfo = {
    x: number;
    y: number;
    username: string;
    id: string;
    ws: WSContext<ServerWebSocket>;
};

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
});
export type ServerSocketInstance = typeof io;

const worldMan = new WorldMan(io);

console.log("Listening on port 3000");
io.listen(3000);

// export type AppType = typeof app;

// export default {
//     fetch: app.fetch,
//     websocket,
// };
