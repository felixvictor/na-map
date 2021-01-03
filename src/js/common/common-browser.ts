/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for browser.
 * @module    src/node/common-browser
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection"

import { degreesFullCircle } from "./common-math"
import { BaseModalPure, DataSource } from "./interface"

// eslint-disable-next-line one-var
declare const CGREEN: string,
    CGREENDARK: string,
    CGREENLIGHT: string,
    CPRIMARY300: string,
    CRED: string,
    CREDDARK: string,
    CREDLIGHT: string,
    CWHITE: string,
    DESCRIPTION: string,
    NAME: string,
    TITLE: string,
    VERSION: string,
    ICONSMALL: string

export const appDescription = DESCRIPTION
export const appName = NAME
export const appTitle = TITLE
export const appVersion = VERSION

export const colourGreen = CGREEN
export const colourGreenDark = CGREENDARK
export const colourGreenLight = CGREENLIGHT
export const colourRed = CRED
export const colourRedDark = CREDDARK
export const colourRedLight = CREDLIGHT
export const colourWhite = CWHITE

export const iconSmallSrc = ICONSMALL
export const primary300 = CPRIMARY300

export const numberSegments = 24
export const segmentRadians = (2 * Math.PI) / numberSegments

export const circleRadiusFactor = 5
const secondsForFullCircle = 2935 // 48 * 60 + 55
export const degreesPerSecond = degreesFullCircle / secondsForFullCircle

// old: http://tools.medialab.sciences-po.fr/iwanthue/
// new: http://phrogz.net/css/distinct-colors.html
// noinspection CssConvertColorToRgbInspection
export const colourList = [
    "#f23d3d",
    "#806060",
    "#8c3f23",
    "#f2c6b6",
    "#bf7c30",
    "#ffd580",
    "#403a30",
    "#73621d",
    "#9da67c",
    "#ace639",
    "#165916",
    "#b6f2be",
    "#39e67e",
    "#30bfb6",
    "#0d3330",
    "#5395a6",
    "#3db6f2",
    "#397ee6",
    "#334766",
    "#404080",
    "#c6b6f2",
    "#7033cc",
    "#39134d",
    "#e63df2",
    "#40303d",
    "#f279ca",
    "#802053",
    "#d93662",
    "#330d12",
    "#f2b6be",
]

/**
 * Enable nested dropdowns in navbar
 * {@link https://github.com/bootstrapthemesco/bootstrap-4-multi-dropdown-navbar}
 * @param id - nav-item id
 */
export const initMultiDropdownNavbar = (id: string): void => {
    $(`#${id} .dropdown-menu .bootstrap-select .dropdown-toggle`).on("click", (event) => {
        const element = $(event.currentTarget)
        element.next(".dropdown-menu").toggleClass("show")
        element.parent("li").toggleClass("show")
        element.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown", (event2) => {
            $(event2.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")
        })

        return false
    })

    $(`#${id} div.dropdown.bootstrap-select`).on("hidden", (event) => {
        // hide any open menus when parent closes
        $(event.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")
    })
}

/**
 * Insert bootstrap modal
 * @param id - Modal id
 * @param title - Modal title
 * @param size - Modal size, "xl" (default)
 * @param buttonText - Button text, "Close" (default)
 */
export const insertBaseModal = ({ id, title, size = "modal-xl", buttonText = "Close" }: BaseModalPure): void => {
    const modal = d3Select("#modal-section")
        .append("div")
        .attr("id", id)
        .attr("class", "modal")
        .attr("tabindex", "-1")
        .attr("role", "dialog")
        .attr("aria-labelledby", `title-${id}`)
        .attr("aria-hidden", "true")
        .append("div")
        .attr("class", `modal-dialog ${size}`)
        .attr("role", "document")

    const content = modal.append("div").attr("class", "modal-content")

    const header = content.append("header").attr("class", "modal-header")
    header.append("h5").attr("class", "modal-title").attr("id", `title-${id}`).html(title)

    content.append("div").attr("class", "modal-body")

    const footer = content.append("footer").attr("class", "modal-footer")
    footer
        .append("button")
        .text(buttonText)
        .attr("type", "button")
        .attr("class", "btn btn-secondary")
        .attr("data-dismiss", "modal")
}

export const pluralise = (number: number, word: string): string => `${number} ${word + (number === 1 ? "" : "s")}`

export const loadJsonFiles = async <T>(dataSources: DataSource[], readData: T): Promise<void> => {
    for await (const dataSource of dataSources) {
        readData[dataSource.name as keyof T] = await loadJsonFile(dataSource.fileName)
    }
}

class FetchError extends Error {
    private readonly response: Response
    constructor(response: Response) {
        super(`${response.url} ${response.statusText} (status ${response.status})`)
        this.name = "Fetch error"
        this.response = response
    }
}

const dataDirectory = "data"

export const loadJsonFile = async <T>(fileName: string): Promise<T> => {
    const response = await fetch(`${dataDirectory}/${fileName}`)

    if (!response.ok) {
        throw new FetchError(response)
    }

    return response.json()
}

export const showCursorWait = (): void => {
    document.body.style.cursor = "wait"
}

export const showCursorDefault = (): void => {
    document.body.style.cursor = "default"
}

/**
 * {@link https://stackoverflow.com/a/43593634}
 */
export class TupleKeyMap<K, V> extends Map {
    private readonly map = new Map<string, V>()

    set(key: K, value: V): this {
        this.map.set(JSON.stringify(key), value)
        return this
    }

    get(key: K): V | undefined {
        return this.map.get(JSON.stringify(key))
    }

    clear(): void {
        this.map.clear()
    }

    delete(key: K): boolean {
        return this.map.delete(JSON.stringify(key))
    }

    has(key: K): boolean {
        return this.map.has(JSON.stringify(key))
    }

    get size(): number {
        return this.map.size
    }

    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: unknown): void {
        this.map.forEach((value, key) => {
            callbackfn.call(thisArg, value, JSON.parse(key), this)
        })
    }
}

/**
 * {@link https://stackoverflow.com/a/54662026}
 * @param id - Id
 */
export const getCanvasElementById = (id: string): HTMLCanvasElement => {
    const canvas = document.querySelector(id)

    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new TypeError(
            `The element of id "${id}" is not a HTMLCanvasElement. Make sure a <canvas id="${id}""> element is present in the document.`
        )
    }

    return canvas
}

/**
 * {@link https://stackoverflow.com/a/54662026}
 * @param canvas - Canvas
 */
export const getCanvasRenderingContext2D = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
    const context = canvas.getContext("2d")

    if (context === null) {
        throw new Error("This browser does not support 2-dimensional canvas rendering contexts.")
    }

    return context
}
