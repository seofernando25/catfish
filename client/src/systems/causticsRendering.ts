import { entityQuery, type ECSWorld } from "@catfish/common/ecs.js";
import { Mesh, PlaneGeometry, type Scene } from "three";
import { is } from "valibot";
import { FishSpotSchemaSchema } from "@catfish/common/data/fishing.js";
import { causticsMaterial } from "../rendering/shaders/causticsMaterial";
import { effect } from "@preact/signals";
import { globalTicker } from "@catfish/common/Ticker.js";

export const causticsRenderingSystem = (scene: Scene, world: ECSWorld) => {
    const fishSpotQuery = entityQuery(world.onWorldLifecycle, (entity) => {
        return is(FishSpotSchemaSchema, entity);
    });

    const geometries = new Map<number, PlaneGeometry>();

    const fishSpotLifecycle = fishSpotQuery.entityLifeCycle((entity) => {
        const dim = entity.dim;
        if (!geometries.has(dim)) {
            geometries.set(
                dim,
                new PlaneGeometry(entity.dim, entity.dim, 1, 1)
            );
        }

        const plane = geometries.get(dim)!;
        const mesh = new Mesh(plane, causticsMaterial.clone());
        mesh.material.uniforms["scale1"].value = dim * 0.5;
        mesh.material.uniforms["scale2"].value = dim;

        mesh.rotation.x = -Math.PI / 2;
        mesh.position.x += entity.dim / 2;
        mesh.position.z += entity.dim / 2;
        mesh.position.x = entity.x;
        mesh.position.z = entity.z;
        mesh.position.y = entity.y;
        scene.add(mesh);

        const cleanUpUniformUpdate = effect(() => {
            mesh.material.uniforms["time"].value =
                globalTicker.elapsed.value / 4;
        });

        return () => {
            cleanUpUniformUpdate();
            scene.remove(mesh);
        };
    });

    return () => {
        fishSpotLifecycle();
    };
};
