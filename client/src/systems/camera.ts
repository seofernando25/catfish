import {
    PositionSchema,
    RenderSpriteSchema,
} from "@catfish/common/data/entity.js";
import { PrimitiveObjectSchema } from "@catfish/common/data/objectData.js";
import { entityQuery, type ECSWorld } from "@catfish/common/ecs.js";
import { custom, is, object, pipe, string } from "valibot";
import { camera } from "../rendering/camera";
import { effect, signal, untracked } from "@preact/signals";
import { spritesheetData } from "../rendering/textures";
import { globalTicker } from "@catfish/common/Ticker.js";

const actions = {
    camRotLeftButton: signal(0),
    camRotRightButton: signal(0),
};

export const cameraDir = signal(Math.PI / 2);

// Use ArrowLeft and ArrowRight to rotate the camera
// but also Q and E for convenience
window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
        actions.camRotLeftButton.value = 1;
    }
    if (e.key === "ArrowRight") {
        actions.camRotRightButton.value = 1;
    }
    if (e.key === "q" || e.key === "Q") {
        actions.camRotLeftButton.value = 1;
    }

    if (e.key === "e" || e.key === "E") {
        actions.camRotRightButton.value = 1;
    }
});

window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") {
        actions.camRotLeftButton.value = 0;
    }
    if (e.key === "ArrowRight") {
        actions.camRotRightButton.value = 0;
    }
    if (e.key === "q" || e.key === "Q") {
        actions.camRotLeftButton.value = 0;
    }

    if (e.key === "e" || e.key === "E") {
        actions.camRotRightButton.value = 0;
    }
});

export const cameraRotationSystem = (world: ECSWorld, username: string) => {
    let desiredCameraDir = Math.PI / 2;

    let camRotLeft = actions.camRotLeftButton;
    let camRotRight = actions.camRotRightButton;

    const updateDesiredCameraEffect = effect(() => {
        desiredCameraDir += (camRotLeft.value * Math.PI) / 4;
        desiredCameraDir -= (camRotRight.value * Math.PI) / 4;
    });

    const query = entityQuery(world.onWorldLifecycle, (entity) => {
        return (
            is(PrimitiveObjectSchema, entity) &&
            is(PositionSchema, entity) &&
            is(RenderSpriteSchema, entity) &&
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

    const updateCameraDirEffect = effect(() => {
        globalTicker.currentTick.value;
        const t = 0.1;
        untracked(() => {
            cameraDir.value = cameraDir.value * (1 - t) + desiredCameraDir * t;
        });
    });

    const system = world.addSystem(query, (entities) => {
        for (const entity of entities) {
            const t = 0.1;
            const x = Math.cos(cameraDir.value);
            const z = Math.sin(cameraDir.value);

            camera.value.position.x = entity.x + x * 5;
            camera.value.position.y = entity.y + 2;
            camera.value.position.z = entity.z - z * 5;
            camera.value.lookAt(entity.x, entity.y, entity.z);
        }
    });

    return () => {
        updateDesiredCameraEffect();
        system();
        query.dispose();
    };
};
