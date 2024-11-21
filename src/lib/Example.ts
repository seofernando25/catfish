import Phaser from "phaser";
import { COAL_COLOR, DIAMOND_COLOR, DIRT_COLOR, IRON_COLOR, LAKE_COLOR, sample } from "./world";

export default class Example extends Phaser.Scene
{
	
	left: Phaser.Input.Keyboard.Key | undefined;
	right: Phaser.Input.Keyboard.Key | undefined;
	up: Phaser.Input.Keyboard.Key | undefined;
	down: Phaser.Input.Keyboard.Key | undefined;
	tileSize = 16;
	chunkSize = 128;
	player = {
		x: 0,
		y: 0,
		graphic: undefined as Phaser.GameObjects.Graphics | undefined
	}
	preload ()
	{
        this.load.image('roguelikeSheet', 'roguelike/roguelikeSheet_transparent.png');
        this.left = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
		this.right = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
		this.up = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
		this.down = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);
		
	}
	


	


	tileCoordsToChunkCoords(x: number, y: number) {
		return [Math.floor(x / this.chunkSize), Math.floor(y / this.chunkSize)];
	}

	worldCoordsToTileCoords(x: number, y: number) {
		return [Math.floor(x / this.tileSize), Math.floor(y / this.tileSize)];
	}

	

	

	update(time: number, delta: number) {
		this.createIntersecting();
		const camera = this.cameras.main;
		const playerSpeed = 340;
		const deltaSeconds = delta / 1000;
	
		let moveX = 0;
		let moveY = 0;

		if (this.left?.isDown) {
			moveX -= 1 ;
		} else if (this.right?.isDown) {
			moveX += 1 ;
		}
	
		if (this.up?.isDown) {
			moveY -= 1 ;	
		} else if (this.down?.isDown) {
			moveY += 1 ;
		}

		const length = Math.sqrt(moveX * moveX + moveY * moveY);
		if (length > 0) {
			moveX /= length;
			moveY /= length;
		}

		this.player.x += moveX * playerSpeed * deltaSeconds;
		this.player.y += moveY * playerSpeed * deltaSeconds;
		this.player.graphic?.setPosition(this.player.x, this.player.y);

		
		camera.centerOn(this.player.x, this.player.y);
	}

	private activeTiles = new Map<string, Phaser.Tilemaps.Tilemap>();
	genTile(offsetX: number, offsetY: number) {
		const key = offsetX + "_" + offsetY
		if (this.activeTiles.get(key)) {
			return;
		}

		
		const map = this.make.tilemap({ 
			tileWidth: this.tileSize,
			tileHeight: this.tileSize,
			width: this.chunkSize,
			height: this.chunkSize,
		 });

		 this.activeTiles.set(key, map);
		 
		 const tileset = map.addTilesetImage('roguelikeSheet', undefined, this.tileSize, this.tileSize, 0, 1)!;
		 
		 const layer = map.createBlankLayer(key, tileset);
		 if(layer) {
			layer.x = offsetX * this.chunkSize * this.tileSize;
			layer.y = offsetY * this.chunkSize * this.tileSize;
		}
		
	




		for (let i = 0; i < this.chunkSize; i++) {
			for (let j = 0; j < this.chunkSize; j++) {
				// Chunck coords to tile coords
				const x = offsetX * this.chunkSize + i;
				const y = offsetY * this.chunkSize + j;
				const c = sample(x, y);
				let idx= 0;
				switch(c) {
					case "coal":
						idx = 48;
						break;
					case "iron":
						idx = 65;
						break;
					case "diamond":
						idx = 2;
						break;
					case "dirt":
						idx = 63;
						break;
					case "lake":
						idx = 1;
						break;
				}
				
				layer?.putTileAt(idx, i, j, false);
			}
		}
		// recalc faces
	}

	createIntersecting() {
		const camera = this.cameras.main;
		// Top-left corner
		const topLeftX = camera.worldView.x;
		const topLeftY = camera.worldView.y;

		// Top-right corner
		const topRightX = camera.worldView.x + camera.worldView.width;
		const topRightY = camera.worldView.y;

		// Bottom-left corner
		const bottomLeftX = camera.worldView.x;
		const bottomLeftY = camera.worldView.y + camera.worldView.height;

		const topLeftTileCoords = this.worldCoordsToTileCoords(topLeftX, topLeftY);
		const topRightTileCoords = this.worldCoordsToTileCoords(topRightX, topRightY);
		const bottomLeftTileCoords = this.worldCoordsToTileCoords(bottomLeftX, bottomLeftY);

		// const topLeftChunk = this.tileCoordsToChunkCoords(topLeftX, topLeftY);
		// const topRightChunk = this.tileCoordsToChunkCoords(topRightX, topRightY);
		// const bottomLeftChunk = this.tileCoordsToChunkCoords(bottomLeftX, bottomLeftY);
		const topLeftChunk = this.tileCoordsToChunkCoords(topLeftTileCoords[0], topLeftTileCoords[1]);
		const topRightChunk = this.tileCoordsToChunkCoords(topRightTileCoords[0], topRightTileCoords[1]);
		const bottomLeftChunk = this.tileCoordsToChunkCoords(bottomLeftTileCoords[0], bottomLeftTileCoords[1]);
		const startX = topLeftChunk[0];
		const endX = topRightChunk[0];
		const startY = topLeftChunk[1];
		const endY = bottomLeftChunk[1];
		const xStep = Math.sign(endX - startX);
		const yStep = Math.sign(endY - startY);
		
		const chunks = [];
		for (let i = startX; i != endX + xStep; i += xStep) {
			for (let j = startY; j != endY + yStep; j += yStep) {
				chunks.push([i, j]);
			}
		}

		// Clean up tiles that are not in view
		const keys = Array.from(this.activeTiles.keys());
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const [x, y] = key.split("_").map(Number);
			if (x < startX || x > endX || y < startY || y > endY) {
				const map = this.activeTiles.get(key);
				if (map) {
					map.destroy();
				}
				this.activeTiles.delete(key);
			}
		}

		// Create new tiles
		for (let i = 0; i < chunks.length; i++) {
			const [x, y] = chunks[i];
			this.genTile(x, y);
		}
	}

	create ()
	{
		const startT = Date.now();
		this.input.on('wheel', (pointer: Phaser.Input.Pointer, deltaX: number, deltaY: number, deltaZ: number) => {
			const camera = this.cameras.main;
			const zoomFactor = 0.05; // Adjust this to control zoom speed
		
			// Calculate the zoom change proportionally
			const zoomChange = camera.zoom * zoomFactor;
			const minZoom = 0.01;
			const maxZoom = 2;
			if (deltaZ > 0) {
				camera.zoom = Phaser.Math.Clamp(camera.zoom - zoomChange, minZoom, maxZoom);
			} else if (deltaZ < 0) {
				camera.zoom = Phaser.Math.Clamp(camera.zoom + zoomChange, minZoom, maxZoom);
			}
		});

		this.cameras.main.zoom = 1;

		// Draw a black square
		const circle = this.add.graphics();
		circle.fillStyle(0x000000, 1);
		circle.fillRect(0, 0, 16 , 16);
		circle.setDepth(999);
		this.player.graphic = circle;
		
		
		console.log("Time to generate: ", Date.now() - startT);
	}
}