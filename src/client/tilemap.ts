import { Sprite, type Container } from "pixi.js";
import { spritesheetObj } from "../main";
import { CHUNK_SIZE } from "../server/chunk";
import {
    DESERT_IDX,
    DIRT_IDX,
    GRASS_IDX,
    ICE_IDX,
    LAKE_IDX,
} from "../server/sampler";

export class TileMapManager {
    tileMapInfo = new Map<string, number[][]>();
    tileMaps = new Map<string, Sprite>();

    constructor(public container: Container) {}

    getChunk(x: number, y: number) {
        const chunkKey = `${x},${y}`;
        return this.tileMaps.get(chunkKey);
    }

    getTile(x: number, y: number) {
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkY = Math.floor(y / CHUNK_SIZE);
        const chunkKey = `${chunkX},${chunkY}`;
        const chunkData = this.tileMapInfo.get(chunkKey);
        if (!chunkData) {
            return null;
        }
        x = ((Math.floor(x) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        y = ((Math.floor(y) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        return chunkData[x][y];
    }

    addChunk(chunkX: number, chunkY: number, chunkData: number[][]) {
        console.log("Adding chunk", chunkX, chunkY);
        const chunkKey = `${chunkX},${chunkY}`;
        if (this.tileMaps.has(chunkKey)) {
            return;
        }

        const OFFSET_X = chunkX * CHUNK_SIZE;
        const OFFSET_Y = chunkY * CHUNK_SIZE;
        const dim = chunkData.length;

        for (let x = 0; x < dim; x++) {
            for (let y = 0; y < dim; y++) {
                const tile = chunkData[x][y];
                // const grayness = tile / 255;
                let sprite: Sprite | null = null;
                if (tile === LAKE_IDX) {
                    sprite = new Sprite(spritesheetObj.textures.water1);
                } else if (tile === DIRT_IDX) {
                    sprite = new Sprite(spritesheetObj.textures.dirt1);
                } else if (tile === DESERT_IDX) {
                    // TODO
                } else if (tile === GRASS_IDX) {
                    sprite = new Sprite(spritesheetObj.textures.grass1);
                } else if (tile === ICE_IDX) {
                    // graphics.fillStyle(iceColor);
                }
                if (sprite) {
                    sprite.x = x + OFFSET_X;
                    sprite.y = y + OFFSET_Y;
                    sprite.setSize(1.1, 1.1);
                    sprite.anchor.set(0.05, 0.05);

                    this.container.addChild(sprite);
                }
            }
        }
    }

    removeChunk(chunkX: number, chunkY: number) {
        const chunkKey = `${chunkX},${chunkY}`;
        const sprite = this.tileMaps.get(chunkKey);
        if (sprite) {
            sprite.destroy();
            this.tileMaps.delete(chunkKey);
            this.tileMapInfo.delete(chunkKey);
        }
    }
}
