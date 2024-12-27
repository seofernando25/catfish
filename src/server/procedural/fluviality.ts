import { multi_octave_noise } from "./noise";

export function sampleFluviality(x: number, y: number): number {
    const coordX = x / 100.0;
    const coordY = y / 100.0;

    const noise = multi_octave_noise(
        coordX + 8612355.453,
        coordY + 2312342.2342,
        8,
        0.5,
        2.0
    );

    const biasStart = 0.38;
    const biasEnd = 0.4;

    if (noise >= biasStart && noise <= biasEnd) {
        return 0.0;
    } else {
        return 1.0;
    }
}
