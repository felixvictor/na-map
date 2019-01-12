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

import {
    forceSimulation as d3ForceSimulation,
    forceLink as d3ForceLink,
    forceCenter as d3ForceCenter,
    forceCollide as d3ForceCollide,
    forceManyBody as d3ForceManyBody
} from "d3-force";
import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { select as d3Select } from "d3-selection";

/**
 * Show trades
 */
export default class ShowTrades {
    /**
     * @param {object} portData - Port data
     * @param {object} map - Map
     */
    constructor(portData, map) {
        this._portData = portData;
        this._map = map;

        this._setupSvg();
        this._test();
    }

    _setupSvg() {
        this._g = d3Select("#na-svg")
            .append("g")
            .classed("trades", true);
    }

    _test() {
        const linkedByIndex = {};

        const isConnected = (a, b) =>
            linkedByIndex[`${a.index},${b.index}`] || linkedByIndex[`${b.index},${a.index}`] || a.index === b.index;

        const mouseOver = d => {
            const opacity = 0.1;
            this._nodes.style("stroke-opacity", o => {
                thisOpacity = isConnected(d, o) ? 1 : opacity;
                return thisOpacity;
            });
            this._nodes.style("fill-opacity", o => {
                thisOpacity = isConnected(d, o) ? 1 : opacity;
                return thisOpacity;
            });
            this._links.style("stroke-opacity", o => (o.source === d || o.target === d ? 1 : opacity));
            this._links.style("stroke", o => (o.source === d || o.target === d ? o.source.colour : "#ddd"));
        };

        const mouseOut = () => {
            this._links.style("stroke-opacity", 1);
            this._links.style("stroke", "#ddd");
        };

        const ticked = () => {
            this._links.attr("d", d => {
                console.log(d);
                const dr = 75 / d.linknum; // linknum is defined above
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });
        };

        /*
        const ticked = () => {
            this._links.attr("d", d => {
                console.log(d);
                const offset = 30;

                const midpointX = (d.source.x + d.target.x) / 2;
                const midpointY = (d.source.y + d.target.y) / 2;

                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;

                const normalise = Math.sqrt(dx * dx + dy * dy);

                const offSetX = midpointX + offset * (dy / normalise);
                const offSetY = midpointY - offset * (dx / normalise);

                return `M${d.source.x},${d.source.y}S${offSetX},${offSetY} ${d.target.x},${d.target.y}`;
            });
        };
*/

        const ids = [231, 234, 238];
        const nodeData = this._portData
            .filter(port => ids.includes(+port.id))
            .map(port => ({
                id: +port.id,
                name: port.properties.name,
                fx: +port.geometry.coordinates[0],
                fy: +port.geometry.coordinates[1]
            }));

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

        /*
        // Compute the distinct nodes from the links.
        linkData = linkData.map(link => ({
            source: nodeData[link.source] || (nodeData[link.source] = { name: link.source }),
            target: nodeData[link.target] || (nodeData[link.target] = { name: link.target }),
            value: link.value
        }));
*/

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
        debugger;
        // http://bl.ocks.org/martinjc/af943be09a748aa747ba3a622b7ff132

        const linkStrengthScale = d3ScaleLinear()
            .range([0, 0.45])
            .domain(d3Extent(linkData, d => d.value));

        const simulation = d3ForceSimulation().force(
            "link",
            d3ForceLink()
                .id(d => d.id)
                .strength(d => linkStrengthScale(d.value))
        );
        //  .force("center", d3ForceCenter(this._map.width / 2, this._map.height / 2))
        // .force("collide", d3ForceCollide().radius(12))
        // .force("charge", d3ForceManyBody().strength(-100))

        this._links = this._g
            .selectAll(".link")
            .data(linkData)
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("stroke", "#ddd")
            .attr("stroke-width", "4");

        this._nodes = this._g
            .selectAll(".node")
            .data(nodeData)
            .enter()
            .append("g")
            .on("mouseover", mouseOver)
            .on("mouseout", mouseOut);

        this._nodes
            .append("circle")
            .attr("class", "node")
            .attr("r", 8)
            .attr("fill", "#3e6")
            .attr("stroke", "#ddd");

        this._nodes
            .append("text")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(d => d.name)
            .style("stroke", "black")
            .style("stroke-width", 0.5)
            .style("fill", "#555");

        simulation.nodes(nodeData).on("tick", ticked);

        simulation.force("link").links(linkData);

        linkData.forEach(d => {
            linkedByIndex[`${d.source.index},${d.target.index}`] = 1;
        });
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap() {
        this._g.selectAll("*").remove();
    }
}
