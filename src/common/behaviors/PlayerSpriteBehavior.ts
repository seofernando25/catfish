import { effect } from "@preact/signals";
import {
    Mesh,
    MeshBasicMaterial,
    Scene,
    SphereGeometry,
    Sprite,
    SpriteMaterial,
    Vector2,
} from "three";
import { GameObject } from "../../client/gameObject";
import {
    getSubTextureFromAtlas,
    spritesheetData,
} from "../../client/rendering/textures";
import stats from "../../client/stats";
import { DIRECTIONS, getDirection } from "../angle";
import { Ticker } from "../ticker/Ticker";
import { CameraBehavior } from "./CameraBehavior";
import { EntityBehavior } from "./PlayerBehavior";
import { sampleContinentalness } from "../../server/procedural/continentalness";
import { inject } from "../di";
import { PlayerInfo, PlayerInfoSymbol } from "../player";

export class PlayerSpriteBehavior extends EntityBehavior {
    playerInfo = inject<PlayerInfo>(PlayerInfoSymbol);
    charL = new SpriteMaterial({
        map: getSubTextureFromAtlas("astrocatL"),
        alphaTest: 0.5,
        transparent: true,
    });

    charR = new SpriteMaterial({
        map: getSubTextureFromAtlas("astrocatR"),
        alphaTest: 0.5,
        transparent: true,
    });

    charF = new SpriteMaterial({
        map: getSubTextureFromAtlas("astrocatF"),
        alphaTest: 0.5,
        transparent: true,
    });

    charB = new SpriteMaterial({
        map: getSubTextureFromAtlas("astrocatB"),
        alphaTest: 0.5,
        transparent: true,
    });

    sprite = new Sprite(this.charF);

    go = inject(GameObject);
    scene = inject(Scene);
    ticker = inject(Ticker);
    camBehavior = inject(CameraBehavior);

    constructor() {
        super();
        this.scene.add(this.sprite);
        this.sprite.center.set(0.5, 0.75);

        let lastX = 0;
        let lastY = 0;
        let lastCameraAngle = 0;
        let lastDir = 0;

        // set sprite aspect ratio to be of image
        const imageAspect =
            spritesheetData.frames.astrocatB.frame.w /
            spritesheetData.frames.astrocatB.frame.h;

        const sphere = new Mesh(
            new SphereGeometry(0.25, 32, 32),
            new MeshBasicMaterial({ color: 0x111111 })
        );

        this.scene.add(sphere);

        let cameraBehavior: CameraBehavior | undefined;

        // queueMicrotask(() => {
        //     // Find CameraBehavior
        //     const camBehavior = this.go.behaviors.find(
        //         (b) => b instanceof CameraBehavior
        //     );
        //     if (camBehavior === undefined) {
        //         console.error("CameraBehavior not found");
        //     }

        //     cameraBehavior = camBehavior;
        // });

        const normalizeAngle = (angle) => {
            return ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        };

        const smallestAngleDiff = (angle1, angle2) => {
            let diff = normalizeAngle(angle1 - angle2);
            if (diff > Math.PI) {
                diff -= 2 * Math.PI;
            }
            return diff;
        };

        const animationParams = {
            bobbingAmplitude: 0.05 * 1,
            bobbingFrequency: 5 * 5,
            squishAmplitude: 0.02 * 1,
            squishFrequency: 5 * 5,
        };

        const lerp = (start, end, alpha) => start + (end - start) * alpha;
        const offset = new Vector2(0, 0);
        let transitionPercent = 0;

        // FIXME: Somehow just using alwaysLastX and alwaysLastY
        // breaks the direction of the sprite when the camera is rotated
        let alwaysLastX = 0;
        let alwaysLastY = 0;

        effect(() => {
            this.ticker.currentTick.value;
            stats.CamAngle = cameraBehavior?.cameraAngle ?? 0;

            let px = this.playerInfo.x;
            let py = this.playerInfo.y;

            let actualDist = Math.sqrt(
                (px - alwaysLastX) ** 2 + (py - alwaysLastY) ** 2
            );

            alwaysLastX = px;
            alwaysLastY = py;

            let dx = px - lastX;
            let dy = py - lastY;

            // Normalize
            let len = Math.sqrt(dx * dx + dy * dy);
            dx /= len || 1;
            dy /= len || 1;

            let cameraAngle = cameraBehavior?.cameraAngle ?? 0;
            let cameraAngleDelta = Math.abs(
                smallestAngleDiff(cameraAngle, lastCameraAngle)
            );

            if (len > 0.1 || cameraAngleDelta > 0.1) {
                if (len > 0.1) {
                    lastDir = Math.atan2(dy, dx);
                }

                stats.PlayerDir = lastDir;

                lastCameraAngle = cameraAngle;
                lastX = px;
                lastY = py;

                let angleDiff = normalizeAngle(
                    cameraAngle + lastDir + Math.PI / 2
                );

                const direction = getDirection(angleDiff);

                switch (direction) {
                    case DIRECTIONS.UP:
                        this.sprite.material = this.charF;
                        break;
                    case DIRECTIONS.RIGHT:
                        this.sprite.material = this.charR;
                        break;
                    case DIRECTIONS.DOWN:
                        this.sprite.material = this.charB;
                        break;
                    case DIRECTIONS.LEFT:
                        this.sprite.material = this.charL;
                        break;

                    default:
                        break;
                }
            }

            sphere.position.set(this.playerInfo.x, 0, this.playerInfo.y);

            const elapsed =
                this.ticker.currentTick.value * this.ticker.deltaTime.value;

            const isMoving = actualDist > 0.05;
            offset.y =
                animationParams.bobbingAmplitude *
                Math.sin(elapsed * animationParams.bobbingFrequency);
            const squish =
                animationParams.squishAmplitude *
                Math.sin(elapsed * animationParams.squishFrequency);

            if (isMoving) {
                transitionPercent += this.ticker.deltaTime.value * 10;
            } else {
                transitionPercent -= this.ticker.deltaTime.value * 10;
            }

            transitionPercent = Math.min(1, Math.max(0, transitionPercent));
            const spriteY = lerp(1, 1 + offset.y, transitionPercent);
            const scaleX = lerp(1, 1 + squish, transitionPercent);
            const scaleY = lerp(1, 1 - squish * 0.5, transitionPercent);
            const scaleZ = lerp(1, 1 + squish, transitionPercent);

            const floorOffset =
                sampleContinentalness(this.playerInfo.x, this.playerInfo.y) *
                    50 -
                25;

            this.sprite.scale.set(imageAspect * scaleX, scaleY, scaleZ);
            this.sprite.position.set(
                this.playerInfo.x,
                spriteY + floorOffset,
                this.playerInfo.y
            );

            stats.px = this.playerInfo.x ?? -1;
            stats.py = this.playerInfo.y ?? -1;
        });

        // Bobbing
    }

    dispose(): void {
        this.scene.remove(this.sprite);
    }
}
