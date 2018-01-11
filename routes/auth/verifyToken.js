module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;


    app.post("/almust/authenticate", settings.isAuthenticated, function(req, res) {
		
		return res.json({
			status: "success"
		});
    });

}
