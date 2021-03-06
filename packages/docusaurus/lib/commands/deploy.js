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
const path_1 = __importDefault(require("path"));
const shelljs_1 = __importDefault(require("shelljs"));
const constants_1 = require("../constants");
const server_1 = require("../server");
const config_1 = __importDefault(require("../server/config"));
const build_1 = __importDefault(require("./build"));
async function deploy(siteDir, cliOptions = {}) {
    const { outDir } = await server_1.loadContext(siteDir, {
        customOutDir: cliOptions.outDir,
    });
    const tempDir = path_1.default.join(siteDir, constants_1.GENERATED_FILES_DIR_NAME);
    console.log('Deploy command invoked ...');
    if (!shelljs_1.default.which('git')) {
        throw new Error('Git not installed or on the PATH!');
    }
    const gitUser = process.env.GIT_USER;
    if (!gitUser) {
        throw new Error('Please set the GIT_USER environment variable!');
    }
    // The branch that contains the latest docs changes that will be deployed.
    const currentBranch = process.env.CURRENT_BRANCH ||
        shelljs_1.default.exec('git rev-parse --abbrev-ref HEAD').stdout.trim();
    const siteConfig = config_1.default(siteDir);
    const organizationName = process.env.ORGANIZATION_NAME ||
        process.env.CIRCLE_PROJECT_USERNAME ||
        siteConfig.organizationName;
    if (!organizationName) {
        throw new Error(`Missing project organization name. Did you forget to define 'organizationName' in ${constants_1.CONFIG_FILE_NAME}? You may also export it via the ORGANIZATION_NAME environment variable.`);
    }
    const projectName = process.env.PROJECT_NAME ||
        process.env.CIRCLE_PROJECT_REPONAME ||
        siteConfig.projectName;
    if (!projectName) {
        throw new Error(`Missing project name. Did you forget to define 'projectName' in ${constants_1.CONFIG_FILE_NAME}? You may also export it via the PROJECT_NAME environment variable.`);
    }
    // We never deploy on pull request.
    const isPullRequest = process.env.CI_PULL_REQUEST || process.env.CIRCLE_PULL_REQUEST;
    if (isPullRequest) {
        shelljs_1.default.echo('Skipping deploy on a pull request');
        shelljs_1.default.exit(0);
    }
    // github.io indicates organization repos that deploy via master. All others use gh-pages.
    const deploymentBranch = process.env.DEPLOYMENT_BRANCH ||
        (projectName.indexOf('.github.io') !== -1 ? 'master' : 'gh-pages');
    const githubHost = process.env.GITHUB_HOST || siteConfig.githubHost || 'github.com';
    const useSSH = process.env.USE_SSH;
    const gitPass = process.env.GIT_PASS;
    let gitCredentials = `${gitUser}`;
    if (gitPass) {
        gitCredentials = `${gitCredentials}:${gitPass}`;
    }
    const sshRemoteBranch = `git@${githubHost}:${organizationName}/${projectName}.git`;
    const nonSshRemoteBranch = `https://${gitCredentials}@${githubHost}/${organizationName}/${projectName}.git`;
    const remoteBranch = useSSH && useSSH.toLowerCase() === 'true'
        ? sshRemoteBranch
        : nonSshRemoteBranch;
    // Check if this is a cross-repo publish.
    const currentRepoUrl = shelljs_1.default
        .exec('git config --get remote.origin.url')
        .stdout.trim();
    const crossRepoPublish = !currentRepoUrl.endsWith(`${organizationName}/${projectName}.git`);
    // We don't allow deploying to the same branch unless it's a cross publish.
    if (currentBranch === deploymentBranch && !crossRepoPublish) {
        throw new Error(`You cannot deploy from this branch (${currentBranch}).` +
            '\nYou will need to checkout to a different branch!');
    }
    // Save the commit hash that triggers publish-gh-pages before checking
    // out to deployment branch.
    const currentCommit = shelljs_1.default.exec('git rev-parse HEAD').stdout.trim();
    const runDeploy = (outputDirectory) => {
        if (shelljs_1.default.cd(tempDir).code !== 0) {
            throw new Error(`Temp dir ${constants_1.GENERATED_FILES_DIR_NAME} does not exists. Run build website first.`);
        }
        if (shelljs_1.default.exec(`git clone ${remoteBranch} ${projectName}-${deploymentBranch}`)
            .code !== 0) {
            throw new Error('Error: git clone failed');
        }
        shelljs_1.default.cd(`${projectName}-${deploymentBranch}`);
        // If the default branch is the one we're deploying to, then we'll fail
        // to create it. This is the case of a cross-repo publish, where we clone
        // a github.io repo with a default master branch.
        const defaultBranch = shelljs_1.default
            .exec('git rev-parse --abbrev-ref HEAD')
            .stdout.trim();
        if (defaultBranch !== deploymentBranch) {
            if (shelljs_1.default.exec(`git checkout origin/${deploymentBranch}`).code !== 0) {
                if (shelljs_1.default.exec(`git checkout --orphan ${deploymentBranch}`).code !== 0) {
                    throw new Error(`Error: Git checkout ${deploymentBranch} failed`);
                }
            }
            else if (shelljs_1.default.exec(`git checkout -b ${deploymentBranch}`).code +
                shelljs_1.default.exec(`git branch --set-upstream-to=origin/${deploymentBranch}`)
                    .code !==
                0) {
                throw new Error(`Error: Git checkout ${deploymentBranch} failed`);
            }
        }
        shelljs_1.default.exec('git rm -rf .');
        shelljs_1.default.cd('../..');
        const fromPath = outputDirectory;
        const toPath = path_1.default.join(constants_1.GENERATED_FILES_DIR_NAME, `${projectName}-${deploymentBranch}`);
        fs_extra_1.default.copy(fromPath, toPath, (error) => {
            if (error) {
                throw new Error(`Error: Copying build assets failed with error '${error}'`);
            }
            shelljs_1.default.cd(toPath);
            shelljs_1.default.exec('git add --all');
            const commitMessage = process.env.CUSTOM_COMMIT_MESSAGE ||
                `Deploy website - based on ${currentCommit}`;
            const commitResults = shelljs_1.default.exec(`git commit -m "${commitMessage}"`);
            if (shelljs_1.default.exec(`git push --force origin ${deploymentBranch}`).code !== 0) {
                throw new Error('Error: Git push failed');
            }
            else if (commitResults.code === 0) {
                // The commit might return a non-zero value when site is up to date.
                let websiteURL = '';
                if (githubHost === 'github.com') {
                    websiteURL = projectName.includes('.github.io')
                        ? `https://${organizationName}.github.io/`
                        : `https://${organizationName}.github.io/${projectName}/`;
                }
                else {
                    // GitHub enterprise hosting.
                    websiteURL = `https://${githubHost}/pages/${organizationName}/${projectName}/`;
                }
                shelljs_1.default.echo(`Website is live at ${websiteURL}`);
                shelljs_1.default.exit(0);
            }
        });
    };
    if (!cliOptions.skipBuild) {
        // Clear Docusaurus 2 cache dir for deploy consistency.
        fs_extra_1.default.removeSync(tempDir);
        // Build static html files, then push to deploymentBranch branch of specified repo.
        build_1.default(siteDir, cliOptions, false)
            .then(runDeploy)
            .catch((buildError) => {
            console.error(buildError);
            process.exit(1);
        });
    }
    else {
        // Push current build to deploymentBranch branch of specified repo.
        runDeploy(outDir);
    }
}
exports.default = deploy;
