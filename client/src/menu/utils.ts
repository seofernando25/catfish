import { globalTicker } from "@catfish/common/Ticker.js";
import { waterSplashAudio } from "../audio";
import { globalScene } from "../rendering/renderer";
import { gameTitleObject } from "../rendering/textures";
import { effect } from "@preact/signals";

export const droppingTitleSeq = async () => {
    await waitForFirstInteraction();
    globalScene.add(gameTitleObject);

    gameTitleObject.position.y = 1;

    function easeOutBack(x: number): number {
        const c1 = 1.70158;
        const c3 = c1 + 1;

        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }

    const startTime =
        globalTicker.currentTick.value * globalTicker.deltaTime.value;
    const animationDuration = 4;
    const animationDelay = 0;
    const fromPosition = 1;
    const toPosition = 0.4;

    const fromRotation = Math.PI / 4;

    waterSplashAudio.play();
    const animationEffect = effect(() => {
        globalTicker.currentTick.value;
        const t = globalTicker.currentTick.value;
        const time =
            globalTicker.currentTick.value * globalTicker.deltaTime.value;
        const timeSinceStart = time - startTime;

        if (
            timeSinceStart > animationDelay &&
            timeSinceStart < animationDelay + animationDuration
        ) {
            const lerp = (x: number, y: number, t: number) =>
                x * (1 - t) + y * t;
            gameTitleObject.position.y = lerp(
                fromPosition,
                toPosition,
                easeOutBack(
                    (timeSinceStart - animationDelay) / animationDuration
                )
            );
            gameTitleObject.rotation.z = lerp(
                fromRotation,
                0,
                easeOutBack(
                    (timeSinceStart - animationDelay) / animationDuration
                )
            );
        }
    });

    return () => {
        globalScene.remove(gameTitleObject);
        animationEffect();
        waterSplashAudio.stop();
    };
};

let windowInteracted = false;
let listeners: (() => void)[] = [];

const listener = () => {
    windowInteracted = true;
    listeners.forEach((listener) => listener());
    listeners = [];
    window.removeEventListener("click", listener);
};
window.addEventListener("click", listener);

const returnEnterListener = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
        listeners.forEach((listener) => listener());
        listeners = [];
        window.removeEventListener("keydown", returnEnterListener);
    }
};
window.addEventListener("keydown", returnEnterListener);

export const waitForFirstInteraction = async () => {
    if (windowInteracted) {
        return;
    }

    return waitForNextInteraction();
};

export const waitForNextInteraction = async () => {
    return new Promise<void>((resolve) => {
        listeners.push(resolve);
        window.addEventListener("click", listener);
        window.addEventListener("keydown", returnEnterListener);
    });
};
