import { effect } from "@preact/signals";
import "./app.css";

import {
    PositionSchema,
    RenderSpriteSchema,
} from "@catfish/common/data/entity.js";
import { PrimitiveObjectSchema } from "@catfish/common/data/objectData.js";
import { entityQuery, newECSWorld } from "@catfish/common/ecs.js";
import {
    BoxGeometry,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    SphereGeometry,
    Vector3,
} from "three";
import { custom, is, object, pipe, string, value } from "valibot";
import { keyboardOrSignal } from "./input/events";
import { login } from "./networkCalls";
import { camera } from "./rendering/camera";
import { globalScene } from "./rendering/renderer";
import { socket } from "./socket";
import { globalTicker } from "@catfish/common/Ticker.js";
import { causticsMaterial } from "./rendering/shaders/causticsMaterial";
import {
    getSubTextureFromAtlas,
    skyboxTexture,
    spritesheetData,
    spriteSheetTexture,
} from "./rendering/textures";
import { getUVOffsets } from "@catfish/common/rendering/atlas.js";
// game(globalScene);

const left = keyboardOrSignal([
    {
        key: "ArrowLeft",
    },
    {
        key: "a",
    },
    {
        key: "A",
    },
]);

const right = keyboardOrSignal([
    {
        key: "ArrowRight",
    },
    {
        key: "d",
    },
    {
        key: "D",
    },
]);

const up = keyboardOrSignal([
    {
        key: "ArrowUp",
    },
    {
        key: "w",
    },
    {
        key: "W",
    },
]);

const down = keyboardOrSignal([
    {
        key: "ArrowDown",
    },
    {
        key: "s",
    },
    {
        key: "S",
    },
]);

const threeScene = globalScene;

const skybox = new SphereGeometry(100, 32, 32);
const skyboxMat = new MeshBasicMaterial({
    map: skyboxTexture,
    side: 1,
});
const skyboxMesh = new Mesh(skybox, skyboxMat);
threeScene.add(skyboxMesh);

const causticsGeometry = new PlaneGeometry(1000, 1000, 1, 1);
const causticsMesh = new Mesh(causticsGeometry, causticsMaterial);
causticsMesh.rotation.x = -Math.PI / 2;
causticsMaterial.uniforms["opacity"].value = 0.9;

threeScene.add(causticsMesh);

// Set up a simple scene

camera.position.x = 5;
camera.position.z = 5;
camera.position.y = 5;

camera.lookAt(0, 0, 0);

const world = newECSWorld();

// region Rendering System
const threeRenderingSystem = () => {
    const geometries = new Map<string, PlaneGeometry>();
    const materials = new Map<string, MeshBasicMaterial>();

    const renderableInstancesMap = new Map<number, Mesh>();

    const getGeoMat = (spriteSrc: keyof typeof spritesheetData.frames) => {
        if (!geometries.has(spriteSrc)) {
            const imageAspect =
                spritesheetData.frames[spriteSrc].frame.w /
                spritesheetData.frames[spriteSrc].frame.h;
            const plane = new PlaneGeometry(imageAspect, 1);
            geometries.set(spriteSrc, plane);
        }

        if (!materials.has(spriteSrc)) {
            const mat = new MeshBasicMaterial({
                map: getSubTextureFromAtlas("astrocatL"),
                alphaTest: 0.5,
                side: 2,
                transparent: true,
            });
            materials.set(spriteSrc, mat);
        }

        return {
            geometry: geometries.get(spriteSrc)!,
            material: materials.get(spriteSrc)!,
        };
    };

    const renderable_query = entityQuery(world.onWorldLifecycle, (entity) => {
        return (
            is(RenderSpriteSchema, entity) &&
            is(PrimitiveObjectSchema, entity) &&
            is(PositionSchema, entity)
        );
    });

    const q1 = renderable_query.entityLifeCycle((entity) => {
        const spriteSrc = entity.spriteSrc;
        const geoMat = getGeoMat(spriteSrc);
        const object = new Mesh(geoMat.geometry, geoMat.material);
        renderableInstancesMap.set(entity.id, object);

        threeScene.add(object);
        return () => {
            threeScene.remove(object);
        };
    });

    const systemCleanup = world.addSystem(
        renderable_query,
        (renderableInstances) => {
            for (const renderable of renderableInstances) {
                const object = renderableInstancesMap.get(renderable.id);
                const geoMat = getGeoMat(renderable.spriteSrc);
                if (!object) {
                    continue;
                }
                if (geoMat.material !== object.material) {
                    object.material = geoMat.material;
                }
                object.position.x = renderable.x;
                object.position.z = renderable.z;
                object.position.y = renderable.y;
            }
        }
    );

    return () => {
        for (const [id, object] of renderableInstancesMap) {
            threeScene.remove(object);
        }
        systemCleanup();
        renderable_query.dispose();
        q1();
    };
};

threeRenderingSystem();
// endregion

// region Camera System
const cameraSystem = () => {
    const camera_query = entityQuery(world.onWorldLifecycle, (entity) => {
        return (
            is(PrimitiveObjectSchema, entity) &&
            is(PositionSchema, entity) &&
            // Is the local player
            is(
                object({
                    name: pipe(
                        string(),
                        custom((v) => v === player_name)
                    ),
                }),
                entity
            )
        );
    });

    const dispose = world.addSystem(camera_query, (entities) => {
        for (const entity of entities) {
            camera.position.x = entity.x + 0;
            camera.position.y = entity.y + 2;
            camera.position.z = entity.z - 5;
            camera.lookAt(entity.x, entity.y, entity.z);
            skyboxMesh.position.x = camera.position.x;
            skyboxMesh.position.y = camera.position.y;
            skyboxMesh.position.z = camera.position.z;
        }
    });

    return () => {
        dispose();
        camera_query.dispose();
    };
};

cameraSystem();
// endregion

globalTicker.tickrate.value = 60;
effect(() => {
    globalTicker.currentTick.value;
    world.tick();
});

socket.on("add_entity", (entity) => {
    console.log("Adding entity", entity);
    world.addEntity(entity);
});

socket.on("remove_entity", (entity) => {
    console.log("Removing entity", entity);
    world.removeEntity(entity);
});

socket.on("update_entity", (entity) => {
    world.patchEntity(entity);
});

const randomNames = ["aaron", "brian", "craig"];

const player_name = randomNames[Math.floor(Math.random() * randomNames.length)];
const logged = await login(player_name);
if (logged.success) {
    effect(() => {
        const leftValue = left.value;
        const rightValue = right.value;
        const x = leftValue - rightValue;
        const y = up.value - down.value;
        socket.emit("action_move", { x, y });
    });
} else {
    console.error("Failed to login", logged.message);
}
