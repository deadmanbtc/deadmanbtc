var appRouter = function (app) {
    app.get("/", function(req, res) {
      res.status(200).send("Welcome to our restful API");
    });

    //receive information from form
    app.post("/register", function(req, res) {
      res.send(req.body.publickey);
    });
  }
  
  module.exports = appRouter;