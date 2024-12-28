import { effect } from "@preact/signals";
import { Scene, WebGLRenderer } from "three";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import {
    EffectComposer,
    OutputPass,
    RenderPass,
} from "three/examples/jsm/Addons.js";
import { globalCameraDist } from "../../common/behaviors/CameraBehavior";
import { camera } from "./camera";
import { windowHeight, windowPixelRatio, windowWidth } from "./window";

export const renderer = new WebGLRenderer({});
document.body.appendChild(renderer.domElement);
document.body.style.overflow = "hidden";

export const globalScene = new Scene();
export const composer = new EffectComposer(renderer);

composer.addPass(new RenderPass(globalScene, camera));

const bokehPass = new BokehPass(globalScene, camera, {
    focus: globalCameraDist.value,
    aperture: 0.0001,
    maxblur: 0.01,
});

effect(() => {
    bokehPass.uniforms["focus"].value = globalCameraDist.value;
});

const outputPass = new OutputPass();

composer.addPass(bokehPass);
composer.addPass(outputPass);

effect(() => {
    renderer.setPixelRatio(windowPixelRatio.value);
    renderer.setSize(windowWidth.value, windowHeight.value);
    composer.setSize(windowWidth.value, windowHeight.value);
});

renderer.setAnimationLoop(() => {
    composer.render();
});
