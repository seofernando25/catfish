import { sample } from "../../../common/src/procedural/sampler";
import type { WorkerTaskData, ChunkTaskResult } from "./ChunkWorkerManager";

self.onmessage = (e: MessageEvent<WorkerTaskData>) => {
    const { taskId, chunkX, chunkY, chunkSize } = e.data;
    const chunkXOffset = chunkX * chunkSize;
    const chunkYOffset = chunkY * chunkSize;
    const result = new Uint8Array(chunkSize * chunkSize);
    const heights = new Float32Array(chunkSize * chunkSize);
    for (let i = 0; i < chunkSize; i++) {
        for (let j = 0; j < chunkSize; j++) {
            const sampleResult = sample(chunkXOffset + i, chunkYOffset + j);

            result[j * chunkSize + i] = sampleResult.value;
            heights[j * chunkSize + i] = sampleResult.continentalness;
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
