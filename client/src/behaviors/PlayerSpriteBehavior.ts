import { effect } from "@preact/signals";
import {
    ArrowHelper,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    Quaternion,
    Scene,
    SphereGeometry,
    Vector2,
    Vector3,
} from "three";
import { CameraBehavior } from "../behaviors/CameraBehavior";
import stats from "../stats";
import { getSubTextureFromAtlas, spritesheetData } from "../rendering/textures";
import { DIRECTIONS, getDirection } from "@catfish/common/angle";
import { inject } from "@catfish/common/di/index";
import { Ticker } from "@catfish/common/Ticker";
import { EntityBehavior } from "@catfish/common/behaviors/PlayerBehavior";
import { type PlayerInfo, PlayerInfoSymbol } from "@catfish/common/player";
import { GameObject } from "@catfish/common/sim/gameObject";
import { TileMapManager, TileMapManagerSymbol } from "../tilemap";
import { CHUNK_SIZE } from "@catfish/common/constants";

export class PlayerSpriteBehavior extends EntityBehavior {
    playerInfo = inject<PlayerInfo>(PlayerInfoSymbol);
    charL = new MeshBasicMaterial({
        map: getSubTextureFromAtlas("astrocatL"),
        alphaTest: 0.5,
        side: 2,
        transparent: true,
    });

    charR = new MeshBasicMaterial({
        map: getSubTextureFromAtlas("astrocatR"),
        alphaTest: 0.5,
        side: 2,
        transparent: true,
    });

    charF = new MeshBasicMaterial({
        map: getSubTextureFromAtlas("astrocatF"),
        alphaTest: 0.5,
        side: 2,
        transparent: true,
    });

    charB = new MeshBasicMaterial({
        map: getSubTextureFromAtlas("astrocatB"),
        alphaTest: 0.5,
        transparent: true,
        side: 2,
    });

    private imageAspect =
        spritesheetData.frames.astrocatB.frame.w /
        spritesheetData.frames.astrocatB.frame.h;

    playerMesh = new Mesh(
        new PlaneGeometry(this.imageAspect, 1),

        this.charF
    );

    go = inject(GameObject);
    scene = inject(Scene);
    ticker = inject(Ticker);
    camBehavior = inject(CameraBehavior);

    tileMapMan = inject<TileMapManager>(TileMapManagerSymbol);

    constructor() {
        super();
        this.scene.add(this.playerMesh);
        this.playerMesh.geometry.center();

        let lastX = 0;
        let lastY = 0;
        let lastCameraAngle = 0;
        let lastDir = 0;

        const sphere = new Mesh(
            new SphereGeometry(0.25, 32, 32),
            new MeshBasicMaterial({ color: 0x111111 })
        );

        this.scene.add(sphere);

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

        let alwaysLastX = 0;
        let alwaysLastY = 0;

        effect(() => {
            this.ticker.currentTick.value;
            stats.CamAngle = this.camBehavior?.cameraAngle ?? 0;

            let px = this.playerInfo.x;
            let py = this.playerInfo.y;

            let actualDist = Math.sqrt(
                (px - alwaysLastX) ** 2 + (py - alwaysLastY) ** 2
            );

            alwaysLastX = px;
            alwaysLastY = py;

            let dx = px - lastX;
            let dy = py - lastY;

            let len = Math.sqrt(dx * dx + dy * dy);
            dx /= len || 1;
            dy /= len || 1;

            let cameraAngle = this.camBehavior?.cameraAngle ?? 0;
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
                        this.playerMesh.material = this.charF;
                        break;
                    case DIRECTIONS.RIGHT:
                        this.playerMesh.material = this.charR;
                        break;
                    case DIRECTIONS.LEFT:
                        this.playerMesh.material = this.charL;
                        break;
                    case DIRECTIONS.DOWN:
                        this.playerMesh.material = this.charB;
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
            const meshY = lerp(1, 1 + offset.y, transitionPercent);
            const scaleX = lerp(1, 1 + squish, transitionPercent);
            const scaleY = lerp(1, 1 - squish * 0.5, transitionPercent);

            const chunkX = Math.floor(this.playerInfo.x / CHUNK_SIZE);
            const chunkY = Math.floor(this.playerInfo.y / CHUNK_SIZE);
            const relX = this.playerInfo.x % CHUNK_SIZE;
            const relY = this.playerInfo.y % CHUNK_SIZE;
            const relXFloor = Math.floor(relX);
            const relYFloor = Math.floor(relY);
            const relNormX = relX - relXFloor;
            const relNormY = relY - relYFloor;

            const chunkHeightMap = this.tileMapMan.getHeightMapForChunk(
                chunkX,
                chunkY
            );
            let floorOffset = 0;
            let floorNormal = new Vector3(0, 1, 0);
            if (chunkHeightMap !== undefined) {
                const tileHeight =
                    chunkHeightMap[relYFloor * CHUNK_SIZE + relXFloor];
                if (tileHeight === undefined) {
                    return;
                }
                const tileTlHeight = tileHeight[0];
                const tileTrHeight = tileHeight[1];
                const tileBlHeight = tileHeight[2];
                const tileBrHeight = tileHeight[3];

                const x1 = lerp(tileTlHeight, tileTrHeight, relNormX);
                const x2 = lerp(tileBlHeight, tileBrHeight, relNormX);
                const y = lerp(x1, x2, relNormY);

                floorOffset = y;

                const tlVec = new Vector3(0, tileTlHeight, 0);
                const trVec = new Vector3(1, tileTrHeight, 0);
                const blVec = new Vector3(0, tileBlHeight, 1);
                const brVec = new Vector3(1, tileBrHeight, 1);

                // Calculate normals for the two triangles that form the tile
                const normal1 = new Vector3()
                    .crossVectors(
                        new Vector3().subVectors(trVec, tlVec), // Edge from top-left to top-right
                        new Vector3().subVectors(blVec, tlVec) // Edge from top-left to bottom-left
                    )
                    .normalize();

                const normal2 = new Vector3()
                    .crossVectors(
                        new Vector3().subVectors(brVec, trVec), // Edge from top-right to bottom-right
                        new Vector3().subVectors(blVec, trVec) // Edge from top-right to bottom-left
                    )
                    .normalize();

                // Average the two normals
                floorNormal = new Vector3()
                    .addVectors(normal1, normal2)
                    .normalize()
                    .negate();
            } else {
                floorOffset = 0;
            }

            this.playerMesh.scale.set(scaleX, scaleY, 1);
            this.playerMesh.position.set(
                this.playerInfo.x,
                meshY + floorOffset - 0.5,
                this.playerInfo.y
            );

            // Step 1: Align the quad to the terrain normal
            const up = new Vector3(0, 1, 0); // World up vector
            const quaternion = new Quaternion(); // To hold the rotation

            quaternion.setFromUnitVectors(up, floorNormal); // Align the 'up' vector to the floorNormal

            // Apply the rotation to the mesh
            this.playerMesh.quaternion.copy(quaternion);

            // Step 2: Face the camera
            const camAngle = this.camBehavior?.cameraAngle ?? 0; // Camera angle in the world
            this.playerMesh.rotateOnWorldAxis(floorNormal, camAngle);

            if (this.ticker.currentTick.value % 60 === 0) {
                const arrowHelper = new ArrowHelper(
                    floorNormal,
                    this.playerMesh.position,
                    1,
                    0x00ff00
                );
                this.scene.add(arrowHelper);
                console.log("Normal:", floorNormal);
            }

            stats.px = this.playerInfo.x ?? -1;
            stats.py = this.playerInfo.y ?? -1;
        });
    }

    dispose(): void {
        this.scene.remove(this.playerMesh);
    }
}
