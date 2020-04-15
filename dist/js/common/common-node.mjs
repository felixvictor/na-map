/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-node
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
export const cleanName = (name) => name
    .replace(/u([\da-f]{4})/gi, (match) => String.fromCharCode(Number.parseInt(match.replace(/u/g, ""), 16)))
    .replace(/'/g, "’")
    .replace(" oak", " Oak")
    .replace(" (S)", "\u202F(S)")
    .trim();
export const simpleStringSort = (a, b) => a && b ? a.localeCompare(b) : 0;
export const simpleNumberSort = (a, b) => (a && b ? a - b : 0);
export const sortBy = (propertyNames) => (a, b) => {
    let r = 0;
    propertyNames.some((propertyName) => {
        let sign = 1;
        if (String(propertyName).startsWith("-")) {
            sign = -1;
            propertyName = String(propertyName).slice(1);
        }
        r = String(a[propertyName]).localeCompare(String(b[propertyName])) * sign;
        return r !== 0;
    });
    return r;
};
//# sourceMappingURL=common-node.js.map