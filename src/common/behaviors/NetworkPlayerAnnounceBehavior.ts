import type { RpcClientRx, RpcClientTx } from "../../client/clientRPC";
import type { GamePlayer } from "../../client/player";
import { PlayerBehavior } from "./PlayerBehavior";

export class NetworkPlayerAnnounceBehavior extends PlayerBehavior {
    lastSentX: number = 0;
    lastSentY: number = 0;

    constructor(
        public gamePlayer: GamePlayer,
        public rpcTx: RpcClientTx,
        public rpcRx: RpcClientRx
    ) {
        super(gamePlayer);
    }

    update(deltaTime: number): void {
        if (
            this.lastSentX === this.gamePlayer.player.x &&
            this.lastSentY === this.gamePlayer.player.y
        ) {
            return;
        }

        this.rpcTx("CLIENT_PLAYER_MOVE", {
            x: this.gamePlayer.player.x,
            y: this.gamePlayer.player.y,
        });

        this.lastSentX = this.gamePlayer.player.x;
        this.lastSentY = this.gamePlayer.player.y;
    }
}
