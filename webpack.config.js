/**
 * webpack.config.js
 */

const webpack = require("webpack");

const path = require("path");
const sass = require("node-sass");
const parseCss = require("css");
const // { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer"),
    CleanWebpackPlugin = require("clean-webpack-plugin"),
    CopyPlugin = require("copy-webpack-plugin"),
    HtmlPlugin = require("html-webpack-plugin"),
    MiniCssExtractPlugin = require("mini-css-extract-plugin"),
    PreloadWebpackPlugin = require("preload-webpack-plugin"),
    SitemapPlugin = require("sitemap-webpack-plugin").default,
    SriPlugin = require("webpack-subresource-integrity"),
    TerserPlugin = require("terser-webpack-plugin"),
    WebpackDeepScopeAnalysisPlugin = require("webpack-deep-scope-plugin").default,
    WebpackPwaManifest = require("webpack-pwa-manifest");
const PACKAGE = require("./package.json");

const gtagLink = "https://www.googletagmanager.com/gtag/js?id=UA-109520372-1";
const libraryName = PACKAGE.name;
const { TARGET } = process.env;
const target = `https://${TARGET}.netlify.com/`;
const isProd = process.env.NODE_ENV === "production";

const description =
    "Yet another map with in-game map, F11 coordinates, resources, ship and wood comparison. Port data is updated constantly from twitter and daily after maintenance.";
const sitemapPaths = ["/fonts/", "/icons", "/images"];

/** Set colours
 * @returns {Map} Colours
 */
function setColours() {
    const css = sass
        .renderSync({
            file: path.resolve("src", "scss", "pre-compile.scss")
        })
        .css.toString();
    const parsedCss = parseCss.parse(css);
    return new Map(
        parsedCss.stylesheet.rules
            .filter(rule => rule.selectors !== undefined && rule.selectors[0].startsWith(".colour-palette "))
            .map(rule => {
                const d = rule.declarations.find(declaration => declaration.property === "background-color");
                return [rule.selectors[0].replace(".colour-palette .", ""), d ? d.value : ""];
            })
    );
}

const colours = setColours();
const backgroundColour = colours.get("primary-500");
const themeColour = colours.get("secondary-500");
const primary700 = colours.get("primary-700");
const primary200 = colours.get("primary-200");
const primary300 = colours.get("primary-300");
const colourGreen = colours.get("green");
const colourGreenDark = colours.get("green-dark");
const colourRed = colours.get("red");
const colourRedDark = colours.get("red-dark");
const colourRedLight = colours.get("red-light");
const colourWhite = colours.get("white");

const outputPath = path.resolve(__dirname, "public");

const babelOpt = {
    cacheDirectory: true,
    plugins: ["@babel/plugin-syntax-dynamic-import"],
    presets: [
        [
            "@babel/preset-env",
            {
                // debug: true,
                loose: true,
                modules: false,
                shippedProposals: true,
                targets: {
                    browsers: PACKAGE.browserslist
                },
                useBuiltIns: "usage"
            }
        ]
    ]
};

const cssOpt = {
    sourceMap: true
};

const htmlMinifyOpt = {
    collapseBooleanAttributes: true,
    collapseWhitespace: false,
    collapseInlineTagWhitespace: true,
    decodeEntities: true,
    html5: true,
    minifyURLs: true,
    removeComments: true,
    sortAttributes: true,
    sortClassName: true
};

const imagewebpackOpt = {
    gifsicle: {
        optimizationLevel: 3,
        interlaced: false
    },
    mozjpeg: {
        quality: 70,
        progressive: true
    },
    optipng: {
        optimizationLevel: 0
    },
    pngquant: {
        floyd: 0.5,
        speed: 2
    }
};

const postcssOpt = {
    config: {
        path: "build/postcss.config.js"
    },
    sourceMap: true
};

const sassOpt = {
    outputStyle: "expanded",
    sourceMap: true,
    sourceMapContents: true,
    precision: 6
};

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
        { removeScriptElement: false }
    ]
};

const htmlOpt = {
    iconSmall: "images/icons/icon_32x32.png",
    iconLarge: "images/icons/icon_1024x1024.png",
    canonicalUrl: TARGET === "na-map" ? target : "",
    name: libraryName,
    description,
    gtag: gtagLink,
    hash: false,
    inject: "body",
    lang: "en-GB",
    meta: { viewport: "width=device-width, initial-scale=1, shrink-to-fit=no" },
    minify: htmlMinifyOpt,
    template: "index.template.ejs",
    title: PACKAGE.description
};

const manifestOpt = {
    background_color: backgroundColour,
    description: PACKAGE.description,
    display: "standalone",
    fingerprints: false,
    icons: [
        {
            src: path.resolve("src", "images", "icons", "logo.png"),
            sizes: [32, 72, 96, 128, 144, 168, 192, 256, 384, 512, 1024],
            destination: path.join("images", "icons")
        }
    ],
    ios: false,
    lang: "en-GB",
    name: PACKAGE.name,
    short_name: PACKAGE.name,
    theme_color: themeColour
};

const config = {
    context: path.resolve(__dirname, "src"),

    devServer: {
        contentBase: outputPath,
        disableHostCheck: true
    },

    entry: [path.resolve(__dirname, PACKAGE.main), path.resolve(__dirname, PACKAGE.sass)],

    externals: {
        jquery: "jQuery",
        "popper.js": "Popper"
    },

    resolve: {
        alias: {
            Fonts: path.resolve(__dirname, "src/fonts/"),
            Icons: path.resolve(__dirname, "src/icons/"),
            Images: path.resolve(__dirname, "src/images/"),
            "@fortawesome/fontawesome-free-regular$": "@fortawesome/fontawesome-free-regular/shakable.es.js",
            "@fortawesome/fontawesome-free-solid$": "@fortawesome/fontawesome-free-solid/shakable.es.js"
        },
        mainFields: ["module", "main"]
    },

    optimization: {
        runtimeChunk: "single",
        splitChunks: {
            chunks: "all"
        }
    },

    output: {
        chunkFilename: isProd ? "[name].[chunkhash].js" : "[name].js",
        filename: isProd ? "[name].[contenthash].js" : "[name].js",
        path: outputPath,
        crossOriginLoading: "anonymous"
    },

    plugins: [
        /*
        new BundleAnalyzerPlugin({
            analyzerMode: isProd ? "static" : "disabled",
            generateStatsFile: true,
            logLevel: "warn",
            openAnalyzer: isProd,
            statsFilename: path.resolve(__dirname, "webpack-stats.json"),
            reportFilename: path.resolve(__dirname, "report.html")
        }),
        */
        new CleanWebpackPlugin(outputPath, {
            verbose: false
        }),
        new MiniCssExtractPlugin({ filename: isProd ? "[name].[contenthash].css" : "[name].css" }),
        new webpack.DefinePlugin({
            CPRIMARY300: JSON.stringify(primary300),
            CGREEN: JSON.stringify(colourGreen),
            CGREENDARK: JSON.stringify(colourGreenDark),
            CRED: JSON.stringify(colourRed),
            CREDLIGHT: JSON.stringify(colourRedLight),
            CREDDARK: JSON.stringify(colourRedDark),
            CWHITE: JSON.stringify(colourWhite),
            NAME: JSON.stringify(libraryName),
            DESCRIPTION: JSON.stringify(description),
            TITLE: JSON.stringify(PACKAGE.description),
            VERSION: JSON.stringify(PACKAGE.version)
        }),
        new webpack.HashedModuleIdsPlugin(),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery",
            moment: "moment",
            "window.moment": "moment",
            Popper: ["popper.js", "default"],
            // Alert: "exports-loader?Alert!bootstrap/js/dist/alert",
            Button: "exports-loader?Button!bootstrap/js/dist/button",
            Collapse: "exports-loader?Collapse!bootstrap/js/dist/collapse",
            Dropdown: "exports-loader?Dropdown!bootstrap/js/dist/dropdown",
            Modal: "exports-loader?Modal!bootstrap/js/dist/modal",
            // Popover: "exports-loader?Popover!bootstrap/js/dist/popover",
            Tooltip: "exports-loader?Tooltip!bootstrap/js/dist/tooltip",
            Util: "exports-loader?Util!bootstrap/js/dist/util"
        }),
        // Do not include all moment locale files, certain locales are loaded by import
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new CopyPlugin([
            { from: "../netlify.toml" },
            { from: "gen/*.json", to: `${outputPath}/data`, flatten: true },
            { from: "gen/*.xlsx", flatten: true },
            { from: "google979f2cf3bed204d6.html", to: "google979f2cf3bed204d6.html", toType: "file" },
            { from: "images/icons/favicon.ico", flatten: true },
            { from: "images/map", to: `${outputPath}/images/map` }
        ]),
        new HtmlPlugin(htmlOpt),
        new PreloadWebpackPlugin({
            include: "allAssets",
            fileWhitelist: [/\.woff2$/]
        }),
        new SitemapPlugin(target, sitemapPaths, { skipGzip: false }),
        new SriPlugin({
            hashFuncNames: ["sha256", "sha384"],
            enabled: isProd
        }),
        new WebpackDeepScopeAnalysisPlugin(),
        new WebpackPwaManifest(manifestOpt)
    ],

    stats: {
        // Add chunk information (setting this to `false` allows for a less verbose output)
        chunks: true,

        // Add namedChunkGroups information
        chunkGroups: true,

        // Add built modules information to chunk information
        chunkModules: true,

        // Add the origins of chunks and chunk merging info
        chunkOrigins: true,

        excludeAssets: [/images\/map\/*/]
    },

    module: {
        rules: [
            {
                test: /\.js$/,
                include: path.resolve(__dirname, "src/js"),
                loader: "babel-loader",
                options: babelOpt
            },
            {
                test: /\.scss$/,
                include: path.resolve(__dirname, "src/scss"),
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: cssOpt
                    },
                    {
                        loader: "postcss-loader",
                        options: postcssOpt
                    },
                    {
                        loader: "sass-loader",
                        options: sassOpt
                    }
                ]
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: cssOpt
                    },
                    {
                        loader: "postcss-loader",
                        options: postcssOpt
                    }
                ]
            },
            {
                test: /\.(woff2?|ttf|eot|svg)$/,
                include: path.resolve(__dirname, "src/fonts"),
                use: {
                    loader: "file-loader",
                    options: {
                        name: "[name].[ext]",
                        outputPath: "fonts/"
                    }
                }
            },
            {
                test: /\.(gif|png|jpe?g)$/i,
                include: path.resolve(__dirname, "src/images"),
                use: [
                    {
                        loader: "file-loader",
                        options: {
                            name: "[name].[ext]",
                            outputPath: "images/"
                        }
                    },
                    {
                        loader: "image-webpack-loader",
                        options: imagewebpackOpt
                    }
                ]
            },
            {
                test: /\.svg$/,
                include: path.resolve(__dirname, "src/images"),
                use: [
                    {
                        loader: "svg-url-loader",
                        options: {
                            limit: 1,
                            name: "[name].[ext]",
                            outputPath: "images/"
                        }
                    },
                    {
                        loader: "image-webpack-loader",
                        options: {
                            svgo: svgoOpt
                        }
                    }
                ]
            },
            {
                test: /\.svg$/,
                include: path.resolve(__dirname, "src/icons"),
                use: [
                    {
                        loader: "svg-url-loader",
                        options: {
                            limit: 1000,
                            name: "[name].[ext]",
                            outputPath: "icons/"
                        }
                    },
                    {
                        loader: "image-webpack-loader",
                        options: {
                            svgo: svgoOpt
                        }
                    },
                    {
                        loader: "string-replace-loader",
                        options: {
                            search: 'fill="#fff" fill-opacity="0"/>',
                            replace: `fill="${primary700}" fill-opacity="0.3"/>`
                        }
                    },
                    {
                        loader: "string-replace-loader",
                        options: {
                            search: 'fill="#fff" fill-opacity="1"/>',
                            replace: `fill="${primary200}" fill-opacity="1"/>`
                        }
                    },
                    {
                        loader: "string-replace-loader",
                        options: {
                            search: 'fill="#fff" fill-opacity=".7"/>',
                            replace: `fill="${primary300}" fill-opacity=".7"/>`
                        }
                    }
                ]
            }
        ]
    }
};

module.exports = (env, argv) => {
    if (argv.mode === "production") {
        config.devtool = "";
        config.optimization.minimizer = [
            new TerserPlugin({
                cache: true,
                parallel: true,
                terserOptions: {
                    output: { comments: false }
                }
            })
        ];
    } else {
        config.devtool = "eval-source-map";
        config.plugins.push(new webpack.HotModuleReplacementPlugin());
    }

    return config;
};
