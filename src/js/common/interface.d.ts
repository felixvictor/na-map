/*!
 * This file is part of na-map.
 *
 * @file      Common types.
 * @module    interface.d
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { VNode } from "preact"
import { PortBasic, PortBattlePerServer, PortPerServer } from "./gen-json"

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

export type ArrayIndex<T> = T[] & Record<string, T[]>

export type NestedArrayIndex<T> = Record<string, ArrayIndex<T>>

export type Index<T> = Record<string, T>

export type NestedIndex<T> = Record<string, Index<T>>

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

type PortIncome = PortBasic & PortPerServer & PortBattlePerServer
export interface PortJsonData {
    ports: PortBasic[]
    pb: PortBattlePerServer[]
    server: PortPerServer[]
}

export interface PowerMapPerDay {
    0: string
    1: number[]
}
export type PowerMapList = PowerMapPerDay[]
