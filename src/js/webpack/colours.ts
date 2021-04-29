// noinspection ES6PreferShortImport

import sass from "sass"
import parseCss, { Declaration, Rule } from "css"
// eslint-disable-next-line unicorn/prefer-node-protocol
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
        (parsedCss.stylesheet?.rules.filter((rule: Rule) =>
            rule.selectors?.[0].startsWith(".colour-palette ")
        ) as Rule[])
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
export const backgroundColour = colours.get("primary-500") ?? "#e11"
export const themeColour = colours.get("secondary-500") ?? "#e11"
export const colourYellowDark = colours.get("yellow-dark") ?? "#e11"
export const primary700 = colours.get("primary-700") ?? "#e11"
export const primary200 = colours.get("primary-200") ?? "#e11"
export const primary300 = colours.get("primary-300") ?? "#e11"
export const colourGreen = colours.get("green") ?? "#e11"
export const colourGreenLight = colours.get("green-light") ?? "#e11"
export const colourGreenDark = colours.get("green-dark") ?? "#e11"
export const colourRed = colours.get("red") ?? "#e11"
export const colourRedLight = colours.get("red-light") ?? "#e11"
export const colourRedDark = colours.get("red-dark") ?? "#e11"
export const colourWhite = colours.get("white") ?? "#e11"
export const colourLight = colours.get("light") ?? "#e11"
