var appRouter = function (app) {
    app.get("/", function(req, res) {
      res.status(200).send("Welcome to our restful API");
    });

    //receive information from form
    app.post("/register", function(req, res) {
      
      //send to ledger
      // res.send(req.body.publickey);
      // res.send(req.body.timeperiod);
      // res.send(req.currenthash);
      // res.send(req.password);

      


    });
  }
  
  module.exports = appRouter;