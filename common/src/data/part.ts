import { type BaseSchema, type InferInput } from "valibot";
import { PartLib } from "./partLib";

export type Part<
    TKey extends BaseSchema<any, any, any>,
    TValue = InferInput<TKey>
> = {
    key: TKey;
    value: TValue;
};

export function partKeyToString<TKey extends BaseSchema<any, any, any>>(
    key: TKey
): string {
    // Find in tag lib and return the key of the lvalue whose value is key
    for (const v of Object.values(PartLib)) {
        const sub = v as Record<string, unknown>;

        for (const [subKey, subValue] of Object.entries(sub)) {
            if (subValue === key) {
                return subKey;
            }
        }
    }
    return "Unknown";
}

export function stringToTagKey<TKey extends BaseSchema<any, any, any>>(
    str: string
): TKey | undefined {
    // Find in tag lib and return the value of the lvalue whose key is str
    for (const [k, v] of Object.entries(PartLib)) {
        const sub = v as Record<string, unknown>;

        if (sub[str]) {
            return sub[str] as TKey;
        }
    }
    return undefined;
}

export function createPart<TKey extends BaseSchema<any, any, any>>(
    key: TKey,
    value: InferInput<TKey>
) {
    return {
        key,
        value,
    };
}
