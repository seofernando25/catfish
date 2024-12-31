import { Pane } from "tweakpane";
import type { heapStats } from "bun:jsc";
import { io } from "socket.io-client";
import { socket } from "./socket";

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

tweakpaneRef.addBinding(stats, "ConnState", {
    readonly: true,
});

tweakpaneRef.addBinding(stats, "px", {
    readonly: true,
});

tweakpaneRef.addBinding(stats, "py", {
    readonly: true,
});

tweakpaneRef.addBinding(stats, "Id", {
    readonly: true,
});

tweakpaneRef.addBinding(stats, "Status", {
    readonly: true,
});

tweakpaneRef.addBinding(stats, "Ping", {
    readonly: true,
});

tweakpaneRef.addBinding(stats, "CamAngle", {
    readonly: true,
});

tweakpaneRef.addBinding(stats, "PlayerDir", {
    readonly: true,
});

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
