export type ClientActions = {};

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
    action_use: () => void;
    action_drop: () => void;
};
