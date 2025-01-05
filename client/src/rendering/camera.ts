import { effect, signal } from "@preact/signals";
import { Camera, PerspectiveCamera } from "three";
import { windowAspect } from "./window";

export const camera = signal<Camera>(
    new PerspectiveCamera(75, windowAspect.value, 0.1, 1000)
);

effect(() => {
    if (camera.value instanceof PerspectiveCamera) {
        camera.value.aspect = windowAspect.value;
        camera.value.updateProjectionMatrix();
    }
});
