var inquirer = require('inquirer'),
    shortid = require('shortid'),
    fs = require('fs'),
    CONFIG_FILE = './config.json',

    prompts = [{
        type: 'input',
        name: 'tag',
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
        name: 'route',
        message: 'Set the route in the server that will be listenig for POST requests. This must be the same path passed to GitHub Webhooks. A POST handler will be attached to this route.',
        default: '/deployer/'+shortid.generate()
    }, {
        type: 'input',
        name: 'port',
        message: 'Port in which node will be listening to POST requests.',
        default: '5000'
    }, {
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
        message: 'Root path where the the repo is clone/updated. This will be the pwd for the commands that will be executed.',
        default: '/tmp/deploy'
    }, {
        type: 'input',
        name: 'stopCmd',
        message: 'Shell command to be issued in order to stop the current running app.',
        default: 'yarn stop'
    },  {
        type: 'input',
        name: 'updateCmd',
        message: 'Shell command to be issued to generate the new version of the app. `{branch}` will be replaced by branch name.',
        default: 'git clone ${repository_ssh_url} && cd {repository_name} && yarn install && yarn build'
    },
        {
        type: 'input',
        name: 'postUpdateCmd',
        message: 'Shell command to be issued after fetching new version. Could be something like npm install or grunt deploy, or whatever',
        default: 'mv {repository_name}/dist {destinationDir} && ln -s -f {destinationDir} {applicationDir}/current'
    }, {
        type: 'input',
        name: 'startCmd',
        message: 'Shell command to restart the app, after updated.',
        default: 'yarn start'
    }],

    getConfig = function (cb) {
        var config;

        fs.readFile(CONFIG_FILE, function (err, data) {
            if (!err) {
                config = JSON.parse(data);
                cb(config);
            }
            else {
                inquirer.prompt(prompts, function (answers) {
                    const port = answers.port;
                    const route = answers.route;
                    delete answers.port;
                    delete answers.route;
                    config = {
                        port,
                        route,
                        projects:[answers]
                    };
                    fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4), function (err) {

                        if (err) {
                            throw err;
                        }

                        cb(config);
                    });

                });
            }
        });
    };

module.exports = getConfig;
