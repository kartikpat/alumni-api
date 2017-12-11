var uuidV4 = require("uuid/v4");
var csvToJSON = require("../../adapters/csv-to-json").csvToJSON;
var fs = require('fs');
// var fileStream = fs.createReadStream('./test/generate/profession.csv', 'utf8');
module.exports = function(settings){
	var cprint = settings.cprint;	
	function stepExecute(rows, parser, companyID, userID, taskID){
		var professionArray = [];
		parser.pause();
		var shouldResume = false;
		rows.data.forEach(function(aRow){
			if(aRow['firstName'])
				shouldResume = true;
			var tempArray = [
						taskID,
						aRow['email'],
						aRow['previous_designation'],
						aRow['previous_organisation'],
						aRow['from'] ? aRow['from'] : null,
						aRow['to'] ? aRow['to'] : null,
						userID,
						companyID
					];
			professionArray.push(tempArray);
		});
		addProfessionalDetails(professionArray)
		.then(function(rows){
			return parser.resume()
		})
		.catch(function(err){
			cprint(err,1);
			return parser.resume()
		})
	}

	function addProfessionalDetails(professionalArray){
		var query = "Insert into StagingProfessionalDetails (TaskId, Email, Designation, Organisation, DateOfJoining, DateOfLeaving,UserId, CompanyId) values ?";
		var queryArray = [ professionalArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function initiateProfessionStaging(someUserID, someTaskID,someCompanyID, fileStream){
		return new Promise(function(resolve, reject){
			csvToJSON(fileStream, function(rows, parser){
				return stepExecute(rows, parser, someCompanyID, someUserID, someTaskID)
			}, function(data){
				return resolve(data)
			})
		})
	}

	settings.initiateProfessionStaging = initiateProfessionStaging;
	//csvToJSON(fileStream, stepExecute)

}