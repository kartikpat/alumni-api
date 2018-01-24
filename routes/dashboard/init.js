var moment = require("moment");
var request = require('request')
module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;


	app.get("/company/:companyID/dashboard",settings.isAuthenticated, function(req, res){
		var companyID = req.params.companyID;
		var currentMonth = 1+ moment().month();
		var promiseArray = [ alumniCount(companyID), getBirthdayCount(companyID,currentMonth), getNewsCount(companyID)]
		var initialPromise = Promise.all(promiseArray)
		initialPromise.then(function(dataArray){
			var alumniRows = dataArray[0];
			var birthdayRows = dataArray[1];
			var newsRows = (dataArray[2]) ? JSON.parse(dataArray[2]) : "";

			var total = alumniRows[0]["totalCount"];
			var birthdayCount = birthdayRows[0]["birthdayCount"];
			var newsCount = (newsRows['data'])? newsRows['data'].length : 0

			var data = [];
			data.push({
				id: "total",
				value: total
			})
			data.push({
				id: "birthdayCount",
				value: birthdayCount
			})
			data.push({
				id: "totalNews",
				value: newsCount
			})
			return res.json({
				status: "success",
				data: data
			})
		})
		.catch(function(err){
			cprint(err,1)
			return settings.serviceError(res);
		})

	});

	function alumniCount(companyID){
		var query = "Select count(*) as totalCount from AlumnusMaster where CompanyId = ?";
		var queryArray = [companyID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	function getBirthdayCount(companyID, aMonth ){
		var query = "Select count(*) as birthdayCount from AlumnusMaster am where am.companyId = ? and Month(DateOfBirth) = ?";
		var queryArray = [companyID, aMonth];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		});
	}
	function getNewsCount(companyID){
		return new Promise(function(fulfill, reject){
			request.get({
				url: config["services"]["news"]+"/group/"+companyID+"/news/",
				strictSSL: false
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
