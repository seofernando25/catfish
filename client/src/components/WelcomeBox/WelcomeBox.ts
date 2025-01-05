import { createRef, render } from "preact";
import html, { uiContainer } from "../../html";
import "./style.css";

export function WelcomeBox(params: {
    loginRequest: (
        username: string
    ) => Promise<{ success: boolean; message: string }>;
}) {
    let inputRef = createRef<HTMLInputElement>();
    let errorMessage = createRef<HTMLParagraphElement>();

    const loginHandler = async () => {
        const loginResult = await params.loginRequest(
            inputRef.current?.value ?? ""
        );
        if (!errorMessage.current) {
            return;
        }

        if (loginResult.success) {
            errorMessage.current.innerText = "";
        } else {
            errorMessage.current.innerText = loginResult.message;
        }
    };

    return html`
        <div class="welcome-box">
            <h1>Welcome to Catfishing</h1>
            <p>
                Cast your lines, shape the waters, and share the catch with all
                your friends.
            </p>
            <hr />
            <h2>
                Enter a username to join, or leave it blank to get a random one
            </h2>
            <input
                ref=${inputRef}
                type="text"
                placeholder="Username"
                onKeyPress=${(e: KeyboardEvent) => {
                    if (e.key === "Enter") {
                        loginHandler();
                    }
                }}
            />

            <p ref=${errorMessage} class="error-message"></p>

            <button onClick=${loginHandler}>JOIN</button>
        </div>
    `;
}

export default async function doUILoginSequence(
    loginFn: (
        username: string
    ) => Promise<{ success: boolean; message: string }>
) {
    const node = uiContainer.appendChild(document.createElement("div"));

    return await new Promise(
        (resolve: (value: { success: boolean; message: string }) => void) => {
            render(
                html`<${WelcomeBox}
                    loginRequest=${async (username: string) => {
                        const result = await loginFn(username);
                        if (result.success) {
                            uiContainer.removeChild(node);
                            resolve({
                                success: true,
                                message: "Logged in",
                            });
                        }
                        return result;
                    }}
                />`,
                node
            );
        }
    );
}
