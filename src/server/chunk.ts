import { ChunkWorkerManager } from "./chunk/ChunkWorkerManager";

export const CHUNK_SIZE = 32;

export class Chunk {
    data: Uint8Array;
    offsetX = 0;
    offsetY = 0;
    // csvMemo: string | undefined = undefined;

    constructor(o: { x: number; y: number; data?: Uint8Array } | undefined) {
        if (o?.data === undefined) {
            this.data = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
            this.data.fill(0);
        } else {
            this.data = o?.data;
        }
        if (o) {
            this.offsetX = o.x;
            this.offsetY = o.y;
        }
    }

    get(x: number, y: number): number {
        return this.data[y * CHUNK_SIZE + x];
    }

    set(x: number, y: number, v: number) {
        this.data[y * CHUNK_SIZE + x] = v;
        // this.c/svMemo = undefined;
    }

    toCSV() {
        const rows = new Array(CHUNK_SIZE);
        for (let i = 0; i < CHUNK_SIZE; i++) {
            const row = new Array(CHUNK_SIZE);
            for (let j = 0, k = i; j < CHUNK_SIZE; j++, k += CHUNK_SIZE) {
                row[j] = this.data[k];
            }
            rows[i] = row.join(",");
        }
        // this.csvMemo = rows.join("\n");
        // return this.csvMemo;
        return rows.join("\n");
    }

    to2DArray(): number[][] {
        const rows = new Array(CHUNK_SIZE);
        for (let i = 0; i < CHUNK_SIZE; i++) {
            const row = new Array(CHUNK_SIZE);
            for (let j = 0, k = i; j < CHUNK_SIZE; j++, k += CHUNK_SIZE) {
                row[j] = this.data[k];
            }
            rows[i] = row;
        }
        return rows;
    }
}

export class ChunkManager {
    chunks = new Map<string, Chunk>();
    computedChunks = new Set<string>();
    chunkWorkerMan = new ChunkWorkerManager();

    async setTile(x: number, y: number, v: number) {
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkY = Math.floor(y / CHUNK_SIZE);
        const chunk = await this.getChunk(chunkX, chunkY);
        chunk.set(x % CHUNK_SIZE, y % CHUNK_SIZE, v);
    }

    async getTile(x: number, y: number) {
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkY = Math.floor(y / CHUNK_SIZE);
        const chunk = await this.getChunk(chunkX, chunkY);
        if (chunk) {
            return chunk.get(x % CHUNK_SIZE, y % CHUNK_SIZE);
        }
        return undefined;
    }

    async genChunk(chunkX: number, chunkY: number) {
        const result = await this.chunkWorkerMan.runTask({
            chunkSize: CHUNK_SIZE,
            chunkX,
            chunkY,
        });
        const chunk = new Chunk({ x: chunkX, y: chunkY, data: result });

        const key = `${chunkX},${chunkY}`;
        this.chunks.set(key, chunk);
        this.computedChunks.add(key);
    }

    async getChunk(chunkX: number, chunkY: number) {
        const key = `${chunkX},${chunkY}`;
        const chunkKey = key;
        if (!this.computedChunks.has(chunkKey)) {
            await this.genChunk(chunkX, chunkY);
        }
        return this.chunks.get(chunkKey)!;
    }
}
