import { computed, signal, type ReadonlySignal } from "@preact/signals";

const partialMatch = <T>(event: T, match: Partial<T>) => {
    for (const key in match) {
        if (event[key] !== match[key]) {
            return false;
        }
    }
    return true;
};

const cachedKeyCbs = new Map<string, ReadonlySignal<number>>();

export const keyboardSignal = (match: Partial<KeyboardEvent>) => {
    const key = JSON.stringify(match);
    if (cachedKeyCbs.has(key)) {
        return cachedKeyCbs.get(key) as ReadonlySignal<number>;
    }

    const state = signal(0);

    window.addEventListener("keydown", (event) => {
        if (partialMatch(event, match)) {
            state.value = 1;
        }
    });
    window.addEventListener("keyup", (event) => {
        if (partialMatch(event, match)) {
            state.value = 0;
        }
    });

    cachedKeyCbs.set(key, state);

    return state as ReadonlySignal<number>;
};

export const keyboardOrSignal = (matches: Partial<KeyboardEvent>[]) => {
    const signals = matches.map((match) => keyboardSignal(match));

    return computed(() =>
        signals.reduce((acc, signal) => acc || signal.value, 0)
    );
};

const cachedMouseCbs = new Map<string, ReadonlySignal<number>>();

export const mouseSignal = (match: Partial<MouseEvent>) => {
    const key = JSON.stringify(match);
    if (cachedMouseCbs.has(key)) {
        return cachedMouseCbs.get(key) as ReadonlySignal<number>;
    }

    const state = signal(0);

    const onMouseDown = (event: MouseEvent) => {
        if (partialMatch(event, match)) {
            state.value = 1;
        }
    };

    const onMouseUp = (event: MouseEvent) => {
        if (partialMatch(event, match)) {
            state.value = 0;
        }
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    cachedMouseCbs.set(key, state);

    return state as ReadonlySignal<number>;
};

// export const scrollHook = (
//     match: Partial<WheelEvent>,
//     cb: (value: number) => void
// ) => {
//     const onScroll = (event: WheelEvent) => {
//         if (partialMatch(event, match)) {
//             cb(event.deltaY);
//         }
//     };

//     window.addEventListener("wheel", onScroll);

//     return () => {
//         window.removeEventListener("wheel", onScroll);
//     };
// };

const cachedScrollCbs = new Map<string, ReadonlySignal<number>>();

export const scrollSignal = (match: Partial<WheelEvent>) => {
    const key = JSON.stringify(match);
    if (cachedScrollCbs.has(key)) {
        return cachedScrollCbs.get(key) as ReadonlySignal<number>;
    }

    const state = signal(0);

    const onScroll = (event: WheelEvent) => {
        if (partialMatch(event, match)) {
            state.value = event.deltaY;
        }
    };

    window.addEventListener("wheel", onScroll);

    cachedScrollCbs.set(key, state);

    return state as ReadonlySignal<number>;
};
