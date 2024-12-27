import { effect } from "@preact/signals";
import { keyboardOrSignal } from "../../client/input/events";
import type { GamePlayer } from "../../client/player";
import type { ClientSocket } from "../../client/socket";
import type { TileMapManager } from "../../client/tilemap";
import { PLAYER_SPEED } from "../player";
import { Ticker } from "../ticker/Ticker";
import { PlayerBehavior } from "./PlayerBehavior";
import { Camera } from "three";
import stats from "../../client/stats";

/**
 * Reconsiliates the player's position with the server's position
 */
export class CameraBehavior extends PlayerBehavior {
    left = keyboardOrSignal([{ key: "q" }, { key: "Q" }]);
    right = keyboardOrSignal([{ key: "e" }, { key: "E" }]);
    zoomIn = keyboardOrSignal([{ key: "z" }, { key: "Z" }]);
    zoomOut = keyboardOrSignal([{ key: "x" }, { key: "X" }]);
    cameraAngle = 0;
    targetCameraAngle = 0;
    cameraSpeed = 1;
    cameraDist = 10;
    targetCameraDist = 10;

    constructor(private gp: GamePlayer, ticker: Ticker, camera: Camera) {
        super(gp);

        effect(() => {
            ticker.currentTick.value;

            // Define bounds
            const minBound = 5;
            const maxBound = 20;
            const defaultSpeed = 3; // Base zoom speed

            // Determine zoom speed dynamically
            let zoomSpeed = defaultSpeed;

            if (this.zoomIn.value) {
                this.targetCameraDist -= zoomSpeed * ticker.deltaTime.value;
            }

            if (this.zoomOut.value) {
                this.targetCameraDist += defaultSpeed * ticker.deltaTime.value;
            }

            // Clamp target distance to avoid exceeding bounds
            this.targetCameraDist = Math.min(
                Math.max(this.targetCameraDist, minBound),
                maxBound
            );

            this.cameraDist +=
                (this.targetCameraDist - this.cameraDist) *
                ticker.deltaTime.value;
        });

        let justPressed = false;

        effect(() => {
            ticker.currentTick.value;

            const deltaTime = ticker.deltaTime.value;

            let cameraMoveDir = this.left.value - this.right.value;

            if (cameraMoveDir !== 0 && !justPressed) {
                justPressed = true;
                this.targetCameraAngle += (Math.PI / 4) * cameraMoveDir;
            } else if (cameraMoveDir === 0) {
                justPressed = false;
            }

            this.cameraAngle +=
                (this.targetCameraAngle - this.cameraAngle) * deltaTime * 4;
        });

        effect(() => {
            ticker.currentTick.value;

            const offsetX = Math.sin(this.cameraAngle) * this.cameraDist;
            const offsetZ = Math.cos(this.cameraAngle) * this.cameraDist;

            camera.position.set(
                (this.gp.player.x ?? 0) + offsetX,
                this.cameraDist,
                (this.gp.player.y ?? 0) + offsetZ
            );
            camera.lookAt(this.gp.player.x, 0, this.gp.player.y);
        });
    }
}
