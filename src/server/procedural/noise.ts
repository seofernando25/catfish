import { dot, hash2_norm, mix } from "./common";

export function perlin_noise(x: number, y: number): number {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    const sub: [number, number] = [x - cellX, y - cellY];

    const quintX = sub[0] ** 3 * (10 + sub[0] * (-15 + 6 * sub[0]));
    const quintY = sub[1] ** 3 * (10 + sub[1] * (-15 + 6 * sub[1]));

    const off: [number, number] = [0, 1];

    // Expected 4 arguments, but got 2.ts(2554)

    const cell0_off0 = cellX + off[0];
    const cell0_off1 = cellX + off[1];
    const cell1_off0 = cellY + off[0];
    const cell1_off1 = cellY + off[1];

    const diff00_0 = off[0] - sub[0];
    const diff00_1 = off[0] - sub[1];
    const diff10_0 = off[1] - sub[0];
    const diff10_1 = off[1] - sub[1];

    // Precompute hash2_norm results
    const hash00 = hash2_norm(cell0_off0, cell1_off0);
    const hash10 = hash2_norm(cell0_off1, cell1_off0);
    const hash01 = hash2_norm(cell0_off0, cell1_off1);
    const hash11 = hash2_norm(cell0_off1, cell1_off1);

    // Calculate gradients
    const grad_corner00 = dot(hash00[0], hash00[1], diff00_0, diff00_1);
    const grad_corner10 = dot(hash10[0], hash10[1], diff10_0, diff00_1);
    const grad_corner01 = dot(hash01[0], hash01[1], diff00_0, diff10_1);
    const grad_corner11 = dot(hash11[0], hash11[1], diff10_0, diff10_1);

    return (
        mix(
            mix(grad_corner00, grad_corner10, quintX),
            mix(grad_corner01, grad_corner11, quintX),
            quintY
        ) *
            0.7 +
        0.5
    );
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
