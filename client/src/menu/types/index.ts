import type { MenuScreen } from "../state/menuState";


export type MenuState = {
	currentScreen: MenuScreen;
	username: string | null;
	error: string | null;
	isLoading: boolean;
};

export type AnimationConfig = {
	duration: number;
	delay: number;
	easing: (t: number) => number;
	from: number;
	to: number;
};

export type InteractionHandler = () => void; 