import { LAKE_IDX, DIRT_IDX, GRASS_IDX, SAND_IDX } from "../procedural/sampler";

export function getTileSpriteName(tile: number): string {
    // if (tile === LAKE_IDX) return "water1";
    if (tile === LAKE_IDX) return "sand1";
    if (tile === DIRT_IDX) return "sand1";
    if (tile === GRASS_IDX) return "grass1";
    if (tile === SAND_IDX) return "sand1";
    // fallback
    console.warn("Unknown tile type:", tile);
    return "uv";
}
