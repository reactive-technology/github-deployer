'use strict';

var async = require('async'),
    deployTasks = {};
var fs = require('fs');
function replaceVars(name, params, nbPass=10){
    let repName = name;
    Object.keys(params).forEach((key) => {
        repName = repName.replace(`{${key}}`, params[key]);
    });
    nbPass -= 1;
    if(nbPass > 0)
    {
        repName = replaceVars(repName, params, nbPass)
    }
    return repName;
}
(function () {
    var config,
        shell,
        initConfigCalled = false;

    deployTasks.initConfig = function (conf) {
        config = conf;
        shell = conf.shell || require('shelljs');
        initConfigCalled = true;
    };

    deployTasks.commandFactory = function (command, params) {
        return function (next) {
            if (command !== undefined && command !== '') {
                let cmdExec = replaceVars(command,params);
                console.log('execute ',cmdExec);
                try {
                    const { stdout, stderr, code } = shell.exec(cmdExec);
                    console.log('returned stdout',stdout);
                    console.log('returned stderr',stderr);
                    console.log('returned code ',code);
                    next();
                } catch(e) {
                    console.error(e);
                    return "Error";
                }
            } else {
                next();
            }
        };
    };

    deployTasks.run = function (cb, params={}) {
        if (!initConfigCalled) {
            throw new Error('You should call initConfig first');
        }
        //shell.config.reset();
        Object.keys(params).forEach((key) => {
            shell.env[key.toUpperCase()] = params[key];
        });

        console.log('checking deploy path ',config.appPath);
        let appPath = replaceVars(config.appPath,params);
        if (!fs.existsSync(appPath)){
            fs.mkdirSync(appPath);
        }

        let applicationDir = replaceVars(config.applicationDir,params);
        console.log('checking applicationDir path ',applicationDir)
        if (!fs.existsSync(applicationDir)){
            fs.mkdirSync(applicationDir);
            fs.mkdirSync(applicationDir+'/builds');
        }

        shell.cd(config.appPath);
        const series =[];
        ['stopCmd','prepareCmd','updateCmd','buildCmd','installCmd','startCmd'].forEach(cmd=>
            config[cmd].split('||').forEach((c,i)=>
                series.push(deployTasks.commandFactory(c, params))
            )
        );
        series.push(cb);
        async.series(series);
    };
})();

module.exports = deployTasks;
