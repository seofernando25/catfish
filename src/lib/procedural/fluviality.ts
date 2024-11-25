import { multi_octave_noise } from "./noise";

export function sampleFluviality(x: number, y: number): number {
    const coord: [number, number] = [x / 200.0, y / 200.0];

    const noise = multi_octave_noise(coord, 1, 0.5, 2.0);

    const biasStart = 0.45;
    const biasEnd = 0.5;
    const shiftAmount = 0.5;

    const biasFactor = Math.min(Math.max((noise - biasStart) / (biasEnd - biasStart), 0), 1);

    if (noise >= biasStart && noise <= biasEnd) {
        return 0.0;
    } else {
        return 1.0;
    }
}
