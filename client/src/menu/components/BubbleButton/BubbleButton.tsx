import type { JSX } from "preact";
import "./style.css";

type BubbleButtonProps = {
    id: string;
    label: string;
    onClick: () => void;
    bubbleImage: string;
    className?: string;
};

export function BubbleButton({ id, label, onClick, bubbleImage, className }: BubbleButtonProps): JSX.Element {
    return (
        <button 
            className={`bubble-button ${className || ''}`}
            onClick={onClick}
            style={{ backgroundImage: `url(${bubbleImage})` }}
        >
            <span className="bubble-label">{label}</span>
        </button>
    );
} 