import { hash1 } from "./procedural/common";
import { sampleContinentalness } from "./procedural/continentalness";
import { sampleFluviality } from "./procedural/fluviality";
import { sampleTemperature } from "./procedural/temperature";

export const LAKE_IDX = 0;
export const DIRT_IDX = 1;
export const SAND_IDX = 2;
export const GRASS_IDX = 3;
export const ICE_IDX = 4;

// Sample method
function sampleImpl(x: number, y: number) {
    const fluviality = sampleFluviality(x, y);
    const continentalness = sampleContinentalness(x, y);

    // const t = fluviality * continentalness;

    if (continentalness > 0.5) {
        if (fluviality < 0.2) {
            return LAKE_IDX;
        }

        const temp = sampleTemperature(x, y) * 10;
        if (continentalness < 0.51) {
            if (temp < 4) {
                return DIRT_IDX;
            }

            return SAND_IDX;
        }

        // return temp * 255;

        // Temp [0, 3] ice       (4)
        // Temp [3, 7] grass     (3)
        // Temp [8, 9] dirt      (1)
        // Temp [9, 10] desert   (2)
        const ranges = [
            // [0, 3, GRASS_IDX],
            [0, 4, DIRT_IDX],
            [4, 7, SAND_IDX],
            [7, 10, SAND_IDX],
        ];

        for (const [min, max, idx] of ranges) {
            if (temp >= min && temp < max) {
                return idx;
            }
        }

        return GRASS_IDX;
    }
    return LAKE_IDX;
}

const sampleMemo = new Map<number, number>();

export function sample(x: number, y: number) {
    const k = hash1([x, y]);
    if (sampleMemo.has(k)) {
        return sampleMemo.get(k)!;
    }

    const v = sampleImpl(x, y);
    sampleMemo.set(k, v);
    return v;
}
