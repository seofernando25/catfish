import { number, object, type InferOutput } from "valibot";
import { baseAnimalBlueprint } from "./entity.js";

export const CatSchema = object({
    cuteness: number(),
});
export type CatComponent = InferOutput<typeof CatSchema>;

export function catMixin<T extends ReturnType<typeof baseAnimalBlueprint>>(
    p: T,
    v?: CatComponent
): T & CatComponent {
    const obj = p as T & CatComponent;
    obj.cuteness = obj.cuteness ?? v?.cuteness ?? 1;
    return obj;
}

export function catBlueprint() {
    return catMixin(baseAnimalBlueprint());
}
