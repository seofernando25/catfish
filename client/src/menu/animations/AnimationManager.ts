import { effect } from "@preact/signals";
import { globalTicker } from "@catfish/common/Ticker.js";
import type { AnimationConfig } from "../types";
import { lerp } from "./easing";

export class AnimationManager {
	private effects: (() => void)[] = [];

	animate(config: AnimationConfig, onUpdate: (value: number) => void): () => void {
		const startTime = globalTicker.currentTick.value * globalTicker.deltaTime.value;

		const animationEffect = effect(() => {
			globalTicker.currentTick.value;
			const currentTime = globalTicker.currentTick.value * globalTicker.deltaTime.value;
			const timeSinceStart = currentTime - startTime;

			if (timeSinceStart < config.delay) {
				return;
			}

			const progress = Math.min((timeSinceStart - config.delay) / config.duration, 1);

			if (progress >= 1) {
				onUpdate(config.to);
				return;
			}

			const easedProgress = config.easing(progress);
			const currentValue = lerp(config.from, config.to, easedProgress);
			onUpdate(currentValue);
		});

		this.effects.push(animationEffect);
		return () => {
			const index = this.effects.indexOf(animationEffect);
			if (index > -1) {
				this.effects.splice(index, 1);
				animationEffect();
			}
		};
	}

	cleanup(): void {
		this.effects.forEach(effect => effect());
		this.effects = [];
	}
} 