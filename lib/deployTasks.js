'use strict';

var async = require('async'),
    deployTasks = {};

(function () {
    var appPath,
        stopCmd,
        updateCmd,
        postUpdateCmd,
        startCmd,
        shell,
        initConfigCalled = false;

    deployTasks.initConfig = function (conf) {
        appPath = conf.appPath;
        stopCmd = conf.stopCmd;
        updateCmd = conf.updateCmd.replace('{branch}', conf.branch);
        updateCmd = conf.updateCmd.replace('{tagsearch}', conf.tagsearch);
        postUpdateCmd = conf.postUpdateCmd;
        startCmd = conf.startCmd;
        shell = conf.shell || require('shelljs');
        initConfigCalled = true;
    };

    deployTasks.commandFactory = function (command, params) {
        return function (next) {
            if (command !== undefined && command !== '') {
                let cmdExec = command;
                Object.keys(params).forEach((key) => {
                    cmdExec = cmdExec.replace(`{${key}}`, params[key]);
                });
                //replace referenced vars in vars
                Object.keys(params).forEach((key) => {
                    cmdExec = cmdExec.replace(`{${key}}`, params[key]);
                });
                shell.exec(cmdExec, next);
            } else {
                next();
            }
        };
    };

    deployTasks.run = function (cb, params={}) {
        if (!initConfigCalled) {
            throw new Error('You should call initConfig first');
        }
        shell.config.reset();
        Object.keys(params).forEach((key) => {
            shell.env[key.toUpperCase()] = params[key];
        });

        shell.cd(appPath);
        async.series([
            deployTasks.commandFactory(stopCmd, params),
            deployTasks.commandFactory(updateCmd, params),
            deployTasks.commandFactory(postUpdateCmd, params),
            deployTasks.commandFactory(startCmd, params),
            cb
        ]);
    };
})();

module.exports = deployTasks;
