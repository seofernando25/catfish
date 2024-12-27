import "./app.css";

import { Scene } from "three";
import { game } from "./client/Game";
import { camera } from "./client/rendering/camera";
import { renderer } from "./client/rendering/renderer";

const scene = new Scene();

const animate = () => {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
};

animate();
game(scene);
