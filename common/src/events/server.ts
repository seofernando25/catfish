import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents } from "./client";
import type { TickerInfo } from "../Ticker";
import type { heapStats } from "bun:jsc";
import type { PrimitiveObject } from "../data/objectData";

export type ServerToClientEvents = {
    add_entity: (data: PrimitiveObject, ack: () => void) => void;
    remove_entity: (id: number, ack: () => void) => void;
    update_entity: (data: PrimitiveObject, ack: () => void) => void;
    tick_sync: (info: TickerInfo) => void;
    heap_stats: (stats: ReturnType<typeof heapStats>) => void;
};

export type InterServerEvents = {};
export type SocketData = {};

export type ServerSocketInstance = Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

export type ServerClientSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;
