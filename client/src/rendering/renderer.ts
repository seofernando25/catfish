import { effect } from "@preact/signals";
import { FogExp2, PCFSoftShadowMap, Scene, WebGLRenderer } from "three";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import {
    EffectComposer,
    OutputPass,
    Pass,
    RenderPass,
} from "three/examples/jsm/Addons.js";
import { globalCameraDist } from "../behaviors/CameraBehavior";
import { tweakpaneRef } from "../stats";
import { camera } from "./camera";
import { windowHeight, windowPixelRatio, windowWidth } from "./window";
import { ShaderMaterial, Vector3, WebGLRenderTarget } from "three";

export const renderer = new WebGLRenderer({});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
document.body.style.overflow = "hidden";

export const globalScene = new Scene();
export const composer = new EffectComposer(renderer);

globalScene.fog = new FogExp2(0xcccccc, 0.002);

composer.addPass(new RenderPass(globalScene, camera));

const bokehPass = new BokehPass(globalScene, camera, {
    focus: globalCameraDist.value,
    aperture: 0.0001,
    maxblur: 0.005,
});

effect(() => {
    bokehPass.uniforms["focus"].value = globalCameraDist.value;
});
composer.addPass(bokehPass);

const outputPass = new OutputPass();

composer.addPass(outputPass);

effect(() => {
    renderer.setPixelRatio(windowPixelRatio.value);
    renderer.setSize(windowWidth.value, windowHeight.value);
    composer.setSize(windowWidth.value, windowHeight.value);
});

renderer.info.autoReset = false;
const renderInfo = { rendererInfo: renderer.info.render.calls };
tweakpaneRef.addBinding(renderInfo, "rendererInfo", {
    label: "Renderer Info",
    expanded: false,
    readonly: true,
});
renderer.setAnimationLoop(() => {
    composer.render();
    renderInfo.rendererInfo = renderer.info.render.calls;
    tweakpaneRef.refresh();
    renderer.info.reset();
});
