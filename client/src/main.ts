import { effect } from "@preact/signals";
import "./app.css";

import {
    PositionSchema,
    RenderSpriteSchema,
} from "@catfish/common/data/entity.js";
import { PrimitiveObjectSchema } from "@catfish/common/data/objectData.js";
import { entityQuery, newECSWorld } from "@catfish/common/ecs.js";
import { globalTicker } from "@catfish/common/Ticker.js";
import {
    Mesh,
    MeshBasicMaterial,
    OrthographicCamera,
    PerspectiveCamera,
    PlaneGeometry,
    SphereGeometry,
    Vector3,
} from "three";
import { custom, is, object, pipe, string } from "valibot";
import { getDebugFlags } from "./debugFlags";
import { keyboardOrSignal } from "./input/events";
import { loginSeq, menuSeq } from "./menu";
import { camera } from "./rendering/camera";
import { globalScene } from "./rendering/renderer";
import { causticsMaterial } from "./rendering/shaders/causticsMaterial";
import {
    getSubTextureFromAtlas,
    skyboxTexture,
    spritesheetData,
} from "./rendering/textures";
import { windowAspect } from "./rendering/window";
import { socket } from "./socket";

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
    color: 0x416f72,
    side: 1,
});
const skyboxMesh = new Mesh(skybox, skyboxMat);
threeScene.add(skyboxMesh);

const addMenuBackground = () => {
    const menuBackgroundMat = new MeshBasicMaterial({
        map: getSubTextureFromAtlas("titlescreen_wide"),
    });
    const menuBackgroundAspect =
        spritesheetData.frames.titlescreen_wide.frame.w /
        spritesheetData.frames.titlescreen_wide.frame.h;

    const menuBackgroundGeometry = new PlaneGeometry(menuBackgroundAspect, 1);
    const catfishingTitlePanelMesh = new Mesh(
        menuBackgroundGeometry,
        menuBackgroundMat
    );
    globalScene.add(catfishingTitlePanelMesh);
    return () => {
        globalScene.remove(catfishingTitlePanelMesh);
    };
};

const addCaustics = () => {
    const causticsGeometry = new PlaneGeometry(1000, 1000, 1, 1);
    const causticsMesh = new Mesh(causticsGeometry, causticsMaterial);
    causticsMesh.rotation.x = -Math.PI / 2;
    causticsMaterial.uniforms["opacity"].value = 0.9;

    globalScene.add(causticsMesh);

    return () => {
        globalScene.remove(causticsMesh);
    };
};

// Make sure camera covers title screen vertically

// region Title screen setup

// region Setup sequennce

camera.value = new OrthographicCamera(-1, 1, 0.5, -0.5, 0.1, 1000);
camera.value.position.z = 1;
const disposeMenu = addMenuBackground();
const computeWindowAspectEffect = effect(() => {
    if (camera.value instanceof OrthographicCamera) {
        const horizontalScale = windowAspect.value;
        camera.value.left = -0.5 * horizontalScale;
        camera.value.right = 0.5 * horizontalScale;
        camera.value.updateProjectionMatrix();
    }
});

const loginInfo = await loginSeq();
let nextScene = "";
if (!getDebugFlags().skipLogin.value) {
    nextScene = await menuSeq();
} else {
    console.log("Skipping Menu");
    nextScene = "game";
}
disposeMenu();
computeWindowAspectEffect();
// endregion

// Set up a simple scene

const game = async () => {
    const world = newECSWorld();

    // Update camera
    camera.value = new PerspectiveCamera(75, windowAspect.value, 0.1, 1000);

    const removeCaustics = addCaustics();

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

        const renderable_query = entityQuery(
            world.onWorldLifecycle,
            (entity) => {
                return (
                    is(RenderSpriteSchema, entity) &&
                    is(PrimitiveObjectSchema, entity) &&
                    is(PositionSchema, entity)
                );
            }
        );

        const renderableLifecycle = renderable_query.entityLifeCycle(
            (entity) => {
                const spriteSrc = entity.spriteSrc;
                const geoMat = getGeoMat(spriteSrc);
                const object = new Mesh(geoMat.geometry, geoMat.material);
                renderableInstancesMap.set(entity.id, object);
                const v = new Vector3();
                v.set(entity.x, entity.y, entity.z);

                threeScene.add(object);
                return () => {
                    threeScene.remove(object);
                };
            }
        );

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
                    object.position.lerp(renderable, 0.9);
                }
            }
        );

        return () => {
            for (const [id, object] of renderableInstancesMap) {
                threeScene.remove(object);
            }
            systemCleanup();
            renderable_query.dispose();
            renderableLifecycle();
            removeCaustics();
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
                            custom((v) => v === loginInfo.username)
                        ),
                    }),
                    entity
                )
            );
        });

        const dispose = world.addSystem(camera_query, (entities) => {
            for (const entity of entities) {
                camera.value.position.x = entity.x + 0;
                camera.value.position.y = entity.y + 2;
                camera.value.position.z = entity.z - 5;
                camera.value.lookAt(entity.x, entity.y, entity.z);
                skyboxMesh.position.x = camera.value.position.x;
                skyboxMesh.position.y = camera.value.position.y;
                skyboxMesh.position.z = camera.value.position.z;
            }
        });

        return () => {
            dispose();
            camera_query.dispose();
        };
    };

    cameraSystem();
    // endregion

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

    effect(() => {
        const leftValue = left.value;
        const rightValue = right.value;
        const x = leftValue - rightValue;
        const y = up.value - down.value;
        socket.emit("action_move", { x, y });
    });

    const startT = Date.now();
    socket.emit("spawn", () => {
        const delta = Date.now() - startT;
        console.log("Spawned in", delta / 1000, "seconds");
    });
};

console.log("Next scene", nextScene);
if (nextScene === "game") {
    game();
} else {
    console.error("Unknown scene", nextScene);
}

// game();
