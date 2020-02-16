/**
 * This file is part of na-map.
 *
 * @file      Utility functions.
 * @module    util
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { formatLocale as d3FormatLocale } from "d3-format"
import { scaleBand as d3ScaleBand } from "d3-scale"
import { html, TemplateResult } from "lit-html"
import { Coordinate, degreesFullCircle, degreesHalfCircle, degreesQuarterCircle } from "./common"
import { BaseType, Selection } from "d3-selection"
import { numberSegments } from "./common-browser"

/**
 * Specification of locale to use when creating a new FormatLocaleObject
 */
interface FormatLocaleDefinition {
    /**
     * The decimal point (e.g., ".")
     */
    decimal: string
    /**
     * The group separator (e.g., ","). Note that the thousands property is a misnomer, as\
     * the grouping definition allows groups other than thousands.
     */
    thousands: string
    /**
     * The array of group sizes (e.g., [3]), cycled as needed.
     */
    grouping: number[]
    /**
     * The currency prefix and suffix (e.g., ["$", ""]).
     */
    currency: [string, string]
    /**
     * An optional array of ten strings to replace the numerals 0-9.
     */
    numerals?: string[]
    /**
     * An optional symbol to replace the `percent` suffix; the percent suffix (defaults to "%").
     */
    percent?: string
    /**
     * optional; the minus sign (defaults to hyphen-minus, "-")
     */
    minus?: string
    /**
     * optional; the not-a-number value (defaults "NaN")
     */
    nan?: string
}

/**
 * Default format
 */
const formatLocale = d3FormatLocale({
    decimal: ".",
    thousands: "\u2009",
    grouping: [3],
    currency: ["", "\u00A0reals"],
    percent: "\u202F%",
    minus: "\u2212\u2009"
} as FormatLocaleDefinition)

// noinspection MagicNumberJS
/**
 * format with SI suffix
 */
const formatPrefix = formatLocale.formatPrefix(",.0", 1.0e3)

/**
 * Format float
 * @param   x - Float
 * @param   s - Significant digits
 * @returns Formatted float
 */
export const formatFloat = (x: number, s = 2): string => formatLocale.format(`,.${s}~r`)(x)

/**
 * Format float with +/- sign
 * @param   x - Float
 * @param   s - Significant digits
 * @returns Formatted signed float
 */
export const formatSignFloat = (x: number, s = 2): string =>
    formatLocale
        .format(`+,.${s}~r`)(x)
        .replace("+", "\uFF0B\u200A")

/**
 * Format float
 * @param   x - Float
 * @param   f - Digits following decimal point
 * @returns Formatted float
 */
export const formatFloatFixed = (x: number, f = 2): string =>
    formatLocale
        .format(`.${f}f`)(x)
        .replace(".00", '<span class="hidden">.00</span>')
        .replace(/\.(\d)0/g, '.$1<span class="hidden">0</span>')

/**
 * Format float for lit-html
 * @param   x - Float
 * @param   f - digits following decimal point
 * @returns Formatted float
 */
export const formatFloatFixedHTML = (x: number, f = 2): TemplateResult => {
    const [number, decimals] = formatLocale
        .format(`.${f}f`)(x)
        .split(".")
    let formattedFloat: TemplateResult = html`
        ${decimals}
    `

    if (decimals) {
        if (decimals === "0" || decimals === "00") {
            // eslint-disable-next-line prettier/prettier
            formattedFloat = html`
                <span class="hidden">.${decimals}</span>
            `
        } else if (decimals.endsWith("0")) {
            // eslint-disable-next-line prettier/prettier
            formattedFloat = html`
                .${decimals.replace("0", "")}<span class="hidden">0</span>
            `
        } else {
            // eslint-disable-next-line prettier/prettier
            formattedFloat = html`
                .${decimals}
            `
        }
    }
    return html`
        ${number}${formattedFloat}
    `
}

/**
 * Format ShowF11 coordinate
 * @param   x - ShowF11 coordinate
 * @returns Formatted ShowF11 coordinate
 */
export const formatF11 = (x: number): string => formatPrefix(x * -1).replace("k", "\u2009k")

/**
 * Format integer
 * @param   x - Integer
 * @returns Formatted Integer
 */
export const formatInt = (x: number): string => formatLocale.format(",d")(x)

// noinspection MagicNumberJS
/**
 * Format truncated integer
 * @param   x - Integer
 * @returns Formatted Integer
 */
export const formatIntTrunc = (x: number): string => formatLocale.format(",d")(x - 0.5)

/**
 * Format integer with +/- sign
 * @param   x - Integer
 * @returns Formatted Integer
 */
export const formatSignInt = (x: number): string =>
    formatLocale
        .format("+,d")(x)
        .replace("+", "\uFF0B\u200A")

/**
 * Format percentage point
 * @param   x - Integer
 * @returns Formatted percentage point
 */
export const formatPP = (x: number): string =>
    formatLocale
        .format(",.0%")(x)
        .replace("%", "pp")

/**
 * Format integer with SI suffix
 * @param   x - Integer
 * @returns Formatted Integer
 */
export const formatSiInt = (x: number): string =>
    formatLocale
        .format(",.2s")(x)
        .replace(".0", "")
        .replace("M", "\u2009\u1d0d") // LATIN LETTER SMALL CAPITAL M
        .replace("k", "\u2009k")
        .replace("m", "\u2009m")

/**
 * Format currency with SI suffix
 * @param   x - Integer
 * @returns Formatted Integer
 */
export const formatSiCurrency = (x: number): string =>
    formatLocale
        .format("$,.2s")(x)
        .replace(".0", "")
        .replace("M", "\u2009\u1d0d") // LATIN LETTER SMALL CAPITAL M
        .replace("k", "\u2009k")

/**
 * Format percent value
 * @param   x - Percent
 * @param   f - digits following decimal point
 * @returns Formatted percent value
 */
export const formatPercent = (x: number, f = 1): string =>
    formatLocale
        .format(`.${f}%`)(x)
        .replace(".0", "")

/**
 * Format percent value with +/- sign
 * @param   x - Percent
 * @returns Formatted percent value
 */
export const formatSignPercent = (x: number): string =>
    formatLocale
        .format("+.1%")(x)
        .replace(".0", "")
        .replace("+", "\uFF0B\u200A")

/**
 * Format ordinal
 * @param   n - Integer
 * @param   sup - True if superscript tags needed
 * @returns Formatted Ordinal
 */
export function getOrdinal(n: number, sup = true): string {
    const s = ["th", "st", "nd", "rd"]
    // noinspection MagicNumberJS
    const v = n % 100
    // noinspection MagicNumberJS
    const text = s[(v - 20) % 10] || s[v] || s[0]
    return n + (sup ? `<span class="super">${text}</span>` : `${text}`)
}

/**
 * {@link https://github.com/30-seconds/30-seconds-of-code#round}
 * @param   n - number
 * @param   decimals - decimals
 * @returns Rounded number
 */
const round = (n: number, decimals = 0): number => Number(`${Math.round(Number(`${n}e${decimals}`))}e-${decimals}`)

/**
 * Round to thousands
 * @param   x - Integer
 * @returns Rounded input
 */
export const roundToThousands = (x: number): number => round(x, 3)

/**
 * Test if object is empty
 * {@link https://stackoverflow.com/a/32108184}
 * @param   object - Object
 * @returns True if object is empty
 */
export const isEmpty = (object: object): boolean =>
    Object.getOwnPropertyNames(object).length === 0 && object.constructor === Object

/**
 * Compass directions
 */
export const compassDirections = [
    "N",
    "N⅓NE",
    "N⅔NE",
    "NE",
    "E⅔NE",
    "E⅓NE",
    "E",
    "E⅓SE",
    "E⅔SE",
    "SE",
    "S⅔SE",
    "S⅓SE",
    "S",
    "S⅓SW",
    "S⅔SW",
    "SW",
    "W⅔SW",
    "W⅓SW",
    "W",
    "W⅓NW",
    "W⅔NW",
    "NW",
    "N⅔NW",
    "N⅓NW"
]

/**
 * Converts compass direction to correctionValueDegrees
 * @param   compass - Compass direction
 * @returns Degrees
 */
export const compassToDegrees = (compass: string): number => {
    const degree = degreesFullCircle / compassDirections.length
    return compassDirections.indexOf(compass) * degree
}

/**
 * Convert correctionValueDegrees to compass direction
 * (see {@link https://stackoverflow.com/questions/7490660/converting-wind-direction-in-angles-to-text-words})
 * @param   degrees - Degrees
 * @returns Compass direction
 */
export const degreesToCompass = (degrees: number): string => {
    const ticks = degreesFullCircle / compassDirections.length
    // noinspection MagicNumberJS
    const value = Math.floor(degrees / ticks + 0.5)
    return compassDirections[value % compassDirections.length]
}

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
export const displayCompassAndDegrees = (wind: string, svg = false): string => {
    let compass
    let degrees

    if (Number.isNaN(Number(wind))) {
        compass = wind
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
 * Test if Number is between two unordered Numbers
 * (see {@link https://stackoverflow.com/questions/14718561/how-to-check-if-a-number-is-between-two-values})
 * @param   value - Value to be tested
 * @param   a - Upper/lower bound
 * @param   b - Upper/lower bound
 * @param   inclusive - True if bounds are inclusive
 * @returns True if value is between a and b
 */
export const between = (value: number, a: number, b: number, inclusive: boolean): boolean => {
    // eslint-disable-next-line no-useless-call
    const min = Math.min.apply(Math, [a, b])
    // eslint-disable-next-line no-useless-call
    const max = Math.max.apply(Math, [a, b])

    return inclusive ? value >= min && value <= max : value > min && value < max
}

/**
 * Convert radians to correctionValueDegrees (see {@link http://cwestblog.com/2012/11/12/javascript-degree-and-radian-conversion/})
 * @param   radians - Radians
 * @returns Degrees
 */
export const radiansToDegrees = (radians: number): number => (radians * degreesHalfCircle) / Math.PI

/**
 * Convert correctionValueDegrees to radians
 * @param   degrees - Degrees
 * @returns Radians
 */
export const degreesToRadians = (degrees: number): number =>
    (Math.PI / degreesHalfCircle) * (degrees - degreesQuarterCircle)

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
 * Calculate the distance between two points
 * see {@link https://www.mathsisfun.com/algebra/distance-2-points.html}
 * @param   centerPt - Center point
 * @param   targetPt - Target point
 * @returns Distance between centerPt and targetPt
 */
export const distancePoints = (centerPt: Coordinate, targetPt: Coordinate): number =>
    Math.sqrt((centerPt.x - targetPt.x) ** 2 + (centerPt.y - targetPt.y) ** 2)

/**
 * Calculate the closest power of 2
 * (see {@link https://bocoup.com/blog/find-the-closest-power-of-2-with-javascript})
 * @param   aSize - Input
 * @returns Closest power of 2 of aSize
 */
export const nearestPow2 = (aSize: number): number => 2 ** Math.round(Math.log2(aSize))

/**
 * {@link https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript}
 * @param   string - String
 * @returns Uppercased string
 */
export const capitalizeFirstLetter = (string: string): string => string.charAt(0).toUpperCase() + string.slice(1)

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
    radius
}: {
    element: Selection<BaseType, unknown, HTMLElement, any>
    radius: number
}): void => {
    const steps = numberSegments
    const degreesPerStep = degreesFullCircle / steps
    // noinspection MagicNumberJS
    const innerRadius = Math.round(radius * 0.8)
    const strokeWidth = 3
    const data = new Array(steps).fill(null).map((e, i) => degreesToCompass(i * degreesPerStep))
    const xScale = d3ScaleBand()
        .range([0 - degreesPerStep / 2, degreesFullCircle - degreesPerStep / 2])
        .domain(data)
        .align(0)

    element
        .append("circle")
        .attr("r", innerRadius)
        .style("stroke-width", `${strokeWidth}px`)

    const dummy = element.append("text")

    // Cardinal and intercardinal winds
    const label = element
        .selectAll("g")
        .data(data)
        .join(enter =>
            enter
                .append("g")
                .attr(
                    "transform",
                    d =>
                        `rotate(${Math.round(
                            (xScale(d) ?? 0) + xScale.bandwidth() / 2 - degreesQuarterCircle
                        )})translate(${innerRadius},0)`
                )
        )

    label
        .filter((d, i) => i % 3 !== 0)
        .append("line")
        .attr("x2", 9)

    label
        .filter((d, i) => i % 3 === 0)
        .append("text")
        .attr("transform", d => {
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
        .text(d => d)

    dummy.remove()
}

/**
 * Print small compass
 * @param   element - Element to append compass
 * @param   radius - Radius
 */
export const printSmallCompassRose = ({
    element,
    radius
}: {
    element: Selection<BaseType, unknown, HTMLElement, any>
    radius: number
}): void => {
    const steps = numberSegments
    const degreesPerStep = degreesFullCircle / steps
    const innerRadius = Math.round(radius * 0.8)
    const strokeWidth = 1.5
    const data = new Array(steps).fill(null).map((e, i) => degreesToCompass(i * degreesPerStep))
    const xScale = d3ScaleBand()
        .range([0 - degreesPerStep / 2, degreesFullCircle - degreesPerStep / 2])
        .domain(data)
        .align(0)

    element
        .append("circle")
        .attr("r", innerRadius)
        .style("stroke-width", `${strokeWidth}px`)

    // Ticks
    const x2 = 2
    const x2InterCard = 4
    const x2Card = 6
    element
        .selectAll("line")
        .data(data)
        .join(enter =>
            enter
                .append("line")
                .attr("x2", (d, i) => {
                    if (i % 3 === 0) {
                        return i % 6 === 0 ? x2Card : x2InterCard
                    }

                    return x2
                })
                .attr(
                    "transform",
                    d => `rotate(${Math.round((xScale(d) ?? 0) + xScale.bandwidth() / 2)})translate(${innerRadius},0)`
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
 * @returns Success
 */
const copyToClipboardFallback = (text: string): boolean => {
    // console.log("copyToClipboardFallback");
    if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        const input = document.createElement("input")

        input.type = "text"
        input.value = text
        input.style = "position: absolute; left: -1000px; top: -1000px"
        this._modal$.append(input)
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
        .catch(error => {
            console.error(`Cannot copy ${text} to clipboard`, error)
            return false
        })
}

/**
 * Copy to clipboard (clipboard API)
 * @param text - String
 */
export const copyToClipboard = (text: string): void => {
    if (!navigator.clipboard) {
        copyToClipboardFallback(text)
    }

    writeClipboard(text)
}

/**
 * Copy F11 coordinates to clipboard
 * @param x - X Coordinate
 * @param z - Z Coordinate
 */
export const copyF11ToClipboard = (x: number, z: number): void => {
    if (Number.isFinite(x) && Number.isFinite(z)) {
        const F11Url = new URL(window.location.href)

        F11Url.searchParams.set("x", String(x))
        F11Url.searchParams.set("z", String(z))

        copyToClipboard(F11Url.href)
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
    element: Selection<GElement, OldDatum, HTMLElement, any>,
    colourScale,
    steps = 512
): void => {
    const height = 50
    const width = element.node().clientWidth
    const canvas = element
        .insert("canvas")
        .attr("width", width)
        .attr("height", height)
    const context = canvas.node()?.getContext("2d")
    canvas.style.imageRendering = "pixelated"

    const min = colourScale.domain()[0]
    const max = colourScale.domain()[colourScale.domain().length - 1]
    const step = (max - min) / steps
    const stepWidth = width / steps
    let x = 0
    for (let currentStep = min; currentStep < max; currentStep += step) {
        context.fillStyle = colourScale(currentStep)
        context.fillRect(x, 0, stepWidth, height)
        x += stepWidth
    }
}

export const drawSvgCircle = (x: number, y: number, r: number): string =>
    `M${x},${y} m${-r},0 a${r},${r} 0,1,0 ${r * 2},0 a${r},${r} 0,1,0 ${-r * 2},0`
export const drawSvgRect = (x: number, y: number, r: number): string => `M${x - r / 2},${y - r / 2}h${r}v${r}h${-r}z`
export const drawSvgLine = (x: number, y: number, l: number): string => `M${x},${y}v${l}`
