import type { GamePlayer } from "../player";

export abstract class PlayerBehavior {
    constructor(public gamePlayer: GamePlayer) {}

    update(deltaTime: number): void {}

    dispose(): void {}
}
