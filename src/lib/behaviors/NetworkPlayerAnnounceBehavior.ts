import type { ClientEvent } from "../../server/state";
import type { GamePlayer } from "../player";
import { PlayerBehavior } from "./PlayerBehavior";

export class NetworkPlayerAnnounceBehavior extends PlayerBehavior {
    lastSentX: number = 0;
    lastSentY: number = 0;

    constructor(public gamePlayer: GamePlayer, public wsClient: WebSocket) {
        super(gamePlayer);
    }

    update(deltaTime: number): void {
        if (this.wsClient?.readyState !== WebSocket.OPEN) {
            return;
        }
        if (
            this.lastSentX === this.gamePlayer.player.x &&
            this.lastSentY === this.gamePlayer.player.y
        ) {
            return;
        }

        const e: ClientEvent = {
            type: "CLIENT_PLAYER_MOVE",
            data: {
                x: this.gamePlayer.player.x,
                y: this.gamePlayer.player.y,
            },
        };

        this.wsClient.send(JSON.stringify(e));

        this.lastSentX = this.gamePlayer.player.x;
        this.lastSentY = this.gamePlayer.player.y;
    }
}
