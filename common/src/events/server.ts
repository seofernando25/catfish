import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents } from "./client";
import type { TickerInfo } from "../Ticker";
import type { heapStats } from "bun:jsc";
import type { PrimitiveObject } from "../data/objectData";

export type ServerToClientEvents = {
    add_entity: (data: PrimitiveObject) => void;
    remove_entity: (id: number) => void;
    update_entity: (data: PrimitiveObject) => void;

    load_chunk: (chunkX: number, chunkY: number, chunkData: number[][]) => void;

    unload_chunk: (chunkX: number, chunkY: number) => void;
    // player_info_announce: (playerInfo: PlayerInfo) => void;
    // player_disconnected: (playerId: string) => void;
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
