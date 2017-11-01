/*
Entry point for the project. All the configurations and settings take place here.
*/
var express = require ("express");

var bodyParser = require("body-parser");
var program = require("commander");
var compression = require("compression");
var mode = "prod";
var env = "cloud";
/**
 * node.js fs module for accessing system file storage
 * @type {module}	
 */
var fs = require("fs");

/**
 * node.js mysql module for connecting to mysql databases
 * @type {module}
 */
var mysql = require("mysql");

/**
 * node.js request module for making HTTP requests
 * @type {module}
 */
var request = require("request");

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
if((!program.vault) || program.vault=="" || (!program.config)  ||  program.config==""){
	console.log("Please provide the vault/config location");
	console.log("Syntax: node --vault/config <location>");
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

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, appID, empID, version, token");
  next();
});

app.use(bodyParser.urlencoded({ extended: true }))
app.use(compression()); //compressing payload on every request
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
	vault: vault,
	mode: mode,
	env: env,
	cprint: cprint,
	request: request
}

require(__dirname+"/db/connect.js")(settings)
require(__dirname+"/db/query.js")(settings)
require(__dirname+"/workers/ingest.js")(settings)
require(__dirname+"/workers/staging/alumnus.js")(settings)
require(__dirname+"/workers/staging/education.js")(settings)
require(__dirname+"/workers/ingest-file.js")(settings);
require(__dirname+"/routes/common/error.js")(settings);
require(__dirname+"/routes/ingest.js")(settings);
require(__dirname+"/routes/auth/auth.js")(settings);
require(__dirname+"/routes/services/birthday.js")(settings);
require(__dirname+"/routes/register/register.js")(settings);
require(__dirname+"/routes/stats.js")(settings)
require(__dirname+"/routes/list/alumni.js")(settings);
require(__dirname+"/routes/list/department.js")(settings);

app.listen(port);
