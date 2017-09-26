	/*
	Entry point for the project. All the configurations and settings take place here.
	*/
	var express = require ("express");
	var fs = require("fs");
	var bodyParser = require("body-parser");
	var program = require("commander");
	var compression = require("compression");
	var mode = "prod";
	var env = "cloud";
	var staticMiddlewareOptions = {
		dotfiles: 'deny',
		etag: true,
		extensions: ['html']
	};

	program
		.version(require('./package.json')['version'])
		.option('-d, --debug', 'run in debug mode')
		.option('-l, --local', 'run in local environment')
		.option('-p, --port [value]', 'specify the port number')
		.option('-c, --config [src]', 'specify config options')
		.option('-v, --vault [src]', 'specify credentials location')
		.parse(process.argv);

	if((!program.port) || program.port==""){
		console.log("Please provide the port number")
		console.log("Syntax: node --port <port number>")
		return
	}

	if(program.debug)
		mode = "debug";
	if(program.local)
		env = "local";

	var port = program.port;
	var config = require(program.config);
	var vault = program.vault;


	var app = express();
	// app.use(session({
	//   secret: 'some secret',
	//   resave: false,
	//   saveUninitialized: true,
	// }));
	app.use(bodyParser.urlencoded({ extended: true }))
	app.use(compression()); //compressing payload on every request

	app.engine('html', require('hogan-express'));
	app.set('partials',{
		header: 'header',
		footer: 'footer'
	});
	app.set('view engine', 'html');
	app.set('views', __dirname + '/views');
	app.use("/static",express.static(__dirname+"/static"))

	function cprint(text, level){
		if(mode=="debug")
			return console.log(text);
		if(level && level === 1)
			return console.log(text);
	}

	var settings= {
		config: config,
		app: app,
		mode: mode,
		env: env,
		cprint: cprint
	}

	require(__dirname+"/routes/home.js")(settings);
	app.listen(port);