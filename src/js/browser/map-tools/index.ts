/*!
 * This file is part of na-map.
 *
 * @file      Map tools main file.
 * @module    map-tools/index
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import PredictWind from "./predict-wind"
import WindRose from "./wind-rose"

import "../../../scss/map-tools.scss"

/**
 * Init
 */
const init = (): void => {
    void new PredictWind()
    void new WindRose()
}

export { init }
