import {
    ChunkDataSchema,
    DesiredDirectionSchema,
    PositionSchema,
} from "@catfish/common/data/entity.ts";
import { PrimitiveObjectSchema } from "@catfish/common/data/objectData.ts";
import { entityQuery, type ECSWorld } from "@catfish/common/ecs.ts";
import { PLAYER_SPEED } from "@catfish/common/player.ts";
import { globalTicker } from "@catfish/common/Ticker.ts";
import { is } from "valibot";
import { CHUNK_SIZE } from "../constants";

export const movementSystem = (ecs: ECSWorld) => {
    const movement_query = entityQuery(ecs.onWorldLifecycle, (entity) => {
        return (
            is(PositionSchema, entity) &&
            is(DesiredDirectionSchema, entity) &&
            is(PrimitiveObjectSchema, entity)
        );
    });

    const chunks_query = entityQuery(ecs.onWorldLifecycle, (entity) => {
        return is(ChunkDataSchema, entity) && is(PositionSchema, entity);
    });

    const movement_system = ecs.addSystem(movement_query, (entities) => {
        for (let entity of entities) {
            let dirX = entity.desireDir.x;
            let dirY = entity.desireDir.y;
            const norm = Math.sqrt(dirX * dirX + dirY * dirY);
            if (norm !== 0) {
                dirX /= norm;
                dirY /= norm;
            }
            entity.x += dirX * globalTicker.deltaTime.value * PLAYER_SPEED;
            entity.z += dirY * globalTicker.deltaTime.value * PLAYER_SPEED;
            if (dirX !== 0 || dirY !== 0) {
                // region Calculate player Y based on terrain
                // TODO: Optimize this so its cached
                const chunk = chunks_query.entities.values().find((c) => {
                    return (
                        c.x <= entity.x &&
                        c.z <= entity.z &&
                        c.x + CHUNK_SIZE >= entity.x &&
                        c.z + CHUNK_SIZE >= entity.z
                    );
                });
                if (chunk) {
                    const localX = Math.floor(entity.x - chunk.x);
                    const localZ = Math.floor(entity.z - chunk.z);

                    const tileVerticeCount = 2 * 3 * 3;
                    const zOffset = Math.floor(
                        localZ * CHUNK_SIZE * tileVerticeCount
                    );
                    const xOffset = Math.floor(localX * tileVerticeCount);
                    const triangle = chunk.position.slice(
                        zOffset + xOffset,
                        zOffset + xOffset + tileVerticeCount
                    );
                    const tl = triangle[1]; // 0, 0
                    const tr = triangle[3 + 1]; // 1, 0
                    const bl = triangle[3 * 2 + 1]; // 0, 1
                    // const br = triangle[3 * 5 + 1]; // 1, 1

                    const tileLocalX = localX % 1;
                    const tileLocalZ = localZ % 1;

                    // Interpolate
                    entity.y =
                        tl + (bl - tl) * tileLocalZ + (tr - tl) * tileLocalX;
                    entity.y += 0.5;
                }
                // endregion

                ecs.markAsMutated(entity);
            }
        }
    });

    return () => {
        movement_system();
        movement_query.dispose();
    };
};
