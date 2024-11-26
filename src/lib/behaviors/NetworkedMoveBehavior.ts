import type { ServerEvent } from "../../server/state";
import type { GamePlayer } from "../player";
import { PlayerBehavior } from "./PlayerBehavior";

export class NetworkedMoveBehavior extends PlayerBehavior {
    lastSentX: number | undefined = undefined;
    lastSentY: number | undefined = undefined;
    onMessageFn = this.onMessage.bind(this);

    constructor(public gamePlayer: GamePlayer, public wsClient: WebSocket) {
        super(gamePlayer);

        wsClient.addEventListener("message", this.onMessageFn);
    }

    onMessage(e: MessageEvent): void {
        const data = JSON.parse(e.data) as ServerEvent;
        if (
            data.type === "PLAYER_MOVE" &&
            data.data.playerId === this.gamePlayer.player.playerId
        ) {
            console.log("Received PLAYER_MOVE event", data);
            this.lastSentX = data.data.x;
            this.lastSentY = data.data.y;
        } else if (
            data.type === "PLAYER_INFO_ANNOUNCE" &&
            data.data.playerId === this.gamePlayer.player.playerId
        ) {
            console.log("Received PLAYER_INFO_ANNOUNCE event", data);
            this.lastSentX = data.data.x;
            this.lastSentY = data.data.y;
        }
    }

    dispose(): void {
        this.wsClient.removeEventListener("message", this.onMessage);
    }

    update(deltaTime: number): void {
        if (this.lastSentX === undefined || this.lastSentY === undefined) {
            return;
        }

        // this.gamePlayer.player.x = this.lastSentX;
        // this.gamePlayer.player.y = this.lastSentY;
        const speed = 0.1;
        this.gamePlayer.player.x +=
            (this.lastSentX - this.gamePlayer.player.x) * speed;
        this.gamePlayer.player.y +=
            (this.lastSentY - this.gamePlayer.player.y) * speed;
    }
}
