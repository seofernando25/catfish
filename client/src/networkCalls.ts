import { socket } from "./socket";

export async function login(username: string) {
    return new Promise<{ success: boolean; message: string }>((resolve) => {
        socket.emit("login", username, (cb) => {
            resolve(cb);
        });
    });
}

export async function ping() {
    const now = Date.now();
    return new Promise<{ timestamp: number }>((resolve) => {
        socket.emit("ping", now, (cb) => {
            resolve(cb);
        });
    });
}
