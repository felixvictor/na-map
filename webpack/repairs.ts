// noinspection ES6PreferShortImport

import { readJson } from "../src/js/common/common-file"
import { dirGenGeneric } from "./dir"

interface Repair {
    percent: number
    time: number
    volume: number
}
type RepairList = Record<string, Repair>

export const repairs: RepairList = readJson(`${dirGenGeneric}/repairs.json`)
