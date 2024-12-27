import { Server } from "socket.io";
import type {
    ClientToServerEvents,
    InterServerEvents,
    ServerToClientEvents,
    SocketData,
} from "./events";
import { WorldMan } from "./world";

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
