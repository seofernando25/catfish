import type { ClientSocket } from "../../client/Game";
import type { GamePlayer } from "../../client/player";
import type { PlayerInfo } from "../player";
import { PlayerBehavior } from "./PlayerBehavior";

export class NetworkedMoveBehavior extends PlayerBehavior {
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
        public reconsiliationSpeed: number = 0.1
    ) {
        super(gamePlayer);

        this.socket.on("player_disconnected", this.onPlayerDisconnected);
        this.socket.on("disconnect", this.onSocketDisconnect);
        this.socket.on("player_info_announce", this.onPlayerInfo);
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

        // this.gamePlayer.player.x = this.lastSentX;
        // this.gamePlayer.player.y = this.lastSentY;
        const speed = this.reconsiliationSpeed;
        this.gamePlayer.player.x +=
            (this.lastSentX - this.gamePlayer.player.x) * speed;
        this.gamePlayer.player.y +=
            (this.lastSentY - this.gamePlayer.player.y) * speed;
    }
}
