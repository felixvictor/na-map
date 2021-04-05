/*!
 * This file is part of na-map.
 *
 * @file      Select ports nation options.
 * @module    map/select-ports/nation-options
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { Nation, nations, sortBy } from "common/common"

export const getNationOptions = (neutralPortsIncluded = true): string =>
    `${nations
        // Exclude neutral nation and free towns when neutralPortsIncluded is set
        .filter((nation) => !(!neutralPortsIncluded && (nation.short === "FT" || nation.short === "NT")))
        .sort(sortBy(["name"]))
        .map((nation: Nation): string => `<option value="${nation.short}">${nation.name}</option>`)
        .join("")}`
