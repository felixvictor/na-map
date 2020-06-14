/*!
 * This file is part of na-map.
 *
 * @file      List cannons.
 * @module    game-tools/list-cannons
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/tab"
import "bootstrap/js/dist/modal"

import { h, render } from "preact"
import htm from "htm"
import Tablesort from "tablesort"

import { registerEvent } from "../analytics"
import { CannonType, cannonType, capitalizeFirstLetter, putImportError } from "../../common/common";
import { HtmlString, initTablesort } from "../../common/common-browser"
import { Cannon, CannonEntity, CannonValue } from "../../common/gen-json"
import { BaseModalHtml, formatFloatFixedHTML, HtmlResult, getBaseModalHTML } from "../../common/common-game-tools"

type GroupKey = string
type GroupData = { values: string; count?: number }
type GroupObject = [GroupKey, GroupData]
type GroupMap = Map<GroupKey, GroupData>

const html = htm.bind(h)

/**
 *
 */
export default class ListCannons {
    private _cannonData: Cannon = {} as Cannon
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _modalId: HtmlString
    private _groups!: GroupMap

    constructor() {
        this._groups = new Map()

        this._baseName = "List cannons"
        this._baseId = "cannon-list"
        this._buttonId = `button-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        try {
            const cannonData = (await import(/* webpackChunkName: "data-cannons" */ "Lib/gen-generic/cannons.json"))
                .default as Cannon
            this._setupData(cannonData)
        } catch (error) {
            putImportError(error)
        }
    }

    _setupData(cannonData: Cannon): void {
        for (const group of cannonData.long) {
            for (const [key, value] of Object.entries(group)) {
                if (key !== "name") {
                    this._groups.set(key, { values: value, count: Object.entries(value).length } as GroupData)
                }
            }
        }

        // Sort data and groups (for table header)
        const groupOrder = ["name", "damage", "penetration", "dispersion", "traverse", "generic"]
        for (const type of cannonType) {
            this._cannonData[type] = cannonData[type].map(
                (cannon: CannonEntity): CannonEntity =>
                    // @ts-expect-error
                    Object.keys(cannon)
                        .sort((a, b) => groupOrder.indexOf(a) - groupOrder.indexOf(b))
                        // @ts-expect-error
                        .reduce((r: CannonEntity, k) => ((r[k] = cannon[k]), r), {}) // eslint-disable-line no-return-assign,no-sequences,unicorn/no-reduce
            )
        }

        this._groups = new Map(
            [...this._groups.entries()].sort((a, b) => groupOrder.indexOf(a[0]) - groupOrder.indexOf(b[0]))
        )
    }

    _setupListener(): void {
        let firstClick = true
        ;(document.querySelector(`#${this._buttonId}`) as HTMLElement)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)

            this._cannonListSelected()
        })
    }

    _getList(type: CannonType): HtmlResult {
        const getColumnGroupHeads = (groupValue: GroupObject): HtmlResult => html`
            <th scope="col" class="text-center" colspan="${groupValue[1].count}">
                ${capitalizeFirstLetter(groupValue[0])}
            </th>
        `

        const getColumnHeads = (groupValue: GroupObject): HtmlResult => html`
            ${Object.entries(groupValue[1].values).map(
                (modifierValue) => html`<th class="text-right">${capitalizeFirstLetter(modifierValue[0])}</th>`
            )}
        `

        const getRowHead = (name: string): HtmlResult => {
            let nameConverted: HtmlResult | string = name
            const nameSplit = name.split(" ")
            const sortPre = `c${nameSplit[0].padStart(3, "0")}`
            const sortPost = nameSplit[1] ? nameSplit[1][1] : "0"

            if (nameSplit.length > 1) {
                nameConverted = html`${nameSplit[0]} <em>${nameSplit[1]}</em>`
            }

            return html`
                <td class="text-right" data-sort="${sortPre}${sortPost}">
                    ${nameConverted}
                </td>
            `
        }

        const getRow = (cannon: CannonEntity): HtmlResult => html`
            ${Object.entries(cannon).map((groupValue): HtmlResult | HtmlResult[] => {
                if (groupValue[0] === "name") {
                    return html``
                }

                return Object.entries<CannonValue>(groupValue[1]).map(
                    (modifierValue) =>
                        html`
                            <td class="text-right" data-sort="${modifierValue[1].value ?? 0}">
                                ${modifierValue[1]
                                    ? formatFloatFixedHTML(modifierValue[1].value, modifierValue[1].digits ?? 0)
                                    : ""}
                            </td>
                        `
                )
            })}
        `

        return html`
            <table id="table-${this._baseId}-${type}-list" class="table table-sm small tablesort na-table">
                <thead>
                    <tr class="thead-group">
                        <th scope="col" class="border-bottom-0"></th>
                        ${[...this._groups].forEach((groupValue) => getColumnGroupHeads(groupValue))}
                    </tr>
                    <tr data-sort-method="thead">
                        <th scope="col" class="text-right border-top-0" data-sort-default>Lb</th>
                        ${[...this._groups].forEach((groupValue) => getColumnHeads(groupValue))}
                    </tr>
                </thead>
                <tbody>
                    ${/*
            repeat(
                        // @ts-expect-error
                        this._cannonData[type],
                        (cannon: CannonEntity) => cannon.name,
                        (cannon: CannonEntity) => {
                            return html`
                                <tr>
                                    ${getRowHead(cannon.name)}${getRow(cannon)}
                                </tr>
                            `
                        }
                    )
            */
                    this._cannonData[type].forEach((cannon: CannonEntity) => {
                        return html`
                            <tr>
                                ${getRowHead(cannon.name)}${getRow(cannon)}
                            </tr>
                        `
                    })}
                </tbody>
            </table>
        `
    }

    _getModalBody(): HtmlResult {
        return html`
            <ul class="nav nav-pills" role="tablist">
                ${/*
            repeat(
                                 Object.keys(this._cannonData),
                    (type: string): string => type,
                    (type, index) =>
                        html`
                            <li class="nav-item">
                                <a
                                    class="nav-link${index === 0 ? " active" : ""}"
                                    id="tab-${this._baseId}-${type}"
                                    data-toggle="tab"
                                    href="#tab-content-${this._baseId}-${type}"
                                    role="tab"
                                    aria-controls="home"
                                    aria-selected="true"
                                    >${capitalizeFirstLetter(type)}</a
                                >
                            </li>
                        `
                )
            */
                cannonType.forEach(
                    (type, index) =>
                        html`
                            <li class="nav-item">
                                <a
                                    class="nav-link${index === 0 ? " active" : ""}"
                                    id="tab-${this._baseId}-${type}"
                                    data-toggle="tab"
                                    href="#tab-content-${this._baseId}-${type}"
                                    role="tab"
                                    aria-controls="home"
                                    aria-selected="true"
                                    >${capitalizeFirstLetter(type)}</a
                                >
                            </li>
                        `
                )}
            </ul>
            <div class="tab-content pt-2">
                ${/*
            repeat(
            
                    Object.keys(this._cannonData),
                    (type: string): string => type,
                    (type, index) =>
                        html`
                            <div
                                class="tab-pane fade${index === 0 ? " show active" : ""}"
                                id="tab-content-${this._baseId}-${type}"
                                role="tabpanel"
                                aria-labelledby="tab-${this._baseId}-${type}"
                            >
                                <div id="${type}-list">
                                    ${this._getList(type)}
                                </div>
                            </div>
                        `
                )
                */
                cannonType.forEach(
                    (type, index) =>
                        html`
                            <div
                                class="tab-pane fade${index === 0 ? " show active" : ""}"
                                id="tab-content-${this._baseId}-${type}"
                                role="tabpanel"
                                aria-labelledby="tab-${this._baseId}-${type}"
                            >
                                <div id="${type}-list">
                                    ${this._getList(type)}
                                </div>
                            </div>
                        `
                )}
            </div>
        `
    }

    _getModalFooter(): HtmlResult {
        return html`
            <button type="button" class="btn btn-secondary" data-dismiss="modal">
                Close
            </button>
        `
    }

    _injectModal(): void {
        render(
            getBaseModalHTML({
                id: this._modalId,
                title: this._baseName,
                body: this._getModalBody.bind(this),
                footer: this._getModalFooter,
            } as BaseModalHtml),
            document.querySelector("#modal-section") as HTMLElement
        )

        for (const type of cannonType) {
            const table = document.querySelector(`#table-${this._baseId}-${type}-list`) as HTMLTableElement
            if (table) {
                // @ts-expect-error
                void new Tablesort(table)
            }
        }
    }

    _initModal(): void {
        initTablesort()
        this._injectModal()
    }

    _cannonListSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`).modal("show")
    }
}
