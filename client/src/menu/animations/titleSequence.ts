import { globalScene } from "../../rendering/renderer";
import { gameTitleObject } from "../../rendering/textures";
import { waitForFirstInteraction } from "../utils";
import { AnimationManager } from "./AnimationManager";
import { easeOutBack } from "./easing";

export class TitleSequence {
	private animationManager = new AnimationManager();
	private cleanup?: () => void;

	async start(): Promise<void> {
		await waitForFirstInteraction();

		globalScene.add(gameTitleObject);
		gameTitleObject.position.y = 1;
		gameTitleObject.rotation.z = Math.PI / 4;

		// Drop animation
		this.cleanup = this.animationManager.animate(
			{
				duration: 4,
				delay: 0,
				easing: easeOutBack,
				from: 1,
				to: 0.35
			},
			(value) => {
				gameTitleObject.position.y = value;
				// Rotate proportionally to the drop
				gameTitleObject.rotation.z = (Math.PI / 4) * (value - 0.35) / 0.6;
			}
		);

		// Add subtle floating animation after drop
		this.animationManager.animate(
			{
				duration: 2 * Math.PI,
				delay: 4,
				easing: (t) => Math.cos(t),
				from: 0.35,
				to: 0.352
			},
			(value) => {
				gameTitleObject.position.y = value;
			}
		);
	}

	stop(): void {
		if (this.cleanup) {
			this.cleanup();
		}
		this.animationManager.cleanup();
		globalScene.remove(gameTitleObject);
	}
} 