import { effect } from "@preact/signals";
import {
    Mesh,
    MeshBasicMaterial,
    OrthographicCamera,
    PlaneGeometry,
} from "three";
import "./app.css";
import { loginSeq, menuSeq } from "./menu";
import { showMenu } from "./menu/Menu";
import { navigateToScreen, setUsername, type MenuScreen } from "./menu/state/menuState";
import { camera } from "./rendering/camera";
import { globalScene } from "./rendering/renderer";
import { getSubTextureFromAtlas, spritesheetData } from "./rendering/textures";
import { windowAspect } from "./rendering/window";

document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
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

async function startGameSequence() {
    // region Setup sequence
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




    try {
        // Step 1: Handle login
        const loginInfo = await loginSeq();

        if (!loginInfo.success) {
            console.error("Login failed:", loginInfo.message);
            return;
        }

        if (!loginInfo.username) {
            console.error("No username provided after login");
            return;
        }

        // Step 2: Show menu sequence first
        await menuSeq();

        // Step 3: Update menu state with login info
        setUsername(loginInfo.username);
        navigateToScreen(localStorage.getItem('menuScreen') as MenuScreen || 'menu');
        showMenu();
    } catch (error) {
        console.error("Error during game sequence:", error);
    }
}

// Start the game sequence
startGameSequence();
