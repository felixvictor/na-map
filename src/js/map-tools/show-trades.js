/**
 * This file is part of na-map.
 *
 * @file      Show trades.
 * @module    map-tools/show-trades
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { extent as d3Extent } from "d3-array";
import { scaleLinear as d3ScaleLinear, scalePoint as d3ScalePoint } from "d3-scale";
import { select as d3Select } from "d3-selection";

import { defaultCircleSize, defaultFontSize } from "../common";
import { formatInt, roundToThousands } from "../util";

/**
 * Show trades
 */
export default class ShowTrades {
    /**
     * @param {object} portData - Port data
     * @param {number} minScale - Minimal scale
     */
    constructor(portData, minScale) {
        this._portData = portData;

        this._minScale = minScale;
        this._scale = this._minScale;
        this._circleSize = defaultCircleSize;
        this._fontSize = defaultFontSize;

        this._arrowX = 9;
        this._arrowY = 6;

        this._setupSvg();
        this._setupData();
    }

    _setupSvg() {
        this._g = d3Select("#na-svg")
            .insert("g", "g.pb")
            .attr("class", "trades");
        this._labelG = this._g.append("g");

        d3Select("#na-svg defs")
            .append("marker")
            .attr("id", "trade-arrow")
            .attr("refX", this._arrowX / 1.2)
            .attr("refY", this._arrowY / 2)
            .attr("markerWidth", 10)
            .attr("markerHeight", 10)
            .attr("markerUnits", "userSpaceOnUse")
            .attr("orient", "auto-start-reverse")
            .append("path")
            .attr("d", `M0,0L0,${this._arrowY}L${this._arrowX},${this._arrowY / 2}z`)
            .attr("class", "trade-head");
    }

    _setupData() {
        const ids = [231, 234, 238];
        this._nodeData = new Map(
            this._portData
                .filter(port => ids.includes(+port.id))
                .map(port => [
                    +port.id,
                    {
                        x: port.coordinates[0],
                        y: port.coordinates[1]
                    }
                ])
        );

        this._linkData = [
            {
                good: "Live Oak Log",
                source: { id: 234, grossPrice: 10 },
                target: { id: 238, grossPrice: 105 },
                quantity: 1500,
                profit: 142500,
                profitPerItem: 95,
                totalWeight: 4650
            },
            {
                good: "Cuban Tobacco",
                source: { id: 234, grossPrice: 482 },
                target: { id: 238, grossPrice: 912 },
                quantity: 336,
                profit: 144480,
                profitPerItem: 430,
                totalWeight: 33600
            },
            {
                good: "Copper Ingots",
                source: { id: 234, grossPrice: 9 },
                target: { id: 238, grossPrice: 318 },
                quantity: 850,
                profit: 262650,
                profitPerItem: 309,
                totalWeight: 570
            },
            {
                good: "Spanish Almonds",
                source: { id: 234, grossPrice: 485 },
                target: { id: 238, grossPrice: 914 },
                quantity: 2578,
                profit: 1105962,
                profitPerItem: 429,
                totalWeight: 257800
            },
            {
                good: "Spanish Almonds",
                source: { id: 234, grossPrice: 485 },
                target: { id: 231, grossPrice: 914 },
                quantity: 2578,
                profit: 1105962,
                profitPerItem: 429,
                totalWeight: 257800
            },
            {
                good: "Spanish Almonds",
                source: { id: 238, grossPrice: 485 },
                target: { id: 234, grossPrice: 914 },
                quantity: 2578,
                profit: 1105962,
                profitPerItem: 429,
                totalWeight: 257800
            }
        ];
    }

    /**
     * @link https://bl.ocks.org/mattkohl/146d301c0fc20d89d85880df537de7b0
     * @return {void}
     * @private
     */
    _updateTrades() {
        const linkWidthScale = d3ScaleLinear()
            .range([1 / this._scale, 10 / this._scale])
            .domain(d3Extent(this._linkData, d => d.profit));
        const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale);
        const circleSize = roundToThousands(this._circleSize / circleScale);
        const fontScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale);
        const fontSize = roundToThousands(this._fontSize / fontScale);

        const arcPath = (leftHand, d) => {
            const getSiblingLinks = (sourceId, targetId) =>
                this._linkData
                    .filter(
                        link =>
                            (link.source.id === sourceId && link.target.id === targetId) ||
                            (link.source.id === targetId && link.target.id === sourceId)
                    )
                    .map(link => link.profit);

            const source = { x: this._nodeData.get(d.source.id).x, y: this._nodeData.get(d.source.id).y };
            const target = { x: this._nodeData.get(d.target.id).x, y: this._nodeData.get(d.target.id).y };
            const x1 = leftHand ? source.x : target.x;
            const y1 = leftHand ? source.y : target.y;
            let x2 = leftHand ? target.x : source.x;
            let y2 = leftHand ? target.y : source.y;

            // Calculate the angle of the arrow in radian
            const rad = Math.atan2(y2 - y1, x2 - x1);

            // Calculate the radius (the length of the arrow)
            // Note: Your arrow size depends on the the 'strokeWidth' attribute of your line
            //  const r = circleSize /2;
            const r = 0;

            console.log({ r }, { rad });
            // Calculate the position of the point
            x2 -= Math.round(r * Math.cos(rad));
            y2 -= Math.round(r * Math.sin(rad));

            let dr = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const xRotation = 0;
            const largeArc = 0;
            const sweep = leftHand ? 0 : 1;
            const siblings = getSiblingLinks(d.source.id, d.target.id);
            if (siblings.length > 1) {
                const arcScale = d3ScalePoint()
                    .domain(siblings)
                    .range([1, siblings.length]);
                dr /= 1 + (1 / siblings.length) * (arcScale(d.profit) - 1);
            }
            dr = Math.round(dr);

            return `M${x1},${y1}A${dr},${dr} ${xRotation},${largeArc},${sweep} ${x2},${y2}`;
        };

        const getId = link => `${link.source.id}-${link.good.replace(/ /g, "")}-${link.target.id}`;

        const linksUpdate = this._g.selectAll(".trade-link").data(this._linkData, d => getId(d));
        linksUpdate.exit().remove();
        const linksEnter = linksUpdate
            .enter()
            .append("path")
            .attr("class", "trade-link")
            .attr("marker-end", "url(#trade-arrow)")
            .attr("id", d => getId(d));
        linksUpdate
            .merge(linksEnter)
            .attr("d", d => arcPath(this._nodeData.get(d.source.id).x < this._nodeData.get(d.target.id).x, d))
            .attr("stroke-width", d => `${linkWidthScale(d.profit)}px`);

        this._labelG.attr("font-size", `${fontSize}px`);

        const labelUpdate = this._labelG.selectAll(".trade-label").data(this._linkData, d => getId(d));
        labelUpdate.exit().remove();
        const labelEnter = labelUpdate
            .enter()
            .append("text")
            .attr("class", "trade-label");
        labelEnter
            .append("textPath")
            .attr("startOffset", "50%")
            .attr("xlink:href", d => `#${getId(d)}`)
            .text(d => `${formatInt(d.quantity)} ${d.good}`);
        labelUpdate.merge(labelEnter).attr("dy", d => `-${linkWidthScale(d.profit) / 2}px`);
    }

    transform(transform) {
        this._g.attr("transform", transform);
        this._scale = transform.k;
        this._updateTrades();
    }

    clearMap() {
        this._g.selectAll("*").remove();
    }
}
