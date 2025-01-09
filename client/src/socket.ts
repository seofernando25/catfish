import { io, Socket } from "socket.io-client";

import stats from "./stats";
import type {
    ServerToClientEvents,
    ClientToServerEvents,
} from "@catfish/common/events/index.js";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    document.location.origin,
    {
        path: "/ws",
        timeout: 5000,
    }
);

socket.on("connect", () => {
    stats.ConnState = "Connected";
    setTimeout(() => {
        console.assert(
            socket.id !== undefined,
            "Socket ID is undefined on connect"
        );
        stats.Id = socket.id ?? "undefined";
    }, 50);
});

socket.on("disconnect", () => {
    stats.ConnState = "Disconnected";
});

socket.on("connect_error", () => {
    console.error("Connection error");
    stats.ConnState = "Connection Error";
});

export async function waitUntilConnected() {
    console.log("Waiting for connection");

    return new Promise<void>((resolve) => {
        if (socket.connected) {
            resolve();
            console.log("Connected to server");
        } else {
            socket.on("connect", () => {
                resolve();
                console.log("Connected to server");
            });
        }
    });
}

export type ClientSocket = typeof socket;
export const ClientSocketSymbol = Symbol("ClientSocket");
