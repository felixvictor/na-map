/**
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-node
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

export interface StringIdedObject {
    Id: string
    [key: string]: string | number | object | []
}

/**
 * Clean API name
 */
export const cleanName = (name: string): string =>
    name
        .replace(/u([\da-f]{4})/gi, match => String.fromCharCode(parseInt(match.replace(/u/g, ""), 16)))
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
export const simpleSort = (a: string | undefined, b: string | undefined): number => (a && b ? a.localeCompare(b) : 0)

/**
 * Sort of Id a and b as numbers
 */

export const sortId = ({ Id: a }: StringIdedObject, { Id: b }: StringIdedObject): number => Number(a) - Number(b)

/**
 * Sort by a list of properties (in left-to-right order)
 */
export const sortBy = (properties: string[]) => <T>(a: { [index: string]: T }, b: { [index: string]: T }): number => {
    let r = 0
    properties.some((property: string) => {
        let sign = 1

        // property starts with '-' when sort is descending
        if (property.startsWith("-")) {
            sign = -1
            property = property.slice(1)
        }

        if (a[property] < b[property]) {
            r = -sign
        } else if (a[property] > b[property]) {
            r = sign
        }

        return r !== 0
    })

    return r
}
