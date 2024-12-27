import { Scene } from "three";
import type { PlayerBehavior } from "../common/behaviors/PlayerBehavior";
import type { PlayerInfo } from "../common/player";
import { Ticker } from "../common/ticker/Ticker";

export class GamePlayer {
    behaviors: PlayerBehavior[] = [];

    constructor(
        public scene: Scene,
        public player: PlayerInfo,
        private ticker: Ticker
    ) {}

    dispose(): void {
        for (const behavior of this.behaviors) {
            behavior.dispose();
        }
    }
}
