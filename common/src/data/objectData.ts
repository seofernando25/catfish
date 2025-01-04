import { number, object, type InferOutput } from "valibot";

export const PrimitiveObjectSchema = object({
    id: number(),
});
export type PrimitiveObject = InferOutput<typeof PrimitiveObjectSchema>;

let iota = 0;
export function newPrimitiveObject(): PrimitiveObject {
    return {
        id: iota++,
    };
}
