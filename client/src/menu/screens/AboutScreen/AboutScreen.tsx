import type { JSX } from "preact";
import { navigateToScreen } from "../../state/menuState";
import "./style.css";
import { BubbleButton } from "../../components/BubbleButton/BubbleButton";
import bubble1 from "../../../../../assets/bubbles/bubble1.png";
import titleSvgRaw from "@catfish/assets/title.svg?raw";

export function AboutScreen(): JSX.Element {

    return (
        <div class="menu-layout">   
            <div  style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: titleSvgRaw }} />
            <nav class="main-menu">
                <section className="about-credits">
                    <dl>
                        <dt>Programmed by</dt>
                        <dd>SeoFer</dd>
                        <dt>Art by</dt>
                        <dd>Miloski</dd>
                        <dd>Goobi</dd>
                    </dl>
                </section>
                <div class="back-button">
                    <BubbleButton
                        id={'back'}
                        label={'Back'}
                        bubbleImage={bubble1}
                        onClick={() => navigateToScreen('menu')}
                    />
                </div>
            </nav>
        </div>
    );
} 