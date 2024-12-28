import { WASDMoveBehavior } from "../common/behaviors/WASDMoveBehavior";
import { GamePlayer } from "./player";
import { TileMapManager } from "./tilemap";

import { Mesh, PlaneGeometry, Scene, Vector2 } from "three";
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

    socket.on("load_chunk", (chunkX, chunkY, chunkData) => {
        tileMan?.addChunk(chunkX, chunkY, chunkData);
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

    const causticsGeometry = new PlaneGeometry(200, 200, 1, 1);
    const causticsMesh = new Mesh(causticsGeometry, causticsMaterial);
    causticsMesh.position.y = 0.1;
    // causticsMesh.position.x = OFFSET_X + dim / 2;
    // causticsMesh.position.z = OFFSET_Y + dim / 2;
    causticsMesh.rotation.x = -Math.PI / 2;
    causticsMaterial.uniforms.opacity.value = 0.1;

    scene.add(causticsMesh);

    effect(() => {
        globalTicker.currentTick.value;
        // Move caustic to player
        if (player) {
            causticsMesh.position.x = player.player.x;
            causticsMesh.position.z = player.player.y;

            // causticsOffset
            causticsMaterial.uniforms.causticsOffset.value = new Vector2(
                player.player.x / 200,
                -player.player.y / 200
            );
        }
    });

    return () => {
        // root.destroy();
    };
}
