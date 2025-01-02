import { CHUNK_SIZE, WORLD_ZONE_DIM } from "@catfish/common/constants";
import wk from "@catfish/assets/wk.png";
import CanvasKitInit from "canvaskit-wasm";

const CanvasKit = await CanvasKitInit();

export const genWorldHeightMapsFromImage = async () => {
    const wkBytes = await Bun.file(wk).arrayBuffer();
    const wkImage = CanvasKit.MakeImageFromEncoded(wkBytes);
    const world: number[][] = new Array(WORLD_ZONE_DIM * WORLD_ZONE_DIM);
    // set world to be an array of arrays initialized to 0
    for (let i = 0; i < world.length; i++) {
        world[i] = new Array(CHUNK_SIZE * CHUNK_SIZE).fill(99);
    }

    const imgWidth = wkImage.width();
    const imgHeight = wkImage.height();

    for (let zoneX = 0; zoneX < WORLD_ZONE_DIM; zoneX++) {
        for (let zoneY = 0; zoneY < WORLD_ZONE_DIM; zoneY++) {
            const zoneIdx = zoneX * WORLD_ZONE_DIM + zoneY;
            const zone = world[zoneIdx];
            const xOff = zoneX * CHUNK_SIZE;
            const yOff = zoneY * CHUNK_SIZE;
            for (let x = 0; x < CHUNK_SIZE; x++) {
                for (let y = 0; y < CHUNK_SIZE; y++) {
                    // Normalize x and y to be in the range [0, 1]
                    const xNorm = (x + xOff) / (CHUNK_SIZE * WORLD_ZONE_DIM);
                    const yNorm = (y + yOff) / (CHUNK_SIZE * WORLD_ZONE_DIM);

                    // Sample the image at the normalized coordinates
                    const imgX = Math.floor(imgWidth * xNorm);
                    const imgY = Math.floor(imgHeight * yNorm);

                    // Read the pixel at the calculated coordinates
                    const pixelData = wkImage.readPixels(imgX, imgY, {
                        width: 1,
                        height: 1,
                        colorType: CanvasKit.ColorType.RGBA_8888,
                        alphaType: CanvasKit.AlphaType.Unpremul,
                        colorSpace: CanvasKit.ColorSpace.SRGB,
                    });
                    const grayscale =
                        (pixelData[0] * 1) / 3 +
                        (pixelData[1] * 1) / 3 +
                        (pixelData[2] * 1) / 3;

                    // Set the zone value based on the pixel color
                    zone[x * CHUNK_SIZE + y] = (grayscale / 255) * 30 - 15;
                }
            }
        }
    }

    return world;
};
