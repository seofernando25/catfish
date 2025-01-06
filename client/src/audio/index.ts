import waterSplash from "@catfish/assets/audio/underwater_muffle_splash.mp3";
import menuMusicPath from "@catfish/assets/audio/Slow Start ep (Remastered).mp3";
import { effect } from "@preact/signals";
import {
    AudioLoader,
    Audio as ThreeAudio,
    AudioListener as ThreeAudioListener,
} from "three";
import { camera } from "../rendering/camera";
import { getDebugFlags } from "../debugFlags";

export const audioLoader = new AudioLoader();

const listener = new ThreeAudioListener();

effect(() => {
    const masterVolume = getDebugFlags().masterVolume.value;
    listener.setMasterVolume(masterVolume);
});

const waterSplashSound = await audioLoader.loadAsync(waterSplash);
export const waterSplashAudio = new ThreeAudio(listener);
waterSplashAudio.setBuffer(waterSplashSound);
waterSplashAudio.setLoop(false);
waterSplashAudio.setVolume(0.5);

const menuMusicSound = await audioLoader.loadAsync(menuMusicPath);
export const menuMusicAudio = new ThreeAudio(listener);
menuMusicAudio.setBuffer(menuMusicSound);
menuMusicAudio.setLoop(true);
menuMusicAudio.setVolume(0.5);

effect(() => {
    camera.value.remove(listener);
    camera.value.add(listener);
});
