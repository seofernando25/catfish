import { Pane } from "tweakpane";

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

export default stats;
