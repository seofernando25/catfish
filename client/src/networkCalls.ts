import { socket } from "./socket";

export async function login(username: string) {
    return new Promise<{ success: boolean; message: string }>((resolve) => {
        socket.emit("login", username, (cb) => {
            resolve(cb);
        });
    });
}

type PingResponse = {
    round_trip_time: number;
    client_delay: number;
    server_delay: number;
};

export async function ping(): Promise<PingResponse> {
    const client_send_time = Date.now();
    return new Promise((resolve) => {
        socket.emit("ping", client_send_time, (cb) => {
            const server_receive_time = cb.timestamp;
            const now = Date.now();
            resolve({
                round_trip_time: now - client_send_time,
                client_delay: server_receive_time - client_send_time,
                server_delay: now - server_receive_time,
            });
        });
    });
}
