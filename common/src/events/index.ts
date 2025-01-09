import type { heapStats } from "bun:jsc";
import type { Server, Socket } from "socket.io";
import type { TickerInfo } from "../Ticker";

export type ClientToServerEvents = {
    /**
     * Sent in the initial screen to log in
     */
    login: (
        username: string,
        cb: (arg: { success: boolean; message: string }) => void
    ) => void;
    /**
     * Sent periodically to check for connection health
     */
    ping: (timestamp: number, cb: (arg: { timestamp: number }) => void) => void;
    /**
     * Sent after login and player asks to spawn.
     * The server will trigger the doneCb after sending all world data.
     */
    spawn: (doneCb: () => void) => void;
    action_move: (dir: { x: number; y: number }) => void;
    action_equip: (itemId: number) => void;
    action_use: (use: boolean) => void;
    action_drop: () => void;
};

export type ServerToClientEvents = {
    add_entity: (
        compressedSerializedEntity: ArrayBuffer,
        ack: () => void
    ) => void;
    remove_entity: (id: number, ack: () => void) => void;
    update_entity: (
        compressedSerializedEntity: ArrayBuffer,
        ack: () => void
    ) => void;
    tick_sync: (info: TickerInfo) => void;
    heap_stats: (stats: ReturnType<typeof heapStats>) => void;
};

export type ServerSocketInstance = Server<
    ClientToServerEvents,
    ServerToClientEvents
>;

export type ServerClientSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents
>;
