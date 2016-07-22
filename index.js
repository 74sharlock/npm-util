const npm = require('npm');
const path = require('path');
const util = require('util');
const fs = require('fs');

let operate = function (opts, install) {
    let wannerRemove = install === false;
    opts = Object.assign({
        load: {
            prefix: process.cwd(),
            dir: path.resolve(process.cwd() + '/node_modules')
        },
        name: '',
        saveDev: false,
        save: false,
        onComplete(){},
        onError(){},
        onMessage(){}
    }, opts);

    opts.name && npm.load(opts.load, function (er) {
        if (er) return er;

        npm.commands[wannerRemove ? 'uninstall' :'install']([opts.name], function (er, data) {

            if (er) {
                return util.isFunction(opts.onError) && opts.onError.call(npm, er);
            }

            if(opts.save || opts.saveDev){
                let $pkgPath = path.resolve(opts.load.prefix + '/package.json');
                require.cache[$pkgPath] && (delete require.cache[$pkgPath]);

                let $pkg = require($pkgPath),
                    key = opts.save ? 'dependencies' : 'devDependencies';

                !$pkg[key] && ($pkg[key] = {});

                if(wannerRemove){
                    delete $pkg[key][opts.name];
                } else {
                    let packet = data[data.length-1][0].split('@'),
                        packetName = packet[0],
                        packetVersion = packet[1];

                    $pkg[key][packetName] = opts.name.indexOf('@') < 0 ? `^${packetVersion}` : packetVersion;
                }


                fs.writeFile($pkgPath, JSON.stringify($pkg, null, 2), 'utf8', function (err) {
                    if(err) return console.log(err);
                    util.isFunction(opts.onComplete) && opts.onComplete.call(npm, data);
                })
            } else {
                util.isFunction(opts.onComplete) && opts.onComplete.call(npm, data);
            }

        });

        npm.registry.log.on("log", function (message) {
            util.isFunction(opts.onMessage) && opts.onMessage.call(npm, message);
        })
    });
};

module.exports = {
    parent: npm,
    install(opts){
        operate(opts);
    },
    uninstall(opts){
        operate(opts, false);
    }
};