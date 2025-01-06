import { TileMapManager, TileMapManagerSymbol } from "./tilemap";

import { effect } from "@preact/signals";
import {
    DirectionalLight,
    InstancedMesh,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    Scene,
    Vector3,
} from "three";

import { camera } from "./rendering/camera";
import { causticsMaterial } from "./rendering/shaders/causticsMaterial";
import { getSubTextureFromAtlas, spritesheetData } from "./rendering/textures";
import { socket } from "./socket";
import { tweakpaneRef } from "./stats";
// import { sampleContinentalness } from "@catfish/common/procedural/continentalness";
import type { CHUNK_SIZE, WORLD_ZONE_DIM } from "@catfish/common/constants.js";
import type { provide } from "@catfish/common/di/index.js";
import { globalTicker } from "@catfish/common/Ticker.js";

export async function game(scene: Scene) {
    // const createNetworkedPlayer = (
    //     playerInfo: PlayerInfo,
    //     socket: ClientSocket
    // ) => {
    //     console.log("Creating networked player", playerInfo.playerId);
    //     if (gameObjects.has(playerInfo.playerId)) {
    //         console.log(
    //             "Tried to create networked player that already exists",
    //             playerInfo.playerId
    //         );
    //         return gameObjects.get(playerInfo.playerId)!;
    //     }
    //     console.log("Creating networked player", playerInfo.playerId);
    //     provide({
    //         provide: Ticker,
    //         useValue: globalTicker,
    //     });
    //     provide({
    //         provide: PlayerInfoSymbol,
    //         useValue: playerInfo,
    //     });

    //     provide({
    //         provide: Scene,
    //         useValue: scene,
    //     });

    //     provide({
    //         provide: Camera,
    //         useValue: camera,
    //     });

    //     provide({
    //         provide: ClientSocketSymbol,
    //         useValue: socket,
    //     });

    //     const newPlayer = new GameObject();

    //     provide({
    //         provide: GameObject,
    //         useValue: newPlayer,
    //     });

    //     if (socket.id === playerInfo.playerId) {
    //         newPlayer.addBehavior(CameraBehavior);
    //         newPlayer.addBehavior(WASDMoveBehavior);
    //         newPlayer.addBehavior(GameUIBehavior);
    //     }
    //     newPlayer.addBehavior(PlayerSpriteBehavior);
    //     newPlayer.addBehavior(ReconsiliationBehavior);

    //     gameObjects.set(playerInfo.playerId, newPlayer);

    //     if (socket.id === playerInfo.playerId) {
    //         player = newPlayer;
    //     }

    //     return newPlayer;
    // };

    const MAX_BATCH_SIZE = 5;
    const PROCESS_INTERVAL = 250;
    let initialLoadT = -1;

    const processChunkQueues = () => {
        // Process some loads
        let loadCount = 0;
        while (loadCount < MAX_BATCH_SIZE && toLoad.length > 0) {
            const { chunkX, chunkY, chunkData } = toLoad.shift();
            tileMan.addChunk(chunkX, chunkY, chunkData);
            const geometry = tileMan.tileMaps.get(
                `${chunkX},${chunkY}`
            )?.geometry;
            loadCount++;

            if (geometry) {
                socket.emit(
                    "getVertexDisplacements",
                    chunkX,
                    chunkY,
                    (data) => {
                        tileMan.updateChunkHeight(geometry, data);
                    }
                );
            }
        }

        // Process some unloads
        let unloadCount = 0;
        while (unloadCount < MAX_BATCH_SIZE && toUnload.length > 0) {
            const { chunkX, chunkY } = toUnload.shift();
            tileMan?.removeChunk(chunkX, chunkY);
            unloadCount++;
        }
    };

    let toLoad: {
        chunkX: any;
        chunkY: any;
        chunkData: any;
    }[] = [];
    let toUnload: { chunkX: any; chunkY: any }[] = [];

    setInterval(() => {
        processChunkQueues();
    }, PROCESS_INTERVAL);

    socket.on("load_chunk", (chunkX, chunkY, chunkData) => {
        if (initialLoadT === -1) {
            initialLoadT = Date.now();
        }

        const inUnload = toUnload.findIndex(
            (c) => c.chunkX === chunkX && c.chunkY === chunkY
        );
        if (inUnload !== -1) {
            toUnload.splice(inUnload, 1);
        }
        toLoad.push({ chunkX, chunkY, chunkData });
    });

    socket.on("unload_chunk", (chunkX, chunkY) => {
        const inLoad = toLoad.findIndex(
            (c) => c.chunkX === chunkX && c.chunkY === chunkY
        );
        if (inLoad !== -1) {
            toLoad.splice(inLoad, 1);
        }

        toUnload.push({ chunkX, chunkY });
    });

    socket.on("player_disconnected", (playerId: string) => {
        const player = gameObjects.get(playerId);
        if (player) {
            player.dispose();
        }
        gameObjects.delete(playerId);
    });

    socket.on("tick_sync", (info) => {
        globalTicker.sync(info);
    });

    socket.emit("clientOk");

    provide({
        provide: Scene,
        useValue: scene,
    });

    let tileMan: TileMapManager = new TileMapManager();

    provide({
        provide: TileMapManagerSymbol,
        useValue: tileMan,
    });

    const causticsGeometry = new PlaneGeometry(1000, 1000, 1, 1);
    const causticsMesh = new Mesh(causticsGeometry, causticsMaterial);
    causticsMesh.rotation.x = -Math.PI / 2;
    causticsMaterial.uniforms["opacity"].value = 0.9;

    scene.add(causticsMesh);

    const debugUV = new Mesh(
        new PlaneGeometry(
            CHUNK_SIZE * WORLD_ZONE_DIM,
            CHUNK_SIZE * WORLD_ZONE_DIM,
            1,
            1
        ),
        new MeshBasicMaterial({
            map: getSubTextureFromAtlas("uv8"),
            transparent: true,
            depthWrite: false,
            depthTest: false,
        })
    );
    debugUV.material.opacity = 0.1;
    debugUV.position.y = -10;
    debugUV.rotation.x = -Math.PI / 2;
    debugUV.position.x = (CHUNK_SIZE * WORLD_ZONE_DIM) / 2;
    debugUV.position.z = (CHUNK_SIZE * WORLD_ZONE_DIM) / 2;
    // scene.add(debugUV);

    // add a skybox

    const light = new DirectionalLight(0xffffff, 2);
    light.castShadow = true; // default false
    const a = Math.PI / 2 + 0.5;
    // Tweakpane color
    tweakpaneRef.addBinding(light, "color", {
        label: "Light Color",
        color: {
            type: "float",
        },
    });

    light.position.y = Math.sin(a);
    light.position.z = Math.cos(a);
    scene.add(light);

    // test night day cycle... just rotate the light

    effect(() => {
        globalTicker.currentTick.value;
        // Move caustic to player

        const player = playerInfos.get(socket.id);
        if (player) {
            causticsMesh.position.x = player.x;
            causticsMesh.position.z = player.y;
            // skyboxMesh.position.x = player.x;
            // skyboxMesh.position.z = player.y;

            causticsMaterial.uniforms["causticsOffset"].value.x =
                player.x / causticsGeometry.parameters.width;
            causticsMaterial.uniforms["causticsOffset"].value.y =
                -player.y / causticsGeometry.parameters.height;
        }
    });

    const texName: keyof typeof spritesheetData.frames = "tall_grass";
    const grassText = getSubTextureFromAtlas(texName);
    const texAspect =
        spritesheetData.frames[texName].frame.w /
        spritesheetData.frames[texName].frame.h;
    const texGeo = new PlaneGeometry(texAspect, 1);
    const texScale = 5;
    texGeo.scale(texScale, texScale, texScale);

    const grassMat = new MeshBasicMaterial({
        map: grassText,
        side: 2,
        transparent: true,
        alphaTest: 0.5,
    });

    const count = 200;

    const instancedMesh = new InstancedMesh(texGeo, grassMat, count * 2);
    effect(() => {
        globalTicker.currentTick.value;
        const newGeo = new PlaneGeometry(texAspect, 1);
        newGeo.scale(texScale, texScale, texScale);

        // Compute the angle based on the camera's direction
        const cameraDirection = new Vector3();
        camera.getWorldDirection(cameraDirection); // Get the camera's current world direction

        const angle = Math.atan2(cameraDirection.x, cameraDirection.z); // Angle to rotate towards camera

        newGeo.rotateY(angle); // Rotate geometry to face the camera

        instancedMesh.geometry = newGeo;
        instancedMesh.instanceMatrix.needsUpdate = true;
    });

    for (let i = 0; i < count; i++) {
        const transform = new Vector3();
        transform.x = Math.random() * 100;
        transform.z = Math.random() * 100;

        // transform.y =
        //     sampleContinentalness(transform.x, transform.z) *
        //         TERRAIN_HEIGHT_SCALE -
        //     TERRAIN_HEIGHT_SCALE / 2 +
        //     texScale / 2;

        const mat = new Matrix4();
        mat.setPosition(transform);
        instancedMesh.setMatrixAt(i, mat);
    }

    scene.add(instancedMesh);

    return () => {
        // root.destroy();
    };
}
