import { multi_octave_noise } from "./noise";

export function sampleContinentalness(x: number, y: number): number {
    // const coord: [number, number] = [x / 200, y / 200];
    const coordX = x / 200.0;
    const coordY = y / 200.0;
    const noise = multi_octave_noise(coordX, coordY, 12, 0.5, 2.0);

    const biasStart = 0.0;
    const biasEnd = 0.5;
    const shiftAmount = 0.4;

    const biasFactor = Math.min(
        Math.max((noise - biasStart) / (biasEnd - biasStart), 0),
        1
    );

    if (noise >= biasStart && noise <= biasEnd) {
        return 0.0;
    } else {
        return 1.0;
    }
}
