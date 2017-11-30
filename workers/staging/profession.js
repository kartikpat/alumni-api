var uuidV4 = require("uuid/v4");
var csvToJSON = require("../../adapters/csv-to-json").csvToJSON;
var fs = require('fs');
var companyID = 1;
var taskID = uuidV4().replace(/\-/g,"");
var fileStream = fs.createReadStream('./test/generate/profession.csv', 'utf8');
module.exports = function(settings){
	var cprint = settings.cprint;	
	function stepExecute(rows, parser){
		var professionArray = [];
		parser.pause();
		rows.data.forEach(function(aRow){
			var tempArray = [
						taskID,
						aRow['email'],
						aRow['designation'],
						aRow['organisation'],
						aRow['from'] ? aRow['from'] : null,
						aRow['to'] ? aRow['to'] : null,
						1
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
		var query = "Insert into StagingProfessionalDetails (TaskId, Email, Designation, Organisation, DateOfJoining, DateOfLeaving, CompanyId) values ?";
		var queryArray = [ professionalArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function initiateProfessionStaging(someUserID, someTaskID,someCompanyID, fileStream){
		userID = someUserID;
		taskID = someTaskID;
		companyID = someCompanyID
		return new Promise(function(resolve, reject){
			csvToJSON(fileStream, stepExecute, function(data){
				return resolve(data)
			})
		})

	}

	settings.initiateProfessionStaging = initiateProfessionStaging;

	//csvToJSON(fileStream, stepExecute)

}