/*!
 * This file is part of na-map.
 *
 * @file      Common types.
 * @module    interface.d
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SVGSVGDatum {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SVGGDatum {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DivDatum {}

export interface MinMaxCoord {
    min: number
    max: number
}

export type ArrayIndex<T> = T[] & {
    [index: string]: T[]
}

export type NestedArrayIndex<T> = {
    [index: string]: ArrayIndex<T>
}

export interface Index<T> {
    [index: string]: T
}

export interface NestedIndex<T> {
    [index: string]: Index<T>
}
