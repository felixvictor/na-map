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
import { MinMax, WoodTypeList } from "compare-woods"
import { WoodType } from "./index"

export class WoodData {
    #baseId: HtmlString
    #defaultWoodId = {} as WoodTypeList<number>
    #frameSelectData = {} as WoodTrimOrFrame[]
    #minMaxProperty: Map<string, MinMax> = new Map()
    #options = {} as WoodTypeList<HtmlString>
    #propertyNames = {} as Set<string>
    #trimSelectData = {} as WoodTrimOrFrame[]
    #woodJsonData = {} as WoodJsonData

    constructor(id: HtmlString) {
        this.#baseId = id
    }

    get defaultWoodId(): WoodTypeList<number> {
        return this.#defaultWoodId
    }

    get propertyNames(): Set<string> {
        return this.#propertyNames
    }

    get options(): WoodTypeList<HtmlString> {
        return this.#options
    }

    get woodJsonData(): WoodJsonData {
        return this.#woodJsonData
    }

    findWoodId(type: WoodType, woodName: string): number {
        return this.#woodJsonData[type].find((wood) => wood.name === woodName)?.id ?? 0
    }

    getMaxProperty(key: string): number {
        return this.#minMaxProperty.get(key)?.max ?? 1
    }

    getMinProperty(key: string): number {
        return this.#minMaxProperty.get(key)?.min ?? 1
    }

    getWoodName(type: WoodType, woodId: number): string {
        return this.#woodJsonData[type].find((wood) => wood.id === woodId)?.name ?? ""
    }

    getWoodTypeData(type: WoodType, woodId: number): WoodTrimOrFrame {
        return this.#woodJsonData[type].find((wood) => wood.id === woodId) ?? ({} as WoodTrimOrFrame)
    }

    _setupData(): void {
        this.#propertyNames = new Set<string>(
            [
                ...this.#woodJsonData.frame.flatMap((frame) => frame.properties.map((property) => property.modifier)),
                ...this.#woodJsonData.trim.flatMap((trim) => trim.properties.map((property) => property.modifier)),
            ].sort(simpleStringSort)
        )

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

    _setupOption(): void {
        this.#frameSelectData = this.#woodJsonData.frame.sort(sortBy(["name"]))
        this.#trimSelectData = this.#woodJsonData.trim.sort(sortBy(["name"]))
        this.#options = {
            frame: this.#frameSelectData.map((wood) => `<option value="${wood.id}">${wood.name}</option>`).toString(),
            trim: this.#trimSelectData.map((wood) => `<option value="${wood.id}">${wood.name}</option>`).toString(),
        }
    }

    _setupMinMax(): void {
        for (const propertyName of this.#propertyNames) {
            const frames = [
                ...this.#woodJsonData.frame.map(
                    (frame) => frame.properties.find((modifier) => modifier.modifier === propertyName)?.amount ?? 0
                ),
            ]
            const trims = [
                ...this.#woodJsonData.trim.map(
                    (trim) => trim.properties.find((modifier) => modifier.modifier === propertyName)?.amount ?? 0
                ),
            ]
            const minFrames = d3Min(frames) ?? 0
            const maxFrames = d3Max(frames) ?? 0
            const minTrims = d3Min(trims) ?? 0
            const maxTrims = d3Max(trims) ?? 0
            this.#minMaxProperty.set(propertyName, {
                min: Math.min(0, minFrames + minTrims),
                max: maxFrames + maxTrims,
            })
        }
    }

    _setupSelectData(): void {
        this._setupOption()
        this._setupMinMax()
    }

    async _loadAndSetupData(): Promise<void> {
        this.#woodJsonData = (
            await import(/* webpackChunkName: "data-woods" */ "../../../../../lib/gen-generic/woods.json")
        ).default as WoodJsonData
        this._setupData()
        this._setupSelectData()
    }

    async init(): Promise<void> {
        await this._loadAndSetupData()
    }
}
