import { computed, effect, signal } from "@preact/signals";
import {
    BloomEffect,
    EffectComposer,
    EffectPass,
    RenderPass,
    SMAAEffect,
} from "postprocessing";

import {
    MeshBasicMaterial,
    NeutralToneMapping,
    PCFSoftShadowMap,
    Scene,
    Vector2,
    WebGLRenderer,
} from "three";

import { tweakpaneRef } from "../stats";
import { camera } from "./camera";
import { windowHeight, windowPixelRatio, windowWidth } from "./window";

export const renderer = new WebGLRenderer({
    powerPreference: "high-performance",
    antialias: false,
});
renderer.shadowMap.enabled = true;
renderer.autoClear = false;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.toneMapping = NeutralToneMapping;
document.body.appendChild(renderer.domElement);
document.body.style.overflow = "hidden";

export const globalScene = new Scene();

const renderPass = computed(() => new RenderPass(globalScene, camera.value));

const renderExposure = signal(1.0);

effect(() => {
    renderer.toneMappingExposure = Math.pow(renderExposure.value, 4.0);
});

// globalScene.fog = new FogExp2(0xcccccc, 0.002);

export const finalComposer = new EffectComposer(renderer);

export const smmaEffect = new EffectPass(camera.value, new SMAAEffect());

effect(() => {
    finalComposer.removePass(renderPass.value);

    finalComposer.addPass(renderPass.value);
    finalComposer.addPass(smmaEffect);
});

effect(() => {
    renderer.setPixelRatio(windowPixelRatio.value);
    renderer.setSize(windowWidth.value, windowHeight.value);
    finalComposer.setSize(windowWidth.value, windowHeight.value);
});

renderer.info.autoReset = false;
const renderInfo = { rendererInfo: renderer.info.render.calls };

let lastTime = 0;
renderer.setAnimationLoop((time) => {
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    renderer.clear();
    finalComposer.render(dt);
    renderInfo.rendererInfo = renderer.info.render.calls;
    tweakpaneRef.refresh();
    renderer.info.reset();
});

const renderingFolder = tweakpaneRef.addFolder({
    title: "Rendering",
    expanded: false,
});

renderingFolder.addBinding(renderInfo, "rendererInfo", {
    label: "Draw calls",
    expanded: false,
    readonly: true,
});
