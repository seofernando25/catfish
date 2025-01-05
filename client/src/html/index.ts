import htm from "htm";
import { h } from "htm/preact/index.js";

export const uiContainer = document.createElement("div");
window.document.body.appendChild(uiContainer);

export const html = htm.bind(h);

export default html;
