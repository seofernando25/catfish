import type { ECSWorld } from "@catfish/common/ecs.ts";
import { genWorldHeightMapsFromImage } from "../gen";
import { CHUNK_SIZE, WORLD_ZONE_DIM } from "@catfish/common/constants.ts";
import { newPrimitiveObject } from "@catfish/common/data/objectData.ts";
import { chunkDataMixin, positionMixin } from "@catfish/common/data/entity.ts";
import {
    cloneGeometry,
    computeUniqueGridVertexNormals,
    createUniqueGridGeometry,
    modifyTileHeight,
    modifyTileUV,
    translateGeometry,
} from "../chunkGeo";
import { getUVOffsets } from "@catfish/common/rendering/atlas.ts";

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

const generateChunkDisplacements = async () => {
    const heightMaps = await genWorldHeightMapsFromImage();
    const chunkDisplacements = [];

    if (!heightMaps) {
        console.error("Height maps not generated");
        return [];
    }

    for (let i = 0; i < heightMaps.length; i++) {
        const coords = indexToCoords(i);
        const chunkX = coords.x;
        const chunkY = coords.y;
        const chunkDisplacement: number[][] = Array.from(
            { length: CHUNK_SIZE * CHUNK_SIZE },
            () => [0, 0, 0, 0]
        );
        const heightMapZone = heightMaps[i];

        const getTileHeight = (x: number, y: number): number => {
            if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_SIZE) {
                // Within the current chunk
                return heightMapZone[y * CHUNK_SIZE + x];
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

                // Fetch the adjacent chunk's height map
                const adjacentZoneIdx =
                    adjacentChunkY * WORLD_ZONE_DIM + adjacentChunkX;

                const outOfBounds =
                    adjacentChunkX < 0 ||
                    adjacentChunkY < 0 ||
                    adjacentChunkX >= WORLD_ZONE_DIM ||
                    adjacentChunkY >= WORLD_ZONE_DIM;

                const adjacentZone = heightMaps[adjacentZoneIdx];

                if (adjacentZone && !outOfBounds) {
                    const adjIdx = adjY * CHUNK_SIZE + adjX;
                    return adjacentZone[adjIdx];
                } else {
                    return -99;
                }
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
                if (chunkDisplacement[cellIndex] === undefined) {
                    console.error("Undefined index at", y, x);
                    console.error("Size was", chunkDisplacement.length);
                    return [];
                }
                chunkDisplacement[cellIndex][0] = tlVertexValue;
                chunkDisplacement[cellIndex][1] = trVertexValue;
                chunkDisplacement[cellIndex][2] = blVertexValue;
                chunkDisplacement[cellIndex][3] = brVertexValue;
            }
        }
        chunkDisplacements.push(chunkDisplacement);
    }

    return chunkDisplacements;
};

export const addChunkDisplacements = async (ecs: ECSWorld) => {
    const planeGeometry = createUniqueGridGeometry(CHUNK_SIZE, CHUNK_SIZE);
    translateGeometry(planeGeometry, CHUNK_SIZE / 2, 0, CHUNK_SIZE / 2);

    const displacements = await generateChunkDisplacements();

    console.log("Adding chunk displacements to ECS");
    const entityDeconstructors: (() => void)[] = [];
    for (let i = 0; i < displacements.length; i++) {
        const coords = indexToCoords(i);
        const chunkX = coords.x;
        const chunkY = coords.y;
        const tileDisplacements = displacements[i];
        const entity = newPrimitiveObject();
        const posEntity = positionMixin(entity);
        posEntity.x = chunkX * CHUNK_SIZE;
        posEntity.y = 0;
        posEntity.z = chunkY * CHUNK_SIZE;

        const geometry = cloneGeometry(planeGeometry);

        const uvInfo = getUVOffsets("sand1");
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

        computeUniqueGridVertexNormals(geometry);

        const chunkEntity = chunkDataMixin(entity, {
            isChunkData: true,
            position: Array.from(
                Bun.gzipSync(new Uint8Array(geometry.position.buffer))
            ),
            uv: Array.from(Bun.gzipSync(new Uint8Array(geometry.uv.buffer))),
            normal: Array.from(
                Bun.gzipSync(new Uint8Array(geometry.normal.buffer))
            ),
        });

        // const compressed = Bun.gzipSync(new Uint8Array(geometry.position));
        // console.log("Compressed size", compressed.length);
        // const decompressed = Bun.gunzipSync(compressed);
        // console.log("Decompressed size", decompressed.length);
        // const compressionRatio = compressed.length / decompressed.length;
        // console.log("Compression ratio", compressionRatio);

        const removeEntity = ecs.addEntity(chunkEntity);
        entityDeconstructors.push(removeEntity);
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("Added chunk displacements to ECS");
    return () => {
        for (let deconstructor of entityDeconstructors) {
            deconstructor();
        }
    };
};
