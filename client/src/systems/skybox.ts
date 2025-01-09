import { effect } from "@preact/signals";
import { Scene, SphereGeometry, MeshBasicMaterial, Mesh } from "three";
import { camera } from "../rendering/camera";
import { skyboxTexture } from "../rendering/textures";
import { globalTicker } from "@catfish/common/Ticker.js";

export const skyboxSystem = (scene: Scene) => {
    const skybox = new SphereGeometry(800, 32, 32);
    const skyboxMat = new MeshBasicMaterial({
        map: skyboxTexture,
        color: 0x416f72,
        side: 1,
    });
    const skyboxMesh = new Mesh(skybox, skyboxMat);
    scene.add(skyboxMesh);

    const moveSkyboxDipose = effect(() => {
        globalTicker.currentTick.value;
        skyboxMesh.position.x = camera.value.position.x;
        skyboxMesh.position.y = camera.value.position.y;
        skyboxMesh.position.z = camera.value.position.z;
    });

    return () => {
        moveSkyboxDipose();
        scene.remove(skyboxMesh);
    };
};
