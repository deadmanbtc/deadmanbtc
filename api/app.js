var TransportNodeHid = require("@ledgerhq/hw-transport-node-hid");
var express = require("express");
var bodyParser = require("body-parser");
var routes = require("./routes/routes.js");
var app = express();

var request = require('request');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

routes(app);

var server = app.listen(3000, function() {
    console.log("app running on port.", server.address().port);
});


app.getBlock = function getBlock(blockNo) {
    request('https://blockchain.info/rawblock/' + blockNo, { json: true }, (err, res, body) => {
        if (err) { return console.log(err); }
        console.log(body);
    });
}


app.example = async function example() {

    var cla = 0x80;
    var ins = 0x02;
    var p1 = 0x80;
    var p2 = 0;
    var data = "Hello";
    // [0x154,1,180,0x12,0x15,....]
    var buffer = Buffer.from(data, "utf8");

    const transport = await TransportNodeHid.default.create(5000);
    transport.setDebugMode(true);

    transport.send(cla, ins, p1, p2, buffer).then(response => {
        console.log("response: " + JSON.stringify(response));
    });

}

app.example();
