import { computed, effect, Signal, signal, useSignal } from "@preact/signals";
import { Camera } from "three";
import { keyboardOrSignal } from "../../client/input/events";
import { GameObject } from "../../client/gameObject";
import { Ticker } from "../ticker/Ticker";
import { EntityBehavior } from "./PlayerBehavior";
import htm from "htm";
import { h } from "htm/preact/index.js";
import { createRef, render } from "preact";
import { useEffect } from "preact/hooks";
import { ttsSpeak } from "../../client/tts";
import { inject } from "../di";

const html = htm.bind(h);

const messages = signal([
    { sender: "System", message: "Welcome to the game!" },
]);

const enterPressed = keyboardOrSignal([{ key: "Enter" }, { key: "Return" }]);

export const inChatBox = signal(false);

export const inUI = computed(() => inChatBox.value);

function sendMessage(message: string) {
    if (message.trim() === "") return;
    messages.value = [...messages.value, { sender: "Player", message }];
    ttsSpeak(message, 0);
    // You can add logic to send the message to a server or other players here
}

function ChatBox() {
    let inputRef = createRef<HTMLInputElement>();

    const containerStyle = {
        position: "absolute",
        bottom: "8px",
        left: "8px",
        width: "300px",
        maxHeight: "400px",
        background: "rgba(255, 255, 255, 0.2)",
        backdropFilter: inChatBox.value ? "blur(10px)" : "blur(0px)",
        borderRadius: "10px",
        padding: "16px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        // opacity: isVisible.value ? 1 : 0,
        transition: "opacity 0.5s ease, backdrop-filter 0.5s ease",
        display: "flex",
        flexDirection: "column",
        pointerEvents: inChatBox.value ? "auto" : "none", // Prevent interaction when hidden
    };

    // Styles for the messages container
    const messagesStyle = {
        flex: "1",
        overflowY: "auto",
        marginBottom: "8px",
    };

    // Styles for individual messages
    const messageStyle = {
        marginBottom: "4px",
        padding: "8px",
        background: "rgba(0, 0, 0, 0.1)",
        borderRadius: "5px",
    };

    let enterJustPressed = useSignal(false);

    useEffect(() => {
        if (enterPressed.value && !enterJustPressed.value) {
            enterJustPressed.value = true;
            inChatBox.value = !inChatBox.value;

            if (inChatBox.value) {
                inputRef.current.focus();
            } else {
                inputRef.current.blur();

                sendMessage(inputRef.current.value);
                inputRef.current.value = "";
            }
        } else if (!enterPressed.value) {
            enterJustPressed.value = false;
        }
    }, [enterPressed.value]);

    return html`
        <div style=${containerStyle}>
            <div style=${messagesStyle}>
                ${messages.value.map(
                    (msg, index) => html`
                        <div key=${index} style=${messageStyle}>
                            <strong>${msg.sender}:</strong> ${msg.message}
                        </div>
                    `
                )}
            </div>
            <form style="display: flex;" onSubmit=${(e) => e.preventDefault()}>
                <input
                    type="text"
                    placeholder="message..."
                    maxlength="100"
                    autocomplete="off"
                    ref=${inputRef}
                    style="
                    flex: 1;
                    padding: 8px;
                    border: none;
                    border-radius: 5px;
                    margin-right: 8px;
                    outline: none;
                "
                />
            </form>
        </div>
    `;
}

const container = document.createElement("div");
window.document.body.appendChild(container);

render(html`<${ChatBox} />`, container);

export class GameUIBehavior extends EntityBehavior {
    toggle = keyboardOrSignal([{ key: "i" }, { key: "I" }]);
    ticker = inject(Ticker);
    go = inject(GameObject);

    constructor() {
        super();
        let justPressed = false;

        effect(() => {
            this.ticker.currentTick.value;

            if (this.toggle.value && !justPressed) {
                justPressed = true;
                console.log("Toggled");
            } else if (!this.toggle.value) {
                justPressed = false;
            }
        });
    }
}
