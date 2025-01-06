import { CHUNK_SIZE } from "@catfish/common/constants.js";
import {
    ChunkDataSchema,
    PositionSchema,
} from "@catfish/common/data/entity.js";
import { entityQuery, type ECSWorld } from "@catfish/common/ecs.js";
import { getUVOffsets } from "@catfish/common/rendering/atlas.js";
import {
    BufferGeometry,
    DataTexture,
    DirectionalLight,
    Float32BufferAttribute,
    Mesh,
    MeshToonMaterial,
    NearestFilter,
    RGBAFormat,
    Scene,
} from "three";
import { is } from "valibot";
import {
    computeUniqueGridVertexNormals,
    createUniqueGridGeometry,
    modifyTileHeight,
    modifyTileUV,
} from "../chunkGeometry";
import { spriteSheetTexture } from "../rendering/textures";
import pako from "pako";

export const chunkRenderingSystem = (scene: Scene, world: ECSWorld) => {
    const chunkPlaneGeometry = createUniqueGridGeometry(
        CHUNK_SIZE,
        CHUNK_SIZE
    ).translate(CHUNK_SIZE / 2, 0, CHUNK_SIZE / 2);

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

    const chunkMaterial = new MeshToonMaterial({
        map: spriteSheetTexture,
        gradientMap: fiveTone,
        side: 2,
    });

    // add directional light
    const light = new DirectionalLight(0xffffff, 1);
    scene.add(light);

    const renderableInstancesMap = new Map<number, Mesh>();

    const chunk_query = entityQuery(world.onWorldLifecycle, (entity) => {
        return is(ChunkDataSchema, entity) && is(PositionSchema, entity);
    });

    const updateChunkHeight = (geo: BufferGeometry, heightData: number[][]) => {
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

        computeUniqueGridVertexNormals(geo);
    };

    console.log("chunk_query", chunk_query.entities);

    const chunkLifecycle = chunk_query.entityLifeCycle((entity) => {
        const geometry = new BufferGeometry();
        const positionsUint8 = pako.ungzip(new Uint8Array(entity.position));
        const positions = new Float32Array(positionsUint8.buffer);

        const uvUint8 = pako.ungzip(new Uint8Array(entity.uv));
        const uv = new Float32Array(uvUint8.buffer);

        const normalsUint8 = pako.ungzip(new Uint8Array(entity.normal));
        const normals = new Float32Array(normalsUint8.buffer);

        geometry.setAttribute(
            "position",
            new Float32BufferAttribute(positions, 3)
        );
        geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
        geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));

        geometry.attributes["position"].needsUpdate = true;
        geometry.attributes["normal"].needsUpdate = true;
        geometry.attributes["uv"].needsUpdate = true;

        // updateChunkHeight(geometry, entity.displacement);
        const chunkMesh = new Mesh(geometry, chunkMaterial);
        chunkMesh.position.set(entity.x, entity.y, entity.z);
        scene.add(chunkMesh);
        return () => {
            scene.remove(chunkMesh);
        };
    });

    return () => {
        for (const [id, object] of renderableInstancesMap) {
            scene.remove(object);
        }
        chunk_query.dispose();
        chunkLifecycle();
    };
};
