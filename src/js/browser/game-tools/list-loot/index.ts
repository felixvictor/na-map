/*!
 * This file is part of na-map.
 *
 * @file      List loot and chests.
 * @module    game-tools/list-loot
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { h, render } from "preact"
import htm from "htm"

import { registerEvent } from "../../analytics"
import { sortBy } from "common/common"
import { getIdFromBaseName } from "common/common-browser"
import { formatInt } from "common/common-format"
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
import { LootItemMap, SourceDetail } from "list-loot"

import Select, { SelectOptions } from "util/select"
import Modal from "util/modal"

const html = htm.bind(h)

export default class ListLoot {
    #data = {} as Loot
    #items: LootItemMap = new Map()
    #modal: Modal | undefined = undefined
    #optionItems: LootItemMap = new Map()
    #select = {} as LootTypeList<Select>
    #selectedItemId = 0
    #selectedType: LootType = "" as LootType
    readonly #baseId: HtmlString
    readonly #baseName = "List of loot and chests"
    readonly #menuId: HtmlString
    readonly #regularLootTypes = new Set<LootType>(["chest", "fish", "loot"])
    readonly #types: LootType[] = lootType

    constructor() {
        this.#baseId = getIdFromBaseName(this.#baseName)
        this.#menuId = `menu-${this.#baseId}`

        this._setupListener()
    }

    static _printAmount(amount: LootAmount): string {
        return amount.min === amount.max
            ? formatInt(amount.min)
            : `${formatInt(amount.min)}\u202F\u2013\u202F${formatInt(amount.max)}`
    }

    static _printChance(chance: number): string {
        return formatInt((1 - chance) * 100)
    }

    async _loadAndSetupData(): Promise<void> {
        const sourceData = (
            await import(/* webpackChunkName: "data-loot" */ "../../../../../lib/gen-generic/loot.json")
        ).default as Loot

        for (const type of this.#types) {
            this.#data[type] = sourceData[type]
        }
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Tools", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            await this._loadAndSetupData()
            this.#modal = new Modal(this.#baseName, "md")
            this._setupSelect()
            this._setupSelectListener()
        }
    }

    _setupListener(): void {
        document.querySelector(`#${this.#menuId}`)?.addEventListener("click", () => {
            void this._menuClicked()
        })
    }

    _getTypeOptions(type: LootType): HtmlString {
        return this.#data[type]
            .sort(sortBy<LootLootEntity | LootChestsEntity, "id" | "name">(["name"]))
            .map((item: LootLootEntity | LootChestsEntity) => `<option value="${item.id}">${item.name}</option>`)
            .join("")
    }

    _setOptionItems(
        source: LootLootEntity | LootChestsEntity,
        item: LootLootItemsEntity | LootChestItemsEntity,
        chance: number
    ): void {
        const sourceDetail = new Map<number, SourceDetail>([
            [source.id, { id: source.id, name: source.name, chance, amount: item.amount }],
        ])

        this.#optionItems.set(item.id, {
            name: item.name,
            sources: this.#optionItems.has(item.id)
                ? new Map([...this.#optionItems.get(item.id)!.sources, ...sourceDetail])
                : sourceDetail,
        })
    }

    _getItemsOptions(): HtmlString {
        // Loot and fish
        for (const loot of [...this.#data.loot, ...this.#data.fish] as LootLootEntity[]) {
            const { items } = loot
            for (const item of items) {
                this._setOptionItems(loot, item, item.chance)
            }
        }

        // Chests
        for (const chest of this.#data.chest as LootChestsEntity[]) {
            for (const group of chest.itemGroup) {
                const { chance, items } = group
                for (const item of items) {
                    this._setOptionItems(chest, item, chance)
                }
            }
        }

        // Sort by name
        this.#items = new Map([...this.#optionItems.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)))

        return [...this.#items].map((value) => `<option value="${value[0]}">${value[1].name}</option>`).join("")
    }

    _getOptions(type: LootType): HtmlString {
        let h = ""

        if (this.#regularLootTypes.has(type)) {
            h = this._getTypeOptions(type)
        } else if (type === "item") {
            h = this._getItemsOptions()
        }

        return h
    }

    _setupSelect(): void {
        this.#modal!.selectsSel.attr("class", "d-flex flex-wrap mb-3")

        for (const type of this.#types) {
            const title = type === "loot" ? "ship loot" : type === "fish" ? "fishing region" : type
            const selectOptions: Partial<SelectOptions> = {
                dropupAuto: false,
                liveSearch: true,
                placeholder: `Select ${title}`,
                virtualScroll: true,
            }

            if (type === "item") {
                selectOptions.width = "440px" // 2 * 220
            }

            this.#select[type] = new Select(
                `${this.#baseId}-${type}`,
                this.#modal!.baseIdSelects,
                selectOptions,
                this._getOptions(type)
            )
        }
    }

    _setupSelectListener(): void {
        for (const type of this.#types) {
            this.#select[type].select$.on("change", () => {
                this.#selectedType = type
                this._itemSelected()
            })
        }
    }

    _getLootItemsText(
        items: Array<LootLootItemsEntity | LootChestItemsEntity>,
        title: string,
        chance = true
    ): HtmlResult {
        return html`
            <table class="table table-sm table-striped table-hover">
                <thead>
                    <tr>
                        <th scope="col" class="text-start">${title}</th>
                        ${chance ? html`<th scope="col">Chance<br />(0 − 100)</th>` : ""}
                        <th scope="col">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(
                        (item) =>
                            html`
                                <tr>
                                    <td class="text-start">${item.name}</td>
                                    ${chance
                                        ? html` <td>${ListLoot._printChance((item as LootLootItemsEntity).chance)}</td>`
                                        : ""}
                                    <td>${ListLoot._printAmount(item.amount)}</td>
                                </tr>
                            `
                    )}
                </tbody>
            </table>
        `
    }

    _getSourceText(): HtmlResult {
        const items = this.#items.get(this.#selectedItemId)

        if (items) {
            const sources = [...items.sources].map((value) => value[1]).sort(sortBy(["chance", "name"]))

            return html`${this._getLootItemsText(sources, "Source")}`
        }

        return html``
    }

    _getChestsText(): HtmlResult {
        const currentChest = (this.#data.chest as LootChestsEntity[]).find((item) => item.id === this.#selectedItemId)

        if (currentChest) {
            return html`
                <p>
                    Weight ${formatInt(currentChest.weight)} tons<br />Lifetime ${formatInt(
                        currentChest.lifetime
                    )} hours
                </p>
                ${currentChest.itemGroup.map(
                    (group) => html`<h5>Group chance: ${ListLoot._printChance(group.chance)}</h5>
                        ${this._getLootItemsText(group.items.sort(sortBy(["name"])), "Item", false)}`
                )}
            `
        }

        return html``
    }

    _getLootText(): HtmlResult {
        const currentItem = (this.#data[this.#selectedType] as LootLootEntity[]).find(
            (item) => item.id === this.#selectedItemId
        )

        if (currentItem) {
            const items = currentItem.items.sort(sortBy(["chance", "name"]))

            return html`${this._getLootItemsText(items, "Item")}`
        }

        return html``
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
        return html`<div class="mt-4">${this._getText()}</div>`
    }

    _resetOtherSelects(): void {
        const types = this.#types.filter((type) => type !== this.#selectedType)
        for (const type of types) {
            this.#select[type].reset()
        }
    }

    /**
     * Show items for selected loot or chest
     */
    _itemSelected(): void {
        this.#selectedItemId = Number(this.#select[this.#selectedType].getValues())
        const div = this.#modal!.outputSel

        this._resetOtherSelects()
        render(this._getTable(), div.node() as HTMLElement)
    }
}
