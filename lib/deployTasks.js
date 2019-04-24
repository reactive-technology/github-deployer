const fs = require('fs');

function replaceVars(name, params, nbPass = 10) {
    let repName = name;
    Object.keys(params).forEach((key) => {
        repName = repName.replace(`{${key}}`, params[key]);
    });
    nbPass -= 1;
    if (nbPass > 0) {
        repName = replaceVars(repName, params, nbPass)
    }
    return repName;
}

class DeployTasks {
    constructor(conf) {
        this.config = conf;
        this.shell = conf.shell || require('shelljs');
        this.initConfigCalled = true;
    }

    async commandFactory(command, params) {
        if (command !== undefined && command !== '') {
            let cmdExec = replaceVars(command, params);
            console.log('execute ', cmdExec);
            try {
                const {output, code} = this.shell.exec(cmdExec);
                console.log('returned output', output);
                console.log('returned code ', code);
                return code;
            } catch (e) {
                console.error(e);
                return -1;
            }
        }
        return 0;
    };

    async run(cb, params = {}) {
        //shell.config.reset();
        try {
            Object.keys(params).forEach((key) => {
                this.shell.env[key.toUpperCase()] = params[key];
            });

            console.log('checking deploy path ', this.config.appPath);
            let appPath = replaceVars(this.config.appPath, params);
            if (!fs.existsSync(appPath)) {
                fs.mkdirSync(appPath);
            }

            let applicationDir = replaceVars(this.config.applicationDir, params);
            console.log('checking applicationDir path ', applicationDir)
            if (!fs.existsSync(applicationDir)) {
                fs.mkdirSync(applicationDir);
                fs.mkdirSync(applicationDir + '/builds');
            }

            this.shell.cd(this.config.appPath);
            const series = ['stopCmd', 'prepareCmd', 'updateCmd', 'addEnv','buildCmd', 'installCmd', 'startCmd'];
            for (const cmd of series) {
                const cmdLine = this.config[cmd];
                const code = await this.commandFactory(cmdLine, params);
                if (code !== 0) {
                    console.log(`command ${cmd} executed with error`);
                    break;
                }
            }
        }catch(e){
            console.error(e)
        }
    }
}

module.exports = DeployTasks;
