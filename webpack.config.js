/**
 * webpack.config
 */

const path = require("path")
const webpack = require("webpack")

// const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer")
const CopyPlugin = require("copy-webpack-plugin")
const FaviconsPlugin = require("favicons-webpack-plugin")
const HtmlPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const parseCss = require("css")
const PreloadWebpackPlugin = require("preload-webpack-plugin")
const sass = require("sass")
const SitemapPlugin = require("sitemap-webpack-plugin").default
// const SriPlugin = require("webpack-subresource-integrity")
const TerserPlugin = require("terser-webpack-plugin")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")

const dirOutput = path.resolve(__dirname, "public")
const dirSrc = path.resolve(__dirname, "src")
const dirLib = path.resolve(dirSrc, "lib")

const dirFlags = path.resolve(dirSrc, "images", "flags")
const dirFonts = path.resolve(dirSrc, "fonts")
const dirIcons = path.resolve(dirSrc, "icons")
const dirJsSrc = path.resolve(dirSrc, "js")
const dirMap = path.resolve(dirSrc, "images", "map")
const dirPrefixIcons = path.join("images", "icons")

const fileLogo = path.resolve(dirSrc, dirPrefixIcons, "logo.png")
const filePostcssConfig = path.resolve(dirSrc, "postcss.config.js")
const fileScssPreCompile = path.resolve(dirSrc, "scss", "pre-compile.scss")

// Variables
const PACKAGE = require("./package.json")
const repairs = require(`${dirLib}/gen-generic/repairs.json`)
const { isProduction } = require("webpack-mode")
const servers = [
    { id: "eu1", name: "War", type: "PVP" },
    { id: "eu2", name: "Peace", type: "PVE" },
]
const { TARGET, QUIET } = process.env
const isQuiet = Boolean(QUIET)

const targetUrl = TARGET ? `https://${TARGET}.netlify.app/` : `http://localhost/na/`
const publicPath = TARGET || !isProduction ? "/" : `http://localhost/na/`

const libraryName = PACKAGE.name
const descriptionLong =
    "Yet another map with in-game map, resources, ship and wood comparisons. Port battle data is updated constantly from twitter and all data daily after maintenance."
const sitemapPaths = ["/fonts/", "/icons", "/images"]

const regExpFont = /\.(woff2?|ttf)$/
const regExpCss = /^map\.\w+\.css$/

const setColours = () => {
    const compiledCss = sass
        .renderSync({
            file: fileScssPreCompile,
        })
        .css.toString()
    const parsedCss = parseCss.parse(compiledCss)
    return new Map(
        parsedCss.stylesheet.rules
            .filter((rule) => rule.selectors && rule.selectors[0].startsWith(".colour-palette "))
            .filter(
                (rule) =>
                    rule &&
                    rule.declarations &&
                    rule.declarations.find((declaration) => declaration.property === "background-color")
            )
            .map((rule) => {
                const d =
                    rule &&
                    rule.declarations &&
                    rule.declarations.find((declaration) => declaration.property === "background-color")
                return [rule.selectors[0].replace(".colour-palette .", "") || "", d.value || ""]
            })
    )
}

const colours = setColours()
const backgroundColour = colours.get("primary-500")
const themeColour = colours.get("secondary-500")
const colourYellowDark = colours.get("yellow-dark")
const primary700 = colours.get("primary-700")
const primary200 = colours.get("primary-200")
const primary300 = colours.get("primary-300")
const colourGreen = colours.get("green")
const colourGreenLight = colours.get("green-light")
const colourGreenDark = colours.get("green-dark")
const colourRed = colours.get("red")
const colourRedLight = colours.get("red-light")
const colourRedDark = colours.get("red-dark")
const colourWhite = colours.get("white")

const babelOpt = {
    cacheDirectory: true,
    plugins: [
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-proposal-nullish-coalescing-operator",
        "@babel/plugin-syntax-dynamic-import",
        "@babel/plugin-transform-spread",
    ],
    presets: [
        [
            "@babel/preset-env",
            {
                // debug: true,
                corejs: { version: 3 },
                modules: false,
                shippedProposals: true,
                targets: PACKAGE.browserslist,
                useBuiltIns: "usage",
            },
        ],
        "@babel/typescript",
    ],
}

const cssLoaderOpt = {
    sourceMap: !isProduction,
}

const htmlMinifyOpt = {
    collapseBooleanAttributes: true,
    collapseInlineTagWhitespace: true,
    collapseWhitespace: false,
    decodeEntities: true,
    html5: true,
    minifyURLs: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    sortAttributes: true,
    sortClassName: true,
    useShortDoctype: true,
}

const postcssLoaderOpt = {
    postcssOptions: {
        config: filePostcssConfig,
    },
    sourceMap: true,
}

const sassLoaderOpt = {
    sourceMap: !isProduction,
    sassOptions: {
        outputStyle: "expanded",
        precision: 6,
        sourceMap: !isProduction,
        sourceMapContents: !isProduction,
    },
}

const svgoOpt = {
    plugins: [
        { cleanupAttrs: true },
        { removeDoctype: true },
        { removeXMLProcInst: true },
        { removeComments: true },
        { removeMetadata: true },
        { removeTitle: true },
        { removeDesc: true },
        { removeUselessDefs: true },
        { removeXMLNS: false },
        { removeEditorsNSData: true },
        { removeEmptyAttrs: true },
        { removeHiddenElems: true },
        { removeEmptyText: true },
        { removeEmptyContainers: true },
        { removeViewBox: false },
        { cleanupEnableBackground: true },
        { minifyStyles: true },
        { convertStyleToAttrs: true },
        { convertColors: true },
        { convertPathData: true },
        { convertTransform: true },
        { removeUnknownsAndDefaults: true },
        { removeNonInheritableGroupAttrs: true },
        { removeUselessStrokeAndFill: true },
        { removeUnusedNS: true },
        { cleanupIDs: true },
        { cleanupNumericValues: true },
        { cleanupListOfValues: false },
        { moveElemsAttrsToGroup: true },
        { moveGroupAttrsToElems: true },
        { collapseGroups: true },
        { removeRasterImages: false },
        { mergePaths: true },
        { convertShapeToPath: true },
        { sortAttrs: false },
        { transformsWithOnePath: false },
        { removeDimensions: true },
        { removeAttrs: false },
        { removeElementsByAttr: true },
        { removeStyleElement: true },
        { addClassesToSVGElement: false },
        { addAttributesToSVGElement: false },
        { removeStyleElement: false },
        { removeScriptElement: false },
    ],
}

// noinspection JSIncompatibleTypesComparison
const htmlOpt = {
    iconSmall: `${dirPrefixIcons}/android-chrome-48x48.png`,
    iconLarge: `${dirPrefixIcons}/firefox_app_512x512.png`,
    canonicalUrl: TARGET === "na-map" ? targetUrl : "",
    name: libraryName,
    description: descriptionLong,
    hash: false,
    inject: "body",
    lang: "en-GB",
    meta: { viewport: "width=device-width, initial-scale=1, shrink-to-fit=no" },
    minify: htmlMinifyOpt,
    scriptLoading: "defer",
    servers,
    template: path.resolve(__dirname, dirSrc, "index.template.ejs"),
    title: PACKAGE.description,
}

const faviconsOpt = {
    logo: fileLogo,
    cache: true,
    devMode: "webapp",
    inject: true,
    prefix: dirPrefixIcons,
    favicons: {
        appDescription: PACKAGE.description,
        appName: PACKAGE.name,
        appShortName: PACKAGE.name,
        background: backgroundColour,
        fingerprints: false,
        icons: {
            android: true,
            appleIcon: false,
            appleStartup: false,
            coast: false,
            favicons: true,
            firefox: true,
            windows: true,
            yandex: false,
        },
        lang: "en-GB",
        // eslint-disable-next-line camelcase
        start_url: "/",
        // eslint-disable-next-line camelcase
        theme_color: themeColour,
        version: PACKAGE.version,
    },
}

const MiniCssExtractPluginOpt = {
    esModule: true,
}

const getSvgLoaderOpt = (path) => ({
    esModule: false,
    limit: 1000,
    name: "[name].[ext]",
    outputPath: path,
})

const config = {
    devServer: {
        hot: true,
        open: true,
    },

    devtool: false,

    entry: [path.resolve(dirJsSrc, "browser/main.ts")],

    externals: {
        jquery: "jQuery",
        "popper.js": "Popper",
    },

    optimization: {
        runtimeChunk: "single",
        splitChunks: {
            chunks: "all",
        },
    },

    output: {
        crossOriginLoading: "anonymous",
        filename: isProduction ? "[name].[contenthash].js" : "[name].js",
        path: dirOutput,
        publicPath,
    },

    plugins: [
        new CleanWebpackPlugin({
            verbose: false,
        }),
        new MiniCssExtractPlugin({
            filename: isProduction ? "[name].[contenthash].css" : "[name].css",
        }),
        new webpack.DefinePlugin({
            CPRIMARY300: JSON.stringify(primary300),
            CGREEN: JSON.stringify(colourGreen),
            CGREENLIGHT: JSON.stringify(colourGreenLight),
            CGREENDARK: JSON.stringify(colourGreenDark),
            CRED: JSON.stringify(colourRed),
            CREDLIGHT: JSON.stringify(colourRedLight),
            CREDDARK: JSON.stringify(colourRedDark),
            CWHITE: JSON.stringify(colourWhite),
            NAME: JSON.stringify(libraryName),
            DESCRIPTION: JSON.stringify(descriptionLong),
            TITLE: JSON.stringify(PACKAGE.description),
            VERSION: JSON.stringify(PACKAGE.version),
            ICONSMALL: JSON.stringify(`${dirPrefixIcons}/android-chrome-48x48.png`),
            REPAIR_ARMOR_VOLUME: JSON.stringify(repairs.armorRepair.volume),
            REPAIR_ARMOR_PERCENT: JSON.stringify(repairs.armorRepair.percent),
            REPAIR_ARMOR_TIME: JSON.stringify(repairs.armorRepair.time),
            REPAIR_SAIL_VOLUME: JSON.stringify(repairs.sailRepair.volume),
            REPAIR_SAIL_PERCENT: JSON.stringify(repairs.sailRepair.percent),
            REPAIR_CREW_VOLUME: JSON.stringify(repairs.crewRepair.volume),
            REPAIR_CREW_PERCENT: JSON.stringify(repairs.crewRepair.percent),
        }),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery",
            Popper: ["popper.js", "default"],
        }),
        new CopyPlugin({
            patterns: [
                { from: "netlify.toml" },
                { from: `${dirLib}/gen-generic/*.xlsx`, to: `${dirOutput}/data` },
                { from: `${dirLib}/gen-server`, to: `${dirOutput}/data` },
                { from: `${dirSrc}/google979f2cf3bed204d6.html` },
                { from: dirMap, to: `${dirOutput}/images/map` },
            ],
        }),
        new HtmlPlugin(htmlOpt),
        new FaviconsPlugin(faviconsOpt),
        new PreloadWebpackPlugin({
            rel: "preload",
            include: "allAssets",
            fileWhitelist: [regExpFont, regExpCss],
            as(entry) {
                if (regExpCss.test(entry)) {
                    return "style"
                }

                if (regExpFont.test(entry)) {
                    return "font"
                }

                return "script"
            },
        }),
        new SitemapPlugin({ base: targetUrl, paths: sitemapPaths, options: { skipGzip: false } }),
        /*
        new SriPlugin({
            hashFuncNames: ["sha384"],
            enabled: isProduction,
        }),
        */
    ],

    resolve: {
        extensions: [".ts", ".js", ".json"],
    },

    target: isProduction ? "browserslist" : "web",

    stats: {
        // Add chunk information (setting this to `false` allows for a less verbose output)
        chunks: true,

        // Add namedChunkGroups information
        chunkGroups: true,

        // Add built modules information to chunk information
        chunkModules: true,

        // Add the origins of chunks and chunk merging info
        chunkOrigins: true,

        excludeAssets: [/images\/map\/*/],
    },

    module: {
        rules: [
            {
                test: /\.(ts|js)$/,
                include: dirJsSrc,
                use: [{ loader: "babel-loader", options: babelOpt }],
            },
            {
                test: /\.scss$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: MiniCssExtractPluginOpt,
                    },
                    {
                        loader: "string-replace-loader",
                        options: {
                            search: "url(ata:image",
                            replace: "url(data:image",
                        },
                    },
                    {
                        loader: "css-loader",
                        options: cssLoaderOpt,
                    },
                    {
                        loader: "postcss-loader",
                        options: postcssLoaderOpt,
                    },
                    {
                        loader: "sass-loader",
                        options: sassLoaderOpt,
                    },
                ],
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: MiniCssExtractPluginOpt,
                    },
                    {
                        loader: "css-loader",
                        options: cssLoaderOpt,
                    },
                    {
                        loader: "postcss-loader",
                        options: postcssLoaderOpt,
                    },
                ],
            },
            {
                test: regExpFont,
                include: dirFonts,
                use: {
                    loader: "file-loader",
                    options: {
                        name: "[name].[ext]",
                        outputPath: "fonts/",
                    },
                },
            },
            {
                test: /\.svg$/,
                include: dirFlags,
                use: [
                    {
                        loader: "svg-url-loader",
                        options: getSvgLoaderOpt("images/flags/"),
                    },
                    {
                        loader: "image-webpack-loader",
                        options: {
                            svgo: svgoOpt,
                        },
                    },
                    {
                        loader: "string-replace-loader",
                        options: {
                            search: 'fill="#fff" fill-opacity="0"/>',
                            replace: `fill="${primary700}" fill-opacity="0.3"/>`,
                        },
                    },
                    {
                        loader: "string-replace-loader",
                        options: {
                            search: 'fill="#fff" fill-opacity="1"/>',
                            replace: `fill="${primary200}" fill-opacity="1"/>`,
                        },
                    },
                ],
            },
            {
                test: /\.svg$/,
                include: dirIcons,
                use: [
                    {
                        loader: "svg-url-loader",
                        options: getSvgLoaderOpt("icons/"),
                    },
                    {
                        loader: "image-webpack-loader",
                        options: {
                            svgo: svgoOpt,
                        },
                    },
                    {
                        loader: "string-replace-loader",
                        options: {
                            search: 'fill="$themeColour"',
                            replace: `fill="${themeColour}"`,
                        },
                    },
                    {
                        loader: "string-replace-loader",
                        options: {
                            search: 'fill="$darkYellow"',
                            replace: `fill="${colourYellowDark}"`,
                        },
                    },
                ],
            },
        ],
    },
}

if (isQuiet) {
    config.stats = "errors-only"
}

/*
if (isProduction && !isQuiet) {
    config.plugins.push(
        new BundleAnalyzerPlugin.BundleAnalyzerPlugin({
            analyzerMode: "static",
            generateStatsFile: true,
            logLevel: "warn",
            openAnalyzer: true,
            statsFilename: path.resolve(__dirname, "webpack-stats.json"),
            reportFilename: path.resolve(__dirname, "report.html"),
        })
    )
}
*/

if (isProduction) {
    config.optimization.minimize = true
    config.optimization.minimizer = [
        new CssMinimizerPlugin({
            sourceMap: false,
            minify: async (data) => {
                const csso = require("csso")

                const [[filename, input]] = Object.entries(data)
                const minifiedCss = csso.minify(input, {
                    comments: false,
                    filename,
                    sourceMap: false,
                })

                return {
                    css: minifiedCss.css,
                }
            },
        }),
        new TerserPlugin({
            parallel: true,
            terserOptions: {
                ecma: 2020,
                module: true,
                mangle: {
                    properties: false,
                },
                output: {
                    beautify: false,
                },
                toplevel: false,
            },
        }),
    ]
} else {
    config.devtool = "eval-source-map"
}

module.exports = () => config
