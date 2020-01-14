#!/usr/bin/env -S node --experimental-modules

/**
 * This file is part of na-map.
 *
 * @file      Main.
 * @module    main
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { getApiData } from "./get-api-data.mjs";
import { convertSpecialPortData } from "./convert-special-port-data.mjs";

getApiData();
// convertSpecialPortData();
