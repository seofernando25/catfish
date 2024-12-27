import { effect } from "@preact/signals";
import { WebGLRenderer } from "three";
import { windowHeight, windowPixelRatio, windowWidth } from "./window";

export const renderer = new WebGLRenderer({});
document.body.appendChild(renderer.domElement);
document.body.style.overflow = "hidden";

effect(() => {
    renderer.setPixelRatio(windowPixelRatio.value);
    renderer.setSize(windowWidth.value, windowHeight.value);
});
