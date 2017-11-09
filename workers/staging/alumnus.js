var fs = require("fs")
var uuidV4 = require("uuid/v4");
var fileStream = fs.createReadStream('./test/generate/employee.csv', 'utf8');
var csvToJSON = require("../../adapters/csv-to-json").csvToJSON;
var companyID = 3;
var taskID = uuidV4().replace(/\-/g,"");
module.exports = function(settings){
	var cprint = settings.cprint;
	
	function stepExecute(rows, parser){
		var userArray = [];
		parser.pause();
		rows.data.forEach(function(aRow){
			var tempArray = [
				taskID,
				aRow['firstName'],
				aRow['middleName'] ? aRow['middleName'] : null,
				aRow['lastName'] ? aRow['lastName'] : null,
				aRow['email'],
				aRow['phone'],
				aRow['companyEmail'],
				aRow['dob'] ? (aRow['dob']): null,
				aRow['doj'] ? (aRow['doj']) : null,
				aRow['dol'] ? (aRow['dol']) : null,
				aRow['department'],
				aRow['designation'],
				aRow['lUrl'] ? aRow['lUrl']: null,
				aRow['code'] ? aRow['code'] : null,
				aRow['salaryLPA'] ? aRow['salaryLPA'] : null,
				companyID,
				aRow['sex'] ? aRow['sex'] : null
			];
			userArray.push(tempArray);
		});
		addUser(userArray)
		.then(function(rows){
			return parser.resume()
		})
		.catch(function(err){
			cprint(err,1);
			return parser.resume()
		})
	}

	function addUser(userArray){
		var query = "Insert into StagingAlumnusMaster (TaskId, FirstName, MiddleName, LastName, Email, Phone, CompanyEmail, Dob, DateOfJoining, DateOfLeaving, Department, Designation, LinkedinURL, Code, SalaryLPA, CompanyId, Sex ) values ?";
		var queryArray = [ userArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	//csvToJSON(fileStream, stepExecute)

}