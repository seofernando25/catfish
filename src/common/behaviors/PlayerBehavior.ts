import type { GamePlayer } from "../../client/player";

export abstract class PlayerBehavior {
    constructor(public gamePlayer: GamePlayer) {}

    update(deltaTime: number): void {}

    dispose(): void {}

    fixedUpdate(): void {}
}
