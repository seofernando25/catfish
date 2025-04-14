import type { JSX } from "preact";
import { BubbleButton } from "../BubbleButton/BubbleButton";
import "./style.css";
import bubble1 from "../../../../../assets/bubbles/bubble1.png";
import bubble2 from "../../../../../assets/bubbles/bubble2.png";
import bubble3 from "../../../../../assets/bubbles/bubble3.png";
import type { MenuScreen } from "../../state/menuState";
import titleSvgRaw from "@catfish/assets/title.svg?raw";

type MenuItem = {
    id: MenuScreen;
    label: string;
    bubbleImage: string;
    className: string;
};

type MainMenuProps = {
    username: string;
    onMenuSelect: (menuId: MenuScreen) => void;
};

const menuItems: MenuItem[] = [
    { id: 'fish', label: 'Fish', bubbleImage: bubble1, className: 'fish-bubble' },
    { id: 'settings', label: 'Settin\'', bubbleImage: bubble2, className: 'settin-bubble' },
    { id: 'arcade', label: 'Arcade', bubbleImage: bubble3, className: 'arcade-bubble' },
    { id: 'about', label: 'About', bubbleImage: bubble2, className: 'about-bubble' },
];

export function MainMenu({ username, onMenuSelect }: MainMenuProps): JSX.Element {
    return (
        <div class="menu-layout">
            <div  style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: titleSvgRaw }} />
            <nav class="main-menu">
                {menuItems.map(item => (
                    <BubbleButton
                        key={item.id}
                        id={item.id}
                        label={item.label}
                        bubbleImage={item.bubbleImage}
                        onClick={() => onMenuSelect(item.id)}
                        className={item.className}
                    />
                ))}
            </nav>
        </div>
    );
} 