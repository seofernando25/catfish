import {
    DesiredDirectionSchema,
    PlayerControlledSchema,
} from "@catfish/common/data/entity.ts";
import type { PrimitiveObjectSchema } from "@catfish/common/data/objectData.js";
import { entityQuery, type ECSWorld } from "@catfish/common/ecs.ts";
import type { ServerClientSocket } from "@catfish/common/events/index.js";
import { is, type InferOutput } from "valibot";

export const mutateDesireDirSystem = <
    T extends InferOutput<typeof DesiredDirectionSchema> &
        InferOutput<typeof PrimitiveObjectSchema>
>(
    ecs: ECSWorld,
    player: T,
    sock: ServerClientSocket
) => {
    const player_entity_query = entityQuery(ecs.onWorldLifecycle, (entity) => {
        return is(PlayerControlledSchema, entity);
    });

    let toMoves: {
        player: T;
        desiredDir: { x: number; y: number };
    }[] = [];
    const cleanUpSystem = ecs.addSystem(player_entity_query, () => {
        for (const moveEntry of toMoves) {
            moveEntry.player.desireDir = moveEntry.desiredDir;
            ecs.markAsMutated(moveEntry.player);
        }
        toMoves = [];
    });

    const fn = (dir: { x: number; y: number }) => {
        toMoves.push({ player, desiredDir: dir });
    };

    sock.on("action_move", fn);

    return () => {
        cleanUpSystem();
        sock.off("action_move", fn);
    };
};
