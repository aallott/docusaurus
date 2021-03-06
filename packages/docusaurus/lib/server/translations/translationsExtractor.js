"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSourceCodeFileTranslations = exports.extractPluginsSourceCodeTranslations = void 0;
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const fs_extra_1 = __importDefault(require("fs-extra"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const generator_1 = __importDefault(require("@babel/generator"));
const chalk_1 = __importDefault(require("chalk"));
const core_1 = require("@babel/core");
const lodash_1 = require("lodash");
const globby_1 = __importDefault(require("globby"));
const path_1 = __importDefault(require("path"));
// We only support extracting source code translations from these kind of files
const TranslatableSourceCodeExtension = new Set([
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
]);
function isTranslatableSourceCodePath(filePath) {
    return TranslatableSourceCodeExtension.has(path_1.default.extname(filePath));
}
async function getSourceCodeFilePaths(plugins) {
    // The getPathsToWatch() generally returns the js/jsx/ts/tsx/md/mdx file paths
    // We can use this method as well to know which folders we should try to extract translations from
    // Hacky/implicit, but do we want to introduce a new lifecycle method for that???
    const allPathsToWatch = lodash_1.flatten(plugins.map((plugin) => { var _a, _b; return (_b = (_a = plugin.getPathsToWatch) === null || _a === void 0 ? void 0 : _a.call(plugin)) !== null && _b !== void 0 ? _b : []; }));
    const filePaths = await globby_1.default(allPathsToWatch);
    return filePaths.filter(isTranslatableSourceCodePath);
}
async function extractPluginsSourceCodeTranslations(plugins, babelOptions) {
    // Should we warn here if the same translation "key" is found in multiple source code files?
    function toTranslationFileContent(sourceCodeFileTranslations) {
        return sourceCodeFileTranslations.reduce((acc, item) => {
            return Object.assign(Object.assign({}, acc), item.translations);
        }, {});
    }
    const sourceCodeFilePaths = await getSourceCodeFilePaths(plugins);
    const sourceCodeFilesTranslations = await extractAllSourceCodeFileTranslations(sourceCodeFilePaths, babelOptions);
    logSourceCodeFileTranslationsWarnings(sourceCodeFilesTranslations);
    return toTranslationFileContent(sourceCodeFilesTranslations);
}
exports.extractPluginsSourceCodeTranslations = extractPluginsSourceCodeTranslations;
function logSourceCodeFileTranslationsWarnings(sourceCodeFilesTranslations) {
    sourceCodeFilesTranslations.forEach(({ sourceCodeFilePath, warnings }) => {
        if (warnings.length > 0) {
            console.warn(`Translation extraction warnings for file path=${sourceCodeFilePath}:\n- ${chalk_1.default.yellow(warnings.join('\n\n- '))}`);
        }
    });
}
async function extractAllSourceCodeFileTranslations(sourceCodeFilePaths, babelOptions) {
    return lodash_1.flatten(await Promise.all(sourceCodeFilePaths.map((sourceFilePath) => extractSourceCodeFileTranslations(sourceFilePath, babelOptions))));
}
async function extractSourceCodeFileTranslations(sourceCodeFilePath, babelOptions) {
    try {
        const code = await fs_extra_1.default.readFile(sourceCodeFilePath, 'utf8');
        const ast = core_1.parse(code, Object.assign(Object.assign({}, babelOptions), { ast: true, 
            // filename is important, because babel does not process the same files according to their js/ts extensions
            // see  see https://twitter.com/NicoloRibaudo/status/1321130735605002243
            filename: sourceCodeFilePath }));
        return await extractSourceCodeAstTranslations(ast, sourceCodeFilePath);
    }
    catch (e) {
        e.message = `Error while attempting to extract Docusaurus translations from source code file at path=${sourceCodeFilePath}\n${e.message}`;
        throw e;
    }
}
exports.extractSourceCodeFileTranslations = extractSourceCodeFileTranslations;
/*
Need help understanding this?

Useful resources:
https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md
https://github.com/formatjs/formatjs/blob/main/packages/babel-plugin-react-intl/index.ts
https://github.com/pugjs/babel-walk
 */
function extractSourceCodeAstTranslations(ast, sourceCodeFilePath) {
    function staticTranslateJSXWarningPart() {
        return 'Translate content could not be extracted.\nIt has to be a static string, like <Translate>text</Translate>.';
    }
    function sourceFileWarningPart(node) {
        var _a;
        return `File=${sourceCodeFilePath} at line=${(_a = node.loc) === null || _a === void 0 ? void 0 : _a.start.line}`;
    }
    function generateCode(node) {
        return generator_1.default(node).code;
    }
    const translations = {};
    const warnings = [];
    // TODO we should check the presence of the correct @docusaurus imports here!
    traverse_1.default(ast, {
        JSXElement(path) {
            function evaluateJSXProp(propName) {
                const attributePath = path
                    .get('openingElement.attributes')
                    .find((attr) => attr.isJSXAttribute() && attr.node.name.name === propName);
                if (attributePath) {
                    const attributeValue = attributePath.get('value');
                    const attributeValueEvaluated = attributeValue.node.type === 'JSXExpressionContainer'
                        ? attributeValue.get('expression').evaluate()
                        : attributeValue.evaluate();
                    if (attributeValueEvaluated.confident &&
                        typeof attributeValueEvaluated.value === 'string') {
                        return attributeValueEvaluated.value;
                    }
                    else {
                        warnings.push(`<Translate> prop=${propName} should be a statically evaluable object.\nExample: <Translate id="optional.id" description="optional description">Message</Translate>\nDynamically constructed values are not allowed, because they prevent translations to be extracted.\n${sourceFileWarningPart(path.node)}\n${generateCode(path.node)}`);
                    }
                }
                return undefined;
            }
            if (path.node.openingElement.name.type === 'JSXIdentifier' &&
                path.node.openingElement.name.name === 'Translate') {
                // TODO support multiple childrens here?
                if (path.node.children.length === 1 &&
                    core_1.types.isJSXText(path.node.children[0])) {
                    const message = path.node.children[0].value
                        .trim()
                        .replace(/\s+/g, ' ');
                    const id = evaluateJSXProp('id');
                    const description = evaluateJSXProp('description');
                    translations[id !== null && id !== void 0 ? id : message] = Object.assign({ message }, (description && { description }));
                }
                else if (path.node.children.length === 1 &&
                    core_1.types.isJSXExpressionContainer(path.node.children[0]) &&
                    path.get('children.0.expression').evaluate().confident) {
                    const message = path.get('children.0.expression').evaluate().value;
                    const id = evaluateJSXProp('id');
                    const description = evaluateJSXProp('description');
                    translations[id !== null && id !== void 0 ? id : message] = Object.assign({ message }, (description && { description }));
                }
                else {
                    warnings.push(`${staticTranslateJSXWarningPart}\n${sourceFileWarningPart(path.node)}\n${generateCode(path.node)}`);
                }
            }
        },
        CallExpression(path) {
            if (path.node.callee.type === 'Identifier' &&
                path.node.callee.name === 'translate') {
                // console.log('CallExpression', path.node);
                if (path.node.arguments.length === 1) {
                    const firstArgPath = path.get('arguments.0');
                    // evaluation allows translate("x" + "y"); to be considered as translate("xy");
                    const firstArgEvaluated = firstArgPath.evaluate();
                    // console.log('firstArgEvaluated', firstArgEvaluated);
                    if (firstArgEvaluated.confident &&
                        typeof firstArgEvaluated.value === 'object') {
                        const { message, id, description } = firstArgEvaluated.value;
                        translations[id !== null && id !== void 0 ? id : message] = Object.assign({ message }, (description && { description }));
                    }
                    else {
                        warnings.push(`translate() first arg should be a statically evaluable object.\nExample: translate({message: "text",id: "optional.id",description: "optional description"}\nDynamically constructed values are not allowed, because they prevent translations to be extracted.\n${sourceFileWarningPart(path.node)}\n${generateCode(path.node)}`);
                    }
                }
                else {
                    warnings.push(`translate() function only takes 1 arg\n${sourceFileWarningPart(path.node)}\n${generateCode(path.node)}`);
                }
            }
        },
    });
    return { sourceCodeFilePath, translations, warnings };
}
