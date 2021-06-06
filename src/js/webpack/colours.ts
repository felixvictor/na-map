// noinspection ES6PreferShortImport

import sass from "sass"
import parseCss, { Declaration, Rule } from "css"
import path from "path"
import { dirSrc } from "./dir"

const fileScssPreCompile = path.resolve(dirSrc, "scss", "pre-compile.scss")
type ColourMap = Map<string, string>

const getColours = (): ColourMap => {
    const compiledCss = sass
        .renderSync({
            file: fileScssPreCompile,
        })
        .css.toString()
    const parsedCss = parseCss.parse(compiledCss)
    return new Map(
        (
            parsedCss.stylesheet?.rules.filter((rule: Rule) =>
                rule.selectors?.[0].startsWith(".colour-palette ")
            ) as Rule[]
        )
            .filter((rule: Rule) =>
                rule?.declarations?.find((declaration: Declaration) => declaration.property === "background-color")
            )
            .map((rule: Rule) => {
                const d = rule?.declarations?.find(
                    (declaration: Declaration) => declaration.property === "background-color"
                ) as Declaration
                return [rule.selectors?.[0].replace(".colour-palette .", "") ?? "", d.value ?? ""]
            })
    )
}

const colours = getColours()
const defaultColour = "#e11"
export const backgroundColour = colours.get("primary-500") ?? defaultColour
export const themeColour = colours.get("secondary-500") ?? defaultColour
export const colourYellowDark = colours.get("yellow-dark") ?? defaultColour
export const primary700 = colours.get("primary-700") ?? defaultColour
export const primary200 = colours.get("primary-200") ?? defaultColour
export const primary300 = colours.get("primary-300") ?? defaultColour
export const colourGreen = colours.get("green") ?? defaultColour
export const colourGreenLight = colours.get("green-light") ?? defaultColour
export const colourGreenDark = colours.get("green-dark") ?? defaultColour
export const colourRed = colours.get("red") ?? defaultColour
export const colourRedLight = colours.get("red-light") ?? defaultColour
export const colourRedDark = colours.get("red-dark") ?? defaultColour
export const colourWhite = colours.get("white") ?? defaultColour
export const colourLight = colours.get("light") ?? defaultColour
