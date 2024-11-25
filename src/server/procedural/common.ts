// Typical pseudo-random hash (white noise) function ported to TypeScript

export function dot(x1: number, y1: number, x2: number, y2: number): number {
    return x1 * x2 + y1 * y2;
}

export function mix(a: number, b: number, t: number): number {
    return a * (1 - t) + b * t;
}

export function fract(x: number): number {
    return x - Math.floor(x);
}

export function sin(x: number): number {
    return Math.sin(x);
}

export function hash1([x, y]: [number, number]): number {
    // Generate a pseudo-random number from 'p'.
    return fract(sin(x * 0.129898 + y * 0.78233) * 43758.5453);
}

export function hash2(x: number, y: number): [number, number] {
    const mat00 = 0.129898,
        mat01 = 0.81314;
    const mat10 = 0.78233,
        mat11 = 0.15926;

    const xComp = x * mat00 + y * mat10;
    const yComp = x * mat01 + y * mat11;

    const sinX = sin(xComp) * 43758.5453;
    const sinY = sin(yComp) * 43758.5453;

    return [fract(sinX), fract(sinY)];
}

export function normalize(x: number, y: number): [number, number] {
    const length = Math.sqrt(x * x + y * y);
    return [x / length, y / length];
}

export function hash2_norm(x: number, y: number): [number, number] {
    // Returns a random normalized direction vector
    const [vx, vy] = hash2(x, y);
    return normalize(vx - 0.5, vy - 0.5);
}
