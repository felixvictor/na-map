/**
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
    private readonly _name: string
    // Radio button ids
    private readonly _ids: string[]
    // Default checked radio button id
    private readonly _default: string

    constructor(name: string, ids: string[]) {
        this._name = name.replace(/ /g, "")
        this._ids = ids
        ;[this._default] = ids
    }

    /**
     * Set radio button
     */
    set(id: string): void {
        ;(document.getElementById(`${this._name}-${id}`) as HTMLInputElement).checked = true
    }

    /**
     * Get radio button value
     */
    get(): string {
        // Radio button value
        let { value } = document.querySelector(`input[name="${this._name}"]:checked`) as HTMLInputElement

        if (typeof value === "undefined" || !this._ids.includes(value)) {
            // Use default value if radio button does not exist or has invalid data
            value = this._default
            this.set(value)
        }

        return value
    }
}
