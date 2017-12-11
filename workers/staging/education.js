var uuidV4 = require("uuid/v4");
var csvToJSON = require("../../adapters/csv-to-json").csvToJSON;
var fs = require('fs');
var userID = null;
var taskID = null;
var companyID = null;
module.exports = function(settings){
	var cprint = settings.cprint;
	
	function stepExecute(rows, parser, companyID, userID, taskID){
		var educationArray = [];
		parser.pause();
		var shouldResume = false;
		rows.data.forEach(function(aRow){
			if(aRow['firstName'])
				shouldResume = true;
			var tempArray = [
						taskID,
						aRow['email'],
						aRow['course'],
						aRow['institute'],
						aRow['batchFrom'] ? aRow['batchFrom'] : null,
						aRow['batchTo'] ? aRow['batchTo'] : null,
						aRow['type'] ? aRow['type'].replace(/ /g, '-').toLowerCase() : null,
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
		return new Promise(function(resolve, reject){
			csvToJSON(fileStream, function(rows, parser){
				return stepExecute(rows, parser, someCompanyID, someUserID, someTaskID)
			}, function(data){
				return resolve(data)
			})
		})
	}
	settings.initiateEducationStaging = initiateEducationStaging;
	//csvToJSON(fileStream, stepExecute)

}