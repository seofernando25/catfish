import type { GamePlayer } from "../../client/player";

export abstract class PlayerBehavior {
    constructor(public gamePlayer: GamePlayer) {}

    dispose(): void {}
}
