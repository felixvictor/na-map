/* eslint-disable @typescript-eslint/no-explicit-any */
// noinspection JSUnusedGlobalSymbols

export {}

declare global {
    interface Window {
        sliderTooltip: any
    }

    interface JQuery {
        roundSlider: (options?: Record<string, unknown> | string) => any
    }
}
