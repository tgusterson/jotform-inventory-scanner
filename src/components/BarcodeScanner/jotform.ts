export type JotformSubmitMessage = {
    valid: boolean;
    value: string;
};

type JotformCustomWidget = {
    subscribe(event: "ready" | "submit", callback: (data?: unknown) => void): void;
    getWidgetSetting(name: string): string | undefined;
    sendSubmit(message: JotformSubmitMessage): void;
    requestFrameResize(size: { width?: number; height?: number }): void;
};

declare global {
    interface Window {
        JFCustomWidget?: JotformCustomWidget;
    }
}

/** Returns the Jotform API only when the app is running inside a Jotform iframe. */
export function getJotform(): JotformCustomWidget | undefined {
    let isInIframe: boolean;

    try {
        isInIframe = window.self !== window.top;
    } catch {
        isInIframe = true;
    }

    return isInIframe ? window.JFCustomWidget : undefined;
}