import type { PlayerInfo } from "../../server/state";
import { PlayerBehavior } from "./PlayerBehavior";

/**
 * Reconsiliates the player's position with the server's position
 */
export class ReconsiliationBehavior extends PlayerBehavior {
    serverState: PlayerInfo | undefined;

    update(deltaTime: number): void {
        if (!this.serverState) {
            return;
        }

        const dx = this.serverState.x - this.gamePlayer.player.x;
        const dy = this.serverState.y - this.gamePlayer.player.y;

        const speed = 0.1;
        this.gamePlayer.player.x += dx * speed;
        this.gamePlayer.player.y += dy * speed;
    }
}
