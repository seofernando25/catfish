export type PlayerJoinEvent = {
    playerId: string;
};

export type PlayerLeaveEvent = {
    playerId: string;
};

export type PlayerMoveEvent = {
    playerId: string;
    x: number;
    y: number;
};

export type ChunkLoadEvent = {
    x: number;
    y: number;
    csv: string;
};

export type PlayerInfo = {
    playerId: string;
    username: string;
    x: number;
    y: number;
};

export type PlayerInfoAnnounceEvent = PlayerInfo;

export type PlayerUsernameChangeEvent = {
    playerId: string;
    username: string;
};

export type ServerEventMap = {
    PLAYER_JOIN: PlayerJoinEvent;
    PLAYER_LEAVE: PlayerLeaveEvent;
    PLAYER_SELF_ID_ASSIGN: PlayerJoinEvent;
    PLAYER_USERNAME_CHANGE: PlayerUsernameChangeEvent;
    PLAYER_MOVE: PlayerMoveEvent;
    CHUNK_LOAD: ChunkLoadEvent;
    PLAYER_INFO_ANNOUNCE: PlayerInfoAnnounceEvent;
};

export type ClientEventMap = {
    CLIENT_PLAYER_MOVE: Omit<PlayerMoveEvent, "playerId">;
    CLIENT_PLAYER_USERNAME_CHANGE: Omit<PlayerUsernameChangeEvent, "playerId">;
    CLIENT_PLAYER_LIST_REQUEST: {};
    CLIENT_CHUNK_LOAD_REQUEST: {
        x: number;
        y: number;
    };
};

export type ServerEventHandlerMap = Partial<{
    [K in keyof ServerEventMap]: (event: {
        type: K;
        data: ServerEventMap[K];
    }) => void;
}>;

export type ClientEventHandlerMap = Partial<{
    [K in keyof ClientEventMap]: (event: {
        type: K;
        data: ClientEventMap[K];
    }) => void;
}>;

export type ServerEvent = {
    [K in keyof ServerEventMap]: {
        type: K;
        data: ServerEventMap[K];
    };
}[keyof ServerEventMap];

export type ClientEvent = {
    [K in keyof ClientEventMap]: {
        type: K;
        data: ClientEventMap[K];
    };
}[keyof ClientEventMap];
