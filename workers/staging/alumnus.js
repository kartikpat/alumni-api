var fs = require("fs")
var uuidV4 = require("uuid/v4");
//var fileStream = fs.createReadStream('./test/generate/employee.csv', 'utf8');
var csvToJSON = require("../../adapters/csv-to-json").csvToJSON;
var taskID = null;
var userID = null;
module.exports = function(settings){
	var config = settings.config;
	var cprint = settings.cprint;
	var app = settings.app;

	function onCompletion(){
		updateTask()
		.then(function(rows){
			settings.sanitize(taskID, userID)
		})
		.catch(function(err){
			cprint(err,1);
		})
	}

	function updateTask(){
		var query = 'Update TaskMaster set Status = ? where Id = ?';
		var queryArray = [ 'done', taskID ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

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
				userID,
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
		var query = "Insert into StagingAlumnusMaster (TaskId, FirstName, MiddleName, LastName, Email, Phone, CompanyEmail, Dob, DateOfJoining, DateOfLeaving, Department, Designation, LinkedinURL, Code, SalaryLPA, UserId, Sex ) values ?";
		var queryArray = [ userArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	function fetchTask(taskID){
		var query = "Select Id,TaskId, FilePath, UserId from TaskMaster where Status = ? and Id = ?";
		var queryArray = ['pending', taskID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	app.post('/initiate/:taskID/start', function(req, res){
		taskID = req.params.taskID || null;
		fetchTask(taskID)
		.then(function(rows){
			if(rows.length<1){
				return	res.json({
					status: 'fail',
					message: 'no tasks available'
				})
			}
			res.json({
				status: 'success',
				message: 'initiated'
			});
			userID = rows[0]['UserId']
			var filePath = rows[0]['FilePath'];
			var fileStream = fs.createReadStream(settings.diskStorage+'/'+ filePath, 'utf8');
			return csvToJSON(fileStream, stepExecute, onCompletion);
		})
		.catch(function(err){
			cprint(err,1)
			return settings.serviceError(res)
		})

	})

	//csvToJSON(fileStream, stepExecute)

}