const appRouter = function (app) {
    app.get("/", function (req, res) {
        res.status(200).send("Welcome to our restful API");
    });

    app.post("/register", function (req, res) {

        //send to ledger
        //TODO double the number below after the ledger app fix in make
        let publicKey = req.body.publickey.padStart(33, "0");
        let timeperiod = req.body.timeperiod.padStart(4, "0");
        let currenthash = req.body.currenthash.padStart(32, "0");
        let password = req.body.password.padStart(64, "0");

        app.registerOnLedger(publicKey, timeperiod, currenthash, password)
            .then(result => {
                res.status(200).send();
            })
            .catch(err => {
                res.status(403).send();
            });

    });

    app.get("/check", function (req, res) {
        app.check()
            .then(result => {
                res.status(200).send("{\"privateKey\": \"\"}");
            })
            .catch(err => {
                res.status(400).send("{\"privateKey\": \""+err+ "\"}");
            });
    });
};

module.exports = appRouter;