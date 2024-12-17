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
    tileMaps = new Map<string, Phaser.GameObjects.Image>();

    constructor(public scene: Phaser.Scene) {}

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
        const chunkKey = `${chunkX},${chunkY}`;
        if (this.tileMaps.has(chunkKey)) {
            return;
        }

        const graphics = this.scene.add.graphics();
        const OFFSET_X = chunkX * CHUNK_SIZE;
        const OFFSET_Y = chunkY * CHUNK_SIZE;
        graphics.x = OFFSET_X;
        graphics.y = OFFSET_Y;

        const tileResolution = 16;
        const renderText = this.scene.add.renderTexture(
            OFFSET_X,
            OFFSET_Y,
            CHUNK_SIZE * tileResolution,
            CHUNK_SIZE * tileResolution
        );

        const iceColor = 0x9ad7db;
        // 0x74cc8c
        const dim = chunkData.length;
        renderText.beginDraw();
        let waterSprite = this.scene.add.image(10, 5555, "waterTileset");
        waterSprite.setVisible(false);
        renderText.batchDraw(waterSprite, tileResolution, tileResolution);
        renderText.batchDraw(
            waterSprite,
            tileResolution * 2,
            tileResolution * 2
        );
        renderText.batchDraw(
            waterSprite,
            tileResolution * 3,
            tileResolution * 3
        );

        for (let x = 0; x < dim; x++) {
            for (let y = 0; y < dim; y++) {
                const tile = chunkData[x][y];
                const grayness = tile / 255;

                if (tile === LAKE_IDX) {
                    renderText.batchDraw(
                        waterSprite,
                        tileResolution * x,
                        tileResolution * y
                    );
                    // renderText.batchDraw(waterSprite, 0, 0);
                    // renderText.batchDraw(waterSprite, 17, 0);
                    // lakeImg.destroy();
                    // graphics.fillStyle(lakeColor);
                } else if (tile === DIRT_IDX) {
                    // dirtTileset
                    let dirtImg = this.scene.add.image(
                        graphics.x + x,
                        graphics.y + y,
                        "dirtTileset"
                    );
                    dirtImg.setDisplaySize(1, 1);
                    dirtImg.setOrigin(0, 0);
                    dirtImg.setDepth(1);
                } else if (tile === DESERT_IDX) {
                    let sandImg = this.scene.add.image(
                        graphics.x + x,
                        graphics.y + y,
                        "sandTileset"
                    );
                    sandImg.setDisplaySize(1, 1);
                    sandImg.setOrigin(0, 0);
                    sandImg.setDepth(1);
                } else if (tile === GRASS_IDX) {
                    let grassImg = this.scene.add.image(
                        graphics.x + x,
                        graphics.y + y,
                        "grassTileset"
                    );
                    grassImg.setDisplaySize(1, 1);
                    grassImg.setOrigin(0, 0);
                    grassImg.setDepth(1);
                } else if (tile === ICE_IDX) {
                    graphics.fillStyle(iceColor);
                }
                graphics.fillRect(x, y, 1, 1);
            }
        }
        renderText.endDraw();
        renderText.setDisplaySize(CHUNK_SIZE, CHUNK_SIZE);

        this.tileMapInfo.set(chunkKey, chunkData);
        // Raster graphics to texture

        const tex = graphics.generateTexture(
            `chunk-${chunkKey}`,
            chunkData.length,
            chunkData.length
        );
        graphics.destroy();
        const image = this.scene.add.image(
            chunkX * CHUNK_SIZE,
            chunkY * CHUNK_SIZE,
            `chunk-${chunkKey}`
        );
        image.setOrigin(0, 0);
        this.tileMaps.set(chunkKey, image);
    }

    removeChunk(chunkX: number, chunkY: number) {
        const chunkKey = `${chunkX},${chunkY}`;
        const graphics = this.tileMaps.get(chunkKey);
        if (graphics) {
            graphics.destroy();
            this.tileMaps.delete(chunkKey);
            this.tileMapInfo.delete(chunkKey);
        }
    }
}
