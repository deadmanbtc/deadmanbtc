const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid");
const express = require("express");
const request = require('sync-request');
const cors = require('cors');
const bodyParser = require("body-parser");
const routes = require("./routes/routes.js");
const app = express();

app.use(cors({origin: '*'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

routes(app);

function getBlockJson(blockIndex){
    let resp = request('GET', 'https://blockchain.info/rawblock/' + blockIndex + '?format=json');
    return JSON.parse(resp.getBody('utf8'));
}

function getBlockHex(blockIndex){
    let resp = request('GET', 'https://blockchain.info/rawblock/' + blockIndex + '?format=hex');
    return resp.getBody('utf8');
}


const server = app.listen(3000, function() {
    console.log("app running on port.", server.address().port);
});

//1
app.registerOnLedger = async function (publickey, timeperiod, currenthash, password) {


    let data = Buffer.concat([
        Buffer.from(publickey, 'hex'),
        Buffer.from(timeperiod, 'hex'),
        Buffer.from(currenthash, 'hex'),
        Buffer.from(password, 'hex')
    ]);


    return new Promise(function(resolve, reject){
        app.sendData(0x01, data)
            .then(res => {
                console.log(res);
                console.log("registered.");
                resolve(res);
            })
            .catch(err => {
                //TODO
                console.error("error on register. " + err);
                reject(err);
            });
    });
};


//2
app.checkOnLedger =  async function () {
    return new Promise(function(resolve, reject){
        app.sendData(0x02, Buffer.alloc(0))
            .then(res => {
                //get the initial hash block
                let initialHash = res.toString('hex').slice(0,64);
                resolve(initialHash);
                console.log("initial hashblock: " + initialHash);
                console.log("checked.");
            })
            .catch(err => {
                //TODO unexpected error
                reject(err);
                console.log("error on check. " + err);
            });
    });
};

//3
app.streamBlock = async function(blockJson, blockHex){
    console.log("streamBlock: " + blockJson.hash);

    return new Promise(function (resolve, reject) {

        let headHex  = blockHex.substring(0,159);
        let txNumber = getTxNumber(blockHex).toString();

        let data = Buffer.concat([
            Buffer.from(headHex, 'hex'),
            Buffer.from(txNumber, 'hex')
        ]);

        //send header to ledger
        app.sendData(0x03, data)
            .then(result => {
                resolve(result);
            })
            .catch(err => {
                reject(err);
            });
    });
};

//4
app.streamTx = async function(blockJson, blockHex, offset, txNumber) {


    if (txNumber == blockJson.n_tx) {
        return new Promise(function (resolve, reject) {
            resolve();
        })
    }

    let tx = blockJson.tx[txNumber];
    console.log("streamTx: " + tx.hash);


    let data = blockHex.slice(offset, offset + tx.size);
    let witness = tx.inputs[0].witness;
    let p2 = witness != "";


    return new Promise(function (resolve, reject) {
        app.sendData2(0x04, p2, data, witness)
            .then(result => {
                app.streamTx(blockJson, blockHex, offset + tx.size, txNumber+1)
                    .then(() => {
                        resolve();
                    });
            })
            .catch(err => {
                reject(err);
            });
    });
};

//5
app.merkleRootVerification = function(){
    return new Promise(function (resolve, reject) {
        resolve();
    })
};


//for each block
app.checkBlock = async function(blockJson){

    if(typeof blockJson === "undefined"){
        return new Promise(function (resolve, reject) {
            resolve("notDead");
        });
    }

    let blockHex = getBlockHex(blockJson.block_index);

    await app.streamBlock(blockJson, blockHex).catch(password => {
        return new Promise(function (resolve, reject) {
            resolve(password);
        });
    })
        .then(async () => {
            await app.streamTx(blockJson, blockHex, 160, 0).catch(password => {
                return new Promise(function (resolve, reject) {
                    resolve(password);
                });
            })
                .then(async () => {
                    await app.merkleRootVerification().catch(password => {
                        return new Promise(function (resolve, reject) {
                            resolve(password);
                        });
                    })
                        .then(() => {

                            blockIndex = blockJson.block_index ++;
                            blockJson = getBlockJson(blockIndex);

                            return new Promise(function (resolve, reject) {
                                return app.checkBlock(blockJson)
                                    .then(result => {
                                        resolve(result);
                                    })
                                    .catch(err => {
                                        reject(err);
                                    });
                            });
                        });
                });
        });
};

app.check = async function(){

    app.checkOnLedger()
        .then(blockHash => {
            let blockJson = getBlockJson(blockHash);

            app.checkBlock(blockJson)
                .then(result => {
                    return new Promise(function (resolve, reject) {
                        if(result !== "notDead") {
                            resolve(result);
                        } else {
                            reject(result)
                        }
                    });
                })
                .catch( err => {
                    return new Promise(function (resolve, reject) {
                        reject(err);
                    });
                });
        })
        .catch(err => {
            return new Promise(function (resolve, reject) {
                reject(err);
            });
        });
};


//get variable integer tx number
function getTxNumber(hexblock)
{
    //interprete as a decimal - convert to decimal
    var ntx  = parseInt(hexblock.substring(160,162), 16);
    if(ntx > 252 && ntx < 65535)
    {
        var revert = hexblock.substring(162,166);
        var first2 = revert.substring(0,2);
        var second2 = revert.substring(2,4);
        revert = second2 + first2;
        ntx = parseInt(revert, 16);
    }
    else if(ntx > 65535)
    {
        revert = parseInt(hexblock.substring(166,174), 16);
        var firstx2 = revert.substring(0,2);
        var secondx2 = revert.substring(2,4);
        var trhx2 = revert.substring(4,6);
        var fourx2 = revert.substring(6,8);
        revert = fourx2 + trhx2 +secondx2+firstx2;
        console.log(revert);
        ntx = parseInt(revert, 16);
    }

    return ntx;
}

//send generic data and instruction code to the ledger
app.sendData = async function(ins, data) {

    const transport = await TransportNodeHid.default.create(5000);
    transport.setDebugMode(true);

    return new Promise(function(resolve, reject) {
        let cla = 0x80;
        let p1 = 0x00;
        let p2 = 0x00;

        transport.send(cla, ins, p1, p2, data).then(response => {
            resolve(response);
        }).catch(err => {
            console.error(err);
            reject(err);
        }).finally(() => { //TODO maybe store the transport for later use
            transport.close();
        });
    });

};

app.sendData2 = async function(ins, p2, data, witness) {

    var cla = 0x80;

    var offset = 0;
    var p1 = 0x00;
    var chunk = "";

    if(p2){
        data = data.substr(0,8) + data.substr(12);
        data = data.replace(witness, '');
        p2 = 0x80;
    } else
        p2 = 0x00;

    data = Buffer.from(data, 'hex');

    const transport = await TransportNodeHid.default.create(5000);
    transport.setDebugMode(true);

    while (offset !== data.length) {
        if (data.length - offset > 254)
            chunk = data.slice(offset, offset + 254);
        else
            chunk = data.slice(offset);

        if (offset + chunk.length === data.length)
            p1 = 0x80;
        else
            p1 = 0x00;

        await transport.send(cla, ins, p1, p2, Buffer.concat([Buffer.from(chunk.length.toString(), 'hex'), chunk])).then(response => {
            console.log("returned hash: " + response.toString('hex'));
        });

        offset += chunk.length;
    }
    transport.close();
    return new Promise(function (resolve, reject) {
        resolve();
    })

};
