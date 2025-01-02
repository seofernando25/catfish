import fsAsync from "fs/promises";
import fs from "fs";
import path from "path";
import { packSprites } from "./packer";

const ASSETS_DIR = path.join(import.meta.dir, "../../../assets");
const pngFilePaths: Set<string> = new Set();

async function initializePngFilePaths(directory: string) {
    const files = await fsAsync.readdir(directory);
    for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = await fsAsync.stat(filePath);

        if (stat.isDirectory()) {
            await initializePngFilePaths(filePath);
        } else if (
            filePath.endsWith(".png") &&
            file !== "spritesheet.png" &&
            file !== "skybox.png"
        ) {
            pngFilePaths.add(filePath);
        }
    }
}
await initializePngFilePaths(ASSETS_DIR);
console.log(`Found ${pngFilePaths.size} PNG file(s)`);

packSprites(Array.from(pngFilePaths), ASSETS_DIR);

const watcher = fs.watch(ASSETS_DIR, { recursive: true }, (event, filename) => {
    if (
        !filename ||
        !filename.endsWith(".png") ||
        filename === "spritesheet.png" ||
        filename === "skybox.png"
    )
        return;

    const filePath = path.join(ASSETS_DIR, filename);
    const fileExists = fs.existsSync(filePath);

    if (event === "rename") {
        if (fileExists) {
            pngFilePaths.add(filePath);
            console.log(`File added: ${filePath}`);
        } else {
            pngFilePaths.delete(filePath);
            console.log(`File deleted: ${filePath}`);
        }
    } else if (event === "change") {
        if (fileExists) {
            pngFilePaths.add(filePath);
            console.log(`File changed: ${filePath}`);
        }
    }

    packSprites(Array.from(pngFilePaths), ASSETS_DIR);
});

process.on("SIGINT", () => {
    console.log("Closing watcher...");
    watcher.close();
    process.exit(0);
});
