import {
    BufferGeometry,
    DataTexture,
    Mesh,
    MeshToonMaterial,
    NearestFilter,
    RGBAFormat,
    Scene,
} from "three";
// import { generateChunkTexture } from "../common/chunk/texturing";
import { getTileSpriteName } from "../common/chunk/util";
import { getUVOffsets } from "../common/rendering/atlas";
import { CHUNK_SIZE } from "../server/chunk";
import { sampleContinentalness } from "../server/procedural/continentalness";
import {
    computeUniqueGridVertexNormals,
    createUniqueGridGeometry,
    modifyTileHeight,
    modifyTileUV,
} from "./chunkGeometry";
import { spriteSheetTexture } from "./rendering/textures";
import { provide } from "../common/di";

export const TERRAIN_HEIGHT_SCALE = 50;
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

const fiveTone = nToneGradientTexture(15);

export const TileMapManagerSymbol = Symbol("TileMapManager");

export class TileMapManager {
    tileMapInfo = new Map<string, number[][]>();
    tileMaps = new Map<string, Mesh>();

    constructor(public scene: Scene) {}

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

    addChunk(
        chunkX: number,
        chunkY: number,
        chunkData: number[][],
        heightData: number[][]
    ) {
        const chunkKey = `${chunkX},${chunkY}`;
        if (this.tileMaps.has(chunkKey)) {
            return;
        }

        const OFFSET_X = chunkX * CHUNK_SIZE;
        const OFFSET_Y = chunkY * CHUNK_SIZE;
        const dim = chunkData.length;

        const planeGeometry = createUniqueGridGeometry(dim, dim);

        this.updateChunkHeight(planeGeometry, chunkX, chunkY, heightData);

        for (let x = 0; x < dim; x++) {
            for (let y = 0; y < dim; y++) {
                const tileIndex = chunkData[x][y];
                const tileName = getTileSpriteName(tileIndex);

                const uvInfo = getUVOffsets(tileName as any);

                modifyTileUV(planeGeometry, x, y, uvInfo, dim);
            }
        }
        planeGeometry.attributes.position.needsUpdate = true;

        const solidColorMaterial = new MeshToonMaterial({
            map: spriteSheetTexture,
            gradientMap: fiveTone,
            blending: 0,
        });

        const chunkMesh = new Mesh(planeGeometry, solidColorMaterial);

        chunkMesh.position.set(
            OFFSET_X + CHUNK_SIZE / 2,
            0,
            OFFSET_Y + CHUNK_SIZE / 2
        );

        this.tileMaps.set(chunkKey, chunkMesh);
        this.tileMapInfo.set(chunkKey, chunkData);
        this.scene.add(chunkMesh);
    }

    private readonly paddedDim = CHUNK_SIZE + 2;
    private paddedHeightData = new Float64Array(
        this.paddedDim * this.paddedDim
    );
    async updateChunkHeight(
        geo: BufferGeometry,
        chunkX: number,
        chunkY: number,
        heightData: number[][]
    ) {
        const dim = CHUNK_SIZE;

        const OFFSET_X = chunkX * CHUNK_SIZE;
        const OFFSET_Y = chunkY * CHUNK_SIZE;

        const getIndex = (x: number, y: number) => x * this.paddedDim + y;

        this.paddedHeightData.fill(0);
        for (let x = 0; x < this.paddedDim; x++) {
            for (let y = 0; y < this.paddedDim; y++) {
                const globalX = x - 1 + OFFSET_X;
                const globalY = y - 1 + OFFSET_Y;

                if (x > 0 && x <= dim && y > 0 && y <= dim) {
                    this.paddedHeightData[getIndex(x, y)] =
                        heightData[x - 1][y - 1];
                } else {
                    this.paddedHeightData[getIndex(x, y)] =
                        sampleContinentalness(globalX, globalY);
                }
            }
        }
        // Iterate over actual chunk size
        for (let x = 1; x <= dim; x++) {
            for (let y = 1; y <= dim; y++) {
                // Precomputed heights using 1D indexing
                const tileHeight = this.paddedHeightData[getIndex(x, y)];
                const leftTileHeight =
                    this.paddedHeightData[getIndex(x - 1, y)];
                const rightTileHeight =
                    this.paddedHeightData[getIndex(x + 1, y)];
                const upTileHeight = this.paddedHeightData[getIndex(x, y - 1)];
                const downTileHeight =
                    this.paddedHeightData[getIndex(x, y + 1)];
                const topLeftTileHeight =
                    this.paddedHeightData[getIndex(x - 1, y - 1)];
                const topRightTileHeight =
                    this.paddedHeightData[getIndex(x + 1, y - 1)];
                const bottomLeftTileHeight =
                    this.paddedHeightData[getIndex(x - 1, y + 1)];
                const bottomRightTileHeight =
                    this.paddedHeightData[getIndex(x + 1, y + 1)];

                const topPlusLeftHeight = tileHeight + leftTileHeight;
                // Average self and neighbors
                const tlValue =
                    (topPlusLeftHeight + upTileHeight + topLeftTileHeight) *
                    0.25;
                const trValue =
                    (tileHeight +
                        rightTileHeight +
                        upTileHeight +
                        topRightTileHeight) *
                    0.25;
                const blValue =
                    (topPlusLeftHeight +
                        downTileHeight +
                        bottomLeftTileHeight) *
                    0.25;
                const brValue =
                    (tileHeight +
                        rightTileHeight +
                        downTileHeight +
                        bottomRightTileHeight) *
                    0.25;

                modifyTileHeight(
                    geo,
                    x - 1,
                    y - 1,
                    tlValue * TERRAIN_HEIGHT_SCALE - TERRAIN_HEIGHT_SCALE / 2,
                    trValue * TERRAIN_HEIGHT_SCALE - TERRAIN_HEIGHT_SCALE / 2,
                    blValue * TERRAIN_HEIGHT_SCALE - TERRAIN_HEIGHT_SCALE / 2,
                    brValue * TERRAIN_HEIGHT_SCALE - TERRAIN_HEIGHT_SCALE / 2,
                    dim
                );
            }
        }
        computeUniqueGridVertexNormals(geo);
    }

    removeChunk(chunkX: number, chunkY: number) {
        const chunkKey = `${chunkX},${chunkY}`;
        const instancedMesh = this.tileMaps.get(chunkKey);
        if (instancedMesh) {
            this.scene.remove(instancedMesh);
            this.tileMaps.delete(chunkKey);
            this.tileMapInfo.delete(chunkKey);
        }
    }
}
