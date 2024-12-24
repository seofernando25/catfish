import {
    Application,
    Assets,
    Container,
    Sprite,
    Spritesheet,
    Texture,
} from "pixi.js";
import spritesheet from "./assets/spritesheet.png";
import atlasData from "./assets/spritesheet.json";
import "./app.css";
import { game } from "./client/Game";
import { keyboardOrSignal, keyboardSignal } from "./client/input/events";
import { effect } from "@preact/signals";

export const app = new Application();

await app.init({
    background: "#ff00ff",
    resizeTo: window,
    autoDensity: true,
    resolution: window.devicePixelRatio,
    autoStart: true,
});
document.body.appendChild(app.canvas);
document.body.style.overflow = "hidden";

// Preload
const spritesheetTex = (await Assets.load(spritesheet)) as Texture;
export const spritesheetObj = new Spritesheet(spritesheetTex, atlasData);
await spritesheetObj.parse();

// Run game

await game(app);
