/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/common-format
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { formatLocale as d3FormatLocale, FormatLocaleDefinition } from "d3-format"
import htm from "htm"
import { h } from "preact"
import { HtmlResult, HtmlString, SVGString } from "./interface"

const html = htm.bind(h)

/**
 * Default format
 */
export const formatLocale = d3FormatLocale({
    decimal: ".",
    thousands: "\u2009",
    grouping: [3],
    currency: ["", "\u00A0reales"],
    percent: "\u202F%",
    minus: "\u2212\u2009",
} as FormatLocaleDefinition)

// noinspection MagicNumberJS
/**
 * format with SI suffix
 */
const formatPrefix = formatLocale.formatPrefix(",.0", 1e3)

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
    formatLocale.format(`+,.${s}~r`)(x).replace("+", "\u002B\u200A")

/**
 * Format float
 * @param   x - Float
 * @param   f - Digits following decimal point
 * @returns Formatted float
 */
export const formatFloatFixed = (x: number, f = 2): HtmlString =>
    formatLocale
        .format(`.${f}f`)(x)
        .replace(".00", '<span class="hidden">.00</span>')
        .replace(/\.(\d)0/g, '.$1<span class="hidden">0</span>')

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
export const formatIntTrunc = (x: number): string => formatLocale.format(",d")(x === 0 ? 0 : x - 0.5)

/**
 * Format integer with +/- sign
 * @param   x - Integer
 * @returns Formatted Integer
 */
export const formatSignInt = (x: number): string => formatLocale.format("+,d")(x).replace("+", "\u002B\u200A")

/**
 * Format percentage point
 * @param   x - Integer
 * @param   f - Digits following decimal point
 * @returns Formatted percentage point
 */
export const formatPP = (x: number, f = 0): string => formatLocale.format(`,.${f}%`)(x).replace("%", "pp")

const mSpan = '<span class="caps">m</span>'
const mTSpan = '<tspan class="caps">m</tspan>'

/**
 * Format integer with SI suffix
 * @param   x - Integer
 * @param svg - True when tspan for SVG needed
 * @returns Formatted Integer
 */
export const formatSiInt = (x: number, svg = false): HtmlString | SVGString =>
    formatLocale
        .format(",.2s")(x)
        .replace(".0", "")
        .replace("k", "\u2009k")
        .replace("m", "\u2009m")
        .replace("M", `\u2009${svg ? mTSpan : mSpan}`)

/**
 * Format integer with SI suffix
 * @param   x - Integer
 * @returns htm formatted integer
 */
export const formatSiIntHtml = (x: number): HtmlResult => {
    const string = formatSiInt(x)

    if (string.endsWith(mSpan)) {
        return html`${string.replace(mSpan, "")}<span class="caps">m</span>`
    }

    return html`${string}`
}

/**
 * Format currency with SI suffix
 * @param   x - Integer
 * @param svg - True when tspan for SVG needed
 * @returns Formatted Integer
 */
export const formatSiCurrency = (x: number, svg = false): HtmlString | SVGString =>
    formatLocale
        .format("$,.2s")(x)
        .replace(".0", "")
        .replace("M", `\u2009${svg ? mTSpan : mSpan}`)
        .replace("k", "\u2009k")

/**
 * Format percent value
 * @param   x - Percent
 * @param   f - digits following decimal point
 * @returns Formatted percent value
 */
export const formatPercent = (x: number, f = 1): string => formatLocale.format(`.${f}%`)(x).replace(".0", "")

/**
 * Format percent value with SI suffix
 * @param   x - Percent
 * @param   s - Significant digits
 * @returns Formatted percent value
 */
export const formatPercentSig = (x: number, s = 1): string => formatLocale.format(`.${s}p`)(x)

/**
 * Format percent value with +/- sign
 * @param   x - Percent
 * @returns Formatted percent value
 */
export const formatSignPercent = (x: number): string =>
    formatLocale.format("+.1%")(x).replace(".0", "").replace("+", "\uFF0B\u200A")
