import salmonSprite from "@catfish/assets/fishes/Sammy_Salmon.png";
import { baseAnimalBlueprint } from "./entity";
import { number, object, type InferOutput } from "valibot";

export const FishSchema = object({
    sizeAverage: number(),
    sizeDeviation: number(),
    weightAverage: number(),
    weightDeviation: number(),
});
type FishComponent = InferOutput<typeof FishSchema>;

function fishMixin<T extends ReturnType<typeof baseAnimalBlueprint>>(
    p: T,
    v?: FishComponent
): T & FishComponent {
    const obj = p as T & FishComponent;
    obj.sizeAverage = obj.sizeAverage ?? v?.sizeAverage ?? 0.3;
    obj.sizeDeviation = obj.sizeDeviation ?? v?.sizeDeviation ?? 0.05;
    obj.weightAverage = obj.weightAverage ?? v?.weightAverage ?? 1;
    obj.weightDeviation = obj.weightDeviation ?? v?.weightDeviation ?? 0.2;
    obj.spriteSrc = obj.spriteSrc ?? "Fallback_Fish";
    return obj;
}

function baseFishBlueprint() {
    return fishMixin(baseAnimalBlueprint(), {
        sizeAverage: 0.3,
        sizeDeviation: 0.05,
        weightAverage: 1,
        weightDeviation: 0.2,
    });
}

function salmonBlueprint() {
    const obj = baseFishBlueprint();

    obj.name = "Sockeye salmon";
    obj.description = "Salmon Says Hi";
    obj.sizeAverage = 0.47;
    obj.sizeDeviation = 0.06;
    obj.weightAverage = 3;
    obj.weightDeviation = 0.6;
    obj.spriteSrc = salmonSprite;

    return obj;
}

function catfishBlueprint() {
    const obj = baseFishBlueprint();

    obj.name = "Catfish";
    obj.description = "Ilegal in 50 states.";
    obj.sizeAverage = 0.6;
    obj.sizeDeviation = 0.15;
    obj.weightAverage = 4.5;
    obj.weightDeviation = 2.0;
    // TODO: Replace by dedicated sprite
    obj.spriteSrc = salmonSprite;

    return obj;
}

export const FishEntries = [catfishBlueprint(), salmonBlueprint()];

// export const SkillCosts = {
//     BasicForaging: 1,
//     SonarPing: 1,
//     SteadyHands: 1,
// } as const satisfies { [key in FishTypeTypes]: number };
