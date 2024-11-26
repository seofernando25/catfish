import Phaser from "phaser";

import dirtImage from "../assets/dirt/dirt.png";
import playerImage from "../assets/player/car.png";
import sandImage from "../assets/sand/sand.png";
import tree1 from "../assets/trees/tree1.png";
import tree2 from "../assets/trees/tree2.png";
import tree3 from "../assets/trees/tree3.png";
import waterImage from "../assets/water/water.png";

import { combineLatest } from "rxjs";
import type {
    ClientEvent,
    PlayerInfo,
    ServerEvent,
    ServerEventHandlerMap,
} from "../server/state";
import { NetworkPlayerAnnounceBehavior } from "./behaviors/NetworkPlayerAnnounceBehavior";
import { WASDMoveBehavior } from "./behaviors/WASDMoveBehavior";
import { GamePlayer } from "./player";
import { TileMapManager } from "./tilemap";
import { NetworkedMoveBehavior } from "./behaviors/NetworkedMoveBehavior";

export default class Example extends Phaser.Scene {
    left: Phaser.Input.Keyboard.Key | undefined;
    right: Phaser.Input.Keyboard.Key | undefined;
    up: Phaser.Input.Keyboard.Key | undefined;
    down: Phaser.Input.Keyboard.Key | undefined;
    chunkSize = 32;
    // player = {
    //     xSubject: new BehaviorSubject(0),
    //     ySubject: new BehaviorSubject(0),
    //     gameThis: this,
    //     // Subscribe to throttled position changes
    //     init() {
    //         combineLatest([this.xSubject, this.ySubject])
    //             .pipe(throttleTime(100)) // Throttle updates for combined `x` and `y`
    //             .subscribe(([x, y]) => {
    //                 this.gameThis.updatePosition();
    //             });
    //     },

    //     set x(x) {
    //         this.xSubject.next(x);
    //     },

    //     get x() {
    //         return this.xSubject.getValue();
    //     },

    //     set y(y) {
    //         this.ySubject.next(y);
    //     },

    //     get y() {
    //         return this.ySubject.getValue();
    //     },
    // };
    player: GamePlayer | undefined = undefined;
    preload() {
        this.load.image("playerImage", playerImage);

        this.load.image("tree1", tree1);
        this.load.image("tree2", tree2);
        this.load.image("tree3", tree3);

        // this.load.image("waterTileset", waterImage);
        this.load.spritesheet("waterTileset", waterImage, {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.spritesheet("dirtTileset", dirtImage, {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.spritesheet("sandTileset", sandImage, {
            frameWidth: 16,
            frameHeight: 16,
        });
    }

    worldCoordsToChunkCoords(x: number, y: number) {
        return [Math.floor(x / this.chunkSize), Math.floor(y / this.chunkSize)];
    }

    update(time: number, delta: number) {
        this.createIntersecting();

        for (const player of this.players.values()) {
            player.update(delta / 1000);
        }

        const camera = this.cameras.main;
        camera.centerOn(this.player?.player.x ?? 0, this.player?.player.y ?? 0);
    }

    createIntersecting() {
        if (this.wsClient?.readyState !== WebSocket.OPEN) {
            console.log("Websocket not open");
            return;
        }

        // Get player chunk
        const [playerChunkX, playerChunkY] = this.worldCoordsToChunkCoords(
            this.player?.player.x ?? 0,
            this.player?.player.y ?? 0
        );

        // Radius 5
        const radius = 5;
        const topLeftChunkX = playerChunkX - radius;
        const topLeftChunkY = playerChunkY - radius;
        const bottomRightChunkX = playerChunkX + radius;
        const bottomRightChunkY = playerChunkY + radius;

        for (let x = topLeftChunkX; x <= bottomRightChunkX; x++) {
            for (let y = topLeftChunkY; y <= bottomRightChunkY; y++) {
                if (this.requestedChunks.has(`${x}_${y}`)) {
                    continue;
                }

                const chunkRequestEvent: ClientEvent = {
                    type: "CLIENT_CHUNK_LOAD_REQUEST",
                    data: {
                        x,
                        y,
                    },
                };

                this.requestedChunks.add(`${x}_${y}`);
                // Request chunk
                this.wsClient?.send(JSON.stringify(chunkRequestEvent));
            }
        }
    }
    requestedChunks = new Set<string>();

    wsClient: WebSocket | undefined;

    tileMan: TileMapManager | undefined;

    players: Map<string, GamePlayer> = new Map();

    create() {
        this.tileMan = new TileMapManager(this);
        console.log("Creating scene");
        // window origin at ws
        this.wsClient = new WebSocket(
            document.location.origin.replace("http", "ws") + "/ws"
        );

        const createNetworkedPlayer = (playerInfo: PlayerInfo) => {
            if (this.players.has(playerInfo.playerId)) {
                console.log(
                    "Tried to create networked player that already exists",
                    playerInfo.playerId
                );
                return this.players.get(playerInfo.playerId)!;
            }

            const player = new GamePlayer(scene, playerInfo);
            player.behaviors = [
                new NetworkedMoveBehavior(player, this.wsClient!),
                // new NetworkPlayerAnnounceBehavior(player, this.wsClient!),
            ];
            this.players.set(playerInfo.playerId, player);
            return player;
        };

        const scene = this;
        const handlers: ServerEventHandlerMap = {
            CHUNK_LOAD: (event) => {
                const { x, y, csv } = event.data;

                const chunkData = csv
                    .split("\n")
                    .map((row) => row.split(","))
                    .map((row) => row.map((v) => parseInt(v)));

                this.tileMan?.addChunk(x, y, chunkData);
            },
            PLAYER_JOIN: (event) => {
                console.log("Player joined" + event.data.playerId);

                createNetworkedPlayer({
                    playerId: event.data.playerId,
                    username: "unknown",
                    x: 0,
                    y: 0,
                });
            },
            PLAYER_INFO_ANNOUNCE(event) {
                const { playerId, username, x, y } = event.data;
                console.log("Player info announce: ", playerId, username, x, y);

                // if player already exists, update it
                if (scene.players.has(playerId)) {
                    console.log("Player already exists, updating");
                    const p = scene.players.get(playerId);
                    if (p) {
                        p.player.x = x;
                        p.player.y = y;
                        p.player.username = username;
                    }
                    return;
                }
                console.log("Creating new player");
                createNetworkedPlayer(event.data);
                // Create new player
            },
            PLAYER_MOVE(event) {
                const { playerId, x, y } = event.data;
                console.log("Player moved: ", playerId, x, y);
            },

            PLAYER_USERNAME_CHANGE: (event) => {
                const { playerId, username } = event.data;
                console.log("Player username change: ", playerId, username);
            },
            PLAYER_LEAVE: (event) => {
                console.log("Player left" + event.data.playerId);
                const p = this.players.get(event.data.playerId);
                if (p) {
                    p.dispose();
                }
                this.players.delete(event.data.playerId);
            },
            PLAYER_SELF_ID_ASSIGN: (event) => {
                console.log("Player self id assign: ", event.data.playerId);
                this.player = new GamePlayer(scene, {
                    playerId: "unknown",
                    username: "unknown",
                    x: 5000,
                    y: 950,
                });
                this.player.behaviors = [
                    new WASDMoveBehavior(this.player, this.tileMan!),
                    new NetworkPlayerAnnounceBehavior(
                        this.player,
                        this.wsClient!
                    ),
                ];
                this.players.set(event.data.playerId, this.player!);
            },
        };

        this.wsClient.onmessage = (event) => {
            const message = JSON.parse(event.data.toString()) as ServerEvent;

            const handler = handlers[message.type];
            if (handler) {
                handler(message as any);
            } else {
                alert("Unrecognized message: " + JSON.stringify(message));
            }

            // if (message.type === "player") {
            //     console.log("Player location: ", message);
            //     const { id, x, y, username } = message;
            //     players.set(id, { x, y, username });
            //     drawPlayers();
            // } else if (message.type === "player_leave") {
            //     console.log("Player left: ", message);
            //     // remove his sprite
            //     const { id } = message;
            //     players.delete(id);
            //     playerImages.get(id)?.destroy();
            //     playerImages.delete(id);
            //     playerTexts.get(id)?.destroy();
            //     playerTexts.delete(id);

            //     console.log("Players: ", players);
            //     drawPlayers();
            // } else if (message.type === "chunk") {
            //     const { x, y, data } = message;
            //     // Convert data to 2d array
            //     const dataArr = (data as string)
            //         .split("\n")
            //         .map((row) => row.split(","))
            //         .map((row) => row.map((v) => parseInt(v)));

            //     console.log("Adding chunk: ", x, y);
            //     this.tileMan?.addChunk(x, y, dataArr);
            // } else {
            //     console.log("Unrecognized message: ", message);
            // }
        };

        this.wsClient.onopen = (event) => {
            console.log("Connection opened");

            const e: ClientEvent = {
                type: "CLIENT_PLAYER_LIST_REQUEST",
                data: {},
            };

            this.wsClient?.send(JSON.stringify(e));

            this.createIntersecting();
        };

        const players = new Map<
            string,
            { x: number; y: number; username: string }
        >();
        const playerGraphic = this.add.graphics();
        playerGraphic.setDepth(1000);
        const playerImages = new Map<string, Phaser.GameObjects.Image>();
        const playerTexts = new Map<string, Phaser.GameObjects.Text>();
        const drawPlayers = () => {
            for (const [id, player] of players.entries()) {
                const playerImage = playerImages.get(id);
                if (!playerImage) {
                    const newPlayerImage = this.add.image(0, 0, "playerImage");
                    newPlayerImage.setDisplaySize(1, 1);
                    newPlayerImage?.setDepth(1000);
                    playerImages.set(id, newPlayerImage);
                }
                const playerText = playerTexts.get(id);
                if (!playerText) {
                    const newPlayerText = this.add.text(0, 0, player.username);
                    newPlayerText.setDepth(1000);
                    playerTexts.set(id, newPlayerText);
                    // Change scale
                    newPlayerText.setScale(0.1);
                }

                playerImage?.setPosition(player.x, player.y);
                playerText?.setPosition(player.x, player.y - 2);
            }
        };

        // this.player.x = 5000;
        // this.player.y = 950;
        // this.player.init();

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
                const minZoom = 5;
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
    }
}
