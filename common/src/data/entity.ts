import {
    array,
    boolean,
    custom,
    intersect,
    literal,
    number,
    object,
    pipe,
    string,
    value,
    type InferOutput,
} from "valibot";
import { newPrimitiveObject, type PrimitiveObject } from "./objectData";
import type { ServerClientSocket } from "../events/server";
import type { spritesheetData } from "../../../client/src/rendering/textures";

// Use valibot to define extending types

export const NamedComponentSchema = object({
    name: string(),
    description: string(),
});
export type NameComponent = InferOutput<typeof NamedComponentSchema>;

export function namedEntityMixin<T extends PrimitiveObject>(
    p: T,
    v?: NameComponent
): T & NameComponent {
    const obj = p as T & NameComponent;
    obj.name = obj.name ?? v?.name ?? "Entity";
    obj.description = obj.description ?? v?.description ?? "Unknown entity";
    return obj;
}

export const PositionSchema = object({
    x: number(),
    y: number(),
    z: number(),
});
export type PositionComponent = InferOutput<typeof PositionSchema>;

export function positionMixin<T extends PrimitiveObject>(
    p: T,
    v?: PositionComponent
): T & PositionComponent {
    const obj = p as T & PositionComponent;
    obj.x = obj.x ?? v?.x ?? 0;
    obj.y = obj.y ?? v?.y ?? 0;
    obj.z = obj.z ?? v?.z ?? 0;
    return obj;
}

export const BaseEntitySchema = intersect([
    NamedComponentSchema,
    PositionSchema,
]);
export type BaseEntity = InferOutput<typeof BaseEntitySchema>;

export function baseEntityBlueprint() {
    const entity = newPrimitiveObject();
    return namedEntityMixin(positionMixin(entity));
}

export const CreatureSchema = object({
    is_creature: pipe(boolean(), value(true)),
    strenght: number(),
    luck: number(),
});
export type CreatureComponent = InferOutput<typeof CreatureSchema>;

export function creatureMixin<T extends PrimitiveObject>(
    p: T,
    v?: CreatureComponent
): T & CreatureComponent {
    const obj = p as T & CreatureComponent;
    obj.is_creature = obj.is_creature ?? v?.is_creature ?? true;
    obj.strenght = obj.strenght ?? v?.strenght ?? 1;
    obj.luck = obj.luck ?? v?.luck ?? 1;
    return obj;
}

export function baseCreatureBlueprint() {
    return creatureMixin(baseEntityBlueprint());
}

export const AnimalTagSchema = object({
    is_animal: pipe(boolean(), value(true)),
});
export type AnimalTag = InferOutput<typeof AnimalTagSchema>;

export function animalMixin<T extends PrimitiveObject>(
    p: T,
    v?: AnimalTag
): T & AnimalTag {
    const obj = p as T & AnimalTag;
    obj.is_animal = obj.is_animal ?? v?.is_animal ?? true;
    return obj;
}

export function baseAnimalBlueprint() {
    return renderSpriteMixin(animalMixin(baseCreatureBlueprint()), {
        spriteSrc: "Sam_forward",
    });
}

export const BrainSchema = object({
    brain: string(),
});
type BrainComponent = InferOutput<typeof BrainSchema>;

// DesiredDirectionSchema
export const DesiredDirectionSchema = object({
    desireDir: object({
        x: number(),
        y: number(),
    }),
});
export type DesiredDirectionComponent = InferOutput<
    typeof DesiredDirectionSchema
>;

export function desiredDirectionMixin<T>(
    p: T,
    v?: DesiredDirectionComponent
): T & DesiredDirectionComponent {
    const obj = p as T & DesiredDirectionComponent;
    obj.desireDir = obj.desireDir ?? v?.desireDir ?? { x: 0, y: 0 };
    return obj;
}

export function brainMixin<T>(p: T, v?: BrainComponent): T & BrainComponent {
    const obj = p as T & BrainComponent;
    obj.brain = obj.brain ?? v?.brain ?? "none";
    return obj;
}

export const SocketIDComponentSchema = object({
    socket: string(),
});
export type SocketIDComponent = InferOutput<typeof SocketIDComponentSchema>;

export function socketMixin<T>(
    p: T,
    v?: SocketIDComponent
): T & SocketIDComponent {
    const obj = p as T & SocketIDComponent;
    obj.socket = obj.socket ?? v?.socket ?? "";
    return obj;
}

export const PlayerControlledSchema = intersect([
    BrainSchema,
    PositionSchema,
    NamedComponentSchema,
    SocketIDComponentSchema,
    DesiredDirectionSchema,
    PositionSchema,
]);
export type PlayerControlledComponent = InferOutput<
    typeof PlayerControlledSchema
>;

export function mixinPlayerSocketControlled<T extends PrimitiveObject>(
    obj: T
): T & PlayerControlledComponent {
    const playerControlled = renderSpriteMixin(
        desiredDirectionMixin(
            positionMixin(
                namedEntityMixin(
                    socketMixin(brainMixin(obj, { brain: "player" }))
                )
            )
        )
    );
    return playerControlled;
}

type SpritesheetKey = keyof typeof spritesheetData.frames;
export const RenderSpriteSchema = object({
    spriteSrc: custom<SpritesheetKey>((input: unknown) =>
        // We could check if the input is a valid spriteSrc
        // but leave open for now
        typeof input === "string" ? true : false
    ),
});

export type RenderSpriteComponent = InferOutput<typeof RenderSpriteSchema>;

export function renderSpriteMixin<T extends PositionComponent>(
    p: T,
    v?: RenderSpriteComponent
): T & RenderSpriteComponent {
    const obj = p as T & RenderSpriteComponent;
    obj.spriteSrc = obj.spriteSrc ?? v?.spriteSrc ?? "uv8";
    return obj;
}

// chunkDataMixin

export const ChunkDataSchema = object({
    isChunkData: literal(true),
    position: array(number()),
    normal: array(number()),
    uv: array(number()),
});

export type ChunkDataComponent = InferOutput<typeof ChunkDataSchema>;

export function chunkDataMixin<T extends PrimitiveObject>(
    p: T,
    v?: ChunkDataComponent
): T & ChunkDataComponent {
    const obj = p as T & ChunkDataComponent;
    obj.isChunkData = obj.isChunkData ?? v?.isChunkData ?? true;
    obj.position = obj.position ?? v?.position ?? [];
    obj.normal = obj.normal ?? v?.normal ?? [];
    obj.uv = obj.uv ?? v?.uv ?? [];
    return obj;
}
