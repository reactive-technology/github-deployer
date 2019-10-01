'use strict';
require("dotenv").config({path: __dirname + "/.env"});

const DeployTasks = require('./lib/deployTasks');

//Short code
function matchRule(str, rule) {
    return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
}

function getDateTime() {
    const now     = new Date();
    let year    = now.getFullYear();
    let month   = now.getMonth()+1;
    let day     = now.getDate();
    let hour    = now.getHours();
    let minute  = now.getMinutes();
    let second  = now.getSeconds();
    if(month.toString().length === 1) {
        month = '0'+month;
    }
    if(day.toString().length === 1) {
        day = '0'+day;
    }
    if(hour.toString().length === 1) {
        hour = '0'+hour;
    }
    if(minute.toString().length === 1) {
        minute = '0'+minute;
    }
    if(second.toString().length === 1) {
        second = '0'+second;
    }
    const dateTime = year+month+day+'-'+hour+minute+second;
    return dateTime;
}

// example usage: realtime clock
console.log('TIME:',getDateTime());

console.log('option:',process.argv[2]);
const createNewConfig = process.argv[2]==='--config' || process.argv[2]==='--add';

const secret = process.env.DEPLOY_LISTENER_SECRET;
const sshKeyName = process.env.SSH_KEY_NAME || 'id_rsa';

if (!secret ) {
    console.error('DEPLOY_LISTENER_SECRET is not defined');
} else if (!sshKeyName) {
    console.error('SSH_KEY_NAME is not defined');
} else {
    const express = require('express'),
        app = express(),
        server = require('http').createServer(app),
        bodyParser = require('body-parser'),
        verifyGitHubSignature = require('./lib/verifyGitHubSignature'),
        getConfig = require('./lib/getConfig');

    app.use(bodyParser.urlencoded({extended: false}));

    app.use(bodyParser.json());
    verifyGitHubSignature.setSecret(secret);

    getConfig(function (config) {
        //for backward compatibity
        if (config.branch && !config.projects) {
            config.projects = [config];
        }

        app.post(config.route, function (req, res) {

            console.log('received req',req);
            for (const projectId in config.projects) {
                const project = config.projects[projectId];
                const deployTasks = new DeployTasks(project);
                const cf_branch = project.branch || project.branch || 'master';
                const cfTagSearch = project.tagsearch || project.tagsearch || undefined;
                const cfRepo = project.repository_name || project.repository_name || undefined;
                console.log('----- check config ',projectId,' -----');
                console.log('checking on branch ',cf_branch, 'tag ',cfTagSearch);

                // Checking if request is authentic
                if (req.body
                    && req.body.ref
                    && req.body.repository
                    && req.body.pusher
                    && verifyGitHubSignature.ofRequest(req)
                ) {
                    // If master was updated, do stuff
                    const tag = req.body.ref.replace('refs/tags/', '');
                    const branch = req.body.ref.replace('refs/heads/', '');
                    const repository_name = req.body.repository.name;
                    const repository_ssh_url = req.body.repository.ssh_url;
                    const pusher_email = req.body.pusher.email;
                    const version = req.body.after || tag;
                    const message = req.body.head_commit && req.body.head_commit.message;
                    const datetime = getDateTime();
                    const params = Object.assign({},
                        project,{ tag, branch, repository_name, repository_ssh_url, pusher_email, version, message, datetime});

                    if (req.body.ref ) {
                        if (matchRule(req.body.ref, 'refs/tags/' + cfTagSearch)) {
                            if (req.body.created) {
                                if(project.checkDestinationDir && project.destinationDir){
                                    console.log('checkDestinationDir not yet implemented');
                                }
                                console.log('Valid tag payload! Running commands with tag=',tag,'repository_name',repository_name);
                                deployTasks.run(function () {
                                    res.status(200).send();
                                }, params);
                            } else {
                                console.log(`the received tag is not created`);
                            }
                        } else if (req.body.ref && req.body.ref === `refs/heads/${cf_branch}`) {
                            console.log('Found a valid payload! with branch=',cf_branch,'version=',version,'message=',message);
                            deployTasks.run(function () {
                                res.status(200).send();
                            }, params);
                        } else {
                            // if other branches were updated, send 200 only to make github happy...
                            cfTagSearch && console.log(`Received tag '${req.body.ref}' payload unrelated to  ${'refs/tags/' + cfTagSearch} tag`);
                            cf_branch && console.log(`Received branch payload unrelated to ${cf_branch} branch`);
                            res.status(200).send();
                        }

                    } else {
                        console.log(`error received ref '${req.body.ref}' `);
                    }
                } else {
                    console.warn('Received payload ref',req.body.ref);
                    if(!verifyGitHubSignature.ofRequest(req)) {
                        console.warn('Received payload with an invalid secret');
                    }else  if (req.body) {
                        [ 'ref','repository', 'pusher', 'message','head_commit'].forEach(n =>
                            !req.body[n] && console.log('cannot found field ', n)
                        );

                    } else {
                        console.log('cannot find', body);
                    }


                    res.status(403).send();
                }
            }
        });

        server.listen(config.port, function () {
            console.log(`Listening for webhook events on port ${config.port} on ${config.route}`);
        });
    }, createNewConfig);

}
