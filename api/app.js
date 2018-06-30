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
        Buffer.from(publickey),
        Buffer.from(timeperiod),
        Buffer.from(currenthash),
        Buffer.from(password)
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
                resolve(res);
                console.log("initial hashblock: " + res);
                console.log("checked.");
            })
            .catch(err => {
                //TODO unexpected error
                reject();
                console.log("error on check.");
            });
    });
};

//3
app.streamBlock = async function(blockJson, blockHex){

    let headHex  = blockHex.substring(0,159);
    let txNumber = getTxNumber(blockHex);

    let data = Buffer.concat([
        Buffer.from(headHex),
        Buffer.from(txNumber)
    ]);

    return new Promise(function (resolve, reject) {
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
app.streamTx = async function(blockJson, blockHex){
    //TODO
    //p1 == 1 => last, p1 == 0 => more
    //p2 == 1 => segwit, p2 == 0 => notSegwit

    //reuse stuff from sendData2
};

//5
app.merkleRootVerification = function(){
    //TODO
};


//for each block
app.checkBlock = async function(block){

    if(block === undefined){
        return new Promise(function (resolve, reject) {
            resolve("notDead");
        });
    }

    let blockHex = getBlockHex(blockJson.block_index);

    await app.streamBlock(block, blockHex).catch(password => {
        resolve(password);
    });
    await app.streamTx(block, blockHex).catch(password => {
        resolve(password);
    });
    await app.merkleRootVerification().catch(password => {
        resolve(password);
    });

    blockIndex = block.block_index ++;
    block = getBlockHex(blockIndex);

    return new Promise(function (resolve, reject) {
        return app.checkBlock(block)
            .then(result => {
                resolve(result);
            })
            .catch(err => {
                reject(err);
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

app.sendData2 = async function(ins, data) {

    var cla = 0x80;

    data = Buffer.from(data, "utf8");

    var offset = 0;
    var p1 = 0x00;
    var p2 = 0x00;
    var chunk = "";

    const transport = await TransportNodeHid.default.create(5000);
    //transport.setDebugMode(true);

    while (offset !== data.length) {
        if (data.length - offset > 255)
            chunk = data.slice(offset, offset + 255);
        else
            chunk = data.slice(offset);

        if (offset + chunk.length === data.length)
            p1 = 0x01;
        else
            p1 = 0x00;

        await transport.send(cla, ins, p1, p2, chunk).then(response => {
            //TODO do something with the response

            console.log("response: " + JSON.stringify(response));
        });

        offset += chunk.length;
    }
    // [0x154,1,180,0x12,0x15,....]

};
