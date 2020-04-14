/* eslint-disable no-irregular-whitespace */
/*!
 * This file is part of na-map.
 *
 * @file      List loot and chests.
 * @module    game-tools/list-loot
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />
import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"
import "bootstrap-select/js/bootstrap-select"
import { html, render, TemplateResult } from "lit-html"
import { repeat } from "lit-html/directives/repeat"

import { registerEvent } from "../analytics"
import { formatInt } from "../../common/common-format"
import { HtmlString, insertBaseModalHTML } from "../../common/common-browser"
import {
    Loot,
    LootAmount,
    LootChestsEntity,
    LootItemsEntity,
    LootLootEntity,
    LootTypeList,
} from "../../common/gen-json"
import { putImportError } from "../../common/common"
import { sortBy } from "../../common/common-node"

const lootType = ["loot", "chests", "items"] as const
export type LootType = typeof lootType[number]

export default class ListLoot {
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _modalId: HtmlString
    private _modal$: JQuery = {} as JQuery
    private readonly _types: LootType[] = ["loot", "chests", "items"]
    private _sourceData: Loot = {} as Loot
    private _selectedType: LootType
    private readonly _selectId: LootTypeList<HtmlString> = {} as LootTypeList<HtmlString>
    private _select$: LootTypeList<JQuery> = {} as LootTypeList<JQuery>
    private _selectedItemId = 0
    private _mainDiv!: HTMLDivElement
    private _items!: Map<number, { name: string; sources: Map<number, LootItemsEntity> }>

    constructor() {
        this._baseName = "List loot and chests"
        this._baseId = "loot-list"
        this._buttonId = `button-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        for (const type of this._types) {
            this._selectId[type] = `${this._baseId}-${type}-select`
        }

        this._selectedType = "" as LootType

        this._setupListener()
    }

    static _getAmount(amount: LootAmount): string {
        return amount.min === amount.max
            ? formatInt(amount.min)
            : `${formatInt(amount.min)} to ${formatInt(amount.max)}`
    }

    static _getChance(chance: number): string {
        return formatInt((1 - chance) * 100)
    }

    async _loadAndSetupData(): Promise<void> {
        try {
            this._sourceData = (await import(/* webpackChunkName: "data-loot" */ "Lib/gen-generic/loot.json"))
                .default as Loot
        } catch (error) {
            putImportError(error)
        }
    }

    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this._buttonId}`)?.addEventListener("click", async (event) => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)
            event.stopPropagation()
            this._sourceListSelected()
        })
    }

    _getOptions(type: LootType): TemplateResult {
        if (type !== "items") {
            return html`
                ${repeat(
                    this._sourceData[type].sort(sortBy(["name"])),
                    (item) => item.id,
                    (item) => html`<option value="${item.id}">${item.name}</option>`
                )}
            `
        }

        const items = new Map<number, { name: string; sources: Map<number, LootItemsEntity> }>()
        const types = this._types.filter((type) => type !== "items")
        for (const type of types) {
            for (const source of this._sourceData[type]) {
                for (const item of source.items) {
                    const sourceDetail = new Map<number, LootItemsEntity>([
                        [source.id, { id: source.id, name: source.name, chance: item.chance, amount: item.amount }],
                    ])

                    items.set(item.id, {
                        name: item.name,
                        sources: items.has(item.id)
                            ? new Map([...items.get(item.id)!.sources, ...sourceDetail])
                            : sourceDetail,
                    })
                }
            }
        }

        // Sort by name
        this._items = new Map([...items.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)))

        return html`
            ${repeat(
                this._items,
                (value, key) => key,
                (value) => {
                    return html`<option value="${value[0]}">${value[1].name}</option>`
                }
            )};
        `
    }

    _getModalBody(): TemplateResult {
        return html`
            ${repeat(
                this._types,
                (type) => type,
                (type) =>
                    html`
                        <label>
                            <select id="${this._selectId[type]}" class="selectpicker">
                                ${this._getOptions(type)}
                            </select>
                        </label>
                    `
            )}
            <div id="${this._baseId}"></div>
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
                size: "md",
                body: this._getModalBody.bind(this),
                footer: this._getModalFooter,
            }),
            document.querySelector("#modal-section")!
        )
    }

    _setupSelectListeners(): void {
        for (const type of this._types) {
            this._select$[type]
                .on("change", () => {
                    this._selectedType = type
                    this._itemSelected()
                })
                .selectpicker({
                    dropupAuto: false,
                    liveSearch: true,
                    liveSearchNormalize: true,
                    liveSearchPlaceholder: "Search ...",
                    title: `Select ${type}`,
                    virtualScroll: true,
                } as BootstrapSelectOptions)
        }
    }

    _initModal(): void {
        this._injectModal()
        this._mainDiv = document.querySelector(`#${this._baseId}`) as HTMLDivElement
        for (const type of this._types) {
            this._select$[type] = $(`#${this._selectId[type]}`)
        }

        this._setupSelectListeners()
    }

    _sourceListSelected(): void {
        // If the modal has no content yet, insert it
        if (!this._modal$) {
            this._initModal()
            this._modal$ = $(`#${this._modalId}`)
        }

        // Show modal
        this._modal$.modal("show")
    }

    _getItemData(selectedItemId: number): LootLootEntity | LootChestsEntity {
        return this._sourceData[this._selectedType].find((item) => item.id === selectedItemId)!
    }

    _getItemsText(items: LootItemsEntity[]): TemplateResult {
        return html`
            <table class="table table-sm small">
                <thead>
                    <tr>
                        <th scope="col">Item</th>
                        <th scope="col" class="text-right">Chance (0 − 100)</th>
                        <th scope="col" class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${repeat(
                        items,
                        (item) => item.id,
                        (item) =>
                            html`
                                <tr>
                                    <td>${item.name}</td>
                                    <td class="text-right">
                                        ${ListLoot._getChance(item.chance)}
                                    </td>
                                    <td class="text-right">
                                        ${ListLoot._getAmount(item.amount)}
                                    </td>
                                </tr>
                            `
                    )}
                </tbody>
            </table>
        `
    }

    _getLootText(currentItem: LootLootEntity): TemplateResult {
        return html`${this._getItemsText(currentItem.items)}`
    }

    _getChestText(currentItem: LootChestsEntity): TemplateResult {
        return html`
            <p>Weight ${formatInt(currentItem.weight)} tons<br />Lifetime ${formatInt(currentItem.lifetime)} hours</p>
            ${this._getItemsText(currentItem.items)}
        `
    }

    _getSourceText(): TemplateResult {
        const items = [...this._items.get(this._selectedItemId)!.sources]
            .map((value) => value[1])
            .sort(sortBy(["chance", "name"]))

        return html`${this._getItemsText(items)}`
    }

    _resetOtherSelects(): void {
        const types = this._types.filter((type) => type !== this._selectedType)
        for (const type of types) {
            this._select$[type].val("default").selectpicker("refresh")
        }
    }

    _getText(): TemplateResult {
        if (this._selectedType === "items") {
            return this._getSourceText()
        }

        const currentItem = this._getItemData(this._selectedItemId)
        currentItem.items = currentItem.items.sort(sortBy(["chance", "name"]))

        return this._selectedType === "loot"
            ? this._getLootText(currentItem as LootLootEntity)
            : this._getChestText(currentItem as LootChestsEntity)
    }

    /**
     * Construct item table
     */
    _getTable(): TemplateResult {
        return html`
            <div class="modules mt-4">
                ${this._getText()}
            </div>
        `
    }

    /**
     * Show items for selected loot or chest
     */
    _itemSelected(): void {
        const currentItem$ = this._select$[this._selectedType].find(":selected")
        this._selectedItemId = Number(currentItem$.val())

        this._resetOtherSelects()

        // Add new list
        render(this._getTable(), this._mainDiv)
    }
}
