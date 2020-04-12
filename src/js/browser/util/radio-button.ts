/*!
 * This file is part of na-map.
 *
 * @file      radioButton.
 * @module    util/radio-button
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/**
 * RadioButton
 */
export default class RadioButton {
    // Radio button name
    readonly #name: string
    // Radio button ids
    readonly #ids: string[]
    // Default checked radio button id
    readonly #default: string

    constructor(name: string, ids: string[]) {
        this.#name = name.replace(/ /g, "")
        this.#ids = ids
        ;[this.#default] = ids
    }

    /**
     * Set radio button
     */
    set(id: string): void {
        ;(document.querySelector(`#${this.#name}-${id}`) as HTMLInputElement).checked = true
    }

    /**
     * Get radio button value
     */
    get(): string {
        // Radio button value
        let { value } = document.querySelector(`input[name="${this.#name}"]:checked`) as HTMLInputElement

        if (typeof value === "undefined" || !this.#ids.includes(value)) {
            // Use default value if radio button does not exist or has invalid data
            value = this.#default
            this.set(value)
        }

        return value
    }
}
