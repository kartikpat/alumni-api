var uploader = require('../../lib/upload.js');
var fs = require('fs');
var moment = require('moment');
var config = require('../../configuration.json')
var mysql = require('mysql')

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
var connection = mysql.createConnection(writePoolConfig);

fs.readdir('./storage/profile', async function(err, files){
	if(err){
		console.log(err)
	}
	try{
		for(var i=0; i<files.length; i++){
			var fileName = await getFile('./storage/profile/'+files[i]);
			console.log(files[i])
			var email = files[i].split('.')
			email.splice(-1,1);

			console.log(email)
			email = email.join('.')
			console.log(email)
			await updateImagePath(fileName, email);

		}
		connection.destroy();
	}
	catch(err){
		console.log(err)
		connection.destroy();
	}
})

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

function getFile(path){
	return new Promise(function(resolve, reject){
		fs.readFile(path, function(err, data){
			var fileStream = fs.createReadStream(path);
			var t = moment();
			var storagePath = config["aws"]["s3"]["bucket"] +"/"+t.format('YYYY/MM/DD')
			var fileName = t.format('YYYY-MM-DD-HH-MM-SS-x')+'.jpg';
			
			uploader.upload(fileName, fileStream, storagePath, 'public-read', function(err, data){
				if(err){
					reject(err)
				}
				resolve(fileName)
			})
		})
	})
}

