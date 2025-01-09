import { CHUNK_SIZE, WORLD_ZONE_DIM } from "@catfish/common/constants.ts";
import { chunkDataMixin, positionMixin } from "@catfish/common/data/entity.ts";
import { newPrimitiveObject } from "@catfish/common/data/objectData.ts";
import type { ECSWorld } from "@catfish/common/ecs.ts";
import { getUVOffsets } from "@catfish/common/rendering/atlas.ts";
import {
    computeUniqueGridVertexNormals,
    createUniqueGridGeometry,
    modifyTileHeight,
    modifyTileUV,
    translateGeometry,
} from "../chunkGeo";
import { genWorldHeightMapsFromImage } from "../gen";
const indexToCoords = (index: number) => {
    const x = Math.floor(index % WORLD_ZONE_DIM);
    const y = Math.floor(index / WORLD_ZONE_DIM);
    return { x, y };
};

const chunkIndexToCoords = (index: number) => {
    const x = Math.floor(index % CHUNK_SIZE);
    const y = Math.floor(index / CHUNK_SIZE);
    return { x, y };
};

const generateChunkDisplacements = async (): Promise<number[][][]> => {
    const t = performance.now();
    const heightMaps = await genWorldHeightMapsFromImage();
    const chunkDisplacements: number[][][] = [];

    if (!heightMaps) {
        console.error("Height maps not generated");
        return [];
    }

    const totalZones = WORLD_ZONE_DIM * WORLD_ZONE_DIM;
    const totalChunks = CHUNK_SIZE * CHUNK_SIZE;

    // Precompute totalChunks for indexing
    const totalChunksPerZone = CHUNK_SIZE * CHUNK_SIZE;

    for (let i = 0; i < totalZones; i++) {
        const coords = indexToCoords(i);
        const chunkX = coords.x;
        const chunkY = coords.y;

        const chunkDisplacement: number[][] = new Array(totalChunks);
        for (let j = 0; j < totalChunks; j++) {
            chunkDisplacement[j] = [0, 0, 0, 0];
        }

        const zoneStartIdx = i * totalChunksPerZone;

        const getTileHeight = (x: number, y: number): number => {
            if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_SIZE) {
                // Within the current chunk
                return heightMaps[zoneStartIdx + y * CHUNK_SIZE + x];
            } else {
                // Outside the current chunk, fetch from adjacent chunks
                let adjacentChunkX = chunkX;
                let adjacentChunkY = chunkY;
                let adjX = x;
                let adjY = y;

                // Adjust coordinates and determine adjacent chunk
                if (x < 0) {
                    adjacentChunkX = chunkX - 1;
                    adjX = CHUNK_SIZE - 1;
                } else if (x >= CHUNK_SIZE) {
                    adjacentChunkX = chunkX + 1;
                    adjX = 0;
                }

                if (y < 0) {
                    adjacentChunkY = chunkY - 1;
                    adjY = CHUNK_SIZE - 1;
                } else if (y >= CHUNK_SIZE) {
                    adjacentChunkY = chunkY + 1;
                    adjY = 0;
                }

                // Check bounds
                if (
                    adjacentChunkX < 0 ||
                    adjacentChunkY < 0 ||
                    adjacentChunkX >= WORLD_ZONE_DIM ||
                    adjacentChunkY >= WORLD_ZONE_DIM
                ) {
                    return -99;
                }

                const adjacentZoneIdx =
                    adjacentChunkY * WORLD_ZONE_DIM + adjacentChunkX;
                const adjacentZoneStartIdx =
                    adjacentZoneIdx * totalChunksPerZone;
                return heightMaps[
                    adjacentZoneStartIdx + adjY * CHUNK_SIZE + adjX
                ];
            }
        };

        for (let y = 0; y < CHUNK_SIZE; y++) {
            for (let x = 0; x < CHUNK_SIZE; x++) {
                const tileValue = getTileHeight(x, y);
                const tileTopValue = getTileHeight(x, y - 1);
                const tileBottomValue = getTileHeight(x, y + 1);
                const tileLeftValue = getTileHeight(x - 1, y);
                const tileRightValue = getTileHeight(x + 1, y);
                const tileTopLeft = getTileHeight(x - 1, y - 1);
                const tileTopRight = getTileHeight(x + 1, y - 1);
                const tileBottomLeft = getTileHeight(x - 1, y + 1);
                const tileBottomRight = getTileHeight(x + 1, y + 1);

                const tlVertexValue =
                    (tileValue + tileTopValue + tileLeftValue + tileTopLeft) /
                    4;
                const trVertexValue =
                    (tileValue + tileTopValue + tileRightValue + tileTopRight) /
                    4;
                const blVertexValue =
                    (tileValue +
                        tileBottomValue +
                        tileLeftValue +
                        tileBottomLeft) /
                    4;
                const brVertexValue =
                    (tileValue +
                        tileBottomValue +
                        tileRightValue +
                        tileBottomRight) /
                    4;

                // Assign to the vertexDisplacements 2D array
                const cellIndex = y * CHUNK_SIZE + x;
                chunkDisplacement[cellIndex][0] = tlVertexValue;
                chunkDisplacement[cellIndex][1] = trVertexValue;
                chunkDisplacement[cellIndex][2] = blVertexValue;
                chunkDisplacement[cellIndex][3] = brVertexValue;
            }
        }

        chunkDisplacements.push(chunkDisplacement);
    }

    const elapsed = performance.now() - t;
    console.log(`Chunk Displacements generated in ${elapsed.toFixed(2)} ms`);

    return chunkDisplacements;
};

// Used to avoid allocation runtime allocations
const planeGeometry = createUniqueGridGeometry(CHUNK_SIZE, CHUNK_SIZE);
const offsetArrays = new Int32Array(planeGeometry.normal.length * 10);
offsetArrays.fill(-1);
const normalsAcc = new Float32Array(planeGeometry.normal.length);

export const addChunkDisplacements = async (ecs: ECSWorld) => {
    translateGeometry(planeGeometry, CHUNK_SIZE / 2, 0, CHUNK_SIZE / 2);

    const displacements = await generateChunkDisplacements();
    console.log("Adding chunk displacements to ECS");

    const coordsI = displacements.map((_, i) => indexToCoords(i));

    const uvInfo = getUVOffsets("sand1");

    let t = performance.now();
    const positionsBuffer = new Float32Array(
        planeGeometry.position.length * displacements.length
    );
    const uvsBuffer = new Float32Array(
        planeGeometry.uv.length * displacements.length
    );
    const normalsBuffer = new Float32Array(
        planeGeometry.normal.length * displacements.length
    );

    // Set up buffers
    for (let i = 0; i < displacements.length; i++) {
        positionsBuffer.set(
            planeGeometry.position,
            i * planeGeometry.position.length
        );
        uvsBuffer.set(planeGeometry.uv, i * planeGeometry.uv.length);
        normalsBuffer.set(
            planeGeometry.normal,
            i * planeGeometry.normal.length
        );
    }

    const geometries = displacements.map((tileDisplacements, i) => {
        const geometry = {
            position: positionsBuffer.subarray(
                i * planeGeometry.position.length,
                (i + 1) * planeGeometry.position.length
            ),
            uv: uvsBuffer.subarray(
                i * planeGeometry.uv.length,
                (i + 1) * planeGeometry.uv.length
            ),
            normal: normalsBuffer.subarray(
                i * planeGeometry.normal.length,
                (i + 1) * planeGeometry.normal.length
            ),
        };

        for (let i = 0; i < tileDisplacements.length; i++) {
            const coords = chunkIndexToCoords(i);
            const x = coords.x;
            const y = coords.y;
            modifyTileUV(geometry, x, y, uvInfo, CHUNK_SIZE);

            const tileDisplacementData = tileDisplacements[i];
            const tl = tileDisplacementData[0];
            const tr = tileDisplacementData[1];
            const bl = tileDisplacementData[2];
            const br = tileDisplacementData[3];
            modifyTileHeight(geometry, x, y, tl, tr, bl, br, CHUNK_SIZE);
        }

        // 2X faster but currently has issues with hash collisions
        // math.computeUniqueGridVertexNormals(
        //     geometry.position,
        //     geometry.position.length,
        //     geometry.normal,
        //     geometry.normal.length,
        //     offsetArrays,
        //     offsetArrays.length,
        //     normalsAcc
        // );

        computeUniqueGridVertexNormals(geometry);
        return geometry;
    });
    console.log("Time to generate geometries:", performance.now() - t);

    t = performance.now();
    const entities = coordsI.map((coord, i) =>
        chunkDataMixin(
            positionMixin(newPrimitiveObject(), {
                x: coord.x * CHUNK_SIZE,
                y: 0,
                z: coord.y * CHUNK_SIZE,
            }),
            {
                isChunkData: true,
                position: geometries[i].position,
                uv: geometries[i].uv,
                normal: geometries[i].normal,
            }
        )
    );
    const entityDeconstructors = entities.map((entity) =>
        ecs.addEntity(entity)
    );
    console.log("Added mesh to ECS");
    return () => {
        for (let deconstructor of entityDeconstructors) {
            deconstructor();
        }
    };
};
