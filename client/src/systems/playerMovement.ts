import { computed, effect, signal } from "@preact/signals";
import { socket } from "../socket";
import { camera } from "../rendering/camera";
import { Vector3 } from "three";
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

export const playerMovementSystem = () => {
    console.log("playerMovementSystem");
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

    return () => {
        disposeNetworkRequests();
    };
};
