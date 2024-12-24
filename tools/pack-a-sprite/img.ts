import fs from "fs/promises";
import { PNG } from "pngjs";
import { PackedSquare } from "./types.js";

export type CompositeResult = {
    fileName: string;
    packedSquare: PackedSquare;
}[];

export async function compositeImages(
    filePaths: string[],
    packedSquares: PackedSquare[],
    canvas: PNG
): Promise<CompositeResult> {
    if (filePaths.length !== packedSquares.length) {
        console.error("Number of images and packed squares must match");
        return [];
    }

    // Read all files in parallel and get buffers
    const fileBuffers = await Promise.allSettled(
        filePaths.map((filePath) => fs.readFile(filePath))
    );

    // if fileBuffers has any rejected promises, return empty
    for (const result of fileBuffers) {
        if (result.status === "rejected") {
            console.error("Failed to read a file: ", result.reason);
            return [];
        }
    }

    // Check for any read errors
    const successfulBuffers = fileBuffers.map((result, index) => {
        if (result.status === "rejected") {
            throw new Error(`Failed to read file at index ${index}`);
        }
        return result.value!;
    });

    let compositeResult: CompositeResult = [];

    // Decode PNGs from buffers and place them in the packed squares
    for (let i = 0; i < successfulBuffers.length; i++) {
        const buffer = successfulBuffers[i];
        const image = PNG.sync.read(buffer);

        // Match the image to a corresponding packed square
        const packedSquareIndex = packedSquares.findIndex(
            (ps) => ps.w === image.width && ps.h === image.height
        );
        if (packedSquareIndex === -1) {
            console.error(
                `Failed to find a suitable packed square for image at index ${i}`
            );
            return [];
        }

        const packedSquare = packedSquares[packedSquareIndex];

        // Remove the matched packed square from the array
        packedSquares.splice(packedSquareIndex, 1);

        // Bitblt the image into the canvas
        PNG.bitblt(
            image,
            canvas,
            0,
            0,
            image.width,
            image.height,
            packedSquare.x,
            packedSquare.y
        );
        compositeResult.push({ fileName: filePaths[i], packedSquare });
    }
    return compositeResult;
}
