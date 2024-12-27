import {
    InstancedBufferAttribute,
    InstancedMesh,
    Object3D,
    PlaneGeometry,
    Scene,
    ShaderMaterial,
} from "three";
import { CHUNK_SIZE } from "../server/chunk";
import { DESERT_IDX, DIRT_IDX, GRASS_IDX, LAKE_IDX } from "../server/sampler";
import { getUVOffsets, spriteSheetTexture } from "./rendering/textures";

const tilemapMaterial = new ShaderMaterial({
    vertexShader: `
        attribute vec4 uvOffsets; 
        varying vec2 vUv;
        void main() {
            vec2 uvMin = uvOffsets.xy; 
            vec2 uvMax = uvOffsets.zw; 
            vUv = mix(uvMin, uvMax, uv); 

            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D atlasTexture;
        varying vec2 vUv;
        void main() {
            gl_FragColor = texture2D(atlasTexture, vUv);
        }
    `,
    uniforms: {
        atlasTexture: { value: spriteSheetTexture },
    },
    transparent: true,
});

const plane = new PlaneGeometry(1, 1);
export class TileMapManager {
    tileMapInfo = new Map<string, number[][]>();
    tileMaps = new Map<string, InstancedMesh>();

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

    addChunk(chunkX: number, chunkY: number, chunkData: number[][]) {
        const chunkKey = `${chunkX},${chunkY}`;
        if (this.tileMaps.has(chunkKey)) {
            return;
        }

        const OFFSET_X = chunkX * CHUNK_SIZE;
        const OFFSET_Y = chunkY * CHUNK_SIZE;
        const dim = chunkData.length;

        const instanceCount = dim * dim;
        const instancedMesh = new InstancedMesh(
            new PlaneGeometry(1, 1),
            tilemapMaterial,
            instanceCount
        );

        const uvOffsets = new Float32Array(instanceCount * 4);
        const transformDummy = new Object3D();
        transformDummy.rotation.set(-Math.PI / 2, 0, 0);

        let index = 0;
        for (let x = 0; x < dim; x++) {
            for (let y = 0; y < dim; y++) {
                const tile = chunkData[x][y];
                const i = x * dim + y;

                let uvInfo = { u0: 0, v0: 0, u1: 1, v1: 1 };

                if (tile === LAKE_IDX) {
                    uvInfo = getUVOffsets("water1");
                } else if (tile === DIRT_IDX) {
                    uvInfo = getUVOffsets("dirt1");
                } else if (tile === GRASS_IDX) {
                    uvInfo = getUVOffsets("grass1");
                } else if (tile == DESERT_IDX) {
                    uvInfo = getUVOffsets("sand1");
                } else {
                    console.log("Unrecognized tile", tile);
                    continue; // Skip unrecognized tiles
                }

                uvOffsets[i * 4 + 0] = uvInfo.u0; // Left
                uvOffsets[i * 4 + 1] = uvInfo.v0; // Bottom
                uvOffsets[i * 4 + 2] = uvInfo.u1; // Right
                uvOffsets[i * 4 + 3] = uvInfo.v1; // Top

                transformDummy.position.set(x, 0, y);

                transformDummy.updateMatrix();
                instancedMesh.setMatrixAt(index++, transformDummy.matrix);
            }
        }
        instancedMesh.geometry.setAttribute(
            "uvOffsets",
            new InstancedBufferAttribute(uvOffsets, 4)
        );
        instancedMesh.position.set(OFFSET_X + 0.5, 0, OFFSET_Y + 0.5);
        instancedMesh.instanceMatrix.needsUpdate = true;
        this.tileMaps.set(chunkKey, instancedMesh);
        this.tileMapInfo.set(chunkKey, chunkData);
        this.scene.add(instancedMesh);
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
