var uuidV4 = require("uuid/v4");
var csvToJSON = require("../../adapters/csv-to-json").csvToJSON;
var fs = require('fs');
var companyID = 1;
var taskID = uuidV4().replace(/\-/g,"");
var fileStream = fs.createReadStream('./test/generate/education.csv', 'utf8');
console.log(fileStream)
module.exports = function(settings){
	var cprint = settings.cprint;
	
	function stepExecute(rows, parser){
		var educationArray = [];
		parser.pause();
		rows.data.forEach(function(aRow){
			cprint(aRow)
			var tempArray = [
						taskID,
						aRow['email'],
						aRow['course'],
						aRow['institute'],
						aRow['from'] ? aRow['from'] : null,
						aRow['to'] ? aRow['to'] : null,
						aRow['type'] ? aRow['type'] : null,
						1
					];
			educationArray.push(tempArray);
		});
		addEducation(educationArray)
		.then(function(rows){
			return parser.resume()
		})
		.catch(function(err){
			cprint(err,1);
			return parser.resume()
		})
	}

	function addEducation(educationArray){
		var query = "Insert into StagingEducationDetails (TaskId, Email, Course, Institute, BatchFrom, BatchTo, CourseType, CompanyId) values ?";
		var queryArray = [ educationArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	//csvToJSON(fileStream, stepExecute)

}