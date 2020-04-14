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

import { html, render, TemplateResult } from "lit-html"
import { repeat } from "lit-html/directives/repeat"
// import { Tablesort } from "tablesort"

import { registerEvent } from "../analytics"
import { capitalizeFirstLetter, putImportError } from "../../common/common"
import { BaseModalHtml, initTablesort, insertBaseModalHTML } from "../../common/common-browser"
import { formatFloatFixedHTML } from "../../common/common-format"
import { Cannon, CannonEntity } from "../../common/gen-json"

type GroupKey = string
type GroupData = { values: string; count?: number }
type GroupObject = [GroupKey, GroupData]
type GroupMap = Map<GroupKey, GroupData>

const cannonType = ["medium", "long", "carronade"] as const
export type CannonType = typeof cannonType[number]

/**
 *
 */
export default class ListCannons {
    private _cannonData: Cannon = {} as Cannon
    private readonly _baseName: string
    private readonly _baseId: string
    private readonly _buttonId: string
    private readonly _modalId: string
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
                    // @ts-ignore
                    Object.keys(cannon)
                        .sort((a, b) => groupOrder.indexOf(a) - groupOrder.indexOf(b))
                        // @ts-ignore
                        .reduce((r: CannonEntity, k) => ((r[k] = cannon[k]), r), {}) // eslint-disable-line no-return-assign,no-sequences
            )
        }

        this._groups = new Map(
            [...this._groups.entries()].sort((a, b) => groupOrder.indexOf(a[0]) - groupOrder.indexOf(b[0]))
        )
    }

    _setupListener(): void {
        let firstClick = true
        ;(document.querySelector(`#${this._buttonId}`) as HTMLElement)?.addEventListener("click", async (event) => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)
            event.stopPropagation()
            this._cannonListSelected()
        })
    }

    _getList(type: string): TemplateResult {
        const getColumnGroupHeads = (groupValue: GroupObject): TemplateResult => html`
            <th scope="col" class="text-center" colspan="${groupValue[1].count}">
                ${capitalizeFirstLetter(groupValue[0])}
            </th>
        `

        const getColumnHeads = (groupValue: GroupObject): TemplateResult => html`
            ${Object.entries(groupValue[1].values).map(
                (modifierValue) => html`<th class="text-right">${capitalizeFirstLetter(modifierValue[0])}</th>`
            )}
        `

        const getRowHead = (name: string): TemplateResult => {
            let nameConverted: TemplateResult | string = name
            const nameSplit = name.split(" (")

            if (nameSplit.length > 1) {
                nameConverted = html`${nameSplit[0]}<br /><em>${nameSplit[1].replace(")", "")}</em>`
            }

            return html`
                <th scope="row" class="text-right" data-sort="${Number.parseInt(name, 10)}">
                    ${nameConverted}
                </th>
            `
        }

        const getRow = (cannon: CannonEntity): TemplateResult => html`
            ${Object.entries(cannon).map((groupValue): TemplateResult | TemplateResult[] => {
                if (groupValue[0] === "name") {
                    return html``
                }

                return Object.entries(groupValue[1]).map(
                    (modifierValue) =>
                        html`
                            <td class="text-right" data-sort="${modifierValue[1].value ?? 0}">
                                ${modifierValue[1]
                                    ? formatFloatFixedHTML(modifierValue[1].value, modifierValue[1].digits)
                                    : ""}
                            </td>
                        `
                )
            })}
        `

        return html`
            <table id="table-${type}-list" class="table table-sm small tablesort">
                <thead>
                    <tr>
                        <th scope="col" class="border-bottom-0"></th>
                        ${repeat(
                            this._groups,
                            (groupValue, groupKey) => groupKey,
                            (groupValue) => getColumnGroupHeads(groupValue)
                        )}
                    </tr>
                    <tr data-sort-method="thead">
                        <th scope="col" class="text-right border-top-0" data-sort-default>Lb</th>
                        ${repeat(
                            this._groups,
                            (groupValue, groupKey) => groupKey,
                            (groupValue) => getColumnHeads(groupValue)
                        )}
                    </tr>
                </thead>
                <tbody>
                    ${repeat(
                        // @ts-ignore
                        this._cannonData[type],
                        (cannon: CannonEntity) => cannon.id,
                        (cannon: CannonEntity) => {
                            return html`
                                <tr>
                                    ${getRowHead(cannon.name)}${getRow(cannon)}
                                </tr>
                            `
                        }
                    )}
                </tbody>
            </table>
        `
    }

    _getModalBody(): TemplateResult {
        return html`
            <ul class="nav nav-pills" role="tablist">
                ${repeat(
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
                )}
            </ul>
            <div class="tab-content pt-2">
                ${repeat(
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
                                <div id="${type}-list" class="modules">
                                    ${this._getList(type)}
                                </div>
                            </div>
                        `
                )}
            </div>
        `
    }

    _getModalFooter(): TemplateResult {
        return html`
            <button type="button" class="btn btn-secondary" data-dismiss="modal">
                Close
            </button>
        `
    }

    _injectModal(): void {
        render(
            insertBaseModalHTML({
                id: this._modalId,
                title: this._baseName,
                body: this._getModalBody.bind(this),
                footer: this._getModalFooter,
            } as BaseModalHtml),
            document.querySelector("#modal-section") as HTMLElement
        )

        /*
        for (const type of Object.keys(this._cannonData)) {
            const table = document.querySelector(`#table-${type}-list`) as HTMLElement
            if (table) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const sortTable = new Tablesort(table)
            }
        }
        */
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
