import { effect } from "@preact/signals";
import type { GamePlayer } from "../../client/player";
import type { ClientSocket } from "../../client/socket";
import type { PlayerInfo } from "../player";
import { Ticker } from "../ticker/Ticker";
import { PlayerBehavior } from "./PlayerBehavior";

export class ReconsiliationBehavior extends PlayerBehavior {
    lastSentX: number | undefined = undefined;
    lastSentY: number | undefined = undefined;

    onSocketDisconnect = (() => {
        this.gamePlayer.dispose();
    }).bind(this);

    onPlayerInfo = ((pi: PlayerInfo) => {
        if (pi.playerId === this.gamePlayer.player.playerId) {
            this.lastSentX = pi.x;
            this.lastSentY = pi.y;
        }
    }).bind(this);

    onPlayerDisconnected = ((playerId: string) => {
        if (playerId === this.gamePlayer.player.playerId) {
            this.gamePlayer.dispose();
        }
    }).bind(this);

    constructor(
        public gamePlayer: GamePlayer,
        public socket: ClientSocket,
        public ticker: Ticker
    ) {
        super(gamePlayer);

        this.socket.on("player_disconnected", this.onPlayerDisconnected);
        this.socket.on("disconnect", this.onSocketDisconnect);
        this.socket.on("player_info_announce", this.onPlayerInfo);

        effect(() => {
            this.ticker.currentTick.value;

            this.update(this.ticker.deltaTime.value);
        });
    }

    dispose(): void {
        this.socket.off("player_disconnected", this.onPlayerDisconnected);
        this.socket.off("disconnect", this.onSocketDisconnect);
        this.socket.off("player_info_announce", this.onPlayerInfo);
    }

    update(deltaTime: number): void {
        if (this.lastSentX === undefined || this.lastSentY === undefined) {
            return;
        }

        const deltaX = this.gamePlayer.player.x - this.lastSentX;
        const deltaY = this.gamePlayer.player.y - this.lastSentY;

        const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (magnitude > 10) {
            console.log("Reconsiliation needed");
            this.gamePlayer.player.x = this.lastSentX;
            this.gamePlayer.player.y = this.lastSentY;
        }

        const speed = 0.1;
        this.gamePlayer.player.x +=
            (this.lastSentX - this.gamePlayer.player.x) * speed;
        this.gamePlayer.player.y +=
            (this.lastSentY - this.gamePlayer.player.y) * speed;
    }
}
