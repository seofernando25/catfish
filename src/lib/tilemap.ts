import { CHUNK_SIZE } from "../server/chunk";

export class TileMapManager {
    tileMaps = new Map<string, Phaser.GameObjects.Graphics>();

    constructor(public scene: Phaser.Scene) {}

    getChunk(x: number, y: number) {
        const chunkKey = `${x},${y}`;
        return this.tileMaps.get(chunkKey);
    }

    addChunk(chunkX: number, chunkY: number, chunkData: number[][]) {
        const chunkKey = `${chunkX},${chunkY}`;
        if (this.tileMaps.has(chunkKey)) {
            return;
        }

        const graphics = this.scene.add.graphics();
        this.tileMaps.set(chunkKey, graphics);

        const dirtColor = 0x8b4513;
        const sandColor = 0xffff00;
        const lakeColor = 0x0000ff;
        const dim = chunkData.length;
        for (let x = 0; x < dim; x++) {
            for (let y = 0; y < dim; y++) {
                const tile = chunkData[x][y];
                if (tile === 0) {
                    graphics.fillStyle(lakeColor);
                } else if (tile === 1) {
                    graphics.fillStyle(dirtColor);
                } else if (tile === 2) {
                    graphics.fillStyle(sandColor);
                }
                graphics.fillRect(x, y, 1, 1);
            }
        }
        graphics.x = chunkX * CHUNK_SIZE;
        graphics.y = chunkY * CHUNK_SIZE;

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
