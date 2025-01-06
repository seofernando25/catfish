import { Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import doUILoginSequence from "../components/WelcomeBox/WelcomeBox";
import { getDebugFlags } from "../debugFlags";
import { socket } from "../socket";
import { waitForFirstInteraction, waitForNextInteraction } from "./utils";

import { droppingTitleSeq } from "./utils";
import { getSubTextureFromAtlas } from "../rendering/textures";
import { globalScene } from "../rendering/renderer";
import { effect } from "@preact/signals";
import { globalTicker } from "@catfish/common/Ticker.js";
import { menuMusicAudio } from "../audio";
export const loginSeq = async () => {
    // Wait for window first interaction
    let username = "";
    const login = (name: string) => {
        const r: Promise<{
            success: boolean;
            message: string;
        }> = new Promise((resolve) => {
            socket.emit("login", name, (response) => {
                username = name;
                resolve(response);
            });
        });
        return r;
    };

    console.log("getDebugFlags", getDebugFlags());
    if (!getDebugFlags().skipLogin.value) {
        const message = await doUILoginSequence(login);
        return {
            ...message,
            username,
        };
    } else {
        const randomString = Math.random().toString(36).substring(7);
        const username = "dbg-usr-" + randomString;
        const loginResult = await login(username);
        console.log("Auto-logged in as", username, loginResult);
        return {
            ...loginResult,
            username,
        };
    }
};

export const menuSeq = async () => {
    droppingTitleSeq();
    const menuMusic = menuMusicAudio.play();

    // Show buttons and await for first pressed
    const buttonMat = new MeshBasicMaterial({
        map: getSubTextureFromAtlas("Play"),
        transparent: true,
    });
    buttonMat.opacity = 0;
    const button = new Mesh(new PlaneGeometry(1, 1), buttonMat);
    const scaleFrom = 0.01;
    const scaleTo = 0.1;
    button.scale.set(scaleFrom, scaleFrom, scaleFrom);
    globalScene.add(button);

    // Fade in button
    setTimeout(() => {
        const fadeInEffect = effect(() => {
            globalTicker.currentTick.value;
            buttonMat.opacity += globalTicker.deltaTime.value * 1;
            if (buttonMat.opacity >= 1) {
                fadeInEffect();
            }
        });

        const scaleEffect = effect(() => {
            globalTicker.currentTick.value;
            button.scale.set(
                button.scale.x + globalTicker.deltaTime.value * 2.0,
                button.scale.y + globalTicker.deltaTime.value * 2.0,
                button.scale.z + globalTicker.deltaTime.value * 2.0
            );
            if (button.scale.x >= scaleTo) {
                scaleEffect();
            }
        });
    }, 1000);

    await waitForNextInteraction();
    // menuMusic.stop();

    // fade out music

    await (async () => {
        while (menuMusicAudio.getVolume() > 0.001) {
            menuMusicAudio.setVolume(menuMusicAudio.getVolume() - 0.025);
            console.log("Music volume", menuMusicAudio.getVolume());
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        console.log("Music faded out");
        menuMusicAudio.stop();
    })();

    return "game";
};
