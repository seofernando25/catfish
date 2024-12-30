import { ChunkWorkerManager } from "./chunk/ChunkWorkerManager";

export const CHUNK_SIZE = 64;
export const CHUNK_RANGE = 8;

export class Chunk {
    data: Uint8Array;
    heightData: Float32Array;
    // csvMemo: string | undefined = undefined;

    constructor(
        o:
            | {
                  x: number;
                  y: number;
                  data?: Uint8Array;
                  heightData?: Float32Array;
              }
            | undefined
    ) {
        if (o?.data === undefined) {
            this.data = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
            this.data.fill(0);
        } else {
            this.data = o?.data;
        }

        if (o?.heightData === undefined) {
            this.heightData = new Float32Array(CHUNK_SIZE * CHUNK_SIZE);
            this.heightData.fill(0);
        } else {
            this.heightData = o?.heightData;
        }
    }

    get(x: number, y: number): number {
        x = x % CHUNK_SIZE;
        y = y % CHUNK_SIZE;
        x = (x + CHUNK_SIZE) % CHUNK_SIZE;
        y = (y + CHUNK_SIZE) % CHUNK_SIZE;
        return this.data[y * CHUNK_SIZE + x];
    }

    set(x: number, y: number, v: number) {
        x = x % CHUNK_SIZE;
        y = y % CHUNK_SIZE;
        x = (x + CHUNK_SIZE) % CHUNK_SIZE;
        y = (y + CHUNK_SIZE) % CHUNK_SIZE;

        this.data[y * CHUNK_SIZE + x] = v;
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

    toHeight2DArray(): number[][] {
        const rows = new Array(CHUNK_SIZE);
        for (let i = 0; i < CHUNK_SIZE; i++) {
            const row = new Array(CHUNK_SIZE);
            for (let j = 0, k = i; j < CHUNK_SIZE; j++, k += CHUNK_SIZE) {
                row[j] = this.heightData[k];
            }
            rows[i] = row;
        }
        return rows;
    }

    toHeightCSV() {
        const rows = new Array(CHUNK_SIZE);
        for (let i = 0; i < CHUNK_SIZE; i++) {
            const row = new Array(CHUNK_SIZE);
            for (let j = 0, k = i; j < CHUNK_SIZE; j++, k += CHUNK_SIZE) {
                row[j] = this.heightData[k];
            }
            rows[i] = row.join(",");
        }
        return rows.join("\n");
    }
}

export class ChunkManager {
    chunks = new Map<string, Chunk>();
    computedChunks = new Set<string>();
    chunkWorkerMan = new ChunkWorkerManager();

    async setTile(x: number, y: number, v: number) {
        x = Math.floor(x);
        y = Math.floor(y);
        const chunkX = x / CHUNK_SIZE;
        const chunkY = y / CHUNK_SIZE;
        const chunk = await this.getChunk(chunkX, chunkY);
        chunk.set(x, y, v);
    }

    async getTile(x: number, y: number) {
        x = Math.floor(x);
        y = Math.floor(y);
        const chunkX = x / CHUNK_SIZE;
        const chunkY = y / CHUNK_SIZE;
        const chunk = await this.getChunk(chunkX, chunkY);
        if (chunk) {
            return chunk.get(x, y);
        }
        console.error("Chunk not found");
        return undefined;
    }

    async genChunk(chunkX: number, chunkY: number) {
        chunkX = Math.floor(chunkX);
        chunkY = Math.floor(chunkY);
        const result = await this.chunkWorkerMan.runTask({
            chunkSize: CHUNK_SIZE,
            chunkX,
            chunkY,
        });
        const chunk = new Chunk({
            x: chunkX,
            y: chunkY,
            data: result.tiles,
            heightData: result.heights,
        });

        const key = `${chunkX},${chunkY}`;
        this.chunks.set(key, chunk);
        this.computedChunks.add(key);
    }

    async getChunk(chunkX: number, chunkY: number) {
        chunkX = Math.floor(chunkX);
        chunkY = Math.floor(chunkY);
        const key = `${chunkX},${chunkY}`;
        const chunkKey = key;
        if (!this.computedChunks.has(chunkKey)) {
            await this.genChunk(chunkX, chunkY);
        }
        return this.chunks.get(chunkKey)!;
    }
}
