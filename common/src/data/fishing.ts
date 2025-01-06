import { intersect, literal, number, object, type InferOutput } from "valibot";
import { positionMixin, PositionSchema } from "./entity";
import { newPrimitiveObject } from "./objectData";

export const FishSpotSchemaSchema = intersect([
    PositionSchema,
    object({
        fishSpot: literal(true),
        dim: number(),
    }),
]);

export type FishSpotComponent = InferOutput<typeof FishSpotSchemaSchema>;

export function newFishSpot(dim: number) {
    return {
        ...positionMixin(newPrimitiveObject()),
        fishSpot: true,
        dim,
    } satisfies FishSpotComponent;
}
