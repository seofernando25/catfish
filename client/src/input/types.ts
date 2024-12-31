// export interface InputDevice {
//     initialize(): void;
//     destroy(): void;
// }

// export interface KeyBinding {
//     device: 'keyboard';
//     key: string;
// }

// export interface GamepadBinding {
//     device: 'gamepad';
//     button: number;
// }

export type InputDevice = {
    initialize(): void;
    destroy(): void;
};

export type KeyBinding = {
    device: "keyboard";
    key: string;
};

export type GamepadBinding = {
    device: "gamepad";
    button: number;
};

// export type Binding = KeyBinding | GamepadBinding;
