/*!
 * This file is part of na-map.
 *
 * @file      Make map tiles.
 * @module    src/node/make-tiles
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// eslint-disable-next-line @typescript-eslint/camelcase
import child_process from "child_process"
import sharp from "sharp"

const inFilename = process.argv[2]
const tileSize = 256
const mapPath = "src/images/map"
const iconsPath = "src/images/icons"
const logoMainFile = `${iconsPath}/logo.png`

const convert = async (): Promise<void> => {
    try {
        await sharp(inFilename)
            .webp({ quality: 100, reductionEffort: 6 })
            .sharpen()
            .tile({ size: tileSize, layout: "google" })
            .toFile(mapPath)

        // eslint-disable-next-line @typescript-eslint/camelcase
        child_process.exec(`convert ${inFilename} -resize 1024 ${logoMainFile}`, (err, stdout, stderr) => {
            if (err) {
                throw err
            }

            if (stdout) {
                console.log("stdout:", stdout)
            }

            if (stderr) {
                console.error("stderr:", stderr)
            }
        })
    } catch (error) {
        throw new Error(error)
    }
}

convert()
