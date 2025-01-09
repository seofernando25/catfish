import { sample } from "../../../common/src/procedural/sampler";
import type { ChunkTaskResult, WorkerTaskData } from "./ChunkWorkerManager";

self.onmessage = (e: MessageEvent<WorkerTaskData>) => {
    const { taskId, chunkX, chunkY, chunkSize } = e.data;
    const chunkXOffset = chunkX * chunkSize;
    const chunkYOffset = chunkY * chunkSize;
    const result = new Uint8Array(chunkSize * chunkSize);
    const heights = new Float32Array((chunkSize + 1) * (chunkSize + 1));

    let memo = new Map<string, ReturnType<typeof sample>>();
    const memoSample = (x: number, y: number) => {
        const k = `${x},${y}`;
        if (memo.has(k)) {
            return memo.get(k)!;
        }
        const v = sample(x, y);
        memo.set(k, v);
        return v;
    };
    for (let x = 0; x < chunkSize; x++) {
        for (let y = 0; y < chunkSize; y++) {
            const sampleResult = memoSample(chunkXOffset + x, chunkYOffset + y);

            result[y * chunkSize + x] = sampleResult.value;

            const tileHeight = sampleResult.continentalness;
            let rightTileHeight = memoSample(
                chunkXOffset + x + 1,
                chunkYOffset + y
            ).continentalness;
            let downTileHeight = memoSample(
                chunkXOffset + x,
                chunkYOffset + y + 1
            ).continentalness;
            let leftTileHeight = memoSample(
                chunkXOffset + x - 1,
                chunkYOffset + y
            ).continentalness;
            let upTileHeight = memoSample(
                chunkXOffset + x,
                chunkYOffset + y - 1
            ).continentalness;
            let topLeftTileHeight = memoSample(
                chunkXOffset + x - 1,
                chunkYOffset + y - 1
            ).continentalness;
            let topRightTileHeight = memoSample(
                chunkXOffset + x + 1,
                chunkYOffset + y - 1
            ).continentalness;
            let bottomLeftTileHeight = memoSample(
                chunkXOffset + x - 1,
                chunkYOffset + y + 1
            ).continentalness;
            let bottomRightTileHeight = memoSample(
                chunkXOffset + x + 1,
                chunkYOffset + y + 1
            ).continentalness;

            // Vertex heights
            const tlValue =
                (tileHeight +
                    leftTileHeight +
                    upTileHeight +
                    topLeftTileHeight) *
                0.25;

            const trValue =
                (tileHeight +
                    rightTileHeight +
                    upTileHeight +
                    topRightTileHeight) *
                0.25;

            const blValue =
                (tileHeight +
                    leftTileHeight +
                    downTileHeight +
                    bottomLeftTileHeight) *
                0.25;

            const brValue =
                (tileHeight +
                    rightTileHeight +
                    downTileHeight +
                    bottomRightTileHeight) *
                0.25;

            heights[y * chunkSize + x] = tlValue;
            heights[y * chunkSize + x + 1] = trValue;
            heights[(y + 1) * chunkSize + x] = blValue;
            heights[(y + 1) * chunkSize + x + 1] = brValue;
        }
    }

    const response: ChunkTaskResult = {
        taskId,
        result: {
            tiles: result,
            heights,
        },
    };
    self.postMessage(response);
};
