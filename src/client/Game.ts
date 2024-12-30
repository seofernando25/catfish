import { WASDMoveBehavior } from "../common/behaviors/WASDMoveBehavior";
import { GameObject } from "./gameObject";
import { TileMapManager, TileMapManagerSymbol } from "./tilemap";

import { effect } from "@preact/signals";
import {
    Camera,
    DirectionalLight,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    Scene,
    SphereGeometry,
    Vector2,
} from "three";
import { CameraBehavior } from "../common/behaviors/CameraBehavior";
import { GameUIBehavior } from "../common/behaviors/GameUIBehavior";
import { PlayerSpriteBehavior } from "../common/behaviors/PlayerSpriteBehavior";
import { ReconsiliationBehavior } from "../common/behaviors/ReconsiliationBehavior";
import { provide } from "../common/di";
import { PlayerInfoSymbol, type PlayerInfo } from "../common/player";
import { globalTicker, Ticker } from "../common/ticker/Ticker";
import { camera } from "./rendering/camera";
import { causticsMaterial } from "./rendering/shaders/causticsMaterial";
import { skyboxTexture } from "./rendering/textures";
import {
    ClientSocketSymbol,
    socket,
    waitUntilConnected,
    type ClientSocket,
} from "./socket";
import { tweakpaneRef } from "./stats";

export async function game(scene: Scene) {
    let playerInfos: Map<string, PlayerInfo> = new Map();
    let player: GameObject | undefined = undefined;
    let players: Map<string, GameObject> = new Map();

    // Wait for connected
    await waitUntilConnected();

    socket.on("player_info_announce", (playerInfo: PlayerInfo) => {
        playerInfos.set(playerInfo.playerId, playerInfo);
        const id = playerInfo.playerId;
        1;
        if (players.has(id)) {
            // Update player etc?
            // const player = this.players.get(id);
            // if (player) {
            //     player.player.x = playerInfo.x;
            //     player.player.y = playerInfo.y;
            //     player.player.username = playerInfo.username;
            // }
        } else {
            createNetworkedPlayer(playerInfo, socket);
        }
    });

    console.log("Creating scene");

    const createNetworkedPlayer = (
        playerInfo: PlayerInfo,
        socket: ClientSocket
    ) => {
        console.log("Creating networked player", playerInfo.playerId);
        if (players.has(playerInfo.playerId)) {
            console.log(
                "Tried to create networked player that already exists",
                playerInfo.playerId
            );
            return players.get(playerInfo.playerId)!;
        }
        console.log("Creating networked player", playerInfo.playerId);
        provide({
            provide: Ticker,
            useValue: globalTicker,
        });
        provide({
            provide: PlayerInfoSymbol,
            useValue: playerInfo,
        });

        provide({
            provide: Scene,
            useValue: scene,
        });

        provide({
            provide: Camera,
            useValue: camera,
        });

        provide({
            provide: ClientSocketSymbol,
            useValue: socket,
        });

        const newPlayer = new GameObject();

        provide({
            provide: GameObject,
            useValue: newPlayer,
        });

        newPlayer.behaviors = [
            ...(socket.id === playerInfo.playerId
                ? [
                      new CameraBehavior(),
                      new WASDMoveBehavior(),
                      new GameUIBehavior(),
                  ]
                : []),
            new PlayerSpriteBehavior(),
            // new NetworkedMoveBehavior(player, socket, 0.1),
            new ReconsiliationBehavior(),
            // new NetworkPlayerAnnounceBehavior(player, this.wsClient!),
        ];
        players.set(playerInfo.playerId, newPlayer);

        if (socket.id === playerInfo.playerId) {
            player = newPlayer;
        }

        return newPlayer;
    };

    const MAX_BATCH_SIZE = 5;
    const PROCESS_INTERVAL = 50;

    const processChunkQueues = () => {
        // Process some loads
        let loadCount = 0;
        while (loadCount < MAX_BATCH_SIZE && toLoad.length > 0) {
            const { chunkX, chunkY, chunkData, heightData } = toLoad.shift();
            tileMan?.addChunk(chunkX, chunkY, chunkData, heightData);
            loadCount++;
        }

        // Process some unloads
        let unloadCount = 0;
        while (unloadCount < MAX_BATCH_SIZE && toUnload.length > 0) {
            const { chunkX, chunkY } = toUnload.shift();
            tileMan?.removeChunk(chunkX, chunkY);
            unloadCount++;
        }
    };

    let toLoad = [];
    let toUnload = [];

    setInterval(() => {
        processChunkQueues();
    }, PROCESS_INTERVAL);

    socket.on("load_chunk", (chunkX, chunkY, chunkData, heightData) => {
        const inUnload = toUnload.findIndex(
            (c) => c.chunkX === chunkX && c.chunkY === chunkY
        );
        if (inUnload !== -1) {
            toUnload.splice(inUnload, 1);
        }
        toLoad.push({ chunkX, chunkY, chunkData, heightData });
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
        const player = players.get(playerId);
        if (player) {
            player.dispose();
        }
        players.delete(playerId);
    });

    socket.on("tick_sync", (info) => {
        globalTicker.sync(info);
    });

    socket.emit("clientOk");

    let tileMan: TileMapManager = new TileMapManager(scene);

    provide({
        provide: TileMapManagerSymbol,
        useValue: tileMan,
    });

    const causticsGeometry = new PlaneGeometry(1000, 1000, 1, 1);
    const causticsMesh = new Mesh(causticsGeometry, causticsMaterial);
    causticsMesh.position.y = 0.1;
    causticsMesh.rotation.x = -Math.PI / 2;
    causticsMaterial.uniforms.opacity.value = 0.9;

    scene.add(causticsMesh);

    // add a skybox
    const skybox = new SphereGeometry(900, 32, 32);
    const skyboxMat = new MeshBasicMaterial({
        map: skyboxTexture,
        side: 1,
    });
    const skyboxMesh = new Mesh(skybox, skyboxMat);
    scene.add(skyboxMesh);

    const light = new DirectionalLight(0xffffff, 1);
    light.castShadow = true; // default false
    const a = Math.PI / 2 + 0.5;
    // Tweakpane color
    tweakpaneRef.addBinding(light, "color", {
        label: "Light Color",
        color: {
            type: "float",
        },
    });

    tweakpaneRef.addBinding(skyboxMat, "color", {
        label: "Skybox Tint",
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
            skyboxMesh.position.x = player.x;
            skyboxMesh.position.z = player.y;

            causticsMaterial.uniforms.causticsOffset.value.x =
                player.x / causticsGeometry.parameters.width;
            causticsMaterial.uniforms.causticsOffset.value.y =
                -player.y / causticsGeometry.parameters.height;
        }
    });

    return () => {
        // root.destroy();
    };
}
