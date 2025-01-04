import type { ServerClientSocket } from "@catfish/common/events/server.js";

/**
 * Wait for the client to respond with a clientOk event within a timeout
 */
export const waitClientOk = async (
    socket: ServerClientSocket,
    timeout: number = 5000
): Promise<boolean> => {
    let clientOk = false;

    // Wait for clientOk event
    await new Promise<void>((resolve) => {
        let cleanUp = () => {
            socket.off("clientOk", cOkHandler);
            socket.off("disconnect", disconnectHandler);
            clearTimeout(okTimeout);
        };

        let cOkHandler = () => {
            resolve();
            cleanUp();
        };

        let disconnectHandler = () => {
            resolve();
            cleanUp();
        };

        const okTimeout = setTimeout(() => {
            if (!clientOk) {
                resolve();
                cleanUp();
                socket.disconnect();
                console.log("Client", socket.id, "did not respond in time");
            }
        }, timeout);

        socket.on("clientOk", cOkHandler);
        socket.on("disconnect", disconnectHandler);
    });

    if (socket.disconnected) {
        return false;
    }
    return true;
};
