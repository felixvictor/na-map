// eslint-disable-next-line import/no-extraneous-dependencies
import sharp from "sharp";

const inFilename = process.argv[2],
    tileSize = 256,
    outPath = "src/images/map";

sharp(inFilename)
    .jpeg({
        quality: 70,
        trellisQuantisation: true,
        overshootDeringing: true,
        optimiseScans: true
    })
    .sharpen()
    .tile({ size: tileSize, layout: "google" })
    .toFile(outPath);
