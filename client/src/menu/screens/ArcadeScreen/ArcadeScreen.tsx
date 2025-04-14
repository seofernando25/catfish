import type { JSX } from "preact";
import { navigateToScreen } from "../../state/menuState";
import { BubbleButton } from "../../components/BubbleButton/BubbleButton";
import bubble1 from "../../../../../assets/bubbles/bubble1.png";
import "./style.css";

type ArcadeGame = {
    id: string;
    label: string;
    className: string;
    screen: string;
};

const arcadeGames: ArcadeGame[] = [
    { id: 'flappy-fish', label: 'Flappy\nFish', className: 'flappy-fish-bubble', screen: '...' },
    { id: 'glow-trail', label: 'Glow\nTrail', className: 'glow-trail-bubble', screen: '...' },
    { id: 'reflex-catch', label: 'Reflex\nCatch', className: 'reflex-catch-bubble', screen: '...' },
];

export function ArcadeScreen(): JSX.Element {
    return (
        <div class="menu-layout">
            <h2 class="arcade-title">The<br></br>Arcade</h2>
            <nav class="arcade-menu">
                {arcadeGames.map(game => (
                    <BubbleButton
                        key={game.id}
                        id={game.id}
                        label={game.label}
                        bubbleImage={bubble1}
                        className={game.className}
                        onClick={() => navigateToScreen('arcade')}
                    />
                ))}
                <BubbleButton
                    id="back"
                    label="Back"
                    bubbleImage={bubble1}
                    onClick={() => navigateToScreen('menu')}
                    className="back-bubble"
                />
            </nav>
        </div>
    );
} 