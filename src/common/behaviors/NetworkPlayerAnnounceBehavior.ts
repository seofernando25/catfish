import type { RpcClientRx, RpcClientTx } from "../../client/clientRPC";
import type { GameObject } from "../../client/gameObject";
import { EntityBehavior } from "./PlayerBehavior";

export class NetworkPlayerAnnounceBehavior extends EntityBehavior {
    lastSentX: number = 0;
    lastSentY: number = 0;

    constructor(
        public gamePlayer: GameObject,
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
