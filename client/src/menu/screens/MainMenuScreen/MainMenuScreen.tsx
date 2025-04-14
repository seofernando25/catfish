import { MainMenu } from "../../components/MainMenu/MainMenu";
import { menuState, navigateToScreen } from "../../state/menuState";
import "./style.css";

export function MainMenuScreen() {
    return (
        <MainMenu 
            username={menuState.username.value || 'Unknown Player'} 
            onMenuSelect={(menuId) => navigateToScreen(menuId)}
        />
    );
}