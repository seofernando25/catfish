// Typical pseudo-random hash (white noise) function ported to TypeScript

export function floor([x, y]: [number, number]): [number, number] {
    return [Math.floor(x), Math.floor(y)];
}

export function dot([x1, y1]: [number, number], [x2, y2]: [number, number]): number {
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

export function mat2(m00: number, m01: number, m10: number, m11: number): [[number, number], [number, number]] {
    return [
        [m00, m01],
        [m10, m11]
    ];
}

export function hash2([x, y]: [number, number]): [number, number] {
    // Generate a pseudo-random vec2 from 'p'
    const mat = mat2(0.129898, 0.81314, 0.78233, 0.15926);
    const xResult = sin(x * mat[0][0] + y * mat[1][0]) * 43758.5453;
    const yResult = sin(x * mat[0][1] + y * mat[1][1]) * 43758.5453;
    return [fract(xResult), fract(yResult)];
}

export function normalize([x, y]: [number, number]): [number, number] {
    const length = Math.sqrt(x * x + y * y);
    return [x / length, y / length];
}

export function hash2_norm(p: [number, number]): [number, number] {
    // Returns a random normalized direction vector
    const [x, y] = hash2(p);
    return normalize([x - 0.5, y - 0.5]);
}
