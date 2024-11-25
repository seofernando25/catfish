import { CHUNK_SIZE } from "../server/chunk";

export class TileMapManager {
    tileMapInfo = new Map<string, number[][]>();
    tileMaps = new Map<string, Phaser.GameObjects.Graphics>();

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
        this.tileMaps.set(chunkKey, graphics);

        const iceColor = 0x9ad7db;
        const grassColor = 0x6c9849;
        const dirtColor = 0x987549;
        const sandColor = 0xf3f5a7;
        const lakeColor = 0x62aed8;
        // 0x74cc8c
        const dim = chunkData.length;
        for (let x = 0; x < dim; x++) {
            for (let y = 0; y < dim; y++) {
                const tile = chunkData[x][y];
                const grayness = tile / 255;

                // graphics.fillStyle(0xffffff, grayness);

                if (tile === 0) {
                    graphics.fillStyle(lakeColor);
                } else if (tile === 1) {
                    graphics.fillStyle(dirtColor);
                } else if (tile === 2) {
                    graphics.fillStyle(sandColor);
                } else if (tile === 3) {
                    graphics.fillStyle(grassColor);
                } else if (tile === 4) {
                    graphics.fillStyle(iceColor);
                }
                graphics.fillRect(x, y, 1, 1);
            }
        }
        graphics.x = chunkX * CHUNK_SIZE;
        graphics.y = chunkY * CHUNK_SIZE;

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
    }
}
