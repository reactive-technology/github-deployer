'use strict';
require("dotenv").config({path: __dirname + "/.env"});
var wildcard = require('wildcard');

const secret = process.env.DEPLOY_LISTENER_SECRET;
if(!secret){
    console.error('DEPLOY_LISTENER_SECRET is not defined');
}else{
    var express = require('express'),
        app = express(),
        server = require('http').createServer(app),
        bodyParser = require('body-parser'),
        verifyGitHubSignature = require('./lib/verifyGitHubSignature'),
        getConfig = require('./lib/getConfig'),
        deployTasks = require('./lib/deployTasks');

    app.use(bodyParser.urlencoded({extended: false}));

    app.use(bodyParser.json());
    verifyGitHubSignature.setSecret(secret);

    getConfig(function (config) {
        if (config.branch && !config.projects) {
            config.projects = [config];
        }
        app.post(config.route, function (req, res) {

            for (const projectId in config.projects) {
                const project = config.projects[projectId];
                deployTasks.initConfig(project);
                const cf_branch = project.branch || config.branch || 'master';
                const cfTagSearch = project.tagsearch || config.tagsearch || undefined;
                const cfRepo = project.repository_name || config.repository_name || undefined;
                // Checking if request is authentic
                if (req.body
                    && req.body.ref
                    && req.body.repository
                    && req.body.pusher
                   // && verifyGitHubSignature.ofRequest(req)
                    ) {
                    // If master was updated, do stuff
                    const tag = req.body.ref.replace('refs/tags/', '');
                    const branch = req.body.ref.replace('refs/heads/', '');
                    const repository_name = req.body.repository.name;
                    const repository_ssh_url = req.body.repository.ssh_url;
                    const pusher_email = req.body.pusher.email;
                    const params = {tag, branch, repository_name, repository_ssh_url, pusher_email};
                    if (req.body.ref && wildcard('refs/tags/' + cfTagSearch, req.body.ref) && req.body.created) {

                        if (req.body.ref && req.body.ref.indexOf(`refs/tags/${cfTagSearch}`) === 0 && req.body.created) {
                            console.log('Valid tag payload! Running commands');
                            deployTasks.run(function () {
                                res.status(200).send();
                            }, params);
                        } else if (req.body.ref && req.body.ref === `refs/heads/${cf_branch}`) {
                            console.log('Valid branch payload! Running commands');
                            deployTasks.run(function () {
                                res.status(200).send();
                            }, params);
                        } else {
                            // if other branches were updated, send 200 only to make github happy...
                            cfTagSearch && console.log(`Received tag payload unrelated to  ${cfTagSearch} tag`);
                            cf_branch && console.log(`Received branch payload unrelated to ${cf_branch} branch`);
                            res.status(200).send();
                        }
                    } else {
                        console.log(`the received repository ${repository_name} does not match ${cfRepo}`);
                    }
                } else {
                    console.warn('Received payload with an invalid secret');
                    res.status(403).send();
                }
            }
        });

        server.listen(config.port, function () {
            console.log(`Listening for webhook events on port ${config.port} on ${config.route}`);
        });
    });

}
