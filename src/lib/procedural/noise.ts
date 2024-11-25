import { floor, dot, hash2_norm, mix } from "./common";

export function perlin_noise([x, y]: [number, number]): number {
    const cell = floor([x, y]);
    const sub: [number, number] = [x - cell[0], y - cell[1]];
    const quint: [number, number] = [
        sub[0] ** 3 * (10 + sub[0] * (-15 + 6 * sub[0])),
        sub[1] ** 3 * (10 + sub[1] * (-15 + 6 * sub[1]))
    ];

    const off: [number, number] = [0, 1];

    const grad_corner00 = dot(hash2_norm([cell[0] + off[0], cell[1] + off[0]]), [off[0] - sub[0], off[0] - sub[1]]);
    const grad_corner10 = dot(hash2_norm([cell[0] + off[1], cell[1] + off[0]]), [off[1] - sub[0], off[0] - sub[1]]);
    const grad_corner01 = dot(hash2_norm([cell[0] + off[0], cell[1] + off[1]]), [off[0] - sub[0], off[1] - sub[1]]);
    const grad_corner11 = dot(hash2_norm([cell[0] + off[1], cell[1] + off[1]]), [off[1] - sub[0], off[1] - sub[1]]);

    return mix(
        mix(grad_corner00, grad_corner10, quint[0]),
        mix(grad_corner01, grad_corner11, quint[0]),
        quint[1]
    ) * 0.7 + 0.5;
}

export function multi_octave_noise([x, y]: [number, number], octaves: number, persistence: number, lacunarity: number): number {
    let noise = 0.0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0.0;

    for (let i = 0; i < octaves; i++) {
        noise += amplitude * perlin_noise([x * frequency, y * frequency]);
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }

    return noise / maxValue;
}