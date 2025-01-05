import { TextureLoader, RepeatWrapping, SRGBColorSpace, Color } from "three";
import { output } from "three/tsl";
import { spriteSheetTexture, getSubTextureFromAtlas } from "../textures";
import {
    texture,
    uniform,
    vec2,
    vec4,
    uv,
    oscSine,
    time,
    grayscale,
} from "three/tsl";

export const simpleUVOutput = () => {
    // const samplerTexture = getSubTextureFromAtlas("uv");
    // samplerTexture.wrapS = RepeatWrapping;
    // samplerTexture.colorSpace = SRGBColorSpace;

    // const scaledTime = time.mul(0.5); // .5 is speed
    // const uv0 = uv();
    // const animateUv = vec2(uv0.x.add(oscSine(scaledTime)), uv0.y);

    // // label is optional
    // const myMap = texture(samplerTexture, animateUv).rgb.label("myTexture");
    // const myColor = uniform(new Color(0x0066ff)).label("myColor");

    // const desaturatedMap = grayscale(myMap.rgb);

    // const finalColor = desaturatedMap.add(myColor);
    const opacity = 0.7;

    return vec4(new Color(0x0066ff), 1.0);
};
