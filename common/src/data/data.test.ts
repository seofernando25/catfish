import { describe, it, expect } from "bun:test";
import { catBlueprint } from "./cat";
import {
    assert,
    fallback,
    is,
    object,
    pipe,
    string,
    type InferOutput,
} from "valibot";

describe("data", () => {
    it("should be able to get data", () => {
        const p = catBlueprint();
        expect(p.name).toBe("Cat");
    });

    it("Valibot", () => {
        const namedSchema = object({
            name: string(),
            description: fallback(string(), "Unknown entity"),
        });

        const obj = {
            foo: "bar",
            name: "Entity",
        };

        if (is(namedSchema, obj)) {
            console.log(obj);
            console.log(
                obj.description ?? namedSchema.entries.description.fallback
            );
            console.log("Is named schema");
        } else {
            console.log(obj);
            console.log("Is not named schema");
        }
    });
});
