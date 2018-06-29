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