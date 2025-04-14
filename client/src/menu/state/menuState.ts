import { effect, signal } from "@preact/signals";

export type MenuScreen = 'login' | 'menu' | 'about' | 'settings' | 'account' | 'arcade' | 'fish';

export const menuState = {
	currentScreen: signal<MenuScreen>('menu'),
	username: signal<string | null>(null),
	error: signal<string | null>(null),
	isLoading: signal(false)
};

export const resetMenuState = () => {
	menuState.currentScreen.value = 'menu';
	menuState.username.value = null;
	menuState.error.value = null;
	menuState.isLoading.value = false;
};

export const setUsername = (username: string) => {
	menuState.username.value = username;
};

export const navigateToScreen = (screen: MenuScreen) => {
	menuState.currentScreen.value = screen;
};


let nEffect = 0;
// Check if we have local storage 
if (localStorage !== undefined) {
	effect(() => {
		menuState.currentScreen.value;
		if (nEffect >= 1) {

			localStorage.setItem('menuScreen', menuState.currentScreen.value);
			console.log('menuScreen', menuState.currentScreen.value);
		}
		nEffect++;
	});
}