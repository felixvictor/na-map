/*!
 * This file is part of na-map.
 *
 * @file      List loot and chests.
 * @module    game-tools/list-loot
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */


import "bootstrap/js/dist/modal"
import "bootstrap-select"
import { h, render } from "preact"
import htm from "htm"

import { registerEvent } from "../analytics"
import { formatInt } from "common/common-format"
import { getBaseModalHTML } from "common/common-game-tools"

import JQuery from "jquery"
import {
    Loot,
    LootAmount,
    LootChestsEntity,
    LootLootItemsEntity,
    LootLootEntity,
    LootTypeList,
    LootChestItemsEntity,
} from "common/gen-json"
import { lootType, LootType } from "common/types"
import { HtmlResult, HtmlString } from "common/interface"
import { sortBy, WoodType } from "common/common"

const html = htm.bind(h)

type LootData = {
    [K in WoodType]: Array<LootLootEntity | LootChestsEntity>
}

export default class ListLoot {
    readonly #baseName: string
    readonly #baseId: HtmlString
    readonly #buttonId: HtmlString
    readonly #modalId: HtmlString
    readonly #types = lootType
    readonly #selectId = {} as LootTypeList<HtmlString>
    #data = {} as LootData
    #items!: Map<number, { name: string; sources: Map<number, LootLootItemsEntity> }>
    #mainDiv!: HTMLDivElement
    #select$ = {} as LootTypeList<JQuery>
    #selectedItemId = 0
    #selectedType: LootType = "" as LootType

    constructor() {
        this.#baseName = "List loot and chests"
        this.#baseId = "loot-list"
        this.#buttonId = `menu-${this.#baseId}`
        this.#modalId = `modal-${this.#baseId}`

        for (const type of this.#types) {
            this.#selectId[type] = `${this.#baseId}-${type}-select`
        }

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
        const sourceData = (await import(/* webpackChunkName: "data-loot" */ "../../../../lib/gen-generic/loot.json"))
            .default as Loot
        console.log(sourceData)
        for (const type of this.#types) {
            this.#data[type] = sourceData[type]
        }
    }

    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this.#buttonId}`)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this.#baseName)

            this._sourceListSelected()
        })
    }

    _getTypeOptions(type: LootType): HtmlResult {
        return html`
            ${this.#data[type]
                .sort(sortBy(["name"]))
                .map((item) => html`<option value="${item.id}">${item.name}</option>`)}
        `
    }

    _getItemsOptions(): HtmlResult {
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

        // Loot and fish
        for (const loot of [...this.#data.loot, ...this.#data.fish] as LootLootEntity[]) {
            const { items } = loot
            for (const item of items) {
                setOptionItems(loot, item, item.chance)
            }
        }

        // Chests
        for (const chest of this.#data.chest as LootChestsEntity[]) {
            for (const group of chest.itemGroup) {
                const { chance, items } = group
                for (const item of items) {
                    setOptionItems(chest, item, chance)
                }
            }
        }

        // Sort by name
        this.#items = new Map([...optionItems.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)))

        return html`${[...this.#items].map((value) => html`<option value="${value[0]}">${value[1].name}</option>`)}`
    }

    _getOptions(type: LootType): HtmlResult {
        const regularLootTypes = new Set<LootType>(["chest", "fish", "loot"])
        let h = html``

        if (regularLootTypes.has(type)) {
            h = this._getTypeOptions(type)
        } else if (type === "item") {
            h = this._getItemsOptions()
        }

        return h
    }

    _getModalBody(): HtmlResult {
        return html`
            ${this.#types.map(
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

    _getModalFooter(): HtmlResult {
        return html` <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button> `
    }

    _injectModal(): void {
        render(
            getBaseModalHTML({
                id: this.#modalId,
                title: this.#baseName,
                size: "modal-md",
                body: this._getModalBody.bind(this),
                footer: this._getModalFooter,
            }),
            document.querySelector("#modal-section")!
        )
    }

    _setupSelectListeners(): void {
        for (const type of this.#types) {
            const title = type === "loot" ? "ship loot" : type === "fish" ? "fishing region" : type
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
                    title: `Select ${title}`,
                    virtualScroll: true,
                })
        }
    }

    _initModal(): void {
        this._injectModal()
        this.#mainDiv = document.querySelector(`#${this.#baseId}`)! as HTMLDivElement
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

    _getLootItemsText(
        items: Array<LootLootItemsEntity | LootChestItemsEntity>,
        title: string,
        chance = true
    ): HtmlResult {
        return html`
            <table class="table table-sm small na-table no-sort">
                <thead>
                    <tr>
                        <th scope="col">${title}</th>
                        ${chance ? html`<th scope="col" class="text-end">Chance (0 − 100)</th>` : ""}
                        <th scope="col" class="text-end">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(
                        (item) =>
                            html`
                                <tr>
                                    <td>${item.name}</td>
                                    ${chance
                                        ? html` <td class="text-end">
                                              ${ListLoot._printChance((item as LootLootItemsEntity).chance)}
                                          </td>`
                                        : ""}
                                    <td class="text-end">${ListLoot._printAmount(item.amount)}</td>
                                </tr>
                            `
                    )}
                </tbody>
            </table>
        `
    }

    _getSourceText(): HtmlResult {
        const items = [...this.#items.get(this.#selectedItemId)!.sources]
            .map((value) => value[1])
            .sort(sortBy(["chance", "name"]))

        return html`${this._getLootItemsText(items, "Source")}`
    }

    _getChestsText(): HtmlResult {
        const currentChest = this.#data.chest.find((item) => item.id === this.#selectedItemId) as LootChestsEntity

        return html`
            <p>Weight ${formatInt(currentChest.weight)} tons<br />Lifetime ${formatInt(currentChest.lifetime)} hours</p>
            ${currentChest.itemGroup.map(
                (group) => html` <h5>Group chance: ${ListLoot._printChance(group.chance)}</h5>
                    ${this._getLootItemsText(group.items.sort(sortBy(["name"])), "Item", false)}`
            )}
        `
    }

    _getLootText(): HtmlResult {
        const currentItem = this.#data[this.#selectedType].find(
            (item) => item.id === this.#selectedItemId
        ) as LootLootEntity
        const items = currentItem.items.sort(sortBy(["chance", "name"]))

        return html`${this._getLootItemsText(items, "Item")}`
    }

    _getText(): HtmlResult {
        if (this.#selectedType === "item") {
            return this._getSourceText()
        }

        if (this.#selectedType === "chest") {
            return this._getChestsText()
        }

        return this._getLootText()
    }

    /**
     * Construct item table
     */
    _getTable(): HtmlResult {
        return html` <div class="mt-4">${this._getText()}</div> `
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
