import Phaser from "phaser";

import waterImage from "../assets/water/water.png";
import dirtImage from "../assets/dirt/dirt.png";
import sandImage from "../assets/sand/sand.png";

import { BehaviorSubject, combineLatest } from "rxjs";
import { throttleTime } from "rxjs/operators";
import { TileMapManager } from "./tilemap";

export default class Example extends Phaser.Scene {
    left: Phaser.Input.Keyboard.Key | undefined;
    right: Phaser.Input.Keyboard.Key | undefined;
    up: Phaser.Input.Keyboard.Key | undefined;
    down: Phaser.Input.Keyboard.Key | undefined;
    chunkSize = 32;
    player = {
        xSubject: new BehaviorSubject(0),
        ySubject: new BehaviorSubject(0),
        gameThis: this,
        // Subscribe to throttled position changes
        init() {
            combineLatest([this.xSubject, this.ySubject])
                .pipe(throttleTime(100)) // Throttle updates for combined `x` and `y`
                .subscribe(([x, y]) => {
                    this.gameThis.updatePosition();
                });
        },

        set x(x) {
            this.xSubject.next(x); // Emit the new `x` value
        },

        get x() {
            return this.xSubject.getValue(); // Get the current `x` value from the subject
        },

        set y(y) {
            this.ySubject.next(y); // Emit the new `y` value
        },

        get y() {
            return this.ySubject.getValue(); // Get the current `y` value from the subject
        },
    };
    preload() {
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

        this.left = this.input.keyboard?.addKey(
            Phaser.Input.Keyboard.KeyCodes.A
        );
        this.right = this.input.keyboard?.addKey(
            Phaser.Input.Keyboard.KeyCodes.D
        );
        this.up = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.down = this.input.keyboard?.addKey(
            Phaser.Input.Keyboard.KeyCodes.S
        );
    }

    worldCoordsToChunkCoords(x: number, y: number) {
        return [Math.floor(x / this.chunkSize), Math.floor(y / this.chunkSize)];
    }

    update(time: number, delta: number) {
        this.createIntersecting();
        const camera = this.cameras.main;
        const playerSpeed = 500;
        const deltaSeconds = delta / 1000;

        let moveX = 0;
        let moveY = 0;

        if (this.left?.isDown) {
            moveX -= 1;
        } else if (this.right?.isDown) {
            moveX += 1;
        }

        if (this.up?.isDown) {
            moveY -= 1;
        } else if (this.down?.isDown) {
            moveY += 1;
        }

        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        if (length > 0) {
            moveX /= length;
            moveY /= length;

            this.player.x += moveX * playerSpeed * deltaSeconds;
            let [tileX, tileY] = [this.player.x, this.player.y];
            let [chunkX, chunkY] = this.worldCoordsToChunkCoords(tileX, tileY);
            // Get chunk
            let key = chunkX + "_" + chunkY;
            let map = this.activeTiles.get(key);
            if (map) {
                // Convert tile coords to chunk coords
                const chunkTileX = tileX - chunkX * this.chunkSize;
                const chunkTileY = tileY - chunkY * this.chunkSize;
                // Check if in water
                const tile = map.getTileAt(
                    chunkTileX,
                    chunkTileY,
                    true,
                    "water"
                );
                if (tile?.index !== -1) {
                    this.player.x -= moveX * playerSpeed * deltaSeconds;
                }
            }

            this.player.y += moveY * playerSpeed * deltaSeconds;

            [tileX, tileY] = [this.player.x, this.player.y];
            [chunkX, chunkY] = this.worldCoordsToChunkCoords(tileX, tileY);
            // Get chunk
            key = chunkX + "_" + chunkY;
            map = this.activeTiles.get(key);
            if (map) {
                // Convert tile coords to chunk coords
                const chunkTileX = tileX - chunkX * this.chunkSize;
                const chunkTileY = tileY - chunkY * this.chunkSize;
                // Check if in water
                const tile = map.getTileAt(
                    chunkTileX,
                    chunkTileY,
                    true,
                    "water"
                );
                if (tile?.index !== -1) {
                    this.player.y -= moveY * playerSpeed * deltaSeconds;
                }
            }
        }

        // If player is on water, move up
        const [tileX, tileY] = [this.player.x, this.player.y];
        const [chunkX, chunkY] = this.worldCoordsToChunkCoords(tileX, tileY);
        // Get chunk
        const key = chunkX + "_" + chunkY;
        const map = this.activeTiles.get(key);
        if (map) {
            // Convert tile coords to chunk coords
            const chunkTileX = tileX - chunkX * this.chunkSize;
            const chunkTileY = tileY - chunkY * this.chunkSize;
            // Check if in water
            const tile = map.getTileAt(chunkTileX, chunkTileY, true, "water");
            if (tile?.index === 1) {
                this.player.y -= 100 * playerSpeed * deltaSeconds;
                camera.centerOn(this.player.x, this.player.y);
            }
        }

        camera.centerOn(this.player.x, this.player.y);
    }

    private activeTiles = new Map<string, Phaser.Tilemaps.Tilemap>();

    dirtPipeline: Phaser.Renderer.WebGL.WebGLPipeline | undefined;
    waterPipeline: Phaser.Renderer.WebGL.WebGLPipeline | undefined;

    createIntersecting() {
        const camera = this.cameras.main;
        // Top-left corner
        const topLeftX = camera.worldView.x;
        const topLeftY = camera.worldView.y;

        // Bottom right corner
        const bottomRightX = camera.worldView.x + camera.worldView.width;
        const bottomRightY = camera.worldView.y + camera.worldView.height;

        if (this.wsClient?.readyState !== WebSocket.OPEN) {
            console.log("Websocket not open");
            return;
        }

        // Get chunk coords
        let [topLeftChunkX, topLeftChunkY] = this.worldCoordsToChunkCoords(
            topLeftX,
            topLeftY
        );

        const [bottomRightChunkX, bottomRightChunkY] =
            this.worldCoordsToChunkCoords(bottomRightX, bottomRightY);

        for (let x = topLeftChunkX; x <= bottomRightChunkX; x++) {
            for (let y = topLeftChunkY; y <= bottomRightChunkY; y++) {
                if (
                    this.requestedChunks.has(`${x}_${y}`) ||
                    this.tileMan?.getChunk(x, y) !== undefined
                ) {
                    continue;
                }
                this.requestedChunks.add(`${x}_${y}`);
                // Request chunk
                this.wsClient?.send(
                    JSON.stringify({
                        type: "chunk",
                        x: x,
                        y: y,
                    })
                );
            }
        }
    }
    requestedChunks = new Set<string>();

    wsClient: WebSocket | undefined;

    updatePosition() {
        if (this.wsClient?.readyState !== WebSocket.OPEN) {
            console.log("Websocket not open");
            return;
        }
        console.log("Updating position");

        const payload = {
            type: "player",
            x: this.player.x,
            y: this.player.y,
        };
        this.wsClient?.send(JSON.stringify(payload));
    }

    tileMan: TileMapManager | undefined;
    create() {
        this.tileMan = new TileMapManager(this);
        console.log("Creating scene");
        // window origin at ws
        this.wsClient = new WebSocket(
            document.location.origin.replace("http", "ws") + "/ws"
        );
        this.wsClient.onmessage = (event) => {
            const message = JSON.parse(event.data.toString());
            if (message.type === "player") {
                const { id, x, y } = message;
                players.set(id, { x, y });
                drawPlayers();
            } else if (message.type === "chunk") {
                const { x, y, data } = message;
                // Convert data to 2d array
                const dataArr = (data as string)
                    .split("\n")
                    .map((row) => row.split(","))
                    .map((row) => row.map((v) => parseInt(v)));

                this.tileMan?.addChunk(x, y, dataArr);
            } else {
                console.log("Unrecognized message: ", message);
            }
        };

        this.wsClient.onopen = (event) => {
            console.log("Connection opened");
            this.updatePosition();
            this.createIntersecting();
        };

        // setTimeout(() => {
        //     this.createIntersecting();
        // }, 1000);

        const players = new Map<string, { x: number; y: number }>();
        const playerGraphic = this.add.graphics();
        playerGraphic.setDepth(1000);
        const drawPlayers = () => {
            playerGraphic?.clear();
            for (const [id, player] of players.entries()) {
                playerGraphic?.fillStyle(0xff0000, 1);
                playerGraphic?.fillCircle(player.x, player.y, 0.5);
            }
        };

        this.player.init();
        this.player.x = 0;
        this.player.y = 0;

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
                const maxZoom = 10;
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

        this.cameras.main.zoom = 10;

        // Draw player
        const frag = `
        precision mediump float;

        void main ()
        {
            gl_FragColor = vec4(1.0);
        }
        `;
        const base = new Phaser.Display.BaseShader("simpleTexture", frag);

        const shader = this.add.shader(base, 0, 0, 0.5, 0.5);
        shader.setDepth(1000);
        this.player.xSubject.subscribe((x) => {
            shader.x = x;
        });

        this.player.ySubject.subscribe((y) => {
            shader.y = y;
        });

        console.log("Time to generate: ", Date.now() - startT);
    }
}
