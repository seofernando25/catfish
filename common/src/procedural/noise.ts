import { dot, hash2_norm, mix } from "./common";

export function perlin_noise(x: number, y: number): number {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    const subX = x - cellX;
    const subY = y - cellY;

    const quintX = subX ** 3 * (10 + subX * (-15 + 6 * subX));
    const quintY = subY ** 3 * (10 + subY * (-15 + 6 * subY));

    const offX = 0;
    const offY = 1;

    const cellX_offX = cellX + offX;
    const cellX_offY = cellX + offY;
    const cellY_offX = cellY + offX;
    const cellY_offY = cellY + offY;

    const diff00_0 = offX - subX;
    const diff00_1 = offX - subY;
    const diff10_0 = offY - subX;
    const diff10_1 = offY - subY;

    // Precompute hash2_norm results
    const hash00 = hash2_norm(cellX_offX, cellY_offX);
    const hash10 = hash2_norm(cellX_offY, cellY_offX);
    const hash01 = hash2_norm(cellX_offX, cellY_offY);
    const hash11 = hash2_norm(cellX_offY, cellY_offY);

    // Calculate gradients
    const grad_corner00 = dot(hash00.x, hash00.y, diff00_0, diff00_1);
    const grad_corner10 = dot(hash10.x, hash10.y, diff10_0, diff00_1);
    const grad_corner01 = dot(hash01.x, hash01.y, diff00_0, diff10_1);
    const grad_corner11 = dot(hash11.x, hash11.y, diff10_0, diff10_1);

    const v =
        mix(
            mix(grad_corner00, grad_corner10, quintX),
            mix(grad_corner01, grad_corner11, quintX),
            quintY
        ) *
            0.7 +
        0.5;

    return v;
}

export function multi_octave_noise(
    x: number,
    y: number,
    octaves: number,
    persistence: number,
    lacunarity: number
): number {
    let noise = 0.0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0.0;

    for (let i = 0; i < octaves; i++) {
        noise += amplitude * perlin_noise(x * frequency, y * frequency);
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }

    return noise / maxValue;
}
