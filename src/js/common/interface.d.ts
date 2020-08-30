/*!
 * This file is part of na-map.
 *
 * @file      Common types.
 * @module    interface.d
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { VNode } from "preact"

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

export type HtmlResult = VNode<unknown> | Array<VNode<unknown>>

export type SVGString = string
export type HtmlString = string
export interface BaseModal {
    id: HtmlString
    title: HtmlString
    size?: string
}
export interface BaseModalPure extends BaseModal {
    buttonText?: HtmlString
}
/**
 * Lower or upper bound coordinates
 */
export type Bound = [number, number]

export interface BaseModalHtml extends BaseModal {
    body: () => HtmlResult
    footer: () => HtmlResult
}

export type ModifierName = string

export interface DataSource {
    fileName: string
    name: string
}

type ZoomLevel = "initial" | "portLabel" | "pbZone"

type Key = string
export interface HeaderMap {
    group: Map<Key, number>
    element: Set<Key>
}
