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
import { scaleLinear as d3ScaleLinear } from "d3-scale";
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

        this._arrowWidth = 10;

        this._setupSvg();
        this._test();
    }

    _setupSvg() {
        this._g = d3Select("#na-svg")
            .append("g")
            .classed("trades", true);

        const width = this._arrowWidth;
        const doubleWidth = this._arrowWidth * 2;

        d3Select("#na-svg defs")
            .append("marker")
            .attr("id", "trade-arrow")
            .attr("viewBox", `0 -${width} ${doubleWidth} ${doubleWidth}`)
            .attr("refX", doubleWidth)
            .attr("refY", 0)
            .attr("markerWidth", width + 1)
            .attr("markerHeight", width + 1)
            .attr("orient", "auto")
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
                    +port.id,
                    {
                        x: +port.geometry.coordinates[0],
                        y: +port.geometry.coordinates[1]
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
        linkData.sort((a, b) => {
            if (a.source > b.source) {
                return 1;
            }
            if (a.source < b.source) {
                return -1;
            }

            if (a.target > b.target) {
                return 1;
            }
            if (a.target < b.target) {
                return -1;
            }
            return 0;
        });

        // any links with duplicate source and target get an incremented 'linknum'
        linkData.forEach((link, i) => {
            if (i !== 0 && link.source === linkData[i - 1].source && link.target === linkData[i - 1].target) {
                // eslint-disable-next-line no-param-reassign
                link.linknum = linkData[i - 1].linknum + 1;
            } else {
                // eslint-disable-next-line no-param-reassign
                link.linknum = 1;
            }
        });

        console.log(linkData);

        // http://bl.ocks.org/martinjc/af943be09a748aa747ba3a622b7ff132
        const linkStrengthScale = d3ScaleLinear()
            .range([0, 0.45])
            .domain(d3Extent(linkData, d => d.value));

        this._links = this._g
            .selectAll(".trade-link")
            .data(linkData)
            .enter()
            .append("path")
            .attr("class", "trade-link")
            .attr("stroke-width", "4")
            .attr("marker-end", "url(#trade-arrow)")
            .attr("d", d => {
                // Total difference in x and y from source to target
                const diffX = nodeData.get(d.target).x - nodeData.get(d.source).x;
                const diffY = nodeData.get(d.target).y - nodeData.get(d.source).y;

                // Length of path from center of source node to center of target node
                const pathLength = Math.sqrt(diffX * diffX + diffY * diffY);

                // x and y distances from center to outside edge of target node
                const offsetX = (diffX * defaultCircleSize) / pathLength;
                const offsetY = (diffY * defaultCircleSize) / pathLength;

                const dr = 75 / d.linknum; // linknum is defined above
                return `M${nodeData.get(d.source).x},${nodeData.get(d.source).y}A${dr},${dr} 0 0,1 ${nodeData.get(
                    d.target
                ).x - offsetX},${nodeData.get(d.target).y - offsetY}`;
            });
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap() {
        this._g.selectAll("*").remove();
    }
}
