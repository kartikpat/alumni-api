/***
home.js
This module contains all the view rendering.
What all is visible to the eyes comes right through here.
**/

var assetsMapper = require("../asset-mapper.json")

module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var baseUrl =  config["baseUrl"];
	if(env=="local")
		baseUrl= config["baseUrl_local"];
	function isAuthenticated(req, res, next) {
		//bypassing the auth for development
		return next()
    // CHECK THE USER STORED IN SESSION FOR A CUSTOM VARIABLE
    // you can do this however you want with whatever variables you set up
    	if (req.session.authenticated)
        	return next();
    // IF A USER ISN'T LOGGED IN, THEN REDIRECT THEM SOMEWHERE
    	res.redirect('/sign-in');
	}

	app.get("/", isAuthenticated,function(req, res){
		res.render("index", {
			title: "",
			styles:  assetsMapper["index"]["styles"][mode],
			scripts: assetsMapper["index"]["scripts"][mode],
			baseUrl: baseUrl
		});
	});
}