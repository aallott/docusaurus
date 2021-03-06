"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBaseConfig = exports.getDocusaurusAliases = exports.excludeJS = exports.clientDir = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const mini_css_extract_plugin_1 = __importDefault(require("mini-css-extract-plugin"));
const pnp_webpack_plugin_1 = __importDefault(require("pnp-webpack-plugin"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const CSS_REGEX = /\.css$/;
const CSS_MODULE_REGEX = /\.module\.css$/;
exports.clientDir = path_1.default.join(__dirname, '..', 'client');
function excludeJS(modulePath) {
    // always transpile client dir
    if (modulePath.startsWith(exports.clientDir)) {
        return false;
    }
    // Don't transpile node_modules except any docusaurus npm package
    return (/node_modules/.test(modulePath) &&
        !/(docusaurus)((?!node_modules).)*\.jsx?$/.test(modulePath));
}
exports.excludeJS = excludeJS;
function getDocusaurusAliases() {
    const dirPath = path_1.default.resolve(__dirname, '../client/exports');
    const extensions = ['.js', '.ts', '.tsx'];
    const aliases = {};
    fs_extra_1.default.readdirSync(dirPath)
        .filter((fileName) => extensions.includes(path_1.default.extname(fileName)))
        .forEach((fileName) => {
        const fileNameWithoutExtension = path_1.default.basename(fileName, path_1.default.extname(fileName));
        const aliasName = `@docusaurus/${fileNameWithoutExtension}`;
        aliases[aliasName] = path_1.default.resolve(dirPath, fileName);
    });
    return aliases;
}
exports.getDocusaurusAliases = getDocusaurusAliases;
function createBaseConfig(props, isServer, minify = true) {
    const { outDir, siteDir, baseUrl, generatedFilesDir, routesPaths } = props;
    const totalPages = routesPaths.length;
    const isProd = process.env.NODE_ENV === 'production';
    const minimizeEnabled = minify && isProd && !isServer;
    const useSimpleCssMinifier = process.env.USE_SIMPLE_CSS_MINIFIER === 'true';
    const fileLoaderUtils = utils_1.getFileLoaderUtils();
    return {
        mode: isProd ? 'production' : 'development',
        output: {
            // Use future version of asset emitting logic, which allows freeing memory of assets after emitting.
            futureEmitAssets: true,
            pathinfo: false,
            path: outDir,
            filename: isProd ? '[name].[contenthash:8].js' : '[name].js',
            chunkFilename: isProd ? '[name].[contenthash:8].js' : '[name].js',
            publicPath: baseUrl,
        },
        // Don't throw warning when asset created is over 250kb
        performance: {
            hints: false,
        },
        devtool: isProd ? false : 'cheap-module-eval-source-map',
        resolve: {
            extensions: ['.wasm', '.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
            symlinks: true,
            alias: Object.assign({ '@site': siteDir, '@generated': generatedFilesDir }, getDocusaurusAliases()),
            // This allows you to set a fallback for where Webpack should look for modules.
            // We want `@docusaurus/core` own dependencies/`node_modules` to "win" if there is conflict
            // Example: if there is core-js@3 in user's own node_modules, but core depends on
            // core-js@2, we should use core-js@2.
            modules: [
                path_1.default.resolve(__dirname, '..', '..', 'node_modules'),
                'node_modules',
                path_1.default.resolve(fs_extra_1.default.realpathSync(process.cwd()), 'node_modules'),
            ],
            plugins: [pnp_webpack_plugin_1.default],
        },
        resolveLoader: {
            plugins: [pnp_webpack_plugin_1.default.moduleLoader(module)],
            modules: ['node_modules', path_1.default.join(siteDir, 'node_modules')],
        },
        optimization: {
            removeAvailableModules: false,
            // Only minimize client bundle in production because server bundle is only used for static site generation
            minimize: minimizeEnabled,
            minimizer: minimizeEnabled
                ? utils_1.getMinimizer(useSimpleCssMinifier)
                : undefined,
            splitChunks: isServer
                ? false
                : {
                    // Since the chunk name includes all origin chunk names it’s recommended for production builds with long term caching to NOT include [name] in the filenames
                    name: false,
                    cacheGroups: {
                        // disable the built-in cacheGroups
                        default: false,
                        common: {
                            name: 'common',
                            minChunks: totalPages > 2 ? totalPages * 0.5 : 2,
                            priority: 40,
                        },
                        // Only create one CSS file to avoid
                        // problems with code-split CSS loading in different orders
                        // causing inconsistent/non-deterministic styling
                        // See https://github.com/facebook/docusaurus/issues/2006
                        styles: {
                            name: 'styles',
                            test: /\.css$/,
                            chunks: `all`,
                            enforce: true,
                            priority: 50,
                        },
                    },
                },
        },
        module: {
            rules: [
                fileLoaderUtils.rules.images(),
                fileLoaderUtils.rules.media(),
                fileLoaderUtils.rules.otherAssets(),
                {
                    test: /\.(j|t)sx?$/,
                    exclude: excludeJS,
                    use: [
                        utils_1.getCacheLoader(isServer),
                        utils_1.getBabelLoader(isServer, utils_1.getCustomBabelConfigFilePath(siteDir)),
                    ].filter(Boolean),
                },
                {
                    test: CSS_REGEX,
                    exclude: CSS_MODULE_REGEX,
                    use: utils_1.getStyleLoaders(isServer, {
                        importLoaders: 1,
                        sourceMap: !isProd,
                    }),
                },
                // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
                // using the extension .module.css
                {
                    test: CSS_MODULE_REGEX,
                    use: utils_1.getStyleLoaders(isServer, {
                        modules: {
                            localIdentName: isProd
                                ? `[local]_[hash:base64:4]`
                                : `[local]_[path]`,
                        },
                        importLoaders: 1,
                        sourceMap: !isProd,
                        onlyLocals: isServer,
                    }),
                },
                {
                    test: /\.svg$/,
                    use: '@svgr/webpack?-prettier,+svgo,+titleProp,+ref![path]',
                },
            ],
        },
        plugins: [
            new mini_css_extract_plugin_1.default({
                filename: isProd ? '[name].[contenthash:8].css' : '[name].css',
                chunkFilename: isProd ? '[name].[contenthash:8].css' : '[name].css',
                // remove css order warnings if css imports are not sorted alphabetically
                // see https://github.com/webpack-contrib/mini-css-extract-plugin/pull/422 for more reasoning
                ignoreOrder: true,
            }),
        ],
    };
}
exports.createBaseConfig = createBaseConfig;
