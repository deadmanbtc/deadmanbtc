const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid");
const express = require("express");
var request = require('sync-request');
const cors = require('cors');
const bodyParser = require("body-parser");
const routes = require("./routes/routes.js");
const app = express();
app.use(cors({origin: '*'}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

routes(app);

const server = app.listen(3000, function() {
    console.log("app running on port.", server.address().port);
});

function getBlock(blockIndex){

    var resp = request('GET', 'https://blockchain.info/rawblock/' + blockIndex + '?format=hex');
    return resp.getBody('utf8');
}

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

app.checkBlock = async function(block){

    //for each block
    if(block === undefined){
        return new Promise(function (resolve, reject) {
            resolve("notDead");
        });
    }

    app.streamBlock(block).catch(password => {
        resolve(password);
    });
    app.merkleRootVerification().catch(password => {
        resolve(password);
    });

    blockIndex = block.block_index ++;
    block = getBlock(blockIndex);

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
            let block = getBlock(blockHash);

            app.checkBlock(block)
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


app.checkOnLedger =  async function () {
    return new Promise(function(resolve, reject){
        app.sendData(0x02, Buffer.alloc(0))
            .then(res => {
                //get the initial hash block
                resolve(res.data);
                console.log("initial hashblock: " + res.data);
                console.log("checked.")})
            .catch(err => {
                //TODO unexpected error
                reject();
                console.log("error on check.")});
    });
};

app.streamBlock = function(block){
    //getHead
    //getTxNumber.getVariableInteger()
    //let data = head + variableInteger
    let data = Buffer.concat([
        Buffer.from(head),
        Buffer.from(variableInteger)
    ]);

    app.sendData(0x03, data)

}

app.merkleRootVerification = function(){
    //TODO
}

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
