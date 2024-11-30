import type { PlayerInfo } from "../../server/events/server";
import type { RpcClientRx } from "../../client/clientRPC";
import type { GamePlayer } from "../../client/player";
import { PlayerBehavior } from "./PlayerBehavior";

/**
 * Reconsiliates the player's position with the server's position
 */
export class ReconsiliationBehavior extends PlayerBehavior {
    serverState: PlayerInfo | undefined;

    disposeFn = () => {};
    constructor(public gamePlayer: GamePlayer, gameRx: RpcClientRx) {
        super(gamePlayer);
        const id = this.gamePlayer.player.playerId;

        const a = gameRx("SERVER_PLAYER_INFO_ANNOUNCE", async (data) => {
            if (data.playerId === id) {
                this.serverState = data;
            }
        });
        const b = gameRx("SERVER_PLAYER_MOVE", async (data) => {
            if (data.playerId === id) {
                this.serverState = {
                    ...data,
                    username: this.serverState?.username ?? "unknown",
                };
            }
        });
        this.dispose = () => {
            a();
            b();
        };
    }

    dispose(): void {
        this.disposeFn();
    }

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
