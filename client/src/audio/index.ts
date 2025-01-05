import waterSplash from "@catfish/assets/audio/underwater_muffle_splash.mp3";
import { effect } from "@preact/signals";
import {
    AudioLoader,
    Audio as ThreeAudio,
    AudioListener as ThreeAudioListener,
} from "three";
import { camera } from "../rendering/camera";

export const audioLoader = new AudioLoader();

const listener = new ThreeAudioListener();

const waterSplashSound = await audioLoader.loadAsync(waterSplash);
export const waterSplashAudio = new ThreeAudio(listener);
waterSplashAudio.setBuffer(waterSplashSound);
waterSplashAudio.setLoop(false);
waterSplashAudio.setVolume(0.5);

effect(() => {
    camera.value.remove(listener);
    camera.value.add(listener);
});
