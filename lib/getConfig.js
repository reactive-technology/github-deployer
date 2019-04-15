var inquirer = require('inquirer'),
    shortid = require('shortid'),
    fs = require('fs'),
    CONFIG_FILE = './config.json',
    promptMainConfig = [
        {
            type: 'input',
            name: 'configType',
            message: 'Is deployment based on tags (default: no)? (if yes deployment will be trigged on each new created TAG that match a given pattern)',
            default: 'no'
        },
        {
            type: 'input',
            name: 'port',
            message: 'Port in which node will be listening to POST requests.',
            default: '5000'
        },
        {
            type: 'input',
            name: 'route',
            message: 'Set the route in the server that will be listenig for POST requests. This must be the same path passed to GitHub Webhooks. A POST handler will be attached to this route.',
            default: '/deployer/' + shortid.generate()
        },
    ],
    promptsTagConfig = [
        {
            type: 'input',
            name: 'tagsearch',
            message: 'TAG pattern to trigger your update on.',
            default: '*PROD_V*'
        }, {
            type: 'input',
            name: 'repository_name',
            message: 'repository name.',
            default: 'someRepoName'
        },
        {
            type: 'input',
            name: 'applicationDir',
            message: 'application dir',
            default: '/var/www/{repository_name}'
        },
        {
            type: 'input',
            name: 'destinationDir',
            message: 'destination dir where the built version is moved',
            default: '/var/www/{repository_name}/builds/{tag}'
        },
        {
            type: 'input',
            name: 'checkDestinationDir',
            message: 'check built version dir, if defined and if folder exist will not execute commands',
            default: 'yes'
        },
        {
            type: 'input',
            name: 'appPath',
            message: 'Temporary path where the the repo is clone/built. This will be the pwd for the commands that will be executed.',
            default: '/tmp/deploy'
        }, {
            type: 'input',
            name: 'stopCmd',
            message: 'Shell command to be issued in order to stop the current running app.',
            default: ''
        }, {
            type: 'input',
            name: 'prepareCmd',
            message: 'prepare folders deployment, clean ...',
            default: 'rm -r {repository_name} 2> /dev/null'
        }, {
            type: 'input',
            name: 'updateCmd',
            message: 'Shell command to be issued to generate the new version of the app. `{xxx}` will be replaced by github info.',
            default: 'rm -r {repository_name} && git clone ${repository_ssh_url}'
        },
        {
            type: 'input',
            name: 'buildCmd',
            message: 'Shell command to be issued after fetching new version is clone. build, make ... ',
            default: 'cd {repository_name} && yarn install && cp /etc/env/{repository_name}.env .env && yarn build'
        }, {
            type: 'input',
            name: 'installCmd',
            message: 'Shell command to be issued after build command, ex: copy built binaries to server public folder',
            default: 'mv {repository_name}/dist {destinationDir} && ln -s -f {destinationDir} {applicationDir}/current'
        },
        {
            type: 'input',
            name: 'startCmd',
            message: 'Shell command to restart the app, after updated.ex: ngninx restart',
            default: ''
        }],
    promptsBranchConfig = [
        {
            type: 'input',
            name: 'branch',
            message: 'branch you want to update on.',
            default: 'production'
        }, {
            type: 'input',
            name: 'repository_name',
            message: 'repository name.',
            default: 'someRepoName'
        },
        {
            type: 'input',
            name: 'applicationDir',
            message: 'application dir',
            default: '/var/www/{repository_name}'
        },
        {
            type: 'input',
            name: 'destinationDir',
            message: 'destination dir where the built version is moved',
            default: '/var/www/{repository_name}/builds/{version}'
        },
        {
            type: 'input',
            name: 'checkDestinationDir',
            message: 'check built version dir, if defined and if folder exist will not execute commands',
            default: 'yes'
        },
        {
            type: 'input',
            name: 'appPath',
            message: 'Temporary path where the the repo is clone/built. This will be the pwd for the commands that will be executed.',
            default: '/tmp/deploy'
        }, {
            type: 'input',
            name: 'stopCmd',
            message: 'Shell command to be issued in order to stop the current running app.',
            default: ''
        }, {
            type: 'input',
            name: 'prepareCmd',
            message: 'prepare folders deployment, clean ...',
            default: 'rm -r {repository_name} 2> /dev/null'
        }, {
            type: 'input',
            name: 'updateCmd',
            message: 'Shell command to be issued to generate the new version of the app. `{xxx}` will be replaced by github info.',
            default: 'rm -r {repository_name} && git clone ${repository_ssh_url}'
        },
        {
            type: 'input',
            name: 'buildCmd',
            message: 'Shell command to be issued after fetching new version is clone. build, make ... ',
            default: 'cd {repository_name} && yarn install && cp /etc/env/{repository_name}.env .env && yarn build'
        }, {
            type: 'input',
            name: 'installCmd',
            message: 'Shell command to be issued after build command, ex: copy built binaries to server public folder',
            default: 'mv {repository_name}/dist {destinationDir} && ln -s -f {destinationDir} {applicationDir}/current'
        },
        {
            type: 'input',
            name: 'startCmd',
            message: 'Shell command to restart the app, after updated.ex: ngninx restart',
            default: ''
        }],
    getConfig = function (cb, force = false) {
        var config={};
        fs.readFile(CONFIG_FILE, function (err, data) {
            if (!err) {
                config = JSON.parse(data);
            }
            if (!err && !force) {
                cb(config);
            } else {
                console.log('You are about to add a new deployment config');
                const filter = config && Object.keys(config);
                const prompts = promptMainConfig.filter(o=>filter.indexOf(o.name)===-1);
                inquirer.prompt(prompts, function (newConfig) {
                    config.projects = config.projects ||[];
                    inquirer.prompt(newConfig.configType === 'no' ? promptsBranchConfig : promptsTagConfig, function (answers) {
                        answers.configType = newConfig.configType;
                        Object.assign(config,newConfig);
                        delete config.configType;
                        config.projects.push(answers);
                        fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4), function (err) {
                            if (err) {
                                throw err;
                            }

                            cb(config);
                        });

                    });
                });
            }
        });
    };

module.exports = getConfig;
