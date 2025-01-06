import {
    PositionSchema,
    DesiredDirectionSchema,
} from "@catfish/common/data/entity.ts";
import { PrimitiveObjectSchema } from "@catfish/common/data/objectData.ts";
import { entityQuery, type ECSWorld } from "@catfish/common/ecs.ts";
import { PLAYER_SPEED } from "@catfish/common/player.ts";
import { globalTicker } from "@catfish/common/Ticker.ts";
import { is } from "valibot";

export const movementSystem = (ecs: ECSWorld) => {
    const movement_query = entityQuery(ecs.onWorldLifecycle, (entity) => {
        return (
            is(PositionSchema, entity) &&
            is(DesiredDirectionSchema, entity) &&
            is(PrimitiveObjectSchema, entity)
        );
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
                ecs.markAsMutated(entity);
            }
        }
    });

    return () => {
        movement_system();
        movement_query.dispose();
    };
};
