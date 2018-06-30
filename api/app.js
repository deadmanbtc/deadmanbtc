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

function getBlockjson(blockIndex){
    var resp = request('GET', 'https://blockchain.info/rawblock/' + blockIndex + '?format=json');
    return JSON.parse(resp.getBody('utf8'));
};

function getBlock(blockIndex){
    var resp = request('GET', 'https://blockchain.info/rawblock/' + blockIndex + '?format=hex');
    return resp.getBody('utf8');    
};


const server = app.listen(3000, function() {
    console.log("app running on port.", server.address().port);
    app.check();
});

//4
function sendtxledger(hexblock, jsonblock)
{
    //var trxhash = 
    //read for tx
    for(var i = 0; i < jsonblock.tx.length;i++)
    {
        console.log(jsonblock.tx[i].size);
    }

}


//3
function sendheadblockledger(hexblock, jsonblock)
{
    var headhex  = hexblock.substring(0,159);
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

app.check = function(){

    var startResp = "1468049" //TODO StartLedgerCheck();

    var hashblock = getBlock(1468049);
    var jsonblock = getBlockjson(1468049);
    
    var codehx = sendheadblockledger(hashblock, jsonblock);
    //sendtxledger(hashblock, jsonblock);
    
    //console.log(jsonblock);
    //TODO
};


app.registerOnLedger = function (publickey, timeperiod, currenthash, password) {

    let data = Buffer.concat([
        Buffer.from(publickey),
        Buffer.from(timeperiod),
        Buffer.from(currenthash),
        Buffer.from(password)
    ]);

    app.sendData(0x01, data);
};

app.sendData = async function(ins, data) {

    let cla = 0x80;
    let p1 = 0x00;
    let p2 = 0x00;

    const transport = await TransportNodeHid.default.create(5000);
    transport.setDebugMode(true);

    await transport.send(cla, ins, p1, p2, data).then(response => {
        //TODO do something with the response

        console.log("response: " + JSON.stringify(response));
    }).catch(reason => {
        console.error(reason);
    });

}


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
            p1 = 0x80;
        else
            p1 = 0x00;

        await transport.send(cla, ins, p1, p2, chunk).then(response => {
            //TODO do something with the response

            console.log("response: " + JSON.stringify(response));
        });

        offset += chunk.length;
    }
    // [0x154,1,180,0x12,0x15,....]

}
//app.sendData(0x02, "hello");
