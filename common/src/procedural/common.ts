type Vec2 = { x: number; y: number };
export const sin = Math.sin;

export function dot(x1: number, y1: number, x2: number, y2: number): number {
    return x1 * x2 + y1 * y2;
}

export function mix(a: number, b: number, t: number): number {
    return a * (1 - t) + b * t;
}

export function fract(x: number): number {
    return x - Math.floor(x);
}

export function hash1(x: number, y: number): number {
    // Generate a pseudo-random number from 'p'.
    return fract(sin(x * 0.129898 + y * 0.78233) * 43758.5453);
}

export function hash2(x: number, y: number): Vec2 {
    const mat00 = 0.129898,
        mat01 = 0.81314;
    const mat10 = 0.78233,
        mat11 = 0.15926;

    const xComp = x * mat00 + y * mat10;
    const yComp = x * mat01 + y * mat11;

    const sinX = sin(xComp) * 43758.5453;
    const sinY = sin(yComp) * 43758.5453;

    return { x: fract(sinX), y: fract(sinY) };
}

export function hash3(x: number, y: number, z: number): number {
    let p3X = fract(x * 0.1031);
    let p3Y = fract(y * 0.1031);
    let p3Z = fract(z * 0.1031);

    const dotX = dot(p3X, p3Y, p3Z + 31.32, 31.32);
    const dotY = dot(p3Y, p3Z, p3X + 31.32, 31.32);
    const dotZ = dot(p3Z, p3X, p3Y + 31.32, 31.32);

    p3X += dotX;
    p3Y += dotY;
    p3Z += dotZ;

    return fract((p3X + p3Y) * p3Z);
}

export function normalize(x: number, y: number): Vec2 {
    const length = Math.sqrt(x * x + y * y);
    return { x: x / length, y: y / length };
}

export function hash2_norm(x: number, y: number): Vec2 {
    // Returns a random normalized direction vector
    const h = hash2(x, y);
    return normalize(h.x - 0.5, h.y - 0.5);
}
