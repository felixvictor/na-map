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
import htm from "htm";
import { h } from "preact";
const html = htm.bind(h);
export const formatLocale = d3FormatLocale({
    decimal: ".",
    thousands: "\u2009",
    grouping: [3],
    currency: ["", "\u00A0reales"],
    percent: "\u202F%",
    minus: "\u2212\u2009",
});
const formatPrefix = formatLocale.formatPrefix(",.0", 1e3);
export const formatFloat = (x, s = 2) => formatLocale.format(`,.${s}~r`)(x);
export const formatSignFloat = (x, s = 2) => formatLocale.format(`+,.${s}~r`)(x).replace("+", "\u002B\u200A");
export const formatFloatFixed = (x, f = 2) => formatLocale
    .format(`.${f}f`)(x)
    .replace(".00", '<span class="hidden">.00</span>')
    .replace(/\.(\d)0/g, '.$1<span class="hidden">0</span>');
export const formatF11 = (x) => formatPrefix(x * -1).replace("k", "\u2009k");
export const formatInt = (x) => formatLocale.format(",d")(x);
export const formatIntTrunc = (x) => formatLocale.format(",d")(x === 0 ? 0 : x - 0.5);
export const formatSignInt = (x) => formatLocale.format("+,d")(x).replace("+", "\u002B\u200A");
export const formatPP = (x, f = 0) => formatLocale.format(`,.${f}%`)(x).replace("%", "pp");
const mSpan = '<span class="caps">m</span>';
const mTSpan = '<tspan class="caps">m</tspan>';
export const formatSiInt = (x, svg = false) => formatLocale
    .format(",.2s")(x)
    .replace(".0", "")
    .replace("k", "\u2009k")
    .replace("m", "\u2009m")
    .replace("M", `\u2009${svg ? mTSpan : mSpan}`);
export const formatSiIntHtml = (x) => {
    const string = formatSiInt(x);
    if (string.endsWith(mSpan)) {
        return html `${string.replace(mSpan, "")}<span class="caps">m</span>`;
    }
    return html `${string}`;
};
export const formatSiCurrency = (x, svg = false) => formatLocale
    .format("$,.2s")(x)
    .replace(".0", "")
    .replace("M", `\u2009${svg ? mTSpan : mSpan}`)
    .replace("k", "\u2009k");
export const formatPercent = (x, f = 1) => formatLocale.format(`.${f}%`)(x).replace(".0", "");
export const formatPercentSig = (x, s = 1) => formatLocale.format(`.${s}p`)(x);
export const formatSignPercent = (x) => formatLocale.format("+.1%")(x).replace(".0", "").replace("+", "\uFF0B\u200A");
//# sourceMappingURL=common-format.js.map