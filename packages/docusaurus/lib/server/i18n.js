"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.localizePath = exports.loadI18n = void 0;
const path_1 = __importDefault(require("path"));
const utils_1 = require("@docusaurus/utils");
async function loadI18n(config, options = {}) {
    var _a;
    const i18nConfig = config.i18n;
    const currentLocale = (_a = options.locale) !== null && _a !== void 0 ? _a : i18nConfig.defaultLocale;
    if (currentLocale && !i18nConfig.locales.includes(currentLocale)) {
        throw new Error(`It is not possible to load Docusaurus with locale="${currentLocale}".
This locale is not in the available locales of your site configuration: config.i18n.locales=[${i18nConfig.locales.join(',')}]
Note: Docusaurus only support running one local at a time.`);
    }
    return Object.assign(Object.assign({}, i18nConfig), { currentLocale });
}
exports.loadI18n = loadI18n;
function localizePath({ pathType, path: originalPath, i18n, options = {}, }) {
    const shouldLocalizePath = typeof options.localizePath === 'undefined'
        ? // By default, we don't localize the path of defaultLocale
            i18n.currentLocale !== i18n.defaultLocale
        : options.localizePath;
    if (shouldLocalizePath) {
        // FS paths need special care, for Windows support
        if (pathType === 'fs') {
            return path_1.default.join(originalPath, path_1.default.sep, i18n.currentLocale, path_1.default.sep);
        }
        // Url paths
        else if (pathType === 'url') {
            return utils_1.normalizeUrl([originalPath, '/', i18n.currentLocale, '/']);
        }
        // should never happen
        else {
            throw new Error(`unhandled pathType=${pathType}`);
        }
    }
    else {
        return originalPath;
    }
}
exports.localizePath = localizePath;
