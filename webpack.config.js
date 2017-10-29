// https://github.com/shakacode/react-webpack-rails-tutorial/blob/master/client%2Fwebpack.client.base.config.js

const libraryName = "na-topo";

const webpack = require("webpack");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const MinifyPlugin = require("babel-minify-webpack-plugin");
const path = require("path");
const PACKAGE = require("./package.json");

const babelOpt = {
    cacheDirectory: true,
    presets: [
        [
            "env",
            {
                exclude: ["transform-es2015-typeof-symbol"],
                loose: true,
                modules: false,
                targets: {
                    browsers: PACKAGE.browserslist
                }
            }
        ],
        ["minify"]
    ]
};

const cssOpt = {
    sourceMap: true
};

const imagewebpackOpt = {
    gifsicle: {
        optimizationLevel: 3,
        interlaced: false
    },
    mozjpeg: {
        quality: 95,
        progressive: true
    },
    optipng: {
        optimizationLevel: 7
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

let config = {
    context: path.resolve(__dirname, "src"),

    entry: [path.resolve(__dirname, PACKAGE.main), path.resolve(__dirname, PACKAGE.sass)],

    resolve: {
        alias: {
            Fonts: path.resolve(__dirname, "src/fonts/"),
            Icons: path.resolve(__dirname, "src/icons/"),
            Images: path.resolve(__dirname, "src/images/")
        }
    },

    output: {
        path: __dirname + "/public/js",
        filename: libraryName + ".min.js"
    },

    plugins: [
        new ExtractTextPlugin({
            filename: "../css/" + libraryName + ".min.css",
            allChunks: true
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
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: [
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
                })
            },
            {
                test: /\.(woff2?|ttf|eot|svg)$/,
                include: path.resolve(__dirname, "src/fonts"),
                use: {
                    loader: "file-loader",
                    options: {
                        name: "[name].[ext]",
                        outputPath: "../fonts/"
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
                            outputPath: "../images/"
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
                            outputPath: "../images/"
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
                            outputPath: "../icons/"
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

if ("prod" === process.env.NODE_ENV) {
    config.devtool = "";
    config.plugins.push(
        new MinifyPlugin({
            mangle: { topLevel: true },
            removeDebugger: true
        })
    );
} else {
    config.devtool = "eval-source-map";
    config.plugins.push(new webpack.HotModuleReplacementPlugin(), new webpack.NoEmitOnErrorsPlugin());
}

module.exports = config;
