import Phaser from "phaser";

import { Pane } from "tweakpane";
import dirtImage from "../assets/dirt/dirt.png";
import playerImage from "../assets/player/car.png";
import sandImage from "../assets/sand/sand.png";
import grassImage from "../assets/grass/grass.png";
import tree1 from "../assets/trees/tree1.png";
import tree2 from "../assets/trees/tree2.png";
import tree3 from "../assets/trees/tree3.png";
import waterImage from "../assets/water/water.png";

import { NetworkedMoveBehavior } from "../common/behaviors/NetworkedMoveBehavior";
import { WASDMoveBehavior } from "../common/behaviors/WASDMoveBehavior";
import { GamePlayer } from "./player";
import { TileMapManager } from "./tilemap";

import { io, Socket } from "socket.io-client";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "../server/events";
import type { PlayerInfo } from "../common/player";
import { GameTimer } from "../server/GameTimer";
import { ReconsiliationBehavior } from "../common/behaviors/ReconsiliationBehavior";

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    document.location.origin,
    {
        path: "/ws",
    }
);

// socket.on("player_info_announce", (playerInfo: PlayerInfo) => {
//     console.log("Player info announce", playerInfo);
// });

export type ClientSocket = typeof socket;

// const honoServer = hc<AppType>(document.location.origin);
// const wsClient = honoServer.ws.$ws();
// const rpcTx = webRpcTx(wsClient);
// const rpcRx = webRpcRx(wsClient);

const PARAMS = {
    factor: 123,
    title: "hello",
    color: "#ff0055",
};

const pane = new Pane();

pane.addBinding(PARAMS, "factor");
pane.addBinding(PARAMS, "title");
pane.addBinding(PARAMS, "color");

export default class Game extends Phaser.Scene {
    chunkSize = 32;
    playerInfos: Map<string, PlayerInfo> = new Map();
    player: GamePlayer | undefined = undefined;
    players: Map<string, GamePlayer> = new Map();
    tileMan: TileMapManager | undefined;
    timer = new GameTimer(20, this.onTick.bind(this));

    onTick() {
        // console.log("Tick", this.tick++);
    }

    tick = 0;

    preload() {
        this.load.image("playerImage", playerImage);

        this.load.image("tree1", tree1);
        this.load.image("tree2", tree2);
        this.load.image("tree3", tree3);

        // this.load.image("waterTileset", waterImage);
        this.load.spritesheet("waterTileset", waterImage, {
            frameWidth: 16,
            frameHeight: 16,
            startFrame: 4,
        });
        this.load.spritesheet("dirtTileset", dirtImage, {
            frameWidth: 16,
            frameHeight: 16,
            startFrame: 4,
        });
        this.load.spritesheet("sandTileset", sandImage, {
            frameWidth: 16,
            frameHeight: 16,
            startFrame: 4,
        });

        this.load.spritesheet("grassTileset", grassImage, {
            frameWidth: 16,
            frameHeight: 16,
            startFrame: 4,
        });
    }

    update(time: number, delta: number) {
        for (const player of this.players.values()) {
            player.update(delta / 1000);
        }

        const camera = this.cameras.main;
        camera.centerOn(this.player?.player.x ?? 0, this.player?.player.y ?? 0);
    }

    async create() {
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

        socket.on("player_info_announce", (playerInfo: PlayerInfo) => {
            this.playerInfos.set(playerInfo.playerId, playerInfo);
            const id = playerInfo.playerId;
            1;
            if (this.players.has(id)) {
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

        this.tileMan = new TileMapManager(this);
        console.log("Creating scene");

        const createNetworkedPlayer = (
            playerInfo: PlayerInfo,
            socket: ClientSocket
        ) => {
            if (this.players.has(playerInfo.playerId)) {
                console.log(
                    "Tried to create networked player that already exists",
                    playerInfo.playerId
                );
                return this.players.get(playerInfo.playerId)!;
            }
            console.log("Creating networked player", playerInfo.playerId);
            const player = new GamePlayer(scene, playerInfo);
            player.behaviors = [
                ...(socket.id === playerInfo.playerId
                    ? [new WASDMoveBehavior(player, this.tileMan!, socket)]
                    : []),
                // new NetworkedMoveBehavior(player, socket, 0.1),
                new ReconsiliationBehavior(player, socket),
                // new NetworkPlayerAnnounceBehavior(player, this.wsClient!),
            ];
            this.players.set(playerInfo.playerId, player);

            if (socket.id === playerInfo.playerId) {
                this.player = player;
            }

            return player;
        };

        socket.on("load_chunk", (chunkX, chunkY, chunkData) => {
            this.tileMan?.addChunk(chunkX, chunkY, chunkData);
        });

        socket.on("unload_chunk", (chunkX, chunkY) => {
            this.tileMan?.removeChunk(chunkX, chunkY);
        });

        socket.on("player_disconnected", (playerId: string) => {
            const player = this.players.get(playerId);
            if (player) {
                player.dispose();
            }
            this.players.delete(playerId);
        });

        socket.emit("clientOk");

        const scene = this;

        const playerGraphic = this.add.graphics();
        playerGraphic.setDepth(1000);

        // Add a tree 10 tiles down the player
        const tree = this.add.image(5000, 960, "tree1").setDisplaySize(3, 3);
        tree.setDepth(1000);

        const startT = Date.now();
        this.input.on(
            "wheel",
            (
                pointer: Phaser.Input.Pointer,
                deltaX: number,
                deltaY: number,
                deltaZ: number
            ) => {
                const camera = this.cameras.main;
                const zoomFactor = 0.05; // Adjust this to control zoom speed

                // Calculate the zoom change proportionally
                const zoomChange = camera.zoom * zoomFactor;
                const minZoom = 1;
                const maxZoom = 50;
                if (deltaZ > 0) {
                    camera.zoom = Phaser.Math.Clamp(
                        camera.zoom - zoomChange,
                        minZoom,
                        maxZoom
                    );
                } else if (deltaZ < 0) {
                    camera.zoom = Phaser.Math.Clamp(
                        camera.zoom + zoomChange,
                        minZoom,
                        maxZoom
                    );
                }
            }
        );

        this.cameras.main.zoom = 20;

        console.log("Time to generate: ", Date.now() - startT);
        this.timer.start();
    }
}
