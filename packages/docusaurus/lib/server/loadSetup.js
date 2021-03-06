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
const path_1 = __importDefault(require("path"));
const index_1 = require("./index");
// Helper methods to setup dummy/fake projects.
const loadSetup = async (name) => {
    const fixtures = path_1.default.join(__dirname, '__tests__', '__fixtures__');
    const simpleSite = path_1.default.join(fixtures, 'simple-site');
    const customSite = path_1.default.join(fixtures, 'custom-site');
    switch (name) {
        case 'custom':
            return index_1.load(customSite);
        case 'simple':
        default:
            return index_1.load(simpleSite);
    }
};
exports.default = loadSetup;
