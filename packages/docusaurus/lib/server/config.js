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
const fs_extra_1 = __importDefault(require("fs-extra"));
const import_fresh_1 = __importDefault(require("import-fresh"));
const path_1 = __importDefault(require("path"));
const constants_1 = require("../constants");
const configValidation_1 = require("./configValidation");
function loadConfig(siteDir) {
    // TODO temporary undocumented env variable: we should be able to use a cli option instead!
    const loadedConfigFileName = process.env.DOCUSAURUS_CONFIG || constants_1.CONFIG_FILE_NAME;
    const configPath = path_1.default.resolve(siteDir, loadedConfigFileName);
    if (!fs_extra_1.default.existsSync(configPath)) {
        throw new Error(`${constants_1.CONFIG_FILE_NAME} not found at ${path_1.default.relative(process.cwd(), configPath)}`);
    }
    const loadedConfig = import_fresh_1.default(configPath);
    return configValidation_1.validateConfig(loadedConfig);
}
exports.default = loadConfig;
