var fs = require('fs');
var uuidV4 = require("uuid/v4");
var uploader = require("../../lib/upload.js");
var request = require('request');
const Multer = require('multer');
const multer = Multer({
  storage: Multer.memoryStorage(),
  // limits: {
  //   fileSize: 5 * 1024 * 1024 // no larger than 5mb
  // },
  onError : function(err, next) {
      console.log('error', err);
      next(err);
    }
});

module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		return next();
	}
	app.post("/company/:companyID/upload", settings.isAuthenticated, validate ,multer.single('aFile'),function(req, res){
		var companyID = req.body.companyID,
			userID = req.body.userID,
			fileType = req.body.type,
			fileStream = req.file.buffer;
		if(!userID)
			return unprocessableEntity(res);
		var taskID = uuidV4().replace(/\-/g,"");
		var fileName = Date.now()+'.csv';
		var writeStream = fs.createWriteStream(settings.diskStorage+'/'+fileName);
		// fileStream.pipe(writeStream);
		writeStream.write(fileStream);
		var timestamp = Date.now();
		addTask(userID, fileName, fileType, timestamp)
		.then(function(rows){
			var id = rows.insertId;
			res.json({
				status: "success"
			});
			console.log('Calling request')
			request({uri: config['worker']['baseUrl']+'/initiate/'+id+'/start', method: 'POST'}, function(err, response, body){
				if(err)
					return cprint(err,1);
				return cprint(body);
			})

		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res)
		})
		writeStream.on('error', function(err){
			cprint(err,1);
			return settings.serviceError(res)
		})

	})
	function addTask(userID, fileName, fileType, timestamp){
		var query = "Insert into TaskMaster ( UserId, filePath, fileType, Status, Timestamp) values (?, ?, ?, ?, ?)";
		var queryArray = [userID, fileName, fileType, 'pending', timestamp];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}
