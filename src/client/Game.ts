import { WASDMoveBehavior } from "../common/behaviors/WASDMoveBehavior";
import { GamePlayer } from "./player";
import { TileMapManager } from "./tilemap";

import { effect } from "@preact/signals";
import { Camera, Scene } from "three";
import { ReconsiliationBehavior } from "../common/behaviors/ReconsiliationBehavior";
import type { PlayerInfo } from "../common/player";
import { Ticker } from "../common/ticker/Ticker";
import { camera } from "./rendering/camera";
import { socket, waitUntilConnected, type ClientSocket } from "./socket";
import stats from "./stats";
import { keyboardOrSignal } from "./input/events";
import { CameraBehavior } from "../common/behaviors/CameraBehavior";
import { PlayerSpriteBehavior } from "../common/behaviors/PlayerSpriteBehavior";

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
        const newPlayer = new GamePlayer(scene, playerInfo, ticker);

        newPlayer.behaviors = [
            ...(socket.id === playerInfo.playerId
                ? [
                      new WASDMoveBehavior(newPlayer, tileMan, socket, ticker),
                      new CameraBehavior(newPlayer, ticker, camera),
                  ]
                : []),
            new PlayerSpriteBehavior(newPlayer, ticker),
            // new NetworkedMoveBehavior(player, socket, 0.1),
            new ReconsiliationBehavior(newPlayer, socket, ticker),
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

    let ticker = new Ticker();

    socket.on("tick_sync", (info) => {
        ticker.sync(info);
    });

    socket.emit("clientOk");

    let tileMan: TileMapManager = new TileMapManager(scene);

    return () => {
        // root.destroy();
    };
}
