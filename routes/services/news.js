var request = require('request');
var sendMessage = require('../../Q/sqs/news.js');
module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		var group = req.body.group || null;
		if(!(group && group.split(',').length>0))
			return settings.unprocessableEntity(res);
		return next()
	}
	app.post('/company/:companyID/news/:newsID/send', validate, async function(req, res){
		var companyID = req.params.companyID,
			newsID = req.params.newsID;
		var groupArray = req.body.group.split(',');
		var timestamp = Date.now();
		try{
			var promiseData = await Promise.all([fetchAlumniList(companyID, groupArray), fetchNews(companyID, newsID)])
			var alumniRows = promiseData[0];
			var newsRows = promiseData[1];
			if(newsRows.length <1 || alumniRows.length <1)
				return settings.badRequest(res);
			res.json({
				status: "success"
			})
			var batchArray = [];
			alumniRows.forEach(async function(aRow, index){
				batchArray.push({
					id:aRow["AlumnusId"],
					catID: aRow["Group"],
					email: aRow["Email"],
					name: aRow["FirstName"]
				})
				if(index%5 ==0 && index>0){
					await populateQ("send", companyID, newsID, batchArray, timestamp);
					batchArray = [];
				}
			});
			if(batchArray.length >0)
				populateQ("send", companyID, newsID, batchArray, timestamp);
			return
		}
		catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}

	});

	function fetchAlumniList(companyID, groupArray){
		var query = "Select am.AlumnusId,FirstName, Email, `Group` from AlumnusMaster am inner join AlumniGroupMapping agm on am.AlumnusId = agm.AlumnusId where am.companyId = ? and `Group` in (?)";
		var queryArray = [ companyID, groupArray ];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}
	
	function populateQ( event, companyID, newsID, dataArray, timestamp){
		var message = {
			event: event,
			newsID: newsID,
			groupID: companyID,
			data: dataArray,
			timestamp:timestamp
		}
		return sendMessage(message);
	}
		

	function fetchNews(companyID, newsID){
		return new Promise(function(fulfill, reject){
			request.get({
				url: config["services"]["news"]+"/group/"+companyID+"/news/"+newsID
				// qs: {
				// 	q: searchString,
				// 	id: userIDArray.join(",")
				// }
			}, function(err, response, body){
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
			})
		})
	}
}