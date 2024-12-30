export type PlayerInfo = {
    playerId: string;
    username: string;
    x: number;
    y: number;
};

type PhantomType<T> = {
    __type: T;
} & T;
export const PlayerInfoSymbol = Symbol("PlayerInfo");

export const PLAYER_SPEED = 15;
export const PLAYER_RADIUS = 0.25;
