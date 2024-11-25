import { multi_octave_noise } from "./noise";

export function sampleTemperature(x: number, y: number): number {
    const coordX = x / 150;
    const coordY = y / 150;
    const noise = multi_octave_noise(
        coordX + 1.3454,
        coordY + 3.2323,
        12,
        0.5,
        2.0
    );
    return noise;
}
