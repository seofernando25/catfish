import { WASDMoveBehavior } from "../common/behaviors/WASDMoveBehavior";
import { GamePlayer } from "./player";
import { TileMapManager } from "./tilemap";

import {
    DirectionalLight,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    Scene,
    Sphere,
    SphereGeometry,
    Vector2,
} from "three";
import { CameraBehavior } from "../common/behaviors/CameraBehavior";
import { PlayerSpriteBehavior } from "../common/behaviors/PlayerSpriteBehavior";
import { ReconsiliationBehavior } from "../common/behaviors/ReconsiliationBehavior";
import type { PlayerInfo } from "../common/player";
import { globalTicker, Ticker } from "../common/ticker/Ticker";
import { camera } from "./rendering/camera";
import { socket, waitUntilConnected, type ClientSocket } from "./socket";
import { GameUIBehavior } from "../common/behaviors/GameUIBehavior";
import { causticsMaterial } from "./rendering/shaders/causticsMaterial";
import { effect } from "@preact/signals";
import { SkyMesh } from "three/addons/objects/SkyMesh.js";
import { skyboxTexture } from "./rendering/textures";

export async function game(scene: Scene) {
    let playerInfos: Map<string, PlayerInfo> = new Map();
    let player: GamePlayer | undefined = undefined;
    let players: Map<string, GamePlayer> = new Map();

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
        if (players.has(playerInfo.playerId)) {
            console.log(
                "Tried to create networked player that already exists",
                playerInfo.playerId
            );
            return players.get(playerInfo.playerId)!;
        }
        console.log("Creating networked player", playerInfo.playerId);
        const newPlayer = new GamePlayer(scene, playerInfo, globalTicker);

        newPlayer.behaviors = [
            ...(socket.id === playerInfo.playerId
                ? [
                      new WASDMoveBehavior(
                          newPlayer,
                          tileMan,
                          socket,
                          globalTicker
                      ),
                      new CameraBehavior(newPlayer, globalTicker, camera),
                      new GameUIBehavior(newPlayer, globalTicker),
                  ]
                : []),
            new PlayerSpriteBehavior(newPlayer, globalTicker),
            // new NetworkedMoveBehavior(player, socket, 0.1),
            new ReconsiliationBehavior(newPlayer, socket, globalTicker),
            // new NetworkPlayerAnnounceBehavior(player, this.wsClient!),
        ];
        players.set(playerInfo.playerId, newPlayer);

        if (socket.id === playerInfo.playerId) {
            player = newPlayer;
        }

        return newPlayer;
    };

    let toLoad = [];

    setInterval(() => {
        if (toLoad.length > 0) {
            console.log("Loading chunk");
            const { chunkX, chunkY, chunkData, heightData } = toLoad.shift();
            tileMan?.addChunk(chunkX, chunkY, chunkData, heightData);
        }
    }, 50);

    socket.on("load_chunk", (chunkX, chunkY, chunkData, heightData) => {
        toLoad.push({ chunkX, chunkY, chunkData, heightData });
    });

    socket.on("unload_chunk", (chunkX, chunkY) => {
        tileMan?.removeChunk(chunkX, chunkY);
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

    const causticsGeometry = new PlaneGeometry(1000, 1000, 1, 1);
    const causticsMesh = new Mesh(causticsGeometry, causticsMaterial);
    causticsMesh.position.y = 0.1;
    causticsMesh.rotation.x = -Math.PI / 2;
    causticsMaterial.uniforms.opacity.value = 0.8;

    scene.add(causticsMesh);

    // add a skybox
    const skybox = new SphereGeometry(900, 32, 32);
    const skyboxMat = new MeshBasicMaterial({
        map: skyboxTexture,
        side: 1,
    });
    const skyboxMesh = new Mesh(skybox, skyboxMat);
    scene.add(skyboxMesh);

    const light = new DirectionalLight(0xffffff, 3);
    light.castShadow = true; // default false
    const a = Math.PI / 2 + 0.5;

    light.position.y = Math.sin(a);
    light.position.z = Math.cos(a);
    scene.add(light);

    // test night day cycle... just rotate the light

    effect(() => {
        globalTicker.currentTick.value;
        // Move caustic to player
        if (player) {
            causticsMesh.position.x = player.player.x;
            causticsMesh.position.z = player.player.y;
            skyboxMesh.position.x = player.player.x;
            skyboxMesh.position.z = player.player.y;

            // causticsOffset
            causticsMaterial.uniforms.causticsOffset.value = new Vector2(
                player.player.x / causticsGeometry.parameters.width,
                -player.player.y / causticsGeometry.parameters.height
            );
        }
    });

    return () => {
        // root.destroy();
    };
}
