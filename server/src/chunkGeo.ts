import { hash3 } from "@catfish/common/procedural/common.ts";

export type UVInfo = { u0: number; v0: number; u1: number; v1: number };

type Geometry = {
    position: Float32Array;
    uv: Float32Array;
    normal: Float32Array;
};

export function cloneGeometry(geometry: Geometry): Geometry {
    return {
        position: new Float32Array(geometry.position),
        uv: new Float32Array(geometry.uv),
        normal: new Float32Array(geometry.normal),
    };
}

export function translateGeometry(
    geometry: Geometry,
    x: number,
    y: number,
    z: number
) {
    for (let i = 0; i < geometry.position.length; i += 3) {
        geometry.position[i] += x;
        geometry.position[i + 1] += y;
        geometry.position[i + 2] += z;
    }
}

const geometryMemo = new Map<string, Geometry>();

export function createUniqueGridGeometry(
    size: number,
    segments: number
): Geometry {
    const k = `${size},${segments}`;
    const existing = geometryMemo.get(k);
    if (existing) {
        return cloneGeometry(existing);
    }

    const vertices = [];
    const uvs = [];

    const segmentSize = size / segments;
    const halfSize = size / 2;

    for (let y = 0; y < segments; y++) {
        for (let x = 0; x < segments; x++) {
            const x0 = x * segmentSize - halfSize;
            const z0 = y * segmentSize - halfSize;
            const x1 = (x + 1) * segmentSize - halfSize;
            const z1 = (y + 1) * segmentSize - halfSize;

            vertices.push(x0, 0, z0);
            vertices.push(x0, 0, z1);
            vertices.push(x1, 0, z0);

            vertices.push(x1, 0, z0);
            vertices.push(x0, 0, z1);
            vertices.push(x1, 0, z1);

            uvs.push(0, 1);
            uvs.push(0, 0);
            uvs.push(1, 1);

            uvs.push(1, 1);
            uvs.push(0, 0);
            uvs.push(1, 0);
        }
    }

    const geometry = {
        position: new Float32Array(vertices),
        uv: new Float32Array(uvs),
        normal: new Float32Array(vertices.length),
    };

    geometryMemo.set(k, geometry);

    return cloneGeometry(geometry);
}

const crossVec = (a: Float32Array, b: Float32Array, out: Float32Array) => {
    out[0] = a[1] * b[2] - a[2] * b[1];
    out[1] = a[2] * b[0] - a[0] * b[2];
    out[2] = a[0] * b[1] - a[1] * b[0];
};

// Helper function to normalize a vector
const normalize = (v: Float32Array) => {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (len > 0) {
        v[0] /= len;
        v[1] /= len;
        v[2] /= len;
    }
};

const subVectors = (a: Float32Array, b: Float32Array, out: Float32Array) => {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
};

const addVecTo = (x1: number, y1: number, z1: number, out: Float32Array) => {
    out[0] += x1;
    out[1] += y1;
    out[2] += z1;
};

const computedNormal = new Float32Array(3);
const e1 = new Float32Array(3);
const e2 = new Float32Array(3);

export function computeUniqueGridVertexNormals(geometry: Geometry) {
    // const positionArray = geometry.attributes["position"].array;
    const positionArray = geometry.position;
    const normals = new Float32Array(positionArray.length * 3);
    const normalsAcc = new Float32Array(positionArray.length);

    computedNormal.fill(0);
    e1.fill(0);
    e2.fill(0);

    let i = 0;
    const vertexNormalsOffsets = new Map<number, number>();

    const addNormal = (index: number, normal: Float32Array) => {
        const key = hash3(
            positionArray[index * 3],
            positionArray[index * 3 + 1],
            positionArray[index * 3 + 2]
        );
        if (!vertexNormalsOffsets.has(key)) {
            vertexNormalsOffsets.set(key, i++);
        }
        const currentNormal = vertexNormalsOffsets.get(key)!;
        // get slice of the normals array
        const currentNormalIndex = currentNormal * 3;
        addVecTo(
            normal[0],
            normal[1],
            normal[2],
            normalsAcc.subarray(currentNormalIndex, currentNormalIndex + 3)
        );
    };

    for (let i = 0; i < positionArray.length; i += 9) {
        // Get vertices of the current triangle
        const v0 = positionArray.subarray(i) as Float32Array;
        const v1 = positionArray.subarray(i + 3) as Float32Array;
        const v2 = positionArray.subarray(i + 6) as Float32Array;

        subVectors(v1, v0, e1);
        subVectors(v2, v0, e2);

        crossVec(e1, e2, computedNormal);
        normalize(computedNormal);

        const vertexIndex = i / 3;
        addNormal(vertexIndex, computedNormal);
        addNormal(vertexIndex + 1, computedNormal);
        addNormal(vertexIndex + 2, computedNormal);
    }

    for (let i = 0; i < positionArray.length / 3; i++) {
        const key = hash3(
            positionArray[i * 3],
            positionArray[i * 3 + 1],
            positionArray[i * 3 + 2]
        );
        const normalIndex = vertexNormalsOffsets.get(key)!;
        const normal = normalsAcc.subarray(
            normalIndex * 3,
            normalIndex * 3 + 3
        );
        normalize(normal);

        normals.set(normal, i * 3);
    }

    geometry.normal = normals;
}

/**
 * Modifies the UVs of a specific tile in the grid.
 */
export function modifyTileUV(
    geometry: Geometry,
    x: number,
    y: number,
    uvInfo: UVInfo,
    segments: number
) {
    const { u0, v0, u1, v1 } = uvInfo;
    const tileIndex = y * segments + x;
    const vertexOffset = tileIndex * 6; // 6 vertices per tile

    const uvArray = geometry.uv;

    // Triangle 1
    // Vertex 0: (x0, z0) -> (u0, v1)
    uvArray[(vertexOffset + 0) * 2] = u0;
    uvArray[(vertexOffset + 0) * 2 + 1] = v1;

    // Vertex 1: (x1, z0) -> (u1, v1)
    uvArray[(vertexOffset + 1) * 2] = u1;
    uvArray[(vertexOffset + 1) * 2 + 1] = v1;

    // Vertex 2: (x0, z1) -> (u0, v0)
    uvArray[(vertexOffset + 2) * 2] = u0;
    uvArray[(vertexOffset + 2) * 2 + 1] = v0;

    // Triangle 2
    // Vertex 3: (x1, z0) -> (u1, v1)
    uvArray[(vertexOffset + 3) * 2] = u1;
    uvArray[(vertexOffset + 3) * 2 + 1] = v1;

    // Vertex 4: (x1, z1) -> (u1, v0)
    uvArray[(vertexOffset + 4) * 2] = u1;
    uvArray[(vertexOffset + 4) * 2 + 1] = v0;

    // Vertex 5: (x0, z1) -> (u0, v0)
    uvArray[(vertexOffset + 5) * 2] = u0;
    uvArray[(vertexOffset + 5) * 2 + 1] = v0;

    // Notify js that UVs have been updated
    // geometry.attributes["uv"].needsUpdate = true;
}

export function modifyTileHeight(
    geometry: Geometry,
    x: number,
    y: number,
    tl: number,
    tr: number,
    bl: number,
    br: number,
    dim: number
): void {
    const tileIndex = y * dim + x;
    const vertexOffset = tileIndex * 6;

    // const positionArray = geometry.attributes["position"].array;
    const positionArray = geometry.position;

    // Vertex 0: Top-Left (tl)
    positionArray[(vertexOffset + 0) * 3 + 1] = tl;

    // Vertex 1: Bottom-Left (bl)
    positionArray[(vertexOffset + 1) * 3 + 1] = bl;
    // Vertex 4: Bottom-Left (bl) - Duplicate for the second triangle
    positionArray[(vertexOffset + 4) * 3 + 1] = bl;
    // Vertex 2: Top-Right (tr)
    positionArray[(vertexOffset + 2) * 3 + 1] = tr;

    // Vertex 3: Top-Right (tr) - Duplicate for the second triangle
    positionArray[(vertexOffset + 3) * 3 + 1] = tr;
    // Vertex 5: Bottom-Right (br)
    positionArray[(vertexOffset + 5) * 3 + 1] = br;

    // geometry.attributes["position"].needsUpdate = true;
}
