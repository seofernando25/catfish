// Smooth 2D noise function
function noise(uv: [number, number]): number {
    const i = [Math.floor(uv[0]), Math.floor(uv[1])]; // Integer part of uv
    const f = [uv[0] - i[0], uv[1] - i[1]]; // Fractional part of uv

    // Smooth interpolation weights
    const smoothF = [f[0] * f[0] * (3.0 - 2.0 * f[0]), f[1] * f[1] * (3.0 - 2.0 * f[1])];

    // Random gradients at corners
    const a = Math.sin(i[0] * 127.1 + i[1] * 311.7) * 43758.5453123 % 1.0;
    const b = Math.sin((i[0] + 1.0) * 127.1 + i[1] * 311.7) * 43758.54131243 % 1.0;
    const c = Math.sin(i[0] * 127.1 + (i[1] + 1.0) * 311.7) * 43758.54531623 % 1.0;
    const d = Math.sin((i[0] + 1.0) * 127.1 + (i[1] + 1.0) * 311.7) * 43758.545973123 % 1.0;

    // Interpolate along x and y axes
    const u = a + smoothF[0] * (b - a);
    const v = c + smoothF[0] * (d - c);
    return u + smoothF[1] * (v - u);
}


function fbm(uv: [number, number]): number {
    let value = 0.0;
    let amplitude = 0.5;
    let frequency = 1.0;
    const octaves = 6;
    for (let i = 0; i < octaves; i++) { 
        value += amplitude * noise([uv[0] * frequency, uv[1] * frequency]);
        uv = [uv[0] * 2.0, uv[1] * 2.0];
        amplitude *= 0.5; 
    }
    return value;
}

export const COAL_COLOR: [number, number, number] = [0.0, 0.0, 0.0];
export const IRON_COLOR: [number, number, number] = [0.6, 0.6, 0.6];
export const DIAMOND_COLOR: [number, number, number] = [0.3, 0.9, 1.0];
export const DIRT_COLOR: [number, number, number] = [0.5, 0.25, 0.1];
export const LAKE_COLOR: [number, number, number] = [0.1, 0.1, 0.8];
export const DEFAULT_COLOR: [number, number, number] = LAKE_COLOR;



// Sample method
export function sample(x: number, y: number) {

    const terrainScale = 0.01;
    const terrain = fbm([x * terrainScale, y * terrainScale]);

    // Threshold for lakes and dirt
    let color: [number, number, number] = [0.1, 0.1, 0.1];
    if (terrain  >    0.2) {
        return "lake";
    } 

   
    // Resource patches

    // Coal patches
    const coal = fbm([x * 0.01 + 12, 12 + y * 0.01]);
    if (coal > 0.4) {
        return "coal";
    }

    // Iron patches
    const iron = fbm([x * 0.01 + 23, 23 + y * 0.01]);
    if (iron > 0.55) {
       return "iron";
    }

    // Diamond patches
    const diamond = fbm([x * 0.01 + 34, 34 + y * 0.01]);
    if (diamond > 0.7) {
        return "diamond";
    }

    return "dirt"

}