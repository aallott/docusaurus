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
exports.loadHtmlTags = exports.createHtmlTagsString = void 0;
const htmlTags_1 = __importDefault(require("./htmlTags"));
function toString(val) {
    return typeof val === 'string' ? val : htmlTags_1.default(val);
}
function createHtmlTagsString(tags) {
    return Array.isArray(tags) ? tags.map(toString).join('\n') : toString(tags);
}
exports.createHtmlTagsString = createHtmlTagsString;
function loadHtmlTags(plugins) {
    const htmlTags = plugins.reduce((acc, plugin) => {
        if (!plugin.injectHtmlTags) {
            return acc;
        }
        const { headTags, preBodyTags, postBodyTags } = plugin.injectHtmlTags() || {};
        return {
            headTags: headTags
                ? `${acc.headTags}\n${createHtmlTagsString(headTags)}`
                : acc.headTags,
            preBodyTags: preBodyTags
                ? `${acc.preBodyTags}\n${createHtmlTagsString(preBodyTags)}`
                : acc.preBodyTags,
            postBodyTags: postBodyTags
                ? `${acc.postBodyTags}\n${createHtmlTagsString(postBodyTags)}`
                : acc.postBodyTags,
        };
    }, { headTags: '', preBodyTags: '', postBodyTags: '' });
    return {
        headTags: htmlTags.headTags.trim(),
        preBodyTags: htmlTags.preBodyTags.trim(),
        postBodyTags: htmlTags.postBodyTags.trim(),
    };
}
exports.loadHtmlTags = loadHtmlTags;
