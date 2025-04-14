import { menuMusicAudio } from "../audio";
import doUILoginSequence from "../components/WelcomeBox/WelcomeBox";
import { getDebugFlags } from "../debugFlags";
import { socket } from "../socket";
import { menuState, resetMenuState } from "./state/menuState";
import type { LoginResult } from "./types";

const handleLogin = (username: string): Promise<LoginResult> => {
    return new Promise((resolve) => {
        socket.emit("login", username, (response) => {
            resolve({
                ...response,
                username
            });
        });
    });
};

export const loginSeq = async (): Promise<LoginResult> => {
    if (getDebugFlags().skipLogin.value) {
        const randomString = Math.random().toString(36).substring(7);
        const username = "dbg-usr-" + randomString;
        const loginResult = await handleLogin(username);
        console.log("Auto-logged in as", username, loginResult);
        return loginResult;
    }

    // Just handle login and return the result
    return await doUILoginSequence(handleLogin);
};

export const menuSeq = async (): Promise<void> => {
    // Reset menu state but preserve username
    const currentUsername = menuState.username.value;
    resetMenuState();
    if (currentUsername) {
        menuState.username.value = currentUsername;
    }

    menuMusicAudio.play();
};

export const fadeOutMusic = async (): Promise<void> => {
    while (menuMusicAudio.getVolume() > 0.001) {
        menuMusicAudio.setVolume(menuMusicAudio.getVolume() - 0.025);
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    menuMusicAudio.stop();
};
