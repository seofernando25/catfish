import { io, Socket } from "socket.io-client";
import type {
    ServerToClientEvents,
    ClientToServerEvents,
} from "../server/events";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    document.location.origin,
    {
        path: "/ws",
        timeout: 5000,
    }
);
export type ClientSocket = typeof socket;
