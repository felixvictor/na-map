/*!
 * This file is part of na-map.
 *
 * @file      Compare woods data class.
 * @module    game-tools/compare-woods/data
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { max as d3Max, min as d3Min } from "d3-array"

import { simpleStringSort, sortBy } from "common/common"

import { WoodJsonData, WoodTrimOrFrame } from "common/gen-json"
import { HtmlString } from "common/interface"
import { MinMax, WoodDataMap, WoodTypeList } from "compare-woods"
import { WoodType } from "common/types"

export class WoodData {
    #baseId: HtmlString
    #defaultWoodId = {} as WoodTypeList<number>
    #minMaxProperty: Map<string, MinMax> = new Map()
    #options = {} as WoodTypeList<HtmlString>
    #modifierNames = {} as Set<string>
    #woods = {} as WoodDataMap

    constructor(id: HtmlString) {
        this.#baseId = id
    }

    get defaultWoodId(): WoodTypeList<number> {
        return this.#defaultWoodId
    }

    get modifierNames(): Set<string> {
        return this.#modifierNames
    }

    findWoodId(type: WoodType, woodName: string): number {
        return [...this.#woods.entries()].find(([, value]) => value.type === type && value.name === woodName)?.[0] ?? 0
    }

    getMaxProperty(key: string): number {
        return this.#minMaxProperty.get(key)?.max ?? 1
    }

    getMinProperty(key: string): number {
        return this.#minMaxProperty.get(key)?.min ?? 1
    }

    getOptions(type: WoodType): HtmlString {
        return this.#options[type]
    }

    getWoodName(woodId: number): string {
        return this.#woods.get(woodId)?.name ?? ""
    }

    getWoodTypeData(woodId: number): WoodTrimOrFrame {
        return this.#woods.get(woodId) ?? ({} as WoodTrimOrFrame)
    }

    _setupData(woodJsonData: WoodJsonData): void {
        this.#modifierNames = new Set<string>(
            [
                ...woodJsonData.frame.flatMap((frame) => frame.properties.map((property) => property.modifier)),
                ...woodJsonData.trim.flatMap((trim) => trim.properties.map((property) => property.modifier)),
            ].sort(simpleStringSort)
        )

        this.#woods = new Map<number, WoodTrimOrFrame>([
            ...new Map<number, WoodTrimOrFrame>(woodJsonData.frame.map((wood) => [wood.id, wood])),
            ...new Map<number, WoodTrimOrFrame>(woodJsonData.trim.map((wood) => [wood.id, wood])),
        ])

        if (this.#baseId === "compare-woods") {
            this.#defaultWoodId = {
                frame: this.findWoodId("frame", "Fir"),
                trim: this.findWoodId("trim", "Crew Space"),
            }
        } else if (this.#baseId === "ship-journey") {
            this.#defaultWoodId = {
                frame: this.findWoodId("frame", "Oak"),
                trim: this.findWoodId("trim", "Oak"),
            }
        } else {
            this.#defaultWoodId = {
                frame: this.findWoodId("frame", "Oak"),
                trim: this.findWoodId("trim", "Oak"),
            }
        }
    }

    _setupOption(woodJsonData: WoodJsonData): void {
        this.#options = {
            frame: woodJsonData.frame
                .sort(sortBy(["name"]))
                .map((wood) => `<option value="${wood.id}">${wood.name}</option>`)
                .join(""),
            trim: woodJsonData.trim
                .sort(sortBy(["name"]))
                .map((wood) => `<option value="${wood.id}">${wood.name}</option>`)
                .join(""),
        }
    }

    _setupMinMax(woodJsonData: WoodJsonData): void {
        for (const modifierName of this.#modifierNames) {
            const frames = [
                ...woodJsonData.frame.map(
                    (frame) => frame.properties.find((modifier) => modifier.modifier === modifierName)?.amount ?? 0
                ),
            ]
            const trims = [
                ...woodJsonData.trim.map(
                    (trim) => trim.properties.find((modifier) => modifier.modifier === modifierName)?.amount ?? 0
                ),
            ]
            const minFrames = d3Min(frames) ?? 0
            const maxFrames = d3Max(frames) ?? 0
            const minTrims = d3Min(trims) ?? 0
            const maxTrims = d3Max(trims) ?? 0
            this.#minMaxProperty.set(modifierName, {
                min: Math.min(0, minFrames + minTrims),
                max: maxFrames + maxTrims,
            })
        }
    }

    _setupSelectData(woodJsonData: WoodJsonData): void {
        this._setupOption(woodJsonData)
        this._setupMinMax(woodJsonData)
    }

    async _loadAndSetupData(): Promise<void> {
        const woodJsonData = (
            await import(/* webpackChunkName: "data-woods" */ "../../../../../lib/gen-generic/woods.json")
        ).default as WoodJsonData
        this._setupData(woodJsonData)
        this._setupSelectData(woodJsonData)
    }

    async init(): Promise<void> {
        await this._loadAndSetupData()
    }
}
