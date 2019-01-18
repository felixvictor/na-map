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

import { defaultCircleSize } from "../common";

/**
 * Show trades
 */
export default class ShowTrades {
    /**
     * @param {object} portData - Port data
     * @param {Map} map - Map
     */
    constructor(portData, map) {
        this._portData = portData;
        this._map = map;

        this._arrowWidth = 5;

        this._setupSvg();
        this._test();
    }

    _setupSvg() {
        this._g = d3Select("#na-svg")
            .insert("g", "g.pb")
            .attr("class", "trades");

        const width = this._arrowWidth;
        const doubleWidth = this._arrowWidth * 2;

        d3Select("#na-svg defs")
            .append("marker")
            .attr("id", "trade-arrow")
            .attr("viewBox", `0 -${width} ${doubleWidth} ${doubleWidth}`)
            .attr("refX", 16)
            .attr("refY", 0)
            .attr("markerWidth", 20)
            .attr("markerHeight", 20)
            .attr("markerUnits", "strokeWidth")
            .attr("orient", "auto")
            .attr("xoverflow", "visible")
            .append("path")
            .attr("d", `M0,-${width}L${doubleWidth},0L0,${width}`)
            .attr("class", "trade-head");
    }

    _test() {
        const ids = [231, 234, 238];
        const nodeData = new Map(
            this._portData
                .filter(port => ids.includes(+port.id))
                .map(port => [
                    port.id,
                    {
                        x: port.coordinates[0],
                        y: port.coordinates[1]
                    }
                ])
        );

        const linkData = [
            { source: 234, target: 238, value: 10 },
            { source: 234, target: 238, value: 100 },
            { source: 234, target: 238, value: 150 },
            { source: 234, target: 231, value: 50 },
            { source: 238, target: 234, value: 200 }
        ];

        // sort links by source, then target
        linkData.sort((a, b) => a.source - b.source || a.target - b.target || a.value - b.value);
        console.log(linkData);

        // http://bl.ocks.org/martinjc/af943be09a748aa747ba3a622b7ff132
        const linkStrengthScale = d3ScaleLinear()
            .range([0, 0.45])
            .domain(d3Extent(linkData, d => d.value));

        const arcPath = (leftHand, d) => {
            const getSiblingLinks = (source, target) =>
                linkData
                    .filter(
                        link =>
                            (link.source === source && link.target === target) ||
                            (link.source === target && link.target === source)
                    )
                    .map(link => link.value);

            const x1 = leftHand ? nodeData.get(d.source).x : nodeData.get(d.target).x;
            const y1 = leftHand ? nodeData.get(d.source).y : nodeData.get(d.target).y;
            const x2 = leftHand ? nodeData.get(d.target).x : nodeData.get(d.source).x;
            const y2 = leftHand ? nodeData.get(d.target).y : nodeData.get(d.source).y;
            let dr = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const xRotation = 0;
            const largeArc = 0;
            const sweep = leftHand ? 0 : 1;
            const siblings = getSiblingLinks(d.source, d.target);

            if (siblings.length > 1) {
                const arcScale = d3ScalePoint()
                    .domain(siblings)
                    .range([1, siblings.length]);
                dr = Math.round(dr / (1 + (1 / siblings.length) * (arcScale(d.value) - 1)));
            }

            return `M${x1},${y1}A${dr},${dr} ${xRotation},${largeArc},${sweep} ${x2},${y2}`;
        };

        this._links = this._g.selectAll(".trade-link").data(linkData);
        this._links
            .enter()
            .append("path")
            .attr("class", "trade-link")
            .attr("marker-end", "url(#trade-arrow)")
            .attr("d", d => arcPath(true, d));

        this._links.exit().remove();

        this._labelPath = this._g.selectAll(".trade-label-path").data(linkData);
        this._labelPath
            .enter()
            .append("path")
            .attr("class", "trade-link")
            .attr("id", d => `invis_${d.source}-${d.value}-${d.target}`)
            .attr("d", d => arcPath(nodeData.get(d.source).x < nodeData.get(d.target).x, d));
        this._labelPath.exit().remove();

        this._label = this._g.selectAll(".trade-label").data(linkData);
        this._label
            .enter()
            .append("g")
            .append("text")
            .attr("class", "trade-label")
            .append("textPath")
            .attr("startOffset", "50%")
            .attr("xlink:href", d => `#invis_${d.source}-${d.value}-${d.target}`)
            .text(d => d.value);
        this._label.exit().remove();
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap() {
        this._g.selectAll("*").remove();
    }
}
