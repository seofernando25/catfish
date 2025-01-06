import {
    PositionSchema,
    RenderSpriteSchema,
} from "@catfish/common/data/entity.js";
import { PrimitiveObjectSchema } from "@catfish/common/data/objectData.js";
import { entityQuery, type ECSWorld } from "@catfish/common/ecs.js";
import {
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    Quaternion,
    Scene,
    Vector3,
} from "three";
import { is } from "valibot";
import { camera } from "../rendering/camera";
import { getSubTextureFromAtlas, spritesheetData } from "../rendering/textures";

export const spriteRenderingSystem = (scene: Scene, world: ECSWorld) => {
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
                map: getSubTextureFromAtlas(spriteSrc),
                alphaTest: 0.5,
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

    const renderableLifecycle = renderable_query.entityLifeCycle((entity) => {
        const spriteSrc = entity.spriteSrc;
        const geoMat = getGeoMat(spriteSrc);
        const object = new Mesh(geoMat.geometry, geoMat.material);
        renderableInstancesMap.set(entity.id, object);

        scene.add(object);
        return () => {
            scene.remove(object);
        };
    });

    const up = new Vector3(0, 1, 0);
    const quaternion = new Quaternion();
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
                object.position.lerp(renderable, 0.19);

                quaternion.identity();
                const floorNormal = up.clone(); // TODO: if we are on a slanted surface, this should be the normal of the surface
                quaternion.setFromUnitVectors(up, floorNormal); // Align the 'up' vector to the floorNormal
                object.quaternion.copy(quaternion);

                // Step 2: Face the camera
                const dx = object.position.x - camera.value.position.x;
                const dz = object.position.z - camera.value.position.z;
                const angle = Math.atan2(dz, dx);
                const spriteOffset = Math.PI / 2;
                object.rotateOnWorldAxis(floorNormal, -angle - spriteOffset);
            }
        }
    );

    return () => {
        for (const [id, object] of renderableInstancesMap) {
            scene.remove(object);
        }
        systemCleanup();
        renderable_query.dispose();
        renderableLifecycle();
    };
};
