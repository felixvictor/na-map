/**
 * This file is part of na-map.
 *
 * @file      radioButton.
 * @module    util/radio-button
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/**
 * RadioButton
 */
export default class RadioButton {
    /**
     * Constructor
     * @param {string} name - Radio button name
     * @param {string[]} ids - Radio button ids
     */
    constructor(name, ids) {
        this._name = name.replace(/ /g, "");
        this._ids = ids;

        /**
         * Default checked radio button id
         * @type {string}
         */
        [this._default] = ids;
    }

    /**
     * Set radio button
     * @param {string} id - Radio button id
     * @return {void}
     */
    set(id) {
        document.getElementById(`${this._name}-${id}`).checked = true;
    }

    /**
     * Get radio button value
     * @returns {string} Radio button value
     */
    get() {
        let { value } = document.querySelector(`input[name="${this._name}"]:checked`);

        if (typeof value === "undefined" || !this._ids.includes(value)) {
            // Use default value if radio button does not exist or has invalid data
            value = this._default;
            this.set(value);
        }

        return value;
    }
}
