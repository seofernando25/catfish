import atlasData from "@catfish/assets/spritesheet.json";

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
