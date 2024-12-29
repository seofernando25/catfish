import { BufferGeometry, Float32BufferAttribute } from "three";

export type UVInfo = { u0: number; v0: number; u1: number; v1: number };

export function modifyTileHeight(
    geometry: BufferGeometry,
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

    const positionArray = geometry.attributes.position.array;

    // Vertex 0: Top-Left (tl)
    positionArray[(vertexOffset + 0) * 3 + 1] = tl;

    // Vertex 1: Bottom-Left (bl)
    positionArray[(vertexOffset + 1) * 3 + 1] = bl;

    // Vertex 2: Top-Right (tr)
    positionArray[(vertexOffset + 2) * 3 + 1] = tr;

    // Vertex 3: Top-Right (tr) - Duplicate for the second triangle
    positionArray[(vertexOffset + 3) * 3 + 1] = tr;

    // Vertex 4: Bottom-Left (bl) - Duplicate for the second triangle
    positionArray[(vertexOffset + 4) * 3 + 1] = bl;

    // Vertex 5: Bottom-Right (br)
    positionArray[(vertexOffset + 5) * 3 + 1] = br;

    // Notify Three.js that positions have been updated
    geometry.attributes.position.needsUpdate = true;
}
