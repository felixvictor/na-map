// eslint-disable-next-line camelcase
import child_process from "child_process";
// eslint-disable-next-line import/no-extraneous-dependencies
import sharp from "sharp";

const inFilename = process.argv[2];
const tileSize = 256;
const mapPath = "src/images/map";
const iconsPath = "src/images/icons";
const logoMainFile = `${iconsPath}/logo.png`;
const icoFile = `${iconsPath}/favicon.ico`;

sharp(inFilename)
    .jpeg({ quality: 100, trellisQuantisation: true, overshootDeringing: true, progressive: false })
    .sharpen()
    .tile({ size: tileSize, layout: "google" })
    .toFile(mapPath)
    .then(
        // eslint-disable-next-line camelcase
        child_process.exec(`convert ${inFilename} -resize 1024 ${logoMainFile}`, (err, stdout, stderr) => {
            if (err) {
                throw err;
            }

            if (stdout) {
                console.log("stdout:", stdout);
            }

            if (stderr) {
                console.error("stderr:", stderr);
            }
        })
    )
    .then(
        // eslint-disable-next-line camelcase
        child_process.exec(
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
        )
    )
    .catch(error => {
        throw new Error(error);
    });
