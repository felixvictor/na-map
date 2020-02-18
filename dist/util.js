import { formatLocale as d3FormatLocale } from "d3-format";
import { scaleBand as d3ScaleBand } from "d3-scale";
import { html } from "lit-html";
import { degreesFullCircle, degreesHalfCircle, degreesQuarterCircle } from "./common";
import { numberSegments } from "./common-browser";
const formatLocale = d3FormatLocale({
    decimal: ".",
    thousands: "\u2009",
    grouping: [3],
    currency: ["", "\u00A0reals"],
    percent: "\u202F%",
    minus: "\u2212\u2009"
});
const formatPrefix = formatLocale.formatPrefix(",.0", 1.0e3);
export const formatFloat = (x, s = 2) => formatLocale.format(`,.${s}~r`)(x);
export const formatSignFloat = (x, s = 2) => formatLocale
    .format(`+,.${s}~r`)(x)
    .replace("+", "\uFF0B\u200A");
export const formatFloatFixed = (x, f = 2) => formatLocale
    .format(`.${f}f`)(x)
    .replace(".00", '<span class="hidden">.00</span>')
    .replace(/\.(\d)0/g, '.$1<span class="hidden">0</span>');
export const formatFloatFixedHTML = (x, f = 2) => {
    const [number, decimals] = formatLocale
        .format(`.${f}f`)(x)
        .split(".");
    let formattedFloat = html `
        ${decimals}
    `;
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
    return html `
        ${number}${formattedFloat}
    `;
};
export const formatF11 = (x) => formatPrefix(x * -1).replace("k", "\u2009k");
export const formatInt = (x) => formatLocale.format(",d")(x);
export const formatIntTrunc = (x) => formatLocale.format(",d")(x - 0.5);
export const formatSignInt = (x) => formatLocale
    .format("+,d")(x)
    .replace("+", "\uFF0B\u200A");
export const formatPP = (x) => formatLocale
    .format(",.0%")(x)
    .replace("%", "pp");
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
export const formatPercent = (x, f = 1) => formatLocale
    .format(`.${f}%`)(x)
    .replace(".0", "");
export const formatSignPercent = (x) => formatLocale
    .format("+.1%")(x)
    .replace(".0", "")
    .replace("+", "\uFF0B\u200A");
export function getOrdinal(n, sup = true) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    const text = s[(v - 20) % 10] || s[v] || s[0];
    return n + (sup ? `<span class="super">${text}</span>` : `${text}`);
}
const round = (n, decimals = 0) => Number(`${Math.round(Number(`${n}e${decimals}`))}e-${decimals}`);
export const roundToThousands = (x) => round(x, 3);
export const isEmpty = (object) => Object.getOwnPropertyNames(object).length === 0 && object.constructor === Object;
export const compassDirections = [
    "N",
    "N⅓NE",
    "N⅔NE",
    "NE",
    "E⅔NE",
    "E⅓NE",
    "E",
    "E⅓SE",
    "E⅔SE",
    "SE",
    "S⅔SE",
    "S⅓SE",
    "S",
    "S⅓SW",
    "S⅔SW",
    "SW",
    "W⅔SW",
    "W⅓SW",
    "W",
    "W⅓NW",
    "W⅔NW",
    "NW",
    "N⅔NW",
    "N⅓NW"
];
export const compassToDegrees = (compass) => {
    const degree = degreesFullCircle / compassDirections.length;
    return compassDirections.indexOf(compass) * degree;
};
export const degreesToCompass = (degrees) => {
    const ticks = degreesFullCircle / compassDirections.length;
    const value = Math.floor(degrees / ticks + 0.5);
    return compassDirections[value % compassDirections.length];
};
export const displayCompass = (wind, svg = false) => {
    let compass;
    if (Number.isNaN(Number(wind))) {
        compass = wind;
    }
    else {
        compass = degreesToCompass(Number(wind));
    }
    return `<${svg ? "tspan" : "span"} class="caps">${compass}</${svg ? "tspan" : "span"}>`;
};
export const displayCompassAndDegrees = (wind, svg = false) => {
    let compass;
    let degrees;
    if (Number.isNaN(Number(wind))) {
        compass = wind;
        degrees = compassToDegrees(compass) % degreesFullCircle;
    }
    else {
        degrees = Number(wind);
        compass = degreesToCompass(degrees);
    }
    return `<${svg ? "tspan" : "span"} class="caps">${compass}</${svg ? "tspan" : "span"}> (${degrees}°)`;
};
export const getUserWind = (sliderId) => {
    const currentUserWind = degreesToCompass($(`#${sliderId}`).roundSlider("getValue"));
    let windDegrees;
    if (Number.isNaN(Number(currentUserWind))) {
        windDegrees = compassToDegrees(currentUserWind);
    }
    else {
        windDegrees = Number(currentUserWind);
    }
    return windDegrees;
};
export const between = (value, a, b, inclusive) => {
    const min = Math.min.apply(Math, [a, b]);
    const max = Math.max.apply(Math, [a, b]);
    return inclusive ? value >= min && value <= max : value > min && value < max;
};
export const radiansToDegrees = (radians) => (radians * degreesHalfCircle) / Math.PI;
export const degreesToRadians = (degrees) => (Math.PI / degreesHalfCircle) * (degrees - degreesQuarterCircle);
export const rotationAngleInDegrees = (centerPt, targetPt) => {
    let theta = Math.atan2(targetPt.y - centerPt.y, targetPt.x - centerPt.x);
    theta -= Math.PI / 2;
    let degrees = radiansToDegrees(theta);
    if (degrees < 0) {
        degrees += degreesFullCircle;
    }
    return degrees;
};
export const distancePoints = (centerPt, targetPt) => Math.sqrt((centerPt.x - targetPt.x) ** 2 + (centerPt.y - targetPt.y) ** 2);
export const nearestPow2 = (aSize) => 2 ** Math.round(Math.log2(aSize));
export const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);
export const chunkify = (array, n, balanced = true) => {
    if (n < 2) {
        return [array];
    }
    const length_ = array.length;
    const out = [];
    let i = 0;
    let size;
    if (length_ % n === 0) {
        size = Math.floor(length_ / n);
        while (i < length_) {
            out.push(array.slice(i, (i += size)));
        }
    }
    else if (balanced) {
        while (i < length_) {
            size = Math.ceil((length_ - i) / n--);
            out.push(array.slice(i, (i += size)));
        }
    }
    else {
        n -= 1;
        size = Math.floor(length_ / n);
        if (length_ % size === 0) {
            size -= 1;
        }
        while (i < size * n) {
            out.push(array.slice(i, (i += size)));
        }
        out.push(array.slice(size * n));
    }
    return out;
};
export const printCompassRose = ({ element, radius }) => {
    const steps = numberSegments;
    const degreesPerStep = degreesFullCircle / steps;
    const innerRadius = Math.round(radius * 0.8);
    const strokeWidth = 3;
    const data = new Array(steps).fill(null).map((e, i) => degreesToCompass(i * degreesPerStep));
    const xScale = d3ScaleBand()
        .range([0 - degreesPerStep / 2, degreesFullCircle - degreesPerStep / 2])
        .domain(data)
        .align(0);
    element
        .append("circle")
        .attr("r", innerRadius)
        .style("stroke-width", `${strokeWidth}px`);
    const dummy = element.append("text");
    const label = element
        .selectAll("g")
        .data(data)
        .join(enter => enter
        .append("g")
        .attr("transform", d => `rotate(${Math.round((xScale(d) ?? 0) + xScale.bandwidth() / 2 - degreesQuarterCircle)})translate(${innerRadius},0)`));
    label
        .filter((d, i) => i % 3 !== 0)
        .append("line")
        .attr("x2", 9);
    label
        .filter((d, i) => i % 3 === 0)
        .append("text")
        .attr("transform", d => {
        let rotate = Math.round((xScale(d) ?? 0) + xScale.bandwidth() / 2);
        let translate = "";
        dummy.text(d);
        const textHeight = dummy.node()?.getBBox().height ?? 0;
        const textWidth = dummy.node()?.getBBox().width ?? 0;
        if ((rotate >= 0 && rotate <= 45) || rotate === 315) {
            rotate = 90;
            translate = `0,-${textHeight / 2}`;
        }
        else if (rotate === 90) {
            rotate = 0;
            translate = `${textWidth / 2 + strokeWidth},0`;
        }
        else if (rotate === 270) {
            rotate = 180;
            translate = `-${textWidth / 2 + strokeWidth},0`;
        }
        else {
            rotate = -90;
            translate = `0,${textHeight / 2 + strokeWidth + 2}`;
        }
        return `rotate(${rotate})translate(${translate})`;
    })
        .text(d => d);
    dummy.remove();
};
export const printSmallCompassRose = ({ element, radius }) => {
    const steps = numberSegments;
    const degreesPerStep = degreesFullCircle / steps;
    const innerRadius = Math.round(radius * 0.8);
    const strokeWidth = 1.5;
    const data = new Array(steps).fill(null).map((e, i) => degreesToCompass(i * degreesPerStep));
    const xScale = d3ScaleBand()
        .range([0 - degreesPerStep / 2, degreesFullCircle - degreesPerStep / 2])
        .domain(data)
        .align(0);
    element
        .append("circle")
        .attr("r", innerRadius)
        .style("stroke-width", `${strokeWidth}px`);
    const x2 = 2;
    const x2InterCard = 4;
    const x2Card = 6;
    element
        .selectAll("line")
        .data(data)
        .join(enter => enter
        .append("line")
        .attr("x2", (d, i) => {
        if (i % 3 === 0) {
            return i % 6 === 0 ? x2Card : x2InterCard;
        }
        return x2;
    })
        .attr("transform", d => `rotate(${Math.round((xScale(d) ?? 0) + xScale.bandwidth() / 2)})translate(${innerRadius},0)`));
};
export const displayClan = (clan) => `<span class="caps">${clan}</span>`;
const copyToClipboardFallback = (text) => {
    if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        const input = document.createElement("input");
        input.type = "text";
        input.value = text;
        input.style = "position: absolute; left: -1000px; top: -1000px";
        this._modal$.append(input);
        input.select();
        try {
            return document.execCommand("copy");
        }
        catch (error) {
            console.error("Copy to clipboard failed.", error);
            return false;
        }
        finally {
            input.remove();
        }
    }
    else {
        console.error(`Insufficient rights to copy ${text} to clipboard`);
        return false;
    }
};
const writeClipboard = (text) => {
    return navigator.clipboard
        .writeText(text)
        .then(() => {
        return true;
    })
        .catch(error => {
        console.error(`Cannot copy ${text} to clipboard`, error);
        return false;
    });
};
export const copyToClipboard = (text) => {
    if (!navigator.clipboard) {
        copyToClipboardFallback(text);
    }
    writeClipboard(text);
};
export const copyF11ToClipboard = (x, z) => {
    if (Number.isFinite(x) && Number.isFinite(z)) {
        const F11Url = new URL(window.location.href);
        F11Url.searchParams.set("x", String(x));
        F11Url.searchParams.set("z", String(z));
        copyToClipboard(F11Url.href);
    }
};
export const drawSvgCircle = (x, y, r) => `M${x},${y} m${-r},0 a${r},${r} 0,1,0 ${r * 2},0 a${r},${r} 0,1,0 ${-r * 2},0`;
export const drawSvgRect = (x, y, r) => `M${x - r / 2},${y - r / 2}h${r}v${r}h${-r}z`;
export const drawSvgLine = (x, y, l) => `M${x},${y}v${l}`;
