/**
 * This file is part of na-map.
 *
 * @file      Make map tiles.
 * @module    game-tools/list-modules
 * @author    iB aka Felix Victor
 * @copyright 2018-2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// eslint-disable-next-line camelcase
import child_process from "child_process";
import sharp from "sharp";

const inFilename = process.argv[2];
const tileSize = 256;
const mapPath = "src/images/map";
const iconsPath = "src/images/icons";
const logoMainFile = `${iconsPath}/logo.png`;
const icoFile = `${iconsPath}/favicon.ico`;

const convert = async () => {
    try {
        await sharp(inFilename)
            .jpeg({ quality: 100, trellisQuantisation: true, overshootDeringing: true, progressive: false })
            .sharpen()
            .tile({ size: tileSize, layout: "google" })
            .toFile(mapPath);

        // eslint-disable-next-line camelcase
        await child_process.exec(`convert ${inFilename} -resize 1024 ${logoMainFile}`, (err, stdout, stderr) => {
            if (err) {
                throw err;
            }

            if (stdout) {
                console.log("stdout:", stdout);
            }

            if (stderr) {
                console.error("stderr:", stderr);
            }
        });

        // eslint-disable-next-line camelcase
        await child_process.exec(
            `convert ${logoMainFile} -define icon:auto-resize=16,32,48,64,128,256 ${icoFile}`,
            (err, stdout, stderr) => {
                if (err) {
                    throw err;
                }

                if (stdout) {
                    console.log("stdout:", stdout);
                }

                if (stderr) {
                    console.error("stderr:", stderr);
                }
            }
        );
    } catch (error) {
        throw new Error(error);
    }
};

convert();
