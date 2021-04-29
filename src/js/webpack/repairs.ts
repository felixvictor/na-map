// noinspection ES6PreferShortImport

import { readJson } from "../common/common-file"
import { dirLib } from "./dir"

interface Repair {
    percent: number
    time: number
    volume: number
}
type RepairList = Record<string, Repair>

export const repairs: RepairList = readJson(`${dirLib}/gen-generic/repairs.json`)
