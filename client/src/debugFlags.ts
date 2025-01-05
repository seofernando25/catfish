import { effect, Signal, signal } from "@preact/signals";

let debugFlags = {
    showDebugPanel: signal(false),
    skipLogin: signal(false),
} as const;

let loaded = false;

export function getDebugFlags() {
    if (!loaded) {
        loaded = true;
        const str = localStorage.getItem("debugFlags");
        if (str) {
            const flags = JSON.parse(str);
            for (const [key, value] of Object.entries(flags)) {
                if (key in debugFlags) {
                    // @ts-ignore
                    debugFlags[key].value = value;
                } else {
                    // Tried adding a deprecated flag?
                }
            }
        }
    }
    return debugFlags;
}

export function saveDebugFlagsToLocalStorage() {
    const serialized: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(debugFlags)) {
        serialized[key] = value.value;
    }
    localStorage.setItem("debugFlags", JSON.stringify(serialized));
}

// Add a listener to save the debug flags to local storage on tilda `
window.addEventListener("keydown", (e) => {
    if (e.key === "`") {
        debugFlags.showDebugPanel.value = !debugFlags.showDebugPanel.value;
        console.log("showDebugPanel", debugFlags.showDebugPanel.value);
        saveDebugFlagsToLocalStorage();
    }
});
