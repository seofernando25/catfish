import { effect, signal } from "@preact/signals";
import { Camera } from "three";
import { keyboardOrSignal } from "../../client/input/events";
import { GameObject } from "../../client/gameObject";
import { Ticker } from "../ticker/Ticker";
import { EntityBehavior } from "./PlayerBehavior";
import { inUI } from "./GameUIBehavior";
import { sampleContinentalness } from "../../server/procedural/continentalness";
import { inject, provide } from "../di";
import { camera } from "../../client/rendering/camera";
import { PlayerInfo, PlayerInfoSymbol } from "../player";

export const globalCameraDist = signal(10);

export class CameraBehavior extends EntityBehavior {
    playerInfo = inject<PlayerInfo>(PlayerInfoSymbol);
    left = keyboardOrSignal([{ key: "q" }, { key: "Q" }]);
    right = keyboardOrSignal([{ key: "e" }, { key: "E" }]);
    zoomIn = keyboardOrSignal([{ key: "z" }, { key: "Z" }]);
    zoomOut = keyboardOrSignal([{ key: "x" }, { key: "X" }]);
    cameraAngle = 0;
    targetCameraAngle = 0;
    cameraSpeed = 1;
    cameraDist = 10;
    targetCameraDist = 10;
    cameraYOffset = 0;
    targetCameraYOffset = 0;

    gp = inject(GameObject);
    ticker = inject(Ticker);
    camera = inject(Camera);

    constructor() {
        super();

        provide({
            provide: CameraBehavior,
            useValue: this,
        });

        effect(() => {
            this.ticker.currentTick.value;

            // Define bounds
            const minBound = 2;
            const maxBound = 15;
            const defaultSpeed = 5; // Base zoom speed

            // Determine zoom speed dynamically
            let zoomSpeed = defaultSpeed;

            if (this.zoomIn.value) {
                this.targetCameraDist -=
                    zoomSpeed * this.ticker.deltaTime.value;
            }

            if (this.zoomOut.value) {
                this.targetCameraDist +=
                    defaultSpeed * this.ticker.deltaTime.value;
            }

            // Clamp target distance to avoid exceeding bounds
            this.targetCameraDist = Math.min(
                Math.max(this.targetCameraDist, minBound),
                maxBound
            );

            this.targetCameraYOffset =
                sampleContinentalness(this.playerInfo.x, this.playerInfo.y) *
                    50 -
                25;

            this.cameraDist +=
                (this.targetCameraDist - this.cameraDist) *
                this.ticker.deltaTime.value *
                10;

            this.cameraYOffset +=
                (this.targetCameraYOffset - this.cameraYOffset) *
                this.ticker.deltaTime.value *
                10;
            globalCameraDist.value = this.cameraDist;
        });

        let justPressed = false;

        effect(() => {
            this.ticker.currentTick.value;

            if (inUI.value) {
                return;
            }

            const deltaTime = this.ticker.deltaTime.value;

            let cameraMoveDir = this.left.value - this.right.value;

            if (cameraMoveDir !== 0 && !justPressed) {
                justPressed = true;
                // PI / 4 ~ 45 degrees
                this.targetCameraAngle += (Math.PI / 4) * cameraMoveDir;
            } else if (cameraMoveDir === 0) {
                justPressed = false;
            }

            this.cameraAngle +=
                (this.targetCameraAngle - this.cameraAngle) * deltaTime * 4;
        });

        effect(() => {
            this.ticker.currentTick.value;

            const offsetX = Math.sin(this.cameraAngle) * this.cameraDist;
            const offsetZ = Math.cos(this.cameraAngle) * this.cameraDist;

            // FIXME: Not straightforward how to configure camera angle
            camera.position.set(
                (this.playerInfo.x ?? 0) + offsetX,
                this.cameraDist / 2 + this.cameraYOffset,
                (this.playerInfo.y ?? 0) + offsetZ
            );
            camera.lookAt(
                this.playerInfo.x,
                this.cameraYOffset,
                this.playerInfo.y
            );
        });
    }
}
