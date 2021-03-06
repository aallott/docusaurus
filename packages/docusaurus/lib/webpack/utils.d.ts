/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="webpack-dev-server" />
/// <reference types="node" />
import { Configuration, Loader, RuleSetRule } from 'webpack';
import { TransformOptions } from '@babel/core';
import { ConfigureWebpackFn } from '@docusaurus/types';
export declare function getStyleLoaders(isServer: boolean, cssOptions?: {
    [key: string]: unknown;
}): Loader[];
export declare function getCacheLoader(isServer: boolean, cacheOptions?: {
    [key: string]: unknown;
}): Loader | null;
export declare function getCustomBabelConfigFilePath(siteDir: string): string | undefined;
export declare function getBabelOptions({ isServer, babelOptions, }?: {
    isServer?: boolean;
    babelOptions?: TransformOptions | string;
}): TransformOptions;
export declare function getBabelLoader(isServer: boolean, babelOptions?: TransformOptions | string): Loader;
/**
 * Helper function to modify webpack config
 * @param configureWebpack a webpack config or a function to modify config
 * @param config initial webpack config
 * @param isServer indicates if this is a server webpack configuration
 * @returns final/ modified webpack config
 */
export declare function applyConfigureWebpack(configureWebpack: ConfigureWebpackFn, config: Configuration, isServer: boolean): Configuration;
export declare function compile(config: Configuration[]): Promise<void>;
declare type AssetFolder = 'images' | 'files' | 'medias';
export declare function getFileLoaderUtils(): {
    loaders: {
        file: (options: {
            folder: AssetFolder;
        }) => {
            loader: string;
            options: {
                name: string;
            };
        };
        url: (options: {
            folder: AssetFolder;
        }) => {
            loader: string;
            options: {
                limit: number;
                name: string;
                fallback: string;
            };
        };
        inlineMarkdownImageFileLoader: string;
        inlineMarkdownLinkFileLoader: string;
    };
    rules: {
        /**
         * Loads image assets, inlines images via a data URI if they are below
         * the size threshold
         */
        images: () => RuleSetRule;
        /**
         * Loads audio and video and inlines them via a data URI if they are below
         * the size threshold
         */
        media: () => RuleSetRule;
        otherAssets: () => RuleSetRule;
    };
};
export declare function getHttpsConfig(): boolean | {
    cert: Buffer;
    key: Buffer;
};
export declare function getMinimizer(useSimpleCssMinifier?: boolean): any[];
export {};
//# sourceMappingURL=utils.d.ts.map