import { effect } from "@preact/signals";
import { PlayerInfoSymbol, type PlayerInfo } from "../player";
import { Ticker } from "../Ticker";
import { EntityBehavior } from "./PlayerBehavior";
import { inject } from "../di";
import {
    type ClientSocket,
    ClientSocketSymbol,
} from "../../../client/src/socket";
import { GameObject } from "../sim/gameObject";

export class ReconsiliationBehavior extends EntityBehavior {
    playerInfo = inject<PlayerInfo>(PlayerInfoSymbol);
    lastSentX: number | undefined = undefined;
    lastSentY: number | undefined = undefined;
    go = inject(GameObject);
    socket = inject<ClientSocket>(ClientSocketSymbol);
    ticker = inject(Ticker);

    onSocketDisconnect = (() => {
        this.go.dispose();
    }).bind(this);

    onPlayerInfo = ((pi: PlayerInfo) => {
        if (pi.playerId === this.playerInfo.playerId) {
            this.lastSentX = pi.x;
            this.lastSentY = pi.y;
        }
    }).bind(this);

    onPlayerDisconnected = ((playerId: string) => {
        if (playerId === this.playerInfo.playerId) {
            this.go.dispose();
        }
    }).bind(this);

    constructor() {
        super();

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

        const deltaX = this.playerInfo.x - this.lastSentX;
        const deltaY = this.playerInfo.y - this.lastSentY;

        const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (magnitude > 10) {
            console.log("Reconsiliation needed");
            this.playerInfo.x = this.lastSentX;
            this.playerInfo.y = this.lastSentY;
        }

        const speed = 0.1;
        this.playerInfo.x += (this.lastSentX - this.playerInfo.x) * speed;
        this.playerInfo.y += (this.lastSentY - this.playerInfo.y) * speed;
    }
}
