// noinspection ES6PreferShortImport

import path from "path"
import TSCONFIG from "../../../tsconfig.json"
import { getCommonPaths } from "../common/common-dir"

export const commonPaths = getCommonPaths()
export const { dirLib, dirOutput, dirSrc } = commonPaths
export const dirEjs = path.resolve(dirSrc, "ejs")
export const dirFlags = path.resolve(dirSrc, "images", "flags")
export const dirFonts = path.resolve(dirSrc, "fonts")
export const dirIcons = path.resolve(dirSrc, "icons")
export const dirJs = path.resolve(dirSrc, "js")
export const dirMap = path.resolve(dirSrc, "images", "map")
export const dirPrefixIcons = path.join("images", "icons")
export const fileLogo = path.resolve(dirSrc, dirPrefixIcons, "logo.png")
export const filePostcssProdConfig = path.resolve(dirSrc, "postcss.prod.config.js")
export const filePostcssDevConfig = path.resolve(dirSrc, "postcss.dev.config.js")

type AliasPaths = Record<string, string>
export const aliasPaths: AliasPaths = {}

const { baseUrl, paths } = TSCONFIG.compilerOptions
for (const [key, value] of Object.entries(paths)) {
    const basePath = key.replace("/*", "")
    aliasPaths[basePath] = path.resolve("./", baseUrl, value.map((path) => path.replace("/*", ""))[0])
}
