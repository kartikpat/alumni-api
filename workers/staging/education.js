var uuidV4 = require("uuid/v4");
var csvToJSON = require("../../adapters/csv-to-json").csvToJSON;
var fs = require('fs');
var userID = null;
var taskID = null;
var companyID = null;
module.exports = function(settings){
	var cprint = settings.cprint;
	
	function stepExecute(rows, parser){
		var educationArray = [];
		parser.pause();
		rows.data.forEach(function(aRow){
			var tempArray = [
						taskID,
						aRow['email'],
						aRow['course'],
						aRow['institute'],
						aRow['from'] ? aRow['from'] : null,
						aRow['to'] ? aRow['to'] : null,
						aRow['type'] ? aRow['type'] : null,
						userID,
						companyID
					];
			educationArray.push(tempArray);
		});
		return addEducation(educationArray)
		.then(function(rows){
			return parser.resume()
		})
		.catch(function(err){
			cprint(err,1);
			return parser.resume()
		})
	}

	function addEducation(educationArray){
		var query = "Insert into StagingEducationDetails (TaskId, Email, Course, Institute, BatchFrom, BatchTo, CourseType, UserId, CompanyId) values ?";
		var queryArray = [ educationArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function initiateEducationStaging(someUserID, someTaskID,someCompanyID, fileStream){
		userID = someUserID;
		taskID = someTaskID;
		companyID = someCompanyID
		return new Promise(function(resolve, reject){
			csvToJSON(fileStream, stepExecute, function(data){
				return resolve(data)
			})
		})

	}
	settings.initiateEducationStaging = initiateEducationStaging;
	//csvToJSON(fileStream, stepExecute)

}