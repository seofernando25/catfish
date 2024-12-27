import { effect } from "@preact/signals";
import { PerspectiveCamera } from "three";
import { windowAspect } from "./window";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { renderer } from "./renderer";
import { keyboardOrSignal } from "../input/events";

export const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);

//  this.left = keyboardOrSignal([
//             { key: "a" },
//             { key: "A" },
//             { key: "ArrowLeft" },
//         ]);

// const controls = new OrbitControls(camera, renderer.domElement);
// controls.target.set(0, 0, 0); // Set the target point (orbit center) to the origin
// controls.minDistance = 5; // Minimum zoom distance
// controls.maxDistance = 50; // Maximum zoom distance

effect(() => {
    camera.aspect = windowAspect.value;
    camera.updateProjectionMatrix();
});
