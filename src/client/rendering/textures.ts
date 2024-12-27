import {
    MeshBasicMaterial,
    NearestFilter,
    PlaneGeometry,
    SpriteMaterial,
    Texture,
    TextureLoader,
    Vector2,
} from "three";
import spritesheet from "../../assets/spritesheet.png";
import atlasData from "../../assets/spritesheet.json";
import skyPath from "../../assets/skybox.png";

const textureLoader = new TextureLoader();
export const spriteSheetTexture = await textureLoader.loadAsync(spritesheet);
spriteSheetTexture.minFilter = NearestFilter;
spriteSheetTexture.magFilter = NearestFilter;
spriteSheetTexture.anisotropy = 1;

export const spritesheetMaterial = new MeshBasicMaterial({
    map: spriteSheetTexture,
    transparent: true,
});

export const spritesheetMaterial2 = new MeshBasicMaterial({
    map: spriteSheetTexture,
    transparent: true,
    alphaTest: 0.5,
    side: 2,
});

export const spriteUniformGeometry = Object.entries(atlasData.frames).reduce(
    (acc, [key, frame]) => {
        const texWidth = atlasData.meta.size.w;
        const texHeight = atlasData.meta.size.h;

        let u0 = frame.frame.x / texWidth;
        let v0 = 1 - frame.frame.y / texHeight;
        let u1 = (frame.frame.x + frame.frame.w) / texWidth;
        let v1 = 1 - (frame.frame.y + frame.frame.h) / texHeight;

        // Use PlaneGeometry and override UVs
        const plane = new PlaneGeometry(1, 1);
        const uv = plane.attributes.uv.array;

        // Update UV coordinates
        uv[0] = u0;
        uv[1] = v0; // Bottom-left
        uv[2] = u1;
        uv[3] = v0; // Bottom-right
        uv[4] = u0;
        uv[5] = v1; // Top-left
        uv[6] = u1;
        uv[7] = v1; // Top-right
        plane.attributes.uv.needsUpdate = true;

        acc[key] = plane;
        return acc;
    },
    {} as Record<keyof typeof atlasData.frames, PlaneGeometry>
);

export const skyboxTexture = await textureLoader.loadAsync(skyPath);

export function getUVOffsets(tileKey: keyof typeof atlasData.frames) {
    const frame = atlasData.frames[tileKey].frame;
    const texWidth = atlasData.meta.size.w; // Full texture width
    const texHeight = atlasData.meta.size.h; // Full texture height

    // Normalize UVs based on the atlas dimensions
    const u0 = frame.x / texWidth; // Left
    const v0 = 1 - (frame.y + frame.h) / texHeight; // Bottom (inverted Y)
    const u1 = (frame.x + frame.w) / texWidth; // Right
    const v1 = 1 - frame.y / texHeight; // Top

    const alpha = 0.001;
    return { u0: u0 + alpha, v0: v0 + alpha, u1: u1 - alpha, v1: v1 - alpha };
}

export function getSubTextureFromAtlas(tileKey: keyof typeof atlasData.frames) {
    const frame = atlasData.frames[tileKey].frame;

    const texWidth = atlasData.meta.size.w;
    const texHeight = atlasData.meta.size.h;

    const subTexture = spriteSheetTexture.clone();
    subTexture.needsUpdate = true;

    // Set the UV offsets and scale for the sub-region
    subTexture.offset.set(
        frame.x / texWidth,
        1 - (frame.y + frame.h) / texHeight
    );
    subTexture.repeat.set(frame.w / texWidth, frame.h / texHeight);

    return subTexture;
}