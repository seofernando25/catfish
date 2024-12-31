import { GameObject } from "@catfish/common/sim/gameObject";
import { ClientSocketSymbol, type ClientSocket } from "../socket";
import { PlayerInfoSymbol, type PlayerInfo } from "@catfish/common/player";
import { EntityBehavior } from "@catfish/common/behaviors/PlayerBehavior";
import { inject } from "@catfish/common/di/index";

export class NetworkedMoveBehavior extends EntityBehavior {
    lastSentX: number | undefined = undefined;
    lastSentY: number | undefined = undefined;

    player = inject<PlayerInfo>(PlayerInfoSymbol);
    go = inject(GameObject);
    socket = inject<ClientSocket>(ClientSocketSymbol);

    onSocketDisconnect = (() => {
        this.go?.dispose();
    }).bind(this);

    onPlayerInfo = ((pi: PlayerInfo) => {
        if (pi.playerId === this.player?.playerId) {
            this.lastSentX = pi.x;
            this.lastSentY = pi.y;
        }
    }).bind(this);

    onPlayerDisconnected = ((playerId: string) => {
        if (playerId === this.player?.playerId) {
            this.go?.dispose();
        }
    }).bind(this);
    // private reconsiliationSpeed: number = 0.1;

    constructor() {
        super();

        this.socket?.on("player_disconnected", this.onPlayerDisconnected);
        this.socket?.on("disconnect", this.onSocketDisconnect);
        this.socket?.on("player_info_announce", this.onPlayerInfo);
    }

    dispose(): void {
        this.socket?.off("player_disconnected", this.onPlayerDisconnected);
        this.socket?.off("disconnect", this.onSocketDisconnect);
        this.socket?.off("player_info_announce", this.onPlayerInfo);
    }

    // update(deltaTime: number): void {
    //     if (this.lastSentX === undefined || this.lastSentY === undefined) {
    //         return;
    //     }

    //     // this.gamePlayer.player.x = this.lastSentX;
    //     // this.gamePlayer.player.y = this.lastSentY;
    //     const speed = this.reconsiliationSpeed;
    //     this.player.x += (this.lastSentX - this.player.x) * speed;
    //     this.player.y += (this.lastSentY - this.player.y) * speed;
    // }
}
