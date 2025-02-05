import type { PrimitiveObject } from "@catfish/common/data/objectData.ts";
import type { ServerClientSocket } from "@catfish/common/events/index.js";
import { serializeObject } from "@catfish/common/serializer.ts";

type EmitAddEntityWithRetryOptions = {
    socket: ServerClientSocket;
    entity: PrimitiveObject;
    maxRetries?: number;
    timeout?: number;
};

export type EmitAddEntityResult = {
    success: boolean;
    attempts: number;
    error?: string;
};

const addEntityQueue: (EmitAddEntityWithRetryOptions & {
    resolve: (result: Promise<EmitAddEntityResult>) => void;
})[] = [];
const sendQueueBatchSize = 100;
const sendQueueInterval = 50;

setInterval(() => {
    if (addEntityQueue.length === 0) {
        return;
    }
    console.log(`Sending ${addEntityQueue.length} entities`);

    const batch = addEntityQueue.splice(0, sendQueueBatchSize);
    batch.forEach((options) => {
        options.resolve(emitAddEntityWithRetryImpl(options));
    });
}, sendQueueInterval);

function entityToArrayBuffer(entity: PrimitiveObject): ArrayBuffer {
    const serialized = serializeObject(entity);
    const compressed = Bun.gzipSync(serialized);
    return new Uint8Array(compressed).buffer as ArrayBuffer;
}

async function emitAddEntityWithRetryImpl({
    socket,
    entity,
    maxRetries = 5,
    timeout = 2000,
}: EmitAddEntityWithRetryOptions): Promise<EmitAddEntityResult> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            await new Promise<void>((resolve, reject) => {
                socket
                    .timeout(timeout)
                    .emit(
                        "add_entity",
                        entityToArrayBuffer(entity),
                        (err?: Error) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        }
                    );
            });
            return { success: true, attempts: attempt + 1 };
        } catch (err) {
            if (attempt === maxRetries - 1) {
                console.error(
                    `"add_entity" failed after ${maxRetries} attempts`
                );
                return {
                    success: false,
                    attempts: maxRetries,
                    error: err instanceof Error ? err.message : "Unknown error",
                };
            } else {
                console.error(
                    `"add_entity" failed on attempt ${attempt + 1}: ${err}`
                );
            }

            // Optional: Add delay before retrying
            await new Promise((res) => setTimeout(res, 500));
        }
    }
    return { success: false, attempts: maxRetries, error: "Unhandled failure" };
}

export async function emitAddEntityWithRetry(
    options: EmitAddEntityWithRetryOptions
): Promise<EmitAddEntityResult> {
    return new Promise((resolve) => {
        addEntityQueue.push({ ...options, resolve });
    });
}

export type EmitRemoveEntityResult = {
    success: boolean;
    attempts: number;
    error?: string;
};

export async function emitRemoveEntityWithRetry({
    socket,
    id,
    maxRetries = 5,
    timeout = 2000,
}: {
    socket: ServerClientSocket;
    id: number;
    maxRetries?: number;
    timeout?: number;
}): Promise<EmitRemoveEntityResult> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            await new Promise<void>((resolve, reject) => {
                socket
                    .timeout(timeout)
                    .emit("remove_entity", id, (err?: Error) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
            });
            return { success: true, attempts: attempt + 1 };
        } catch (err) {
            if (attempt === maxRetries - 1) {
                console.error(
                    `"remove_entity" failed after ${maxRetries} attempts`
                );
                return {
                    success: false,
                    attempts: maxRetries,
                    error: err instanceof Error ? err.message : "Unknown error",
                };
            }
            // Delay before retrying
            await new Promise((res) => setTimeout(res, 100));
        }
    }
    return { success: false, attempts: maxRetries, error: "Unhandled failure" };
}

export type EmitUpdateEntityResult = {
    success: boolean;
    attempts: number;
    error?: string;
};

export async function emitUpdateEntityWithRetry({
    socket,
    entity,
    maxRetries = 5,
    timeout = 2000,
}: {
    socket: ServerClientSocket;
    entity: PrimitiveObject;
    maxRetries?: number;
    timeout?: number;
}): Promise<EmitUpdateEntityResult> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            await new Promise<void>((resolve, reject) => {
                socket
                    .timeout(timeout)
                    .emit(
                        "update_entity",
                        entityToArrayBuffer(entity),
                        (err?: Error) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        }
                    );
            });
            return { success: true, attempts: attempt + 1 };
        } catch (err) {
            if (attempt === maxRetries - 1) {
                // console.error(
                //     `"update_entity" failed after ${maxRetries} attempts`
                // );
                return {
                    success: false,
                    attempts: maxRetries,
                    error: err instanceof Error ? err.message : "Unknown error",
                };
            }
            // Optional: Add delay before retrying
            await new Promise((res) => setTimeout(res, 500));
        }
    }
    return { success: false, attempts: maxRetries, error: "Unhandled failure" };
}
