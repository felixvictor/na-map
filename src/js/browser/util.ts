/*!
 * This file is part of na-map.
 *
 * @file      Utility functions.
 * @module    util
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="jquery" />

import { scaleBand as d3ScaleBand, ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import { BaseType, Selection } from "d3-selection"

import { numberSegments } from "../common/common-browser"
import {
    compassToDegrees,
    Coordinate,
    degreesFullCircle,
    degreesQuarterCircle,
    degreesToCompass,
    radiansToDegrees,
} from "../common/common-math"

/**
 * Display formatted compass
 * @param   wind - Wind direction in compass or correctionValueDegrees
 * @param   svg - True to use 'tspan' instead of 'span'
 * @returns HTML formatted compass
 */
export const displayCompass = (wind: string, svg = false): string => {
    let compass

    if (Number.isNaN(Number(wind))) {
        compass = wind
    } else {
        compass = degreesToCompass(Number(wind))
    }

    return `<${svg ? "tspan" : "span"} class="caps">${compass}</${svg ? "tspan" : "span"}>`
}

/**
 * Display formatted compass and correctionValueDegrees
 * @param   wind - Wind direction in compass or correctionValueDegrees
 * @param   svg - True to use 'tspan' instead of 'span'
 * @returns HTML formatted compass and correctionValueDegrees
 */
export const displayCompassAndDegrees = (wind: number | string, svg = false): string => {
    let compass: string
    let degrees: number

    if (Number.isNaN(Number(wind))) {
        compass = wind as string
        degrees = compassToDegrees(compass) % degreesFullCircle
    } else {
        degrees = Number(wind)
        compass = degreesToCompass(degrees)
    }

    return `<${svg ? "tspan" : "span"} class="caps">${compass}</${svg ? "tspan" : "span"}> (${degrees}°)`
}

/**
 * Get wind in correctionValueDegrees from user input (rs-slider)
 * @param   sliderId - Slider id
 * @returns Wind in correctionValueDegrees
 */
export const getUserWind = (sliderId: string): number => {
    const currentUserWind = degreesToCompass($(`#${sliderId}`).roundSlider("getValue"))
    let windDegrees

    if (Number.isNaN(Number(currentUserWind))) {
        windDegrees = compassToDegrees(currentUserWind)
    } else {
        windDegrees = Number(currentUserWind)
    }

    return windDegrees
}

/**
 * Calculate the angle in correctionValueDegrees between two points
 * see {@link https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees}
 * @param   centerPt - Center point
 * @param   targetPt - Target point
 * @returns Degrees between centerPt and targetPt
 */
export const rotationAngleInDegrees = (centerPt: Coordinate, targetPt: Coordinate): number => {
    let theta = Math.atan2(targetPt.y - centerPt.y, targetPt.x - centerPt.x)
    theta -= Math.PI / 2
    let degrees = radiansToDegrees(theta)
    if (degrees < 0) {
        degrees += degreesFullCircle
    }

    return degrees
}

/**
 * Split array into n pieces
 * {@link https://stackoverflow.com/questions/8188548/splitting-a-js-array-into-n-arrays}
 * @param   array - Array to be split
 * @param   n - Number of splits
 * @param   balanced - True if splits' lengths differ as less as possible
 * @returns Split arrays
 */
export const chunkify = (array: Array<number | string>, n: number, balanced = true): Array<Array<number | string>> => {
    if (n < 2) {
        return [array]
    }

    const length_ = array.length
    const out = []
    let i = 0
    let size

    if (length_ % n === 0) {
        size = Math.floor(length_ / n)
        while (i < length_) {
            out.push(array.slice(i, (i += size)))
        }
    } else if (balanced) {
        while (i < length_) {
            size = Math.ceil((length_ - i) / n--)
            out.push(array.slice(i, (i += size)))
        }
    } else {
        n -= 1
        size = Math.floor(length_ / n)
        if (length_ % size === 0) {
            size -= 1
        }

        while (i < size * n) {
            out.push(array.slice(i, (i += size)))
        }

        out.push(array.slice(size * n))
    }

    return out
}

/**
 * Print compass
 * @param   element - Element to append compass
 * @param   radius - Radius
 */
export const printCompassRose = ({
    element,
    radius,
}: {
    element: Selection<BaseType, any, HTMLElement, any>
    radius: number
}): void => {
    const steps = numberSegments
    const degreesPerStep = degreesFullCircle / steps
    // noinspection MagicNumberJS
    const innerRadius = Math.round(radius * 0.8)
    const strokeWidth = 3
    const data = new Array(steps).fill(null).map((_e, i) => degreesToCompass(i * degreesPerStep))
    const xScale = d3ScaleBand()
        .range([0 - degreesPerStep / 2, degreesFullCircle - degreesPerStep / 2])
        .domain(data)
        .align(0)

    element.append("circle").attr("r", innerRadius).style("stroke-width", `${strokeWidth}px`)

    const dummy = element.append("text")

    // Cardinal and intercardinal winds
    const label = element
        .selectAll("g")
        .data(data)
        .join((enter) =>
            enter
                .append("g")
                .attr(
                    "transform",
                    (d) =>
                        `rotate(${Math.round(
                            (xScale(d) ?? 0) + xScale.bandwidth() / 2 - degreesQuarterCircle
                        )})translate(${innerRadius},0)`
                )
        )

    label
        .filter((_d, i) => i % 3 !== 0)
        .append("line")
        .attr("x2", 9)

    label
        .filter((_d, i) => i % 3 === 0)
        .append("text")
        .attr("transform", (d) => {
            let rotate = Math.round((xScale(d) ?? 0) + xScale.bandwidth() / 2)
            let translate = ""

            dummy.text(d)
            const textHeight = dummy.node()?.getBBox().height ?? 0
            const textWidth = dummy.node()?.getBBox().width ?? 0

            if ((rotate >= 0 && rotate <= 45) || rotate === 315) {
                rotate = 90
                translate = `0,-${textHeight / 2}`
            } else if (rotate === 90) {
                rotate = 0
                translate = `${textWidth / 2 + strokeWidth},0`
            } else if (rotate === 270) {
                rotate = 180
                translate = `-${textWidth / 2 + strokeWidth},0`
            } else {
                rotate = -90
                translate = `0,${textHeight / 2 + strokeWidth + 2}`
            }

            return `rotate(${rotate})translate(${translate})`
        })
        .text((d) => d)

    dummy.remove()
}

/**
 * Print small compass
 * @param   element - Element to append compass
 * @param   radius - Radius
 */
export const printSmallCompassRose = ({
    element,
    radius,
}: {
    element: Selection<BaseType, unknown, HTMLElement, any>
    radius: number
}): void => {
    const steps = numberSegments
    const degreesPerStep = degreesFullCircle / steps
    const innerRadius = Math.round(radius * 0.8)
    const strokeWidth = 1.5
    const data = new Array(steps).fill(null).map((_e, i) => degreesToCompass(i * degreesPerStep))
    const xScale = d3ScaleBand()
        .range([0 - degreesPerStep / 2, degreesFullCircle - degreesPerStep / 2])
        .domain(data)
        .align(0)

    element.append("circle").attr("r", innerRadius).style("stroke-width", `${strokeWidth}px`)

    // Ticks
    const x2 = 2
    const x2InterCard = 4
    const x2Card = 6
    element
        .selectAll("line")
        .data(data)
        .join((enter) =>
            enter
                .append("line")
                .attr("x2", (_d, i) => {
                    if (i % 3 === 0) {
                        return i % 6 === 0 ? x2Card : x2InterCard
                    }

                    return x2
                })
                .attr(
                    "transform",
                    (d) => `rotate(${Math.round((xScale(d) ?? 0) + xScale.bandwidth() / 2)})translate(${innerRadius},0)`
                )
        )
}

/**
 * Format clan name
 * @param   clan - Clan name
 * @returns Formatted clan name
 */
export const displayClan = (clan: string): string => `<span class="caps">${clan}</span>`

/**
 * Copy to clipboard (fallback solution)
 * @param   text - String
 * @param modal$ - Modal
 * @returns Success
 */
const copyToClipboardFallback = (text: string, modal$: JQuery): boolean => {
    // console.log("copyToClipboardFallback");
    if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        const input = document.createElement("input")

        input.type = "text"
        input.value = text
        input.style.position = "absolute"
        input.style.left = "-1000px"
        input.style.top = "-1000px"
        modal$.append(input)
        input.select()

        try {
            return document.execCommand("copy")
        } catch (error) {
            console.error("Copy to clipboard failed.", error)
            return false
        } finally {
            input.remove()
        }
    } else {
        console.error(`Insufficient rights to copy ${text} to clipboard`)
        return false
    }
}

/**
 * Copy to clipboard (API)
 * @param   text - String
 * @returns Clipboard promise
 */
const writeClipboard = (text: string): Promise<boolean> => {
    return navigator.clipboard
        .writeText(text)
        .then(() => {
            // console.log(`Copied ${text} to clipboard.`);
            return true
        })
        .catch((error) => {
            console.error(`Cannot copy ${text} to clipboard`, error)
            return false
        })
}

/**
 * Copy to clipboard (clipboard API)
 * @param text - String
 * @param modal$ - Modal
 */
export const copyToClipboard = (text: string, modal$: JQuery): void => {
    if (!navigator.clipboard) {
        copyToClipboardFallback(text, modal$)
    }

    // noinspection JSIgnoredPromiseFromCall
    writeClipboard(text)
}

/**
 * Copy F11 coordinates to clipboard
 * @param x - X Coordinate
 * @param z - Z Coordinate
 * @param modal$ - Modal
 */
export const copyF11ToClipboard = (x: number, z: number, modal$: JQuery): void => {
    if (Number.isFinite(x) && Number.isFinite(z)) {
        const F11Url = new URL(window.location.href)

        F11Url.searchParams.set("x", String(x))
        F11Url.searchParams.set("z", String(z))

        copyToClipboard(F11Url.href, modal$)
    }
}

/**
 * Ramp for visualizing colour scales
 * {@link https://observablehq.com/@mbostock/color-ramp}
 * @param element - DOM element
 * @param colourScale - Colour
 * @param steps - Number of steps (default 512)
 */
export const colourRamp = (
    element: Selection<SVGElement | HTMLElement, unknown, HTMLElement, any>,
    colourScale: ScaleLinear<string | CanvasGradient | CanvasPattern, string | CanvasGradient | CanvasPattern>,
    steps = 512
): void => {
    const height = 200
    const width = 1000
    const canvas = element.insert("canvas").attr("width", width).attr("height", height)
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    const context = canvas.node()?.getContext("2d")
    // @ts-ignore
    canvas.style.imageRendering = "pixelated"
    const min = colourScale.domain()[0]

    const max = colourScale.domain()[colourScale.domain().length - 1]
    const step = (max - min) / steps
    const stepWidth = Math.floor(width / steps)
    let x = 0
    console.log(canvas, context)
    console.log(min, max, steps, step)
    if (context) {
        for (let currentStep = min; currentStep < max; currentStep += step) {
            context.fillStyle = colourScale(currentStep)
            context.fillRect(x, 0, stepWidth, height)
            x += stepWidth
        }
    }
}

export const drawSvgCircle = (x: number, y: number, r: number): string =>
    `M${x},${y} m${-r},0 a${r},${r} 0,1,0 ${r * 2},0 a${r},${r} 0,1,0 ${-r * 2},0`
export const drawSvgRect = (x: number, y: number, r: number): string => `M${x - r / 2},${y - r / 2}h${r}v${r}h${-r}z`
export const drawSvgLine = (x: number, y: number, l: number): string => `M${x},${y}v${l}`
