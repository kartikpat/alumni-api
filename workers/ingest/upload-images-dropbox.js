var uploader = require('../../lib/upload.js');
var fs = require('fs');
var moment = require('moment');
var config = require('../../configuration.json')
var mysql = require('mysql');
var request = require('request');

var writePoolConfig = {
		connectionLimit: 20,
		user: config["db"]["write"]["user"],
		password: config["db"]["write"]["password"],
		database: config["db"]["write"]["name"],
		host: config["db"]["write"]["host"],
		debug: false,
		connectTimeout: 120000 ,
		timeout: 120000
	};
var connection = null;


function dbCall(connection, query, queryArray){
		return new Promise(function (resolve, reject){
				connection.query(query, queryArray, function(err, rows, fields){
					console.log(this.sql)
					if(err){
						return reject(err);
					}
					return resolve(rows);
				});
			})
	}

function updateImagePath(image, email){
	email = email.toLowerCase();
	var query = 'Update AlumnusMaster Set Image = ? where LOWER(CompanyEmail) = ?';
	var queryArray = [image, email];
	return dbCall(connection, query, queryArray);
}

function getFile(path, url){
	var options = { 
		method: 'POST',
		encoding: null ,
	  	url: 'https://content.dropboxapi.com/2/sharing/get_shared_link_file',
	  	headers: { 
	     	'dropbox-api-arg': JSON.stringify({
	     		"url":url,
	     		"path":'/'+path
	     }),
	     	authorization: 'Bearer Sj7eSzKeuxAAAAAAAAAA89Eh_ojrBPlgv52XASgVjhOn2vVOijPuInUt6GzvQKz3' 
	     } 
	 };
	return new Promise(function(fulfill, reject){
		request(options, function (err, response, body) {
		  if(err){
				cprint(err,1);
				reject(err);
			}
			if(response.statusCode==200){
				 fulfill(body);
			}
			else{
				reject(body);
			}
		});
	})
}

function uploadFile(fileStream){
	return new Promise(function(resolve, reject){
		var t = moment();
		var storagePath = config["aws"]["s3"]["bucket"] +"/profileImages/"+t.format('YYYY/MM/DD')
		var fileName = t.format('YYYY-MM-DD-HH-MM-SS-x')+'.jpg';

		uploader.upload(fileName, fileStream, storagePath, 'public-read', function(err, data){
			if(err){
				reject(err)
			}
			resolve(fileName)
		})
	})
}
function listFiles(url){
	var options = { 
		method: 'POST',
	  	url: 'https://api.dropboxapi.com/2/files/list_folder',
	  	headers: { 
	  		'content-type': 'application/json',
	     	authorization: 'Bearer Sj7eSzKeuxAAAAAAAAAA9BaAKm6EpneDkztIvIA2k8UA7-xbTPXBFid2R1_kvbty' 
	     },
	  	body: { 
	  		path: '',
	     	shared_link: { 
	     		url: url 
	    	} 
	 	},
	  json: true 
	};
	return new Promise(function(fulfill, reject){
		request(options, function (err, response, body) {
		  if(err){
				cprint(err,1);
				reject(err);
			}
			if(response.statusCode==200){
				 fulfill(body);
			}
			else{
				reject(body);
			}
		});
	})
}
async function init(url){
	connection = mysql.createConnection(writePoolConfig);
	try{
		var files = await listFiles(url);
		files = files['entries'] || [];
		for(var i=0; i < files.length; i++ ){
			var file = await getFile(files[i]["name"], url);
			var fileStream = file;
			var name = await uploadFile(fileStream);
			var email = files[i]["name"].split('.')
			email.splice(-1,1);
			email = email.join('.')
			await updateImagePath(name, email);
		}
		connection.destroy();
	}
	catch(err){
		console.log(err);
		connection.destroy();
	}
}

// var test =init("https://www.dropbox.com/sh/l9eebaka6newp8y/AABipCAAZBgzX4EG6Zbprte9a?dl=0");
exports.init = init;