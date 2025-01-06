import { Pane } from "tweakpane";
import type { heapStats } from "bun:jsc";
import { io } from "socket.io-client";
import { socket } from "./socket";
import { getDebugFlags, saveDebugFlagsToLocalStorage } from "./debugFlags";
import { effect } from "@preact/signals";
import { ping } from "./networkCalls";

export const stats = {
    ConnState: "Disconnected",
    Id: "",
    Status: "",
    Ping: "0",
    px: -1,
    py: -1,
    CamAngle: 0,
    PlayerDir: 0,
};

export const tweakpaneRef = new Pane();

const debugFlagsLocal = getDebugFlags();
effect(() => {
    tweakpaneRef.hidden = !debugFlagsLocal.showDebugPanel.value;
});

const debugFlagsFolder = tweakpaneRef.addFolder({
    title: "Debug Flags",
    expanded: false,
});

for (const [key, value] of Object.entries(debugFlagsLocal)) {
    const bind = debugFlagsFolder.addBinding(value, "value", {
        label: key,
        min: 0,
        max: 1,
    });
    bind.on("change", () => {
        console.log("Saving debug flags to local storage");
        saveDebugFlagsToLocalStorage();
    });
}

export const addSocketFolders = async () => {
    const socketFolder = tweakpaneRef.addFolder({
        title: "Socket",
        expanded: false,
    });

    let socketStat = {
        id: socket.id ?? "undefined",
        ping: 0,
    };

    socketFolder.addBinding(socketStat, "id", {
        readonly: true,
    });

    let pingResponse = await ping();

    socketFolder.addBinding(pingResponse, "round_trip_time", {
        label: "RTT",
        readonly: true,
    });

    const advancedSocketFolder = socketFolder.addFolder({
        title: "Advanced",
        expanded: false,
    });

    advancedSocketFolder.addBinding(pingResponse, "round_trip_time", {
        label: "Round Trip Time",
        readonly: true,
        view: "graph",
        min: 0,
        max: 200,
    });

    advancedSocketFolder.addBinding(pingResponse, "client_delay", {
        label: "Client Delay",
        readonly: true,
        view: "graph",
        min: 0,
        max: 200,
    });

    advancedSocketFolder.addBinding(pingResponse, "server_delay", {
        label: "Server Delay",
        readonly: true,
        view: "graph",
        min: 0,
        max: 200,
    });

    socket.on("connect", () => {
        socketStat.id = socket.id ?? "undefined";
    });

    socket.on("disconnect", () => {
        socketStat.id = "undefined";
    });

    const updatePing = async () => {
        const newResponse = await ping();
        pingResponse.client_delay = newResponse.client_delay;
        pingResponse.round_trip_time = newResponse.round_trip_time;
        pingResponse.server_delay = newResponse.server_delay;
    };

    const pingInterval = setInterval(updatePing, 1000);

    return () => {
        advancedSocketFolder.dispose();
        socketFolder.dispose();
        clearInterval(pingInterval);
    };
};

setTimeout(() => {
    addSocketFolders();
}, 100);

const superSecretFolder = tweakpaneRef.addFolder({
    title: "Super Secret Settings",
    expanded: false,
});

// region TV girl mode

const tvGirlModeButton = superSecretFolder.addButton({
    label: "TV Girl Mode",
    title: "Toggle",
});

let iframeAdded = false;
const iframe = document.createElement("iframe");
iframe.src =
    "https://www.youtube.com/embed/MWj7MhupSoM?autoplay=0&loop=1&playlist=MWj7MhupSoM&mute=0";
iframe.allow = "autoplay; encrypted-media";
// anchor to bottom left
iframe.style.position = "absolute";
iframe.style.bottom = "0";
iframe.style.left = "0";
iframe.style.width = "480px";
iframe.style.height = "360px";
iframe.style.display = "none";

tvGirlModeButton.on("click", () => {
    iframe.style.display = iframe.style.display === "none" ? "block" : "none";

    if (!iframeAdded) {
        document.body.appendChild(iframe);
        iframeAdded = true;
    }
});

// endregion

// Heap stats

export const addHeapStats = () => {
    const lastHeapStat: ReturnType<typeof heapStats> = {
        extraMemorySize: 0,
        globalObjectCount: 0,
        heapCapacity: 0,
        heapSize: 0,
        objectCount: 0,
        objectTypeCounts: {},
        protectedGlobalObjectCount: 0,
        protectedObjectCount: 0,
        protectedObjectTypeCounts: {},
    };

    const heapStatPane = tweakpaneRef.addFolder({
        title: "Heap Stats",
        expanded: false,
    });

    heapStatPane.addBinding(lastHeapStat, "heapSize", {
        label: "Size (MB)",
        readonly: true,
    });

    heapStatPane.addBinding(lastHeapStat, "heapCapacity", {
        label: "Capacity (MB)",
        readonly: true,
    });

    heapStatPane.addBinding(lastHeapStat, "extraMemorySize", {
        label: "X Memory Size",
        readonly: true,
    });

    heapStatPane.addBinding(lastHeapStat, "objectCount", {
        label: "Object Count",
        readonly: true,
    });

    heapStatPane.addBinding(lastHeapStat, "protectedObjectCount", {
        label: "Protected Object Count",
        readonly: true,
    });

    socket.on("heap_stats", (heapStat: ReturnType<typeof heapStats>) => {
        // Update all fields in lastHeapStat

        const bytesToMB = (bytes: number) => bytes / 1024 / 1024;
        lastHeapStat.heapSize = bytesToMB(heapStat.heapSize);
        lastHeapStat.heapCapacity = bytesToMB(heapStat.heapCapacity);
        lastHeapStat.extraMemorySize = bytesToMB(heapStat.extraMemorySize);
        lastHeapStat.globalObjectCount = heapStat.globalObjectCount;
        lastHeapStat.objectCount = heapStat.objectCount;
        lastHeapStat.protectedGlobalObjectCount =
            heapStat.protectedGlobalObjectCount;
        lastHeapStat.protectedObjectCount = heapStat.protectedObjectCount;
        heapStatPane.refresh();
    });
};

export default stats;
