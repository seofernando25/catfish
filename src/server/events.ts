import type { Socket } from "socket.io";
import type { PlayerInfo } from "../common/player";

export type MoveCmd = {
    cmd: "move";
    x: number;
    y: number;
};

export type InputCmd = MoveCmd;

export type ClientToServerEvents = {
    clientOk: () => void;
    moveRequest: (x: number, y: number) => void;
};

export type ServerToClientEvents = {
    load_chunk: (chunkX: number, chunkY: number, chunkData: number[][]) => void;
    unload_chunk: (chunkX: number, chunkY: number) => void;
    player_info_announce: (playerInfo: PlayerInfo) => void;
    player_disconnected: (playerId: string) => void;
    tick_sync: (num: number) => void;
};

export type InterServerEvents = {
    hello: (name: string) => void;
};

export type SocketData = {
    playerInfo?: PlayerInfo;
    onTick?: (() => void)[];
    dispose?: (() => void)[];
    input_buffer?: InputCmd[];
};

export type ServerSocketClient = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;
