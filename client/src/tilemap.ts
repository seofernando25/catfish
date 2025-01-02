import {
    BufferGeometry,
    DataTexture,
    Mesh,
    MeshToonMaterial,
    NearestFilter,
    RGBAFormat,
    Scene,
} from "three";
import { getTileSpriteName } from "@catfish/common/chunk/util";
import { getUVOffsets } from "@catfish/common/rendering/atlas";
import { CHUNK_SIZE } from "@catfish/common/constants";

import {
    computeUniqueGridVertexNormals,
    createUniqueGridGeometry,
    modifyTileHeight,
    modifyTileUV,
} from "./chunkGeometry";
import { spriteSheetTexture } from "./rendering/textures";
import { inject } from "@catfish/common/di/index";

export const TERRAIN_HEIGHT_SCALE = 2;
// returns a threejs texture from black to white in n tones
const nToneGradientTexture = (n: number) => {
    // Create w x h (n x 1) texture
    const width = n; // Width of the texture
    const height = 1; // Single row
    const data = new Uint8Array(width * height * 4); // r, g, b, a

    for (let i = 0; i < width; i++) {
        const v = i / (width - 1); // Normalize value to range [0, 1]
        data[i * 4] = v * 255; // Red channel
        data[i * 4 + 1] = v * 255; // Green channel
        data[i * 4 + 2] = v * 255; // Blue channel
        data[i * 4 + 3] = 255; // Alpha channel (fully opaque)
    }

    // Create a DataTexture using the data
    const texture = new DataTexture(data, width, height, RGBAFormat);
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.needsUpdate = true; // Mark texture as needing update

    return texture;
};

const fiveTone = nToneGradientTexture(8);

export const TileMapManagerSymbol = Symbol("TileMapManager");

const solidColorMaterial = new MeshToonMaterial({
    map: spriteSheetTexture,
    gradientMap: fiveTone,
    blending: 0,
});

export class TileMapManager {
    vertexDisplacementsMap = new Map<string, number[][]>();
    tileMapInfo = new Map<string, number[][]>();
    tileMaps = new Map<string, Mesh>();
    loadedCount = 0;
    chunkPlaneGeometry = createUniqueGridGeometry(
        CHUNK_SIZE,
        CHUNK_SIZE
    ).translate(CHUNK_SIZE / 2, 0, CHUNK_SIZE / 2);

    scene = inject(Scene);

    constructor() {}

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
        this.loadedCount++;
        const chunkKey = `${chunkX},${chunkY}`;
        if (this.tileMaps.has(chunkKey)) {
            return;
        }

        const OFFSET_X = chunkX * CHUNK_SIZE;
        const OFFSET_Y = chunkY * CHUNK_SIZE;
        const dim = chunkData.length;
        const planeGeometry = this.chunkPlaneGeometry.clone();

        for (let x = 0; x < dim; x++) {
            for (let y = 0; y < dim; y++) {
                const tileIndex = chunkData[x][y];
                const tileName = getTileSpriteName(tileIndex);

                const uvInfo = getUVOffsets(tileName as any);

                modifyTileUV(planeGeometry, x, y, uvInfo, dim);
            }
        }
        planeGeometry.attributes["position"].needsUpdate = true;

        const chunkMesh = new Mesh(planeGeometry, solidColorMaterial);

        chunkMesh.position.set(OFFSET_X, 0, OFFSET_Y);

        this.tileMaps.set(chunkKey, chunkMesh);
        this.tileMapInfo.set(chunkKey, chunkData);
        this.scene.add(chunkMesh);
    }

    async updateChunkHeight(geo: BufferGeometry, heightData: number[][]) {
        // Iterate over vertices and set their heights

        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let y = 0; y < CHUNK_SIZE; y++) {
                const displacementData = heightData[y * CHUNK_SIZE + x];
                const tl = displacementData[0];
                const tr = displacementData[1];
                const bl = displacementData[2];
                const br = displacementData[3];

                modifyTileHeight(geo, x, y, tl, tr, bl, br, CHUNK_SIZE);
            }
        }

        this.vertexDisplacementsMap.set(
            geo.uuid,
            heightData.map((row) => [...row])
        );
        computeUniqueGridVertexNormals(geo);
    }

    getHeightMapForChunk(chunkX: number, chunkY: number) {
        const chunkKey = `${chunkX},${chunkY}`;
        const mesh = this.tileMaps.get(chunkKey);
        const geoId = mesh?.geometry?.uuid;
        return this.vertexDisplacementsMap.get(geoId) as number[][] | undefined;
    }

    removeChunk(chunkX: number, chunkY: number) {
        const chunkKey = `${chunkX},${chunkY}`;
        const instancedMesh = this.tileMaps.get(chunkKey);
        if (instancedMesh) {
            this.loadedCount--;
            this.scene.remove(instancedMesh);
            this.tileMaps.delete(chunkKey);
            this.tileMapInfo.delete(chunkKey);
        }
    }
}
