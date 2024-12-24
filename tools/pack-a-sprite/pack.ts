import { Square, PackedSquare } from "./types";

export function squarePack(squares: Square[]): PackedSquare[] {
    const sortedSquares = squares.toSorted(
        (a, b) => Math.max(a.w, a.h) - Math.max(b.w, b.h)
    );
    const totalArea = sortedSquares.reduce((acc, s) => acc + s.w * s.h, 0);
    let side = Math.ceil(Math.sqrt(totalArea));

    let packed: PackedSquare[] = [];
    while (true) {
        packed = tryPack(sortedSquares, side);
        if (packed.length === sortedSquares.length) {
            console.assert(
                isPackValid(packed),
                "Packing failed: images overlap"
            );
            return packed;
        }
        side++;
    }
}

export function tryPack(squares: Square[], side: number): PackedSquare[] {
    const result: PackedSquare[] = [];
    let curX = 0,
        curY = 0,
        rowHeight = 0;

    for (const sq of squares) {
        if (curX + sq.w > side) {
            curY += rowHeight;
            curX = 0;
            rowHeight = 0;
        }

        if (curY + sq.h > side) {
            return [];
        }

        result.push({ x: curX, y: curY, w: sq.w, h: sq.h });
        curX += sq.w;
        rowHeight = Math.max(rowHeight, sq.h);
    }
    return result;
}

export function isPackValid(packed: PackedSquare[]): boolean {
    for (let i = 0; i < packed.length; i++) {
        for (let j = i + 1; j < packed.length; j++) {
            if (isRectOverlapping(packed[i], packed[j])) {
                return false;
            }
        }
    }
    return true;
}

export function getPackDimensions(packed: PackedSquare[]): {
    width: number;
    height: number;
} {
    console.assert(packed.length > 0, "Packed squares must not be empty");

    let minX = Infinity,
        minY = Infinity;
    let maxX = -Infinity,
        maxY = -Infinity;

    for (const sq of packed) {
        minX = Math.min(minX, sq.x);
        minY = Math.min(minY, sq.y);
        maxX = Math.max(maxX, sq.x + sq.w);
        maxY = Math.max(maxY, sq.y + sq.h);
    }

    const width = maxX - minX;
    const height = maxY - minY;

    return { width, height };
}

export function isRectOverlapping(a: PackedSquare, b: PackedSquare): boolean {
    if (a.x + a.w <= b.x || b.x + b.w <= a.x) return false;
    if (a.y + a.h <= b.y || b.y + b.h <= a.y) return false;
    return true;
}
