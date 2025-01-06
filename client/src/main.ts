import { effect } from "@preact/signals";
import "./app.css";

import { newECSWorld } from "@catfish/common/ecs.js";
import { globalTicker } from "@catfish/common/Ticker.js";
import {
    Mesh,
    MeshBasicMaterial,
    OrthographicCamera,
    PerspectiveCamera,
    PlaneGeometry,
} from "three";
import { getDebugFlags } from "./debugFlags";
import { loginSeq, menuSeq } from "./menu";
import { camera } from "./rendering/camera";
import { globalScene } from "./rendering/renderer";
import { getSubTextureFromAtlas, spritesheetData } from "./rendering/textures";
import { windowAspect } from "./rendering/window";
import { socket } from "./socket";
import { cameraRotationSystem } from "./systems/camera";
import { causticsRenderingSystem } from "./systems/causticsRendering";
import { chunkRenderingSystem } from "./systems/chunkRendering";
import { playerInfoSystem } from "./systems/playerInfo";
import { playerMovementSystem } from "./systems/playerMovement";
import { skyboxSystem } from "./systems/skybox";
import { spriteRenderingSystem } from "./systems/spriteRendering";

document.addEventListener("contextmenu", function (event) {
    event.preventDefault(); // Prevent the default right-click menu
});

const threeScene = globalScene;

const addMenuBackground = () => {
    const menuBackgroundMat = new MeshBasicMaterial({
        map: getSubTextureFromAtlas("titlescreen_wide"),
    });
    const menuBackgroundAspect =
        spritesheetData.frames.titlescreen_wide.frame.w /
        spritesheetData.frames.titlescreen_wide.frame.h;

    const menuBackgroundGeometry = new PlaneGeometry(menuBackgroundAspect, 1);
    const catfishingTitlePanelMesh = new Mesh(
        menuBackgroundGeometry,
        menuBackgroundMat
    );
    globalScene.add(catfishingTitlePanelMesh);
    return () => {
        globalScene.remove(catfishingTitlePanelMesh);
    };
};

// Make sure camera covers title screen vertically

// region Title screen setup

// region Setup sequennce

camera.value = new OrthographicCamera(-1, 1, 0.5, -0.5, 0.1, 1000);
camera.value.position.z = 1;
const disposeMenu = addMenuBackground();
const computeWindowAspectEffect = effect(() => {
    if (camera.value instanceof OrthographicCamera) {
        const horizontalScale = windowAspect.value;
        camera.value.left = -0.5 * horizontalScale;
        camera.value.right = 0.5 * horizontalScale;
        camera.value.updateProjectionMatrix();
    }
});

const loginInfo = await loginSeq();
let nextScene = "";
if (!getDebugFlags().skipLogin.value) {
    nextScene = await menuSeq();
} else {
    console.log("Skipping Menu");
    nextScene = "game";
}
disposeMenu();
computeWindowAspectEffect();
// endregion

// Set up a simple scene

const game = async () => {
    const world = newECSWorld();

    // Update camera
    camera.value = new PerspectiveCamera(75, windowAspect.value, 0.1, 1000);

    const cleanUpCausticsSystem = causticsRenderingSystem(globalScene, world);
    const cleanUpRendering = spriteRenderingSystem(globalScene, world);
    const cleanUpCameraSystem = cameraRotationSystem(world, loginInfo.username);
    const cleanUpDebugPlayerInfoSystem = playerInfoSystem(
        world,
        loginInfo.username
    );
    const cleanUpChunkRenderingSystem = chunkRenderingSystem(
        globalScene,
        world
    );

    const cleanUpPlayerMovementSystem = playerMovementSystem();

    const p = skyboxSystem(globalScene);

    // endregion

    effect(() => {
        globalTicker.currentTick.value;
        world.tick();
    });

    socket.on("add_entity", (entity, ack) => {
        console.log("Adding entity", entity);
        world.addEntity(entity);
        ack();
    });

    socket.on("remove_entity", (entity, ack) => {
        console.log("Removing entity", entity);
        world.removeEntity(entity);
        ack();
    });

    socket.on("update_entity", (entity, ack) => {
        world.patchEntity(entity);
        ack();
    });

    const startT = Date.now();
    console.log("Emitting spawn");
    socket.emit("spawn", () => {
        const delta = Date.now() - startT;
        console.log("Spawned in", delta / 1000, "seconds");
    });

    return () => {
        cleanUpDebugPlayerInfoSystem();
        cleanUpRendering();
        cleanUpCausticsSystem();
        cleanUpCameraSystem();
        cleanUpPlayerMovementSystem();
        cleanUpChunkRenderingSystem();
    };
};

console.log("Next scene", nextScene);
if (nextScene === "game") {
    game();
} else {
    console.error("Unknown scene", nextScene);
}

// game();
