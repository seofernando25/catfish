import wk from "@catfish/assets/wk.png";
import { CHUNK_SIZE, WORLD_ZONE_DIM } from "@catfish/common/constants.ts";
import CanvasKitInit from "canvaskit-wasm";

const TERRAIN_HEIGHT_SCALE = 10;

// Initialize CanvasKit
const CanvasKit = await CanvasKitInit();

export const genWorldHeightMapsFromImage = async () => {
    // Step 1: Load and decode the image
    const wkBytes = await Bun.file(wk).arrayBuffer();
    const wkImage = CanvasKit.MakeImageFromEncoded(wkBytes);
    if (!wkImage) {
        console.error("Failed to create image from encoded bytes.");
        return;
    }

    const imgWidth = wkImage.width();
    const imgHeight = wkImage.height();

    // Step 2: Read all pixel data at once (RGBA format)
    const imgData = wkImage.readPixels(0, 0, {
        width: imgWidth,
        height: imgHeight,
        colorType: CanvasKit.ColorType.RGBA_8888,
        alphaType: CanvasKit.AlphaType.Unpremul,
        colorSpace: CanvasKit.ColorSpace.SRGB,
    });

    if (!imgData) {
        console.error("Failed to read pixel data from image.");
        return;
    }

    // Ensure imgData is a Uint8Array for typed array operations
    const pixels = new Uint8ClampedArray(imgData);

    // Step 3: Initialize a Float32Array for internal computations
    const totalZones = WORLD_ZONE_DIM * WORLD_ZONE_DIM;
    const totalChunks = CHUNK_SIZE * CHUNK_SIZE;
    const totalPoints = totalZones * totalChunks;
    const world = new Float32Array(totalPoints);

    // Step 4: Precompute scaling factors to avoid repeated calculations
    const invWorldTotalDim = 1 / (WORLD_ZONE_DIM * CHUNK_SIZE);

    // Step 5: Iterate through each zone and chunk to compute height values
    for (let zoneX = 0; zoneX < WORLD_ZONE_DIM; zoneX++) {
        const xOff = zoneX * CHUNK_SIZE;

        for (let zoneY = 0; zoneY < WORLD_ZONE_DIM; zoneY++) {
            const yOff = zoneY * CHUNK_SIZE;
            const zoneIdx = zoneX * WORLD_ZONE_DIM + zoneY;
            const zoneStartIdx = zoneIdx * totalChunks;

            for (let x = 0; x < CHUNK_SIZE; x++) {
                const worldX = x + xOff;
                // Calculate normalized X coordinate
                const xNorm = worldX * invWorldTotalDim;
                const imgXFloat = xNorm * imgWidth;
                // Fast floor operation using bitwise OR
                const imgX = Math.min(imgXFloat | 0, imgWidth - 1);

                for (let y = 0; y < CHUNK_SIZE; y++) {
                    const worldY = y + yOff;
                    // Calculate normalized Y coordinate
                    const yNorm = worldY * invWorldTotalDim;
                    const imgYFloat = yNorm * imgHeight;
                    const imgY = Math.min(imgYFloat | 0, imgHeight - 1);

                    // Compute the index for the pixel data
                    const pixelIdx = (imgY * imgWidth + imgX) * 4; // RGBA

                    // Extract RGB values
                    const r = pixels[pixelIdx];
                    const g = pixels[pixelIdx + 1];
                    const b = pixels[pixelIdx + 2];

                    // Compute grayscale value
                    const grayscale = (r + g + b) / 3;

                    // Map grayscale to height
                    const height =
                        (grayscale / 255) * TERRAIN_HEIGHT_SCALE -
                        TERRAIN_HEIGHT_SCALE / 2;

                    // Assign to the world array
                    const worldIdx = zoneStartIdx + x * CHUNK_SIZE + y;
                    world[worldIdx] = height;
                }
            }
        }
    }
    // Step 6: Convert Float32Array to number[][] for the return type
    // const worldArray: number[][] = new Array(totalZones);
    // for (let zoneIdx = 0; zoneIdx < totalZones; zoneIdx++) {
    //     const start = zoneIdx * totalChunks;
    //     const end = start + totalChunks;
    //     // Manually convert Float32Array segment to number[] for better performance
    //     const zoneArray = new Array<number>(totalChunks);
    //     for (let i = 0; i < totalChunks; i++) {
    //         zoneArray[i] = world[start + i];
    //     }
    //     worldArray[zoneIdx] = zoneArray;
    // }

    // return worldArray;
    return world;
};
