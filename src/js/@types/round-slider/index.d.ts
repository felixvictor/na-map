/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "round-slider" {
    interface RoundSliderPos {
        "margin-top"?: number
        "margin-left"?: number
    }
}

interface JQuery {
    roundSlider: (options?: Record<string, unknown> | string) => any
}
