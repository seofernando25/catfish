export type ChunkTaskData = {
    chunkX: number;
    chunkY: number;
    chunkSize: number;
};

export type ChunkTaskResult = {
    taskId: string;
    result: Uint8Array;
};

export type WorkerTaskData = {
    taskId: string;
    chunkX: number;
    chunkY: number;
    chunkSize: number;
};

export type WorkerTaskResult = {
    taskId: string;
    result: Uint8Array;
};

// Get path worker relative to meta url
const workerPath = new URL("./worker.ts", import.meta.url).href;

export class ChunkWorkerManager {
    private poolSize: number;
    private workers: Worker[] = [];
    private taskQueue: Array<{
        taskId: string;
        data: ChunkTaskData;
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
    }> = [];
    private activeTasks: Map<
        string,
        { resolve: (value: any) => void; reject: (reason?: any) => void }
    > = new Map();

    constructor(poolSize: number = navigator.hardwareConcurrency || 4) {
        this.poolSize = poolSize;
        // Initialize worker pool
        for (let i = 0; i < this.poolSize; i++) {
            const worker = new Worker(workerPath);

            worker.onmessage = this.handleWorkerResponse.bind(this, worker);
            worker.onerror = this.handleWorkerError.bind(this, worker);
            this.workers.push(worker);
        }
    }

    private handleWorkerResponse(
        worker: Worker,
        event: MessageEvent<ChunkTaskResult>
    ) {
        const { taskId, result } = event.data;
        const task = this.activeTasks.get(taskId);

        if (task) {
            task.resolve(result);
            this.activeTasks.delete(taskId);
        }

        this.workers.push(worker); // Return worker to pool
        this.processNextTask();
    }

    private handleWorkerError(worker: Worker, error: ErrorEvent) {
        console.error("Worker error:", error.message);
        this.workers.push(worker); // Return worker to pool
    }

    private processNextTask() {
        if (this.taskQueue.length > 0 && this.workers.length > 0) {
            const { taskId, data, resolve, reject } = this.taskQueue.shift()!;
            const worker = this.workers.pop()!;
            this.activeTasks.set(taskId, { resolve, reject });
            worker.postMessage({ taskId, ...data });
        }
    }

    public async runTask(data: ChunkTaskData): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const taskId = crypto.randomUUID();
            this.taskQueue.push({ taskId, data, resolve, reject });
            this.processNextTask();
        });
    }

    public terminateAll() {
        for (const worker of this.workers) {
            worker.terminate();
        }
        this.workers = [];
        this.taskQueue = [];
        this.activeTasks.clear();
    }
}
