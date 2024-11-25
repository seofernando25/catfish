import { hash1 } from "./procedural/common";
import { sampleContinentalness } from "./procedural/continentalness";
import { sampleFluviality } from "./procedural/fluviality";
import { sampleTemperature } from "./procedural/temperature";

// Sample method
function sampleImpl(x: number, y: number) {
    const fluviality = sampleFluviality(x, y);
    const continentalness = sampleContinentalness(x, y);

    const t = fluviality * continentalness;

    if (t > 0) {
        const temp = sampleTemperature(x, y);
        if (temp > 0.2) {
            // return "dirt";
            return 1;
        } else {
            return 2;
            // return "sand";
        }
    } else {
        return 0;
        // return "lake";
    }
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
