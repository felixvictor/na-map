/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file - select ship.
 * @module    game-tools/compare-ships/compare-ships/select-ship
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { group as d3Group } from "d3-array"
import { select as d3Select } from "d3-selection"

import { sortBy } from "common/common"
import { isImported, stripShipName } from "common/common-game-tools"
import { getOrdinal } from "common/common-math"

import { ShipColumnType } from "./index"
import { ShipColumnTypeList, ShipSelectData, ShipSelectMap } from "compare-ships"
import { HtmlString } from "common/interface"
import { ShipData } from "common/gen-json"

import Select from "util/select"

export default class SelectShip extends Select {
    #select$ = {} as ShipColumnTypeList<JQuery<HTMLSelectElement>>
    #selectData = {} as ShipSelectMap[]

    readonly #shipData: ShipData[]

    constructor(id: HtmlString, shipData: ShipData[]) {
        super(id)

        this.#shipData = shipData

        this._setupSelectData()
    }

    /**
     * Setup data (group by class)
     */
    _setupSelectData(): void {
        this.#selectData = [...d3Group(this.#shipData, (ship) => ship.class)]
            .map(([key, value]) => ({
                key,
                values: value
                    .map(
                        (ship) =>
                            ({
                                id: ship.id,
                                name: ship.name,
                                class: ship.class,
                                battleRating: ship.battleRating,
                                guns: ship.guns.total,
                            } as ShipSelectData)
                    )
                    .sort(sortBy(["name"])),
            }))
            .sort(sortBy(["key"]))
    }

    _injectSelects(id: HtmlString, columnId: string): void {
        const select = d3Select(`#${super.baseId}-${columnId} .input-group label select`)

        select.attr("name", id).attr("id", this.getSelectId(columnId))
    }

    _getShipOptions(): HtmlString {
        return this.#selectData
            .map(
                (key) =>
                    `<optgroup label="${getOrdinal(Number(key.key), false)} rate">${key.values
                        .map(
                            (ship) =>
                                `<option data-subtext="${ship.battleRating}${
                                    isImported(ship.name) ? " Imported" : ""
                                }" value="${ship.id}">${stripShipName(ship.name)} (${ship.guns})</option>`
                        )
                        .join("")}</optgroup>`
            )
            .join("")
    }

    getSelectId(columnId: ShipColumnType): HtmlString {
        return `${super.baseId}-${columnId}-select`
    }

    getSelect$(columnId: ShipColumnType): JQuery<HTMLSelectElement> {
        return this.#select$[columnId]
    }

    enableSelect(columnId: string): void {
        Select.enable(this.#select$[columnId])
    }

    getSelectedValue(columnId: ShipColumnType): string | number | string[] | undefined {
        return this.#select$[columnId].val()
    }

    setup(columnId: ShipColumnType): void {
        const id = this.getSelectId(columnId)

        this._injectSelects(id, columnId)
        this.#select$[columnId] = $(`#${id}`)
        const options = this._getShipOptions()
        this.#select$[columnId].append(options)
        if (columnId !== "base") {
            Select.disable(this.#select$[columnId])
        }
    }
}
