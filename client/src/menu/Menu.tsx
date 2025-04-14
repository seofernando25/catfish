import type { JSX } from "preact";
import { render } from "preact";
import { AboutScreen } from "./screens/AboutScreen/AboutScreen";
import { MainMenuScreen } from "./screens/MainMenuScreen/MainMenuScreen";
import { menuState } from "./state/menuState";
import { ArcadeScreen } from "./screens/ArcadeScreen/ArcadeScreen";

export function Menu(): JSX.Element {
    switch (menuState.currentScreen.value) {
        case 'about':
            return <AboutScreen />;
        case 'menu':
            return <MainMenuScreen />;
        case 'arcade':
            return <ArcadeScreen />;
        default:
            return <MainMenuScreen />;
    }
}

export const showMenu = () => {
    const menuMount = document.createElement('div');
    menuMount.classList.add('menu-root');
    document.body.appendChild(menuMount);

    render(<Menu />, menuMount);

    return () => {
        render(null, menuMount);
        document.body.removeChild(menuMount);
    };
}; 