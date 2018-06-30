const appRouter = function (app) {
    app.get("/", function (req, res) {
        res.status(200).send("Welcome to our restful API");
    });

    //receive information from form
    app.post("/register", function (req, res) {

        //send to ledger
        let publicKey = req.body.publickey.padStart(33, "0");
        let timeperiod = req.body.timeperiod.padStart(4, "0");
        let currenthash = req.body.currenthash.padStart(32, "0");
        let password = req.body.password.padStart(64);

        app.registerOnLedger(publicKey, timeperiod, currenthash, password);

    });

    app.get("/check", function (req, res) {
        res.status(200).send("password");

    });
};

module.exports = appRouter;