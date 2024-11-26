import { sample } from "../world";
import type {
    ChunkTaskData,
    WorkerTaskData,
    WorkerTaskResult,
} from "./ChunkWorkerManager";

self.onmessage = (e: MessageEvent<WorkerTaskData>) => {
    const { taskId, chunkX, chunkY, chunkSize } = e.data;
    // console.log("Received task", taskId, chunkX, chunkY, chunkSize);
    const chunkXOffset = chunkX * chunkSize;
    const chunkYOffset = chunkY * chunkSize;
    const result = new Uint8Array(chunkSize * chunkSize);
    for (let i = 0; i < chunkSize; i++) {
        for (let j = 0; j < chunkSize; j++) {
            // y * CHUNK_SIZE + x];
            const v = sample(chunkXOffset + i, chunkYOffset + j);
            result[j * chunkSize + i] = v;
        }
    }

    const response: WorkerTaskResult = { taskId, result };
    // console.log("Task complete", taskId);
    self.postMessage(response);
};
