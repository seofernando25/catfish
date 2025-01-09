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
    obj.spriteSrc = "Sam_forward";
    obj.cuteness = obj.cuteness ?? v?.cuteness ?? 1;
    obj.name = obj.name ?? "Cat";
    obj.description = obj.description ?? "A small, furry animal that purrs.";
    return obj;
}

export function catBlueprint() {
    return catMixin(baseAnimalBlueprint());
}
