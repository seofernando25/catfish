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

const pane = new Pane();

pane.addBinding(stats, "ConnState", {
    readonly: true,
});

pane.addBinding(stats, "px", {
    readonly: true,
});

pane.addBinding(stats, "py", {
    readonly: true,
});

pane.addBinding(stats, "Id", {
    readonly: true,
});

pane.addBinding(stats, "Status", {
    readonly: true,
});

pane.addBinding(stats, "Ping", {
    readonly: true,
});

pane.addBinding(stats, "CamAngle", {
    readonly: true,
});

pane.addBinding(stats, "PlayerDir", {
    readonly: true,
});

export default stats;
