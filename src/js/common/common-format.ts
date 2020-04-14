/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/common-format
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { formatLocale as d3FormatLocale } from "d3-format"
import { html, TemplateResult } from "lit-html"

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
    formatLocale.format(`+,.${s}~r`)(x).replace("+", "\uFF0B\u200A")

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
    const [number, decimals] = formatLocale.format(`.${f}f`)(x).split(".")
    let formattedFloat: TemplateResult = html` ${decimals} `

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

    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return html`${number}${formattedFloat}`
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
export const formatSignInt = (x: number): string => formatLocale.format("+,d")(x).replace("+", "\uFF0B\u200A")

/**
 * Format percentage point
 * @param   x - Integer
 * @returns Formatted percentage point
 */
export const formatPP = (x: number): string => formatLocale.format(",.0%")(x).replace("%", "pp")

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
export const formatPercent = (x: number, f = 1): string => formatLocale.format(`.${f}%`)(x).replace(".0", "")

/**
 * Format percent value with +/- sign
 * @param   x - Percent
 * @returns Formatted percent value
 */
export const formatSignPercent = (x: number): string =>
    formatLocale.format("+.1%")(x).replace(".0", "").replace("+", "\uFF0B\u200A")
