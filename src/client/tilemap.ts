import {
    AmbientLight,
    BoxGeometry,
    DataTexture,
    DirectionalLight,
    DirectionalLightHelper,
    HemisphereLight,
    HemisphereLightHelper,
    Mesh,
    MeshStandardMaterial,
    MeshToonMaterial,
    NearestFilter,
    PlaneGeometry,
    RGBAFormat,
    Scene,
    SphereGeometry,
    SpotLight,
} from "three";
import { CHUNK_SIZE } from "../server/chunk";
import { DIRT_IDX, GRASS_IDX, LAKE_IDX, SAND_IDX } from "../server/sampler";
import {
    getSubTextureFromAtlas,
    getUVOffsets,
    spriteSheetTexture,
} from "./rendering/textures";
import { sampleContinentalness } from "../server/procedural/continentalness";
import { h } from "htm/preact/index.js";

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

function getTileSpriteName(tile: number): string {
    if (tile === LAKE_IDX) return "water1";
    if (tile === DIRT_IDX) return "dirt1";
    if (tile === GRASS_IDX) return "grass1";
    if (tile === SAND_IDX) return "sand1";
    // fallback
    console.warn("Unknown tile type:", tile);
    return "uv";
}

export function generateChunkTexture(chunkData: number[][]): DataTexture {
    const TILE_SIZE = 32;
    const dim = chunkData.length;

    // Dimensions in pixels of the final chunk texture
    const canvasWidth = dim * TILE_SIZE;
    const canvasHeight = dim * TILE_SIZE;

    // Create an offscreen canvas
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = canvasWidth;
    offscreenCanvas.height = canvasHeight;
    const ctx = offscreenCanvas.getContext("2d");
    if (!ctx) {
        throw new Error("Could not get 2D context for offscreen canvas");
    }

    ctx.imageSmoothingEnabled = false;

    // Get the source image for your sprite sheet
    // (spriteSheetTexture is assumed to be a THREE.Texture)
    const spriteImage = spriteSheetTexture.image;
    const spriteWidth = spriteImage.width;
    const spriteHeight = spriteImage.height;

    // Draw each tile into the correct position on the offscreen canvas
    for (let x = 0; x < dim; x++) {
        for (let y = 0; y < dim; y++) {
            const tileIndex = chunkData[x][y];
            const tileName = getTileSpriteName(tileIndex);

            const { u0, v0, u1, v1 } = getUVOffsets(tileName as any);

            const realY0 = (1 - v1) * spriteHeight;
            const realY1 = (1 - v0) * spriteHeight;
            const realX0 = u0 * spriteWidth;
            const realX1 = u1 * spriteWidth;

            const srcX = realX0;
            const srcY = realY0;
            const srcW = realX1 - realX0;
            const srcH = realY1 - realY0;

            // Compute where to place the tile in our chunk canvas
            const destX = x * TILE_SIZE;
            const destY = y * TILE_SIZE;

            ctx.drawImage(
                spriteImage,
                srcX,
                srcY,
                srcW,
                srcH,
                destX,
                destY,
                TILE_SIZE,
                TILE_SIZE
            );
        }
    }

    // Now convert the canvas pixels to a DataTexture
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

    // The raw pixel array (Uint8ClampedArray) needs to be a normal Uint8Array for DataTexture
    const data = new Uint8Array(imageData.data);

    // Create a DataTexture from this pixel data
    const dataTex = new DataTexture(
        data,
        canvasWidth,
        canvasHeight,
        RGBAFormat
    );
    dataTex.flipY = true;
    dataTex.minFilter = NearestFilter;
    dataTex.magFilter = NearestFilter;
    dataTex.needsUpdate = true;

    return dataTex;
}

export class TileMapManager {
    tileMapInfo = new Map<string, number[][]>();
    tileMaps = new Map<string, Mesh>();

    constructor(public scene: Scene) {
        const light = new DirectionalLight(0xffffff, 3);
        light.castShadow = true; // default false
        light.position.set(0, 100, 0);

        scene.add(light);

        // test night day cycle... just rotate the light

        let a = Math.PI / 2 + 0.5;
        light.position.set(0, Math.sin(a) * 100, Math.cos(a) * 100);
    }

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

        const OFFSET_X = chunkX * CHUNK_SIZE;
        const OFFSET_Y = chunkY * CHUNK_SIZE;
        const dim = chunkData.length;

        const planeGeometry = new PlaneGeometry(dim, dim, dim, dim);
        planeGeometry.rotateX(-Math.PI / 2);

        const heightScale = 50;
        const getHeightMemo = new Map<string, number>();
        const getHeight = (x: number, y: number) => {
            const k = `${x},${y}`;
            if (getHeightMemo.has(k)) {
                return getHeightMemo.get(k)!;
            }

            const v = sampleContinentalness(x, y);
            getHeightMemo.set(k, v);
            return v;
        };

        // Modify the geometry to have the correct heights
        for (let x = 0; x < dim; x++) {
            for (let y = 0; y < dim + 1; y++) {
                let trueX = x + OFFSET_X;
                let trueY = y + OFFSET_Y;
                const tileHeight = getHeight(trueX, trueY);
                const leftTileHeight = getHeight(trueX - 1, trueY);
                const rightTileHeight = getHeight(trueX + 1, trueY);
                const upTileHeight = getHeight(trueX, trueY + 1);
                const downTileHeight = getHeight(trueX, trueY - 1);
                const topLeftTileHeight = getHeight(trueX - 1, trueY + 1);
                const topRightTileHeight = getHeight(trueX + 1, trueY + 1);
                const bottomLeftTileHeight = getHeight(trueX - 1, trueY - 1);
                const bottomRightTileHeight = getHeight(trueX + 1, trueY - 1);

                const tlIdx = y * (dim + 1) + x; // Top-left
                const trIdx = tlIdx + 1; // Top-right
                const blIdx = (y + 1) * (dim + 1) + x; // Bottom-left
                const brIdx = blIdx + 1; // Bottom-right

                // Average self and neighbors
                const tlValue =
                    (tileHeight +
                        leftTileHeight +
                        upTileHeight +
                        topLeftTileHeight) /
                    4;
                const trValue =
                    (tileHeight +
                        rightTileHeight +
                        upTileHeight +
                        topRightTileHeight) /
                    4;
                const blValue =
                    (tileHeight +
                        leftTileHeight +
                        downTileHeight +
                        bottomLeftTileHeight) /
                    4;
                const brValue =
                    (tileHeight +
                        rightTileHeight +
                        downTileHeight +
                        bottomRightTileHeight) /
                    4;

                // Set the heights to random values for now
                planeGeometry.attributes.position.setY(
                    tlIdx,
                    tlValue * heightScale - heightScale / 2
                );
                planeGeometry.attributes.position.setY(
                    trIdx,
                    trValue * heightScale - heightScale / 2
                );
                planeGeometry.attributes.position.setY(
                    blIdx,
                    blValue * heightScale - heightScale / 2
                );
                planeGeometry.attributes.position.setY(
                    brIdx,
                    brValue * heightScale - heightScale / 2
                );

                // If last x don't set right

                // planeGeometry.attributes.position.setY(blIdx, blValue);
                // planeGeometry.attributes.position.setY(brIdx, brValue);
            }
        }
        planeGeometry.attributes.position.needsUpdate = true;
        planeGeometry.computeVertexNormals();

        const tex = generateChunkTexture(chunkData);

        const solidColorMaterial = new MeshToonMaterial({
            map: tex,
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

    removeChunk(chunkX: number, chunkY: number) {
        console.log("Removing chunk", chunkX, chunkY);
        const chunkKey = `${chunkX},${chunkY}`;
        const instancedMesh = this.tileMaps.get(chunkKey);
        if (instancedMesh) {
            this.scene.remove(instancedMesh);
            this.tileMaps.delete(chunkKey);
            this.tileMapInfo.delete(chunkKey);
        }
    }
}
