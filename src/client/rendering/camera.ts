import { effect } from "@preact/signals";
import { PerspectiveCamera } from "three";
import { windowAspect } from "./window";

export const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

effect(() => {
    camera.aspect = windowAspect.value;
    camera.updateProjectionMatrix();
});
