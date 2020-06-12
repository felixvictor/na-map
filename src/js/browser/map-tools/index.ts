/*!
 * This file is part of na-map.
 *
 * @file      Map tools main file.
 * @module    map-tools/index
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import PredictWind from "./predict-wind"
import WindRose from "./wind-rose"

/**
 * Init
 */
const init = (): void => {
    void new PredictWind()
    void new WindRose()
}

export { init }
