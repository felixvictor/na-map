import { argv } from "yargs"

export const isProduction = argv.mode === "production"
export const { TARGET, QUIET } = process.env
export const isQuiet = Boolean(QUIET)
