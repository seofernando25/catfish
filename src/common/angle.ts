const TWO_PI = 2 * Math.PI;
export const DIRECTIONS = {
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3,
} as const;

export type DirectionName = keyof typeof DIRECTIONS;
export type Direction = (typeof DIRECTIONS)[DirectionName];

const DIRECTION_THRESHOLDS = [
    { direction: DIRECTIONS.UP, min: 1.75 * Math.PI, max: 0.25 * Math.PI },
    { direction: DIRECTIONS.RIGHT, min: 0.25 * Math.PI, max: 0.75 * Math.PI },
    { direction: DIRECTIONS.DOWN, min: 0.75 * Math.PI, max: 1.25 * Math.PI },
    { direction: DIRECTIONS.LEFT, min: 1.25 * Math.PI, max: 1.75 * Math.PI },
];

const normalizeAngle = (angle: number) => {
    return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
};

export const smallestAngleDiff = (angle1: number, angle2: number) => {
    let diff = normalizeAngle(angle1 - angle2);
    if (diff > Math.PI) {
        diff -= TWO_PI;
    }
    return diff;
};

export const getDirection = (angleDiff: number) => {
    for (const { direction, min, max } of DIRECTION_THRESHOLDS) {
        if (min > max) {
            if (angleDiff >= min || angleDiff < max) {
                return direction;
            }
        } else {
            if (angleDiff >= min && angleDiff < max) {
                return direction;
            }
        }
    }
    console.warn("No direction found for angleDiff", angleDiff);
    return DIRECTIONS.UP;
};

export const getDirectionName = (direction: Direction) => {
    return Object.keys(DIRECTIONS).find(
        (key) => DIRECTIONS[key as DirectionName] === direction
    ) as DirectionName;
};
