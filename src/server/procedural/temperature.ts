import { multi_octave_noise } from "./noise";


export function sampleTemperature(x: number, y: number): number {
    const coord: [number, number] = [x / 500, y / 500];
    const noise = multi_octave_noise(coord, 6, 0.5, 2.0);
	return noise;
}