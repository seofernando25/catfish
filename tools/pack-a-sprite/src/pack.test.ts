import { expect, test, describe } from "bun:test";
import { squarePack, isPackValid, getPackDimensions } from "./pack";

describe("Packing Tests", () => {
    test("Simple packing test", () => {
        const squares = [
            { w: 10, h: 10 },
            { w: 20, h: 10 },
        ];
        const packed = squarePack(squares);
        expect(packed.length).toBe(2);
        expect(isPackValid(packed)).toBe(true);

        const dims = getPackDimensions(packed);
        expect(dims.width).toBeGreaterThan(0);
        expect(dims.height).toBeGreaterThan(0);
    });
});
