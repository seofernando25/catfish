import { computed, signal } from "@preact/signals";

export const windowWidth = signal(window.innerWidth ?? 1);
export const windowHeight = signal(window.innerHeight ?? 1);
export const windowPixelRatio = signal(window.devicePixelRatio ?? 1);
export const windowAspect = computed(
    () => windowWidth.value / windowHeight.value
);

window.addEventListener("resize", () => {
    windowWidth.value = window.innerWidth;
    windowHeight.value = window.innerHeight;
    windowPixelRatio.value = window.devicePixelRatio;
});
