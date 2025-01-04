import {
    array,
    boolean,
    fallback,
    minValue,
    number,
    object,
    pipe,
    string,
} from "valibot";
import { ObjectDataSchema } from "./objectData";

export const PartLib = {
    rendering: {
        spriteSrc: string(),
        tint: string(),
    },
    common: {
        name: string(),
        weight: pipe(number(), minValue(0)),
        description: string(),
        commerce: pipe(number(), minValue(0)),
    },
    entities: {
        hp: object({
            current: fallback(number(), 100),
            min: fallback(number(), 0),
            max: fallback(number(), 100),
        }),
        brain: string(),
        skills: array(ObjectDataSchema),
        gender: string(),
    },
    stats: {
        strenght: number(),
        luck: number(),
    },
    skill: {
        unlockCost: number(),
    },
    fishingSampling: {
        sizeProperties: object({
            average: number(),
            deviation: number(),
        }),
        weightProperties: object({
            average: number(),
            deviation: number(),
        }),
    },
    is: {
        cat: boolean(),
        fish: boolean(),
        creature: boolean(),
        skill: boolean(),
        bleeds: boolean(),
    },
    pet: {
        pettable: boolean(),
        petSound: string(),
    },
} as const;
