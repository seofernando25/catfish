import { newECSWorld } from "@catfish/common/ecs.js";
import { globalTicker } from "@catfish/common/Ticker.js";
import { PerspectiveCamera } from "three";
import { camera } from "../rendering/camera";
import { globalScene } from "../rendering/renderer";
import { windowAspect } from "../rendering/window";
import { socket } from "../socket";
import { cameraRotationSystem } from "../systems/camera";
import { causticsRenderingSystem } from "../systems/causticsRendering";
import { chunkRenderingSystem } from "../systems/chunkRendering";
import { playerInfoSystem } from "../systems/playerInfo";
import { playerMovementSystem } from "../systems/playerMovement";
import { skyboxSystem } from "../systems/skybox";
import { spriteRenderingSystem } from "../systems/spriteRendering";
import pako from "pako";
import { deserializeObject } from "@catfish/common/serializer.js";
import { movementSystem } from "@catfish/common/systems/movementSystem.js";
import { playerUseSystem } from "../systems/playerUse";
import { effect } from "@preact/signals";

type GameConfig = {
	username: string;
};

export const startGame = async ({ username }: GameConfig) => {
	const world = newECSWorld();

	// Update camera
	camera.value = new PerspectiveCamera(75, windowAspect.value, 0.1, 1000);

	const cleanUpCausticsSystem = causticsRenderingSystem(globalScene, world);
	const cleanUpRendering = spriteRenderingSystem(globalScene, world);
	const cleanUpCameraSystem = cameraRotationSystem(world, username);
	const cleanUpDebugPlayerInfoSystem = playerInfoSystem(
		world,
		username
	);
	const cleanUpChunkRenderingSystem = chunkRenderingSystem(
		globalScene,
		world
	);

	const cleanUpMovementSystem = movementSystem(world);
	const cleanUpPlayerMovementSystem = playerMovementSystem(
		world,
		username
	);
	const cleanUpPlayerUseSystem = playerUseSystem();

	const cleanUpSkyboxSystem = skyboxSystem(globalScene);

	effect(() => {
		globalTicker.currentTick.value;
		world.tick();
	});

	socket.on("add_entity", (entity, ack) => {
		const decompressed = pako.ungzip(entity);
		const deserialized = deserializeObject(decompressed) as any;
		world.addEntity(deserialized);
		ack();
	});

	socket.on("remove_entity", (entity, ack) => {
		console.log("Removing entity", entity);
		world.removeEntity(entity);
		ack();
	});

	socket.on("update_entity", (entity, ack) => {
		const decompressed = pako.ungzip(entity);
		const deserialized = deserializeObject(decompressed) as any;
		world.patchEntity(deserialized);
		ack();
	});

	const startT = Date.now();
	console.log("Emitting spawn");
	socket.emit("spawn", () => {
		const delta = Date.now() - startT;
		console.log("Spawned in", delta / 1000, "seconds");
	});

	return () => {
		cleanUpDebugPlayerInfoSystem();
		cleanUpRendering();
		cleanUpCausticsSystem();
		cleanUpCameraSystem();
		cleanUpPlayerMovementSystem();
		cleanUpChunkRenderingSystem();
		cleanUpMovementSystem();
		cleanUpPlayerUseSystem();
		cleanUpSkyboxSystem();
	};
}; 