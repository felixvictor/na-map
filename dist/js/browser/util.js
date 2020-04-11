/*!
 * This file is part of na-map.
 *
 * @file      Utility functions.
 * @module    util
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import { scaleBand as d3ScaleBand } from "d3-scale";
import { numberSegments } from "../common/common-browser";
import { compassToDegrees, degreesFullCircle, degreesQuarterCircle, degreesToCompass, radiansToDegrees, } from "../common/common-math";
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
export const rotationAngleInDegrees = (centerPt, targetPt) => {
    let theta = Math.atan2(targetPt.y - centerPt.y, targetPt.x - centerPt.x);
    theta -= Math.PI / 2;
    let degrees = radiansToDegrees(theta);
    if (degrees < 0) {
        degrees += degreesFullCircle;
    }
    return degrees;
};
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
export const printCompassRose = ({ element, radius, }) => {
    const steps = numberSegments;
    const degreesPerStep = degreesFullCircle / steps;
    const innerRadius = Math.round(radius * 0.8);
    const strokeWidth = 3;
    const data = new Array(steps).fill(null).map((_e, i) => degreesToCompass(i * degreesPerStep));
    const xScale = d3ScaleBand()
        .range([0 - degreesPerStep / 2, degreesFullCircle - degreesPerStep / 2])
        .domain(data)
        .align(0);
    element.append("circle").attr("r", innerRadius).style("stroke-width", `${strokeWidth}px`);
    const dummy = element.append("text");
    const label = element
        .selectAll("g")
        .data(data)
        .join((enter) => enter
        .append("g")
        .attr("transform", (d) => {
        var _a;
        return `rotate(${Math.round(((_a = xScale(d)) !== null && _a !== void 0 ? _a : 0) + xScale.bandwidth() / 2 - degreesQuarterCircle)})translate(${innerRadius},0)`;
    }));
    label
        .filter((_d, i) => i % 3 !== 0)
        .append("line")
        .attr("x2", 9);
    label
        .filter((_d, i) => i % 3 === 0)
        .append("text")
        .attr("transform", (d) => {
        var _a, _b, _c, _f, _g;
        let rotate = Math.round(((_a = xScale(d)) !== null && _a !== void 0 ? _a : 0) + xScale.bandwidth() / 2);
        let translate = "";
        dummy.text(d);
        const textHeight = (_c = (_b = dummy.node()) === null || _b === void 0 ? void 0 : _b.getBBox().height) !== null && _c !== void 0 ? _c : 0;
        const textWidth = (_g = (_f = dummy.node()) === null || _f === void 0 ? void 0 : _f.getBBox().width) !== null && _g !== void 0 ? _g : 0;
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
        .text((d) => d);
    dummy.remove();
};
export const printSmallCompassRose = ({ element, radius, }) => {
    const steps = numberSegments;
    const degreesPerStep = degreesFullCircle / steps;
    const innerRadius = Math.round(radius * 0.8);
    const strokeWidth = 1.5;
    const data = new Array(steps).fill(null).map((_e, i) => degreesToCompass(i * degreesPerStep));
    const xScale = d3ScaleBand()
        .range([0 - degreesPerStep / 2, degreesFullCircle - degreesPerStep / 2])
        .domain(data)
        .align(0);
    element.append("circle").attr("r", innerRadius).style("stroke-width", `${strokeWidth}px`);
    const x2 = 2;
    const x2InterCard = 4;
    const x2Card = 6;
    element
        .selectAll("line")
        .data(data)
        .join((enter) => enter
        .append("line")
        .attr("x2", (_d, i) => {
        if (i % 3 === 0) {
            return i % 6 === 0 ? x2Card : x2InterCard;
        }
        return x2;
    })
        .attr("transform", (d) => { var _a; return `rotate(${Math.round(((_a = xScale(d)) !== null && _a !== void 0 ? _a : 0) + xScale.bandwidth() / 2)})translate(${innerRadius},0)`; }));
};
export const displayClan = (clan) => `<span class="caps">${clan}</span>`;
const copyToClipboardFallback = (text, modal$) => {
    if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        const input = document.createElement("input");
        input.type = "text";
        input.value = text;
        input.style.position = "absolute";
        input.style.left = "-1000px";
        input.style.top = "-1000px";
        modal$.append(input);
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
        .catch((error) => {
        console.error(`Cannot copy ${text} to clipboard`, error);
        return false;
    });
};
export const copyToClipboard = (text, modal$) => {
    if (!navigator.clipboard) {
        copyToClipboardFallback(text, modal$);
    }
    writeClipboard(text);
};
export const copyF11ToClipboard = (x, z, modal$) => {
    if (Number.isFinite(x) && Number.isFinite(z)) {
        const F11Url = new URL(window.location.href);
        F11Url.searchParams.set("x", String(x));
        F11Url.searchParams.set("z", String(z));
        copyToClipboard(F11Url.href, modal$);
    }
};
export const drawSvgCircle = (x, y, r) => `M${x},${y} m${-r},0 a${r},${r} 0,1,0 ${r * 2},0 a${r},${r} 0,1,0 ${-r * 2},0`;
export const drawSvgRect = (x, y, r) => `M${x - r / 2},${y - r / 2}h${r}v${r}h${-r}z`;
export const drawSvgLine = (x, y, l) => `M${x},${y}v${l}`;
//# sourceMappingURL=util.js.map