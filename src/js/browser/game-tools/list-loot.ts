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
import { putImportError } from "../../common/common"
import { HtmlString, insertBaseModalHTML } from "../../common/common-browser"
import { formatInt } from "../../common/common-format"
import { sortBy } from "../../common/common-node"

import {
    Loot,
    LootAmount,
    LootChestsEntity,
    LootLootItemsEntity,
    LootLootEntity,
    LootTypeList,
    LootChestItemsEntity,
} from "../../common/gen-json"
import { LootType } from "../../common/types"

export default class ListLoot {
    readonly #baseName: string
    readonly #baseId: HtmlString
    readonly #buttonId: HtmlString
    readonly #modalId: HtmlString
    readonly #types: LootType[] = ["loot", "chests", "items"]
    #selectedType: LootType
    readonly #selectId: LootTypeList<HtmlString> = {} as LootTypeList<HtmlString>
    #select$: LootTypeList<JQuery> = {} as LootTypeList<JQuery>
    #selectedItemId = 0
    #mainDiv!: HTMLDivElement
    #items!: Map<number, { name: string; sources: Map<number, LootLootItemsEntity> }>
    #lootData!: LootLootEntity[]
    #chestsData!: LootChestsEntity[]

    constructor() {
        this.#baseName = "List loot and chests"
        this.#baseId = "loot-list"
        this.#buttonId = `button-${this.#baseId}`
        this.#modalId = `modal-${this.#baseId}`

        for (const type of this.#types) {
            this.#selectId[type] = `${this.#baseId}-${type}-select`
        }

        this.#selectedType = "" as LootType

        this._setupListener()
    }

    static _printAmount(amount: LootAmount): string {
        return amount.min === amount.max
            ? formatInt(amount.min)
            : `${formatInt(amount.min)} to ${formatInt(amount.max)}`
    }

    static _printChance(chance: number): string {
        return formatInt((1 - chance) * 100)
    }

    async _loadAndSetupData(): Promise<void> {
        try {
            const sourceData = (await import(/* webpackChunkName: "data-loot" */ "Lib/gen-generic/loot.json"))
                .default as Loot
            this.#lootData = sourceData.loot as LootLootEntity[]
            this.#chestsData = sourceData.chests as LootChestsEntity[]
        } catch (error) {
            putImportError(error)
        }
    }

    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this.#buttonId}`)?.addEventListener("click", async (event) => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this.#baseName)
            event.stopPropagation()
            this._sourceListSelected()
        })
    }

    _getLootOptions(): TemplateResult {
        return html`
            ${repeat(
                this.#lootData.sort(sortBy(["name"])),
                (item) => item.id,
                (item) => html`<option value="${item.id}">${item.name}</option>`
            )}
        `
    }

    _getChestsOptions(): TemplateResult {
        return html`
            ${repeat(
                this.#chestsData.sort(sortBy(["name"])),
                (item) => item.id,
                (item) => html`<option value="${item.id}">${item.name}</option>`
            )}
        `
    }

    _getItemsOptions(): TemplateResult {
        interface SourceDetail {
            id: number
            name: string
            chance: number
            amount: LootAmount
        }
        const optionItems = new Map<number, { name: string; sources: Map<number, SourceDetail> }>()

        const setOptionItems = (
            source: LootLootEntity | LootChestsEntity,
            item: LootLootItemsEntity | LootChestItemsEntity,
            chance: number
        ): void => {
            const sourceDetail = new Map<number, SourceDetail>([
                [source.id, { id: source.id, name: source.name, chance, amount: item.amount }],
            ])

            optionItems.set(item.id, {
                name: item.name,
                sources: optionItems.has(item.id)
                    ? new Map([...optionItems.get(item.id)!.sources, ...sourceDetail])
                    : sourceDetail,
            })
        }

        // Loot
        for (const loot of this.#lootData) {
            const { items } = loot
            for (const item of items) {
                setOptionItems(loot, item, item.chance)
            }
        }

        // Chests
        for (const chest of this.#chestsData) {
            for (const group of chest.itemGroup) {
                const { items } = group
                for (const item of items) {
                    setOptionItems(chest, item, group.chance)
                }
            }
        }

        // Sort by name
        this.#items = new Map([...optionItems.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)))

        return html`
            ${repeat(
                this.#items,
                (value, key) => key,
                (value) => {
                    return html`<option value="${value[0]}">${value[1].name}</option>`
                }
            )};
        `
    }

    _getOptions(type: LootType): TemplateResult {
        if (type === "items") {
            return this._getItemsOptions()
        }

        if (type === "chests") {
            return this._getChestsOptions()
        }

        if (type === "loot") {
            return this._getLootOptions()
        }

        return html``
    }

    _getModalBody(): TemplateResult {
        return html`
            ${repeat(
                this.#types,
                (type) => type,
                (type) =>
                    html`
                        <label>
                            <select id="${this.#selectId[type]}" class="selectpicker">
                                ${this._getOptions(type)}
                            </select>
                        </label>
                    `
            )}
            <div id="${this.#baseId}"></div>
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
                id: this.#modalId,
                title: this.#baseName,
                size: "md",
                body: this._getModalBody.bind(this),
                footer: this._getModalFooter,
            }),
            document.querySelector("#modal-section")!
        )
    }

    _setupSelectListeners(): void {
        for (const type of this.#types) {
            this.#select$[type]
                .on("change", () => {
                    this.#selectedType = type
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
        this.#mainDiv = document.querySelector(`#${this.#baseId}`) as HTMLDivElement
        for (const type of this.#types) {
            this.#select$[type] = $(`#${this.#selectId[type]}`)
        }

        this._setupSelectListeners()
    }

    _sourceListSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this.#modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this.#modalId}`).modal("show")
    }

    _getLootItemsText(items: Array<LootLootItemsEntity | LootChestItemsEntity>, chance = true): TemplateResult {
        /* eslint-disable no-irregular-whitespace */
        return html`
            <table class="table table-sm small">
                <thead>
                    <tr>
                        <th scope="col">Item</th>
                        ${chance ? html`<th scope="col" class="text-right">Chance (0 − 100)</th>` : ""}
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
                                    ${chance
                                        ? html` <td class="text-right">
                                              ${ListLoot._printChance((item as LootLootItemsEntity).chance)}
                                          </td>`
                                        : ""}
                                    <td class="text-right">
                                        ${ListLoot._printAmount(item.amount)}
                                    </td>
                                </tr>
                            `
                    )}
                </tbody>
            </table>
        `
    }

    _getSourceText(): TemplateResult {
        const items = [...this.#items.get(this.#selectedItemId)!.sources]
            .map((value) => value[1])
            .sort(sortBy(["chance", "name"]))

        return html`${this._getLootItemsText(items)}`
    }

    _getChestsText(): TemplateResult {
        const currentChest = this.#chestsData.find((item) => item.id === this.#selectedItemId)!

        return html`
            <p>Weight ${formatInt(currentChest.weight)} tons<br />Lifetime ${formatInt(currentChest.lifetime)} hours</p>
            ${repeat(
                currentChest.itemGroup,
                (group) => group,
                (group) => html` <h6>Group chance: ${ListLoot._printChance(group.chance)}</h6>
                    ${this._getLootItemsText(group.items.sort(sortBy(["name"])), false)}`
            )}
        `
    }

    _getLootText(): TemplateResult {
        const currentItem = this.#lootData.find((item) => item.id === this.#selectedItemId)!
        const items = currentItem.items.sort(sortBy(["chance", "name"]))

        return html`${this._getLootItemsText(items)}`
    }

    _getText(): TemplateResult {
        if (this.#selectedType === "items") {
            return this._getSourceText()
        }

        if (this.#selectedType === "chests") {
            return this._getChestsText()
        }

        return this._getLootText()
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

    _resetOtherSelects(): void {
        const types = this.#types.filter((type) => type !== this.#selectedType)
        for (const type of types) {
            this.#select$[type].val("default").selectpicker("refresh")
        }
    }

    /**
     * Show items for selected loot or chest
     */
    _itemSelected(): void {
        const currentItem$ = this.#select$[this.#selectedType].find(":selected")
        this.#selectedItemId = Number(currentItem$.val())

        this._resetOtherSelects()

        // Add new list
        render(this._getTable(), this.#mainDiv)
    }
}
