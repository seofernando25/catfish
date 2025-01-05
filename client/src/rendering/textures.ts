import skyPath from "@catfish/assets/skybox.png";
import atlasData from "@catfish/assets/spritesheet.json";
import spritesheetPath from "@catfish/assets/spritesheet.png";
import titleSvgPath from "@catfish/assets/title.svg";
import {
    AmbientLight,
    AxesHelper,
    Color,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    NearestFilter,
    PlaneGeometry,
    ShapeGeometry,
    SRGBColorSpace,
    TextureLoader,
    Vector3,
} from "three";
import { SVGLoader } from "three/examples/jsm/Addons.js";
import { screenSpaceGradientMaterial } from "./shaders/screenSpaceGradient";

const textureLoader = new TextureLoader();

export const spriteSheetTexture = await textureLoader.loadAsync(
    spritesheetPath
);
spriteSheetTexture.minFilter = NearestFilter;
spriteSheetTexture.magFilter = NearestFilter;
spriteSheetTexture.anisotropy = 1;
spriteSheetTexture.colorSpace = SRGBColorSpace;

const svgLoader = new SVGLoader();

const titleTexture = await svgLoader.loadAsync(titleSvgPath);

export const gameTitleObject = new Group();
const titleAnchorGroup = new Group();

// export const titleMaterial = screenSpaceGradientMaterial.clone();
export const titleMaterial = screenSpaceGradientMaterial.clone();
// 7abba7 to 3f7c7e
const fromCol = new Color("#2d423f");
const fromColHSL = {
    h: 0,
    s: 0,
    l: 0,
};
fromCol.getHSL(fromColHSL);
fromColHSL.l += 0.0;
fromCol.setHSL(fromColHSL.h, fromColHSL.s, fromColHSL.l);

const toCol = new Color("#010101");

titleMaterial.uniforms.colorA.value.set(fromCol);
titleMaterial.uniforms.colorB.value.set(toCol);

const groupBoundingBox = new Vector3(0, 0, 0);
for (const path of titleTexture.paths) {
    const shapes = SVGLoader.createShapes(path);
    for (const shape of shapes) {
        const geometry = new ShapeGeometry(shape);
        geometry.computeBoundingBox();
        const aabb = geometry.boundingBox
            ?.getCenter(new Vector3(0, 0, 0))
            .clone();
        if (!aabb) {
            console.error("No AABB for title geometry");
            continue;
        }
        geometry.center();
        const mesh = new Mesh(geometry, titleMaterial);
        mesh.layers.enable(1);

        const scale = 1.5 * 0.0001;
        mesh.scale.set(scale, scale, scale);
        mesh.position.set(aabb.x * scale, aabb.y * scale, 0);
        titleAnchorGroup.add(mesh);
        if (aabb.x > groupBoundingBox.x) {
            groupBoundingBox.x = aabb.x * scale;
        }
        if (aabb.y > groupBoundingBox.y) {
            groupBoundingBox.y = aabb.y * scale;
        }
    }
}

titleAnchorGroup.scale.set(1, -1, 1);

titleAnchorGroup.position.set(0, 0, 0);
titleAnchorGroup.position.x -= groupBoundingBox.x / 2;
titleAnchorGroup.position.y = groupBoundingBox.y / 2;
titleAnchorGroup.position.z = 0.001;
gameTitleObject.add(titleAnchorGroup);

export const spritesheetData = atlasData;

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
        const uv = plane.attributes["uv"].array;

        // Update UV coordinates
        uv[0] = u0;
        uv[1] = v0; // Bottom-left
        uv[2] = u1;
        uv[3] = v0; // Bottom-right
        uv[4] = u0;
        uv[5] = v1; // Top-left
        uv[6] = u1;
        uv[7] = v1; // Top-right
        plane.attributes["uv"].needsUpdate = true;

        // @ts-expect-error - index signature from object entries
        acc[key] = plane;
        return acc;
    },
    {} as Record<keyof typeof atlasData.frames, PlaneGeometry>
);

export const skyboxTexture = await textureLoader.loadAsync(skyPath);

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
