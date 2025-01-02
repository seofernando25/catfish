import { CHUNK_SIZE } from "./constants";

export const tileXYToZone = (x: number, y: number) => {
    return {
        zoneX: Math.floor(x / CHUNK_SIZE),
        zoneY: Math.floor(y / CHUNK_SIZE),
    };
};

export const zoneToTileXY = (zoneX: number, zoneY: number) => {
    return {
        tileX: zoneX * CHUNK_SIZE,
        tileY: zoneY * CHUNK_SIZE,
    };
};

export const tileXYtoLocalTileXY = (x: number, y: number) => {
    return {
        localTileX: x % CHUNK_SIZE,
        localTileY: y % CHUNK_SIZE,
    };
};
