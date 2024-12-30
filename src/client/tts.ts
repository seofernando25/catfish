import SamJs from "sam-js";
import { Howl, Howler } from "howler";

let sam = new SamJs();

const voices = [
    {
        pitch: 21,
        speed: 38,
        mouth: 45,
        throat: 43,
    },
    {
        pitch: 32,
        speed: 33,
        mouth: 63,
        throat: 21,
    },
    {
        pitch: 25,
        speed: 33,
        mouth: 77,
        throat: 255,
    },
] as const;

export function ttsSpeak(text: string, voice: number) {
    let sam = new SamJs({
        ...voices[voice],
    });

    let wavBuff = sam.wav(text);
    var blob = new Blob([wavBuff], { type: "music/wav" });

    let sound = new Howl({
        src: [URL.createObjectURL(blob)],
        format: ["wav"],
        volume: 0.1,
    });
    sound.play();
}
