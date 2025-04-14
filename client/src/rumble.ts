import { effect, signal } from "@preact/signals";
import { ButtplugClient, ButtplugClientDevice } from "buttplug";
import { ButtplugWasmClientConnector } from "https://cdn.jsdelivr.net/npm/buttplug-wasm@2.0.1/dist/buttplug-wasm.mjs";

const client = new ButtplugClient("Catfishing");
export const lvsDevice = signal<ButtplugClientDevice | undefined>(undefined);

async function newDeviceRoutine() {
    const dev = lvsDevice.value;
    if (dev === undefined) {
        return;
    }
    console.log("Device added: ", dev.name);
    await dev.vibrate(0.1);
    await dev.vibrate(0);
    await dev.vibrate(0.2);
    await dev.vibrate(0);
    await dev.vibrate(0.4);
    await dev.vibrate(0);
    await dev.vibrate(0.8);
    await dev.vibrate(0);
    await dev.vibrate(1);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await dev.vibrate(0);
}

effect(() => {
    if (lvsDevice.value) {
        newDeviceRoutine();
    }
});

client.on("deviceadded", async (newDevice) => {
    lvsDevice.value = newDevice;
});
client.on("deviceremoved", async (device) => {
    if (device === device.value) {
        device.value = undefined;
    }
});

try {
    const connector = new ButtplugWasmClientConnector();
    await client.connect(connector);
} catch (e) {
    console.log("Failed to enable bluetooth:", e);
}

export async function scanDevices() {
    lvsDevice.value = undefined;
    await client.disconnect();

    try {
        const connector = new ButtplugWasmClientConnector();
        await client.connect(connector);
        await client.startScanning();
    } catch (e) {
        console.log("Failed to enable bluetooth:", e);
    }
}
