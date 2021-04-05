/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for browser.
 * @module    src/node/common-browser
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="webpack-env" />

import { select as d3Select } from "d3-selection"

import { degreesFullCircle } from "./common-math"
import { BaseModalPure, DataSource, HtmlString } from "./interface"
import { NationListAlternative } from "common/gen-json"
import { findNationByNationShortName } from "common/common"

// eslint-disable-next-line one-var
declare const CGREEN: string,
    CGREENDARK: string,
    CGREENLIGHT: string,
    CLIGHT: string,
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
export const colourLight = CLIGHT
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

export const nationColourList = [
    "#ffffff", // Neutral
    "#111111", // Pirates
    "#f1bf00", // España
    "#0039a6", // France
    "#cf142b", // Great Britain
    "#21468b", // Verenigde Provinciën
    "#ac0234", // Danmark-Norge
    "#006aa7", // Sverige
    "#bf0a30", // United States
    "#aaa", // Free Town
    "#0039a6", // Russian Empire
    "#333", // Kingdom of Prussia
    "#eb001a", // Commonwealth of Poland
    "#fecd21", // China
]

/**
 * Enable nested dropdowns in navbar
 * {@link https://stackoverflow.com/a/66470962}
 */
export const initMultiDropdownNavbar = (id: string): void => {
    const CLASS_NAME = "has-child-dropdown-show"
    const mainElement = document.querySelector(`#${id}`) as HTMLElement

    // @ts-expect-error
    bootstrap.Dropdown.prototype.toggle = (function (_original) {
        return function () {
            for (const e of document.querySelectorAll(`.${CLASS_NAME}`)) {
                e.classList.remove(CLASS_NAME)
            }

            // @ts-expect-error
            let dd = this._element.closest(".dropdown").parentNode.closest(".dropdown")
            for (; dd && dd !== document; dd = dd.parentNode.closest(".dropdown")) {
                dd.classList.add(CLASS_NAME)
            }

            // @ts-expect-error
            return _original.call(this)
        }
        // @ts-expect-error
    })(bootstrap.Dropdown.prototype.toggle)

    for (const dd of mainElement.querySelectorAll(".dropdown")) {
        dd.addEventListener("hide.bs.dropdown", function (this: HTMLElement, e: Event) {
            if (this.classList.contains(CLASS_NAME)) {
                this.classList.remove(CLASS_NAME)
                e.preventDefault()
            }

            // @ts-expect-error
            if (e.clickEvent?.composedPath().some((el) => el.classList?.contains("dropdown-toggle"))) {
                e.preventDefault()
            }

            e.stopPropagation() // do not need pop in multi level mode
        })
    }
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
        .attr("data-bs-dismiss", "modal")
}

export const pluralise = (number: number, word: string): string => `${number} ${word + (number === 1 ? "" : "s")}`

export const loadJsonFiles = async <T>(dataSources: DataSource[], readData: T): Promise<void> => {
    showCursorWait()

    for await (const dataSource of dataSources) {
        readData[dataSource.name as keyof T] = await loadJsonFile(dataSource.fileName)
    }

    showCursorDefault()
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

/**
 * {@link https://stackoverflow.com/questions/42118296/dynamically-import-images-from-a-directory-using-webpack}
 * @param r - webpack require.context
 * @returns Images
 */
const importAll = (r: __WebpackModuleApi.RequireContext): NationListAlternative<string> => {
    const images = {} as NationListAlternative<string>
    for (const item of r.keys()) {
        images[item.replace("./", "").replace(".svg", "")!] = r(item)
    }

    // Sort by nation
    const sortedImages = Object.fromEntries(
        Object.entries(images).sort(
            ([nation1], [nation2]) =>
                findNationByNationShortName(nation1)!.id - findNationByNationShortName(nation2)!.id
        )
    )
    return sortedImages
}

export const getIcons = (): NationListAlternative<string> => {
    return importAll((require as __WebpackModuleApi.RequireFunction).context("../../images/flags", false, /\.svg$/))
}

export const getElementHeight = (element: HTMLElement | SVGElement): number => {
    const { height } = element.getBoundingClientRect()

    return Math.floor(height)
}

export const getElementWidth = (element: HTMLElement | SVGElement): number => {
    const { width } = element.getBoundingClientRect()

    return Math.floor(width)
}

export const getIdFromBaseName = (baseName: string): HtmlString => baseName.toLocaleLowerCase().replaceAll(" ", "-")
