/*!
 * This file is part of na-map.
 *
 * @file      radioButton.
 * @module    util/radio-button
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
export default class RadioButton {
    constructor(name, ids) {
        this._name = name.replace(/ /g, "");
        this._ids = ids;
        [this._default] = ids;
    }
    set(id) {
        ;
        document.getElementById(`${this._name}-${id}`).checked = true;
    }
    get() {
        let { value } = document.querySelector(`input[name="${this._name}"]:checked`);
        if (typeof value === "undefined" || !this._ids.includes(value)) {
            value = this._default;
            this.set(value);
        }
        return value;
    }
}
//# sourceMappingURL=radio-button.js.map