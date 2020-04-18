/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-node
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/**
 * Clean API name
 */
export const cleanName = (name: string): string =>
    name
        .replace(/u([\da-f]{4})/gi, (match) => String.fromCharCode(Number.parseInt(match.replace(/u/g, ""), 16)))
        .replace(/'/g, "’")
        .replace(" oak", " Oak")
        .replace(" (S)", "\u202F(S)")
        .trim()

/**
 * Simple sort of strings a and b
 * @param   a - String a
 * @param   b - String b
 * @returns Sort result
 */
export const simpleStringSort = (a: string | undefined, b: string | undefined): number =>
    a && b ? a.localeCompare(b) : 0

/**
 * Simple sort of numbers a and b
 * @param   a - Number a
 * @param   b - Number b
 * @returns Sort result
 */
export const simpleNumberSort = (a: number | undefined, b: number | undefined): number => (a && b ? a - b : 0)

/**
 * Sort by a list of properties (in left-to-right order)
 */
export const sortBy = <T, K extends keyof T>(propertyNames: K[]) => (a: T, b: T): number => {
    let r = 0
    propertyNames.some((propertyName: K) => {
        let sign = 1

        // property starts with '-' when sort is descending
        if (String(propertyName).startsWith("-")) {
            sign = -1
            propertyName = String(propertyName).slice(1) as K
        }

        if (Number.isNaN(Number(a[propertyName])) && Number.isNaN(Number(b[propertyName]))) {
            r = String(a[propertyName]).localeCompare(String(b[propertyName])) * sign
        } else {
            r = Number(a[propertyName]) - Number(b[propertyName]) * sign
        }

        return r !== 0
    })

    return r
}
