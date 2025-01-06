import { PositionSchema } from "@catfish/common/data/entity.js";
import { PrimitiveObjectSchema } from "@catfish/common/data/objectData.js";
import { entityQuery, type ECSWorld } from "@catfish/common/ecs.js";
import { custom, is, object, pipe, string } from "valibot";
import { tweakpaneRef } from "../stats";

export const playerInfoSystem = (world: ECSWorld, username: string) => {
    const playerInfoFolder = tweakpaneRef.addFolder({
        title: "Player Info",
        expanded: false,
    });

    const pInfo = {
        x: -1,
        y: -1,
        z: -1,
    };

    playerInfoFolder.addBinding(pInfo, "x", {
        label: "X",
        readonly: true,
    });

    playerInfoFolder.addBinding(pInfo, "y", {
        label: "Y",
        readonly: true,
    });

    playerInfoFolder.addBinding(pInfo, "z", {
        label: "Z",
        readonly: true,
    });

    const query = entityQuery(world.onWorldLifecycle, (entity) => {
        return (
            is(PrimitiveObjectSchema, entity) &&
            is(PositionSchema, entity) &&
            is(
                object({
                    name: pipe(
                        string(),
                        custom((v) => v === username)
                    ),
                }),
                entity
            )
        );
    });

    const system = world.addSystem(query, (entities) => {
        for (const entity of entities) {
            pInfo.x = entity.x;
            pInfo.y = entity.y;
            pInfo.z = entity.z;
        }
    });

    return () => {
        system();
        query.dispose();
        playerInfoFolder.dispose();
    };
};
