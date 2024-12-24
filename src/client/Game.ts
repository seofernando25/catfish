import { Pane } from "tweakpane";

import { WASDMoveBehavior } from "../common/behaviors/WASDMoveBehavior";
import { GamePlayer } from "./player";
import { TileMapManager } from "./tilemap";

import { Application, Container } from "pixi.js";
import { ReconsiliationBehavior } from "../common/behaviors/ReconsiliationBehavior";
import type { PlayerInfo } from "../common/player";
import { socket, type ClientSocket } from "./socket";

const stats = {
    Connected: false,
    Id: "",
    Status: "",
    Ping: "0",
};

const pane = new Pane();

pane.addBinding(stats, "Connected", {
    readonly: true,
});
pane.addBinding(stats, "Id", {
    readonly: true,
});

pane.addBinding(stats, "Status", {
    readonly: true,
});

pane.addBinding(stats, "Ping", {
    readonly: true,
});

socket.on("connect", () => {
    stats.Connected = true;
    stats.Id = socket.id ?? "Connection Error";
    stats.Status = "Connected";
});

socket.on("disconnect", () => {
    stats.Connected = false;
    stats.Id = "Disconnected";
    stats.Status = "Disconnected";
});

socket.on("connect_error", () => {
    stats.Connected = false;
    stats.Id = "Connection Error";
    stats.Status = "Connection Error";
});

setInterval(() => {
    socket.timeout(250).emit("ping", Date.now(), (err, serverTime: number) => {
        if (err) {
            stats.Ping = "250+";
            return;
        }
        const deltaMs = Date.now() - serverTime;
        const deltaS = deltaMs / 1000;
        stats.Ping = deltaMs.toFixed(0);
    });
}, 250);

export async function game(app: Application) {
    let playerInfos: Map<string, PlayerInfo> = new Map();
    let player: GamePlayer | undefined = undefined;
    let players: Map<string, GamePlayer> = new Map();

    // Wait for connected
    console.log("Waiting for connection");
    await new Promise<void>((resolve) => {
        if (socket.connected) {
            resolve();
        } else {
            socket.on("connect", () => {
                resolve();
            });
        }
    });
    console.log("Connected to server");
    stats.Connected = true;
    stats.Id = socket.id ?? "Connection Error";

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
        const newPlayer = new GamePlayer(root, playerInfo);

        newPlayer.behaviors = [
            ...(socket.id === playerInfo.playerId
                ? [new WASDMoveBehavior(newPlayer, tileMan, socket)]
                : []),
            // new NetworkedMoveBehavior(player, socket, 0.1),
            new ReconsiliationBehavior(newPlayer, socket),
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

    socket.emit("clientOk");

    let root = new Container();
    root.scale.set(20, 20);
    app.stage.addChild(root);

    let tileMan: TileMapManager = new TileMapManager(root);

    // update
    app.ticker.minFPS = 20;
    app.ticker.maxFPS = 20;
    app.ticker.add((ticker) => {
        for (const player of players.values()) {
            console.log(ticker.deltaTime);
            player.update(ticker.deltaTime / 50);
        }

        // move root so its centered on the player
        root.x =
            app.renderer.width / 2 - (player?.player.x ?? 0) * root.scale.x;
        root.y =
            app.renderer.height / 2 - (player?.player.y ?? 0) * root.scale.y;

        // const camera = this.cameras.main;
        // camera.centerOn(this.player?.player.x ?? 0, this.player?.player.y ?? 0);
    });

    // fixed update
    // const onTick = () => {
    //     for (const player of players.values()) {
    //         player.update(20 / 1000);
    //     }
    // };

    // let timer = new GameTimer(20, onTick);

    return () => {
        // timer.stop();
        root.destroy();
    };
}
