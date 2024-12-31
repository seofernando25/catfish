import { Database } from "bun:sqlite";
import fs from "fs";

fs.rmSync("./db.sqlite", { force: true });
fs.rmSync("./db.sqlite-wal", { force: true });
fs.rmSync("./db.sqlite-shm", { force: true });

export const db = new Database("./db.sqlite");

db.exec("PRAGMA page_size = 4096");
db.exec("PRAGMA cache_size=10000");
db.exec("PRAGMA locking_mode=EXCLUSIVE");
db.exec("PRAGMA synchronous=NORMAL");
db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA cache_size=5000");

db.exec(`
CREATE TABLE IF NOT EXISTS players (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT,
	x INTEGER,
	y INTEGER
)
`);

db.exec(`
	CREATE TABLE IF NOT EXISTS chunks (
		x INTEGER,
		y INTEGER,
		PRIMARY KEY (x, y)
	)
	`);

// placed items
db.exec(`
CREATE TABLE IF NOT EXISTS placed_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chunk_x INTEGER,
    chunk_y INTEGER,
    x INTEGER,
    y INTEGER,
    item_id INTEGER,
    FOREIGN KEY (chunk_x, chunk_y) REFERENCES chunks(x, y),
    FOREIGN KEY (item_id) REFERENCES item_definitions(id)
	UNIQUE (chunk_x, chunk_y, x, y) 
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS item_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
);
`);

export function createChunk(x: number, y: number) {
    db.exec("INSERT INTO chunks (x, y) VALUES (?, ?)", [x, y]);
}

export function placeItem(
    chunkX: number,
    chunkY: number,
    offsetX: number,
    offsetY: number,
    itemId: number
) {
    db.exec(
        "INSERT INTO placed_items (chunk_x, chunk_y, x, y, item_id) VALUES (?, ?, ?, ?, ?)",
        [chunkX, chunkY, offsetX, offsetY, itemId]
    );
}

export function createItemDefinition(name: string) {
    db.exec("INSERT INTO item_definitions (name) VALUES (?)", [name]);
}

export function getItemDefinitionId(name: string) {
    const res = db.prepare("SELECT id FROM item_definitions WHERE name = ?", [
        name,
    ]);
    return (res.get() as any)?.id;
}

export function getPlacedItems(chunkX: number, chunkY: number) {
    const res = db.prepare(
        "SELECT * FROM placed_items WHERE chunk_x = ? AND chunk_y = ?",
        [chunkX, chunkY]
    );
    return res.all();
}

console.log("Database initialized");
placeItem(0, 0, 0, 0, 1);
placeItem(0, 0, 1, 1, 2);
console.log(getPlacedItems(0, 0));
