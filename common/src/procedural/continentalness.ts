import { multi_octave_noise } from "./noise";

export function sampleContinentalness(x: number, y: number): number {
    const coordX = x / 200.0;
    const coordY = y / 200.0;
    const noise = multi_octave_noise(
        coordX + 23123.2131,
        coordY + 32132.53425,
        12,
        0.5,
        2.0
    );

    return noise;
}
