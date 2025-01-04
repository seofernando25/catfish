export type ClientActions = {};

export type ClientToServerEvents = {
    login: (
        username: string,
        cb: (arg: { success: boolean; message: string }) => void
    ) => void;
    ping: (timestamp: number, cb: (arg: { timestamp: number }) => void) => void;
    action_move: (dir: { x: number; y: number }) => void;
    action_equip: (itemId: number) => void;
    action_use: () => void;
    action_drop: () => void;
};
