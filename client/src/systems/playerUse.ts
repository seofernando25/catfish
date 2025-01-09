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
    use: signal(0),
};

// WASD and Arrow keys
window.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "F") {
        actions.use.value = 1;
    }
});

window.addEventListener("keyup", (e) => {
    if (e.key === "f" || e.key === "F") {
        actions.use.value = 0;
    }
});

export const playerUseSystem = () => {
    const disposeNetworkRequests = effect(() => {
        console.log("playerUseSystem effect", actions.use.value);
        socket.emit("action_use", Boolean(actions.use.value));
    });

    return () => {
        disposeNetworkRequests();
    };
};
