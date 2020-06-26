/* eslint-disable @typescript-eslint/no-explicit-any */

/// <reference types="jquery"/>

interface RoundSliderPos {
    "margin-top"?: number
    "margin-left"?: number
}

interface JQuery {
    roundSlider: (options?: Record<string, unknown> | string) => any
}
