import { useSignal } from "@preact/signals";
import type { JSX } from "preact";
import { createRef, render } from "preact";
import { scanDevices } from "../../rumble";
import "./style.css";
import type { LoginResult } from "../../menu/types";

type WelcomeBoxProps = {
    loginRequest: (username: string) => Promise<LoginResult>;
    onSuccess: (result: LoginResult) => void;
    onConnect?: () => Promise<void>;
};

export function WelcomeBox({ loginRequest, onSuccess, onConnect }: WelcomeBoxProps): JSX.Element {
    const isLoading = useSignal(false);
    const error = useSignal("");
    const inputRef = createRef<HTMLInputElement>();

    const handleLogin = async () => {
        if (isLoading.value) return;
        
        isLoading.value = true;
        error.value = "";
        
        try {
            let username = inputRef.current?.value ?? "";


            if (username === "") {
                console.log("No username provided, generating random one");
                username = "dbg-usr-" + Math.random().toString(36).substring(7);
            }

            const result = await loginRequest(username);
            
            if (result.success) {
                onSuccess({
                    ...result,
                    username // Include the username in the result
                });
            } else {
                error.value = result.message;
            }
        } catch (err) {
            error.value = "An unexpected error occurred. Please try again.";
            console.error("Login error:", err);
        } finally {
            isLoading.value = false;
        }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            handleLogin();
        }
    };

    const handleConnect = async () => {
        if (onConnect) {
            await onConnect();
        } else {
            scanDevices();
        }
    };

    return (
        <div class="welcome-box" role="dialog" aria-labelledby="welcome-title">
            <h1 id="welcome-title">Welcome to Catfishing</h1>
            <p>
                Cast your lines, shape the waters, and share the catch with all
                your friends.
            </p>
            <hr />
            <h2>
                Enter a username to join, or leave it blank to get a random one
            </h2>
            <input
                ref={inputRef}
                type="text"
                placeholder="Username"
                onKeyPress={handleKeyPress}
                disabled={isLoading.value}
                aria-label="Username"
                aria-invalid={!!error.value}
                aria-describedby={error.value ? "error-message" : undefined}
            />

            {error.value && (
                <p id="error-message" class="error-message" role="alert">
                    {error.value}
                </p>
            )}

            <div class="button-group">
                <button 
                    onClick={handleLogin} 
                    disabled={isLoading.value}
                    aria-busy={isLoading.value}
                >
                    {isLoading.value ? "JOINING..." : "JOIN"}
                </button>
                <button 
                    onClick={handleConnect}
                    disabled={isLoading.value}
                >
                    CONNECT
                </button>
            </div>
        </div>
    );
}

export default async function doUILoginSequence(
    loginFn: (username: string) => Promise<LoginResult>
) {
	const mountPoint = document.createElement("div");
	document.body.appendChild(mountPoint);

    return new Promise<LoginResult>((resolve) => {
		console.log("Mounting welcome box");
        render(
            <WelcomeBox
                loginRequest={loginFn}
                onSuccess={(result) => {
					render(null, mountPoint);
					resolve(result);
                }}
            />,
            mountPoint
        );
    });
}