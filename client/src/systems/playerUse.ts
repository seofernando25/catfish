import {
    DesiredDirectionSchema,
    RenderSpriteSchema,
} from "@catfish/common/data/entity.js";
import { entityQuery, type ECSWorld } from "@catfish/common/ecs.js";
import { computed, effect, signal } from "@preact/signals";
import { custom, is, object, pipe, string } from "valibot";
import { socket } from "../socket";
import { cameraDir } from "./camera";
import { lvsDevice } from "../rumble";

const actions = {
    use: signal(0),
};

let useBusy = false;
window.addEventListener("keydown", (e) => {
    // Use key pressed
    if (e.key === "f" || e.key === "F") {
        actions.use.value = 1;

        (async () => {
            if (lvsDevice.value && !useBusy) {
                useBusy = true;
                await lvsDevice.value.vibrate(0);
                await lvsDevice.value.vibrate(0.5);
                await new Promise((resolve) => setTimeout(resolve, 50));
                await lvsDevice.value.vibrate(0);
                useBusy = false;
            }
        })();
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
