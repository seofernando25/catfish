import {
    DesiredDirectionSchema,
    RenderSpriteSchema,
} from "@catfish/common/data/entity.js";
import { entityQuery, type ECSWorld } from "@catfish/common/ecs.js";
import { computed, effect, signal } from "@preact/signals";
import { custom, is, object, pipe, string } from "valibot";
import { socket } from "../socket";
import { cameraDir } from "./camera";

const actions = {
    left: signal(0),
    right: signal(0),
    up: signal(0),
    down: signal(0),
};

// WASD and Arrow keys
window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
        actions.left.value = 1;
    }
    if (e.key === "ArrowRight") {
        actions.right.value = 1;
    }
    if (e.key === "ArrowUp") {
        actions.up.value = 1;
    }
    if (e.key === "ArrowDown") {
        actions.down.value = 1;
    }

    if (e.key === "w" || e.key === "W") {
        actions.up.value = 1;
    }
    if (e.key === "a" || e.key === "A") {
        actions.left.value = 1;
    }
    if (e.key === "s" || e.key === "S") {
        actions.down.value = 1;
    }
    if (e.key === "d" || e.key === "D") {
        actions.right.value = 1;
    }
});

window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") {
        actions.left.value = 0;
    }
    if (e.key === "ArrowRight") {
        actions.right.value = 0;
    }
    if (e.key === "ArrowUp") {
        actions.up.value = 0;
    }
    if (e.key === "ArrowDown") {
        actions.down.value = 0;
    }

    if (e.key === "w" || e.key === "W") {
        actions.up.value = 0;
    }
    if (e.key === "a" || e.key === "A") {
        actions.left.value = 0;
    }
    if (e.key === "s" || e.key === "S") {
        actions.down.value = 0;
    }
    if (e.key === "d" || e.key === "D") {
        actions.right.value = 0;
    }
});

export const playerMovementSystem = (world: ECSWorld, username: string) => {
    const playerQuery = entityQuery(world.onWorldLifecycle, (entity) => {
        return (
            is(DesiredDirectionSchema, entity) &&
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

    const xDir = computed(() => actions.right.value - actions.left.value);
    const yDir = computed(() => actions.down.value - actions.up.value);
    const angle = computed(() => cameraDir.value);
    const rotatedX = computed(
        () =>
            xDir.value * Math.cos(angle.value) +
            yDir.value * Math.sin(angle.value)
    );
    const rotatedY = computed(
        () =>
            yDir.value * Math.cos(angle.value) -
            xDir.value * Math.sin(angle.value)
    );

    const disposeNetworkRequests = effect(() => {
        socket.emit("action_move", {
            x: rotatedY.value,
            y: -rotatedX.value,
        });
    });

    const system = world.addSystem(playerQuery, (entities) => {
        let count = 0;
        for (const entity of entities) {
            count++;
            entity.desireDir.x = rotatedY.value;
            entity.desireDir.y = -rotatedX.value;
            entity.spriteInterpolation = 0.5;
        }
        if (count > 1) {
            console.error(
                "More than one player entity found for username",
                username
            );
        }
    });

    return () => {
        disposeNetworkRequests();
        system();
    };
};
