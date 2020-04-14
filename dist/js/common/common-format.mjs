/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/common-format
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import { formatLocale as d3FormatLocale } from "d3-format";
import { html } from "lit-html";
const formatLocale = d3FormatLocale({
    decimal: ".",
    thousands: "\u2009",
    grouping: [3],
    currency: ["", "\u00A0reals"],
    percent: "\u202F%",
    minus: "\u2212\u2009",
});
const formatPrefix = formatLocale.formatPrefix(",.0", 1e3);
export const formatFloat = (x, s = 2) => formatLocale.format(`,.${s}~r`)(x);
export const formatSignFloat = (x, s = 2) => formatLocale.format(`+,.${s}~r`)(x).replace("+", "\uFF0B\u200A");
export const formatFloatFixed = (x, f = 2) => formatLocale
    .format(`.${f}f`)(x)
    .replace(".00", '<span class="hidden">.00</span>')
    .replace(/\.(\d)0/g, '.$1<span class="hidden">0</span>');
export const formatFloatFixedHTML = (x, f = 2) => {
    const [number, decimals] = formatLocale.format(`.${f}f`)(x).split(".");
    let formattedFloat = html ` ${decimals} `;
    if (decimals) {
        if (decimals === "0" || decimals === "00") {
            formattedFloat = html `
                <span class="hidden">.${decimals}</span>
            `;
        }
        else if (decimals.endsWith("0")) {
            formattedFloat = html `
                .${decimals.replace("0", "")}<span class="hidden">0</span>
            `;
        }
        else {
            formattedFloat = html `
                .${decimals}
            `;
        }
    }
    return html `${number}${formattedFloat}`;
};
export const formatF11 = (x) => formatPrefix(x * -1).replace("k", "\u2009k");
export const formatInt = (x) => formatLocale.format(",d")(x);
export const formatIntTrunc = (x) => formatLocale.format(",d")(x - 0.5);
export const formatSignInt = (x) => formatLocale.format("+,d")(x).replace("+", "\uFF0B\u200A");
export const formatPP = (x) => formatLocale.format(",.0%")(x).replace("%", "pp");
export const formatSiInt = (x) => formatLocale
    .format(",.2s")(x)
    .replace(".0", "")
    .replace("M", "\u2009\u1d0d")
    .replace("k", "\u2009k")
    .replace("m", "\u2009m");
export const formatSiCurrency = (x) => formatLocale
    .format("$,.2s")(x)
    .replace(".0", "")
    .replace("M", "\u2009\u1d0d")
    .replace("k", "\u2009k");
export const formatPercent = (x, f = 1) => formatLocale.format(`.${f}%`)(x).replace(".0", "");
export const formatSignPercent = (x) => formatLocale.format("+.1%")(x).replace(".0", "").replace("+", "\uFF0B\u200A");
//# sourceMappingURL=common-format.js.map