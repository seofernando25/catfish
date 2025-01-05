import path from "path";
import fsAsync from "fs/promises";
import fs from "fs";
import { PNG } from "pngjs";
import { compositeImages } from "./img";
import { getPackDimensions, squarePack } from "./pack";

export async function createSpriteSheet(
    filePaths: string[],
    outputFilePath: string
): Promise<boolean> {
    const imageSizes = filePaths.map((filePath) => {
        const buffer = fs.readFileSync(filePath);
        const png = PNG.sync.read(buffer);
        return { w: png.width, h: png.height };
    });

    const packedSquares = squarePack(imageSizes);

    const { width, height } = getPackDimensions(packedSquares);

    const canvas = new PNG({ width, height });
    canvas.data.fill(0);

    const compositeResult = await compositeImages(
        filePaths,
        packedSquares,
        canvas
    );
    // Saving Image
    const buffer = PNG.sync.write(canvas);
    await fsAsync.writeFile(outputFilePath, new Uint8Array(buffer));

    // Saving Image coordinates
    let frames = new Map<
        string,
        {
            frame: { x: number; y: number; w: number; h: number };
            sourceSize: { w: number; h: number };
            spriteSourceSize: { x: number; y: number; w: number; h: number };
        }
    >();

    for (const item of compositeResult) {
        const baseName = path.basename(
            item.fileName,
            path.extname(item.fileName)
        );
        frames.set(baseName, {
            frame: {
                x: item.packedSquare.x,
                y: item.packedSquare.y,
                w: item.packedSquare.w,
                h: item.packedSquare.h,
            },
            sourceSize: {
                w: item.packedSquare.w,
                h: item.packedSquare.h,
            },
            spriteSourceSize: {
                x: 0,
                y: 0,
                w: item.packedSquare.w,
                h: item.packedSquare.h,
            },
        });
    }

    let atlasData = {
        frames: Object.fromEntries(frames),
        meta: {
            size: {
                w: width,
                h: height,
            },
            format: "RGBA8888",
            scale: "1",
        },
    };

    const jsonFilePath = outputFilePath.replace(/\.[^/.]+$/, ".json");
    await fsAsync.writeFile(jsonFilePath, JSON.stringify(atlasData, null, 2));

    return true;
}

export async function packSprites(pngFilePaths: string[], outputDir: string) {
    console.assert(pngFilePaths.length > 0, "No PNG files to pack");
    console.log(`Packing ${pngFilePaths.length} sprite(s)`);
    await createSpriteSheet(
        pngFilePaths,
        path.join(outputDir, "spritesheet.png")
    );
    console.log("Spritesheet created");
}
