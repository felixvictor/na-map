// https://github.com/shakacode/react-webpack-rails-tutorial/blob/master/client%2Fwebpack.client.base.config.js

const libraryName = "na-map";

const webpack = require("webpack");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin"),
    HtmlPlugin = require("html-webpack-plugin"),
    MiniCssExtractPlugin = require("mini-css-extract-plugin"),
    MinifyPlugin = require("babel-minify-webpack-plugin"),
    SitemapPlugin = require("sitemap-webpack-plugin").default,
    SriPlugin = require("webpack-subresource-integrity");
const PACKAGE = require("./package.json");

const sitemapPaths = ["/fonts/", "/icons", "/images"];

const babelOpt = {
    cacheDirectory: true,
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
                }
            }
        ]
    ]
};

const cssOpt = {
    sourceMap: true
};

const minifyMinifyOpt = {
    numericLiterals: false,
    removeDebugger: true
};

const pluginMinifyOpt = { comments: false };

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
        quality: 90,
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

const config = {
    context: path.resolve(__dirname, "src"),

    entry: [path.resolve(__dirname, PACKAGE.main), path.resolve(__dirname, PACKAGE.sass)],

    resolve: {
        alias: {
            Fonts: path.resolve(__dirname, "src/fonts/"),
            Icons: path.resolve(__dirname, "src/icons/"),
            Images: path.resolve(__dirname, "src/images/"),
            "@fortawesome/fontawesome-free-regular$": "@fortawesome/fontawesome-free-regular/shakable.es.js",
            "@fortawesome/fontawesome-free-solid$": "@fortawesome/fontawesome-free-solid/shakable.es.js"
        }
    },

    optimization: {
        splitChunks: {
            cacheGroups: {
                styles: {
                    name: "styles",
                    test: /\.css$/,
                    chunks: "all",
                    enforce: true
                }
            }
        }
    },

    output: {
        path: `${__dirname}/public`,
        filename: `${libraryName}.min.js`,
        crossOriginLoading: "anonymous"
    },

    plugins: [
        new MiniCssExtractPlugin({
            filename: `${libraryName}.min.css`
        }),
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
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new CopyPlugin([
            { from: "google979f2cf3bed204d6.html", to: "google979f2cf3bed204d6.html", toType: "file" },
            { from: "images/map", to: "../public/images/map" },
            { from: "images/icons", to: "../public/images/icons" },
            { from: "*.json" },
            { from: "*.txt" },
            { from: "*.xlsx" },
            { from: "../netlify.toml" }
        ]),
        new HtmlPlugin({
            filename: "index.html",
            gtag: "https://www.googletagmanager.com/gtag/js?id=UA-109520372-1",
            hash: true,
            inject: "body",
            lang: "en-GB",
            minify: htmlMinifyOpt,
            template: "index.template.ejs",
            title: "Naval Action map",
            description:
                "Yet another map with in-game map, F11 coordinates, resources. Port data is updated constantly from twitter and daily after maintenance.",
            brand: "https://na-map-test.netlify.com/images/icons/favicon-32x32.png",
            version: PACKAGE.version
        }),
        new SitemapPlugin("https://na-map.netlify.com/", sitemapPaths, { skipGzip: false }),
        new SriPlugin({
            hashFuncNames: ["sha256", "sha384"],
            enabled: process.env.NODE_ENV === "production"
        })
    ],

    stats: "normal",

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
                            limit: 1,
                            name: "[name].[ext]",
                            outputPath: "icons/"
                        }
                    },
                    {
                        loader: "image-webpack-loader",
                        options: {
                            svgo: svgoOpt
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
        config.plugins.push(new MinifyPlugin(minifyMinifyOpt, pluginMinifyOpt));
    } else {
        config.devtool = "eval-source-map";
        config.plugins.push(new webpack.HotModuleReplacementPlugin(), new webpack.NoEmitOnErrorsPlugin());
    }

    return config;
};
