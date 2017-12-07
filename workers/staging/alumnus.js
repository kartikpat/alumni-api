var fs = require("fs")
var uuidV4 = require("uuid/v4");
var csvToJSON = require("../../adapters/csv-to-json").csvToJSON;
var taskID = null;
var userID = null;
var companyID = null;
module.exports = function(settings){
	var config = settings.config;
	var cprint = settings.cprint;
	var app = settings.app;

	async function onCompletion(){
		await settings.sanitize(taskID, userID)
		updateTask();
	}

	function updateTask(taskID, correctRows, incorrectRows){
		var timestamp = Date.now();
		var query = 'Update TaskMaster set Status = ?, EndTimestamp = ?, CorrectRowCount = ?, IncorrectRowCount= ? where Id = ?';
		var queryArray = [ 'done', timestamp, correctRows, incorrectRows, taskID ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function stepExecute(rows, parser){
		var userArray = [];
		parser.pause();
		rows.data.forEach(function(aRow){
			console.log(aRow)
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
		var query = "Insert into StagingAlumnusMaster (TaskId, FirstName, MiddleName, LastName, Email, Phone, CompanyEmail, Dob, DateOfJoining, DateOfLeaving, Department, Designation, LinkedinURL, Code, SalaryLPA, UserId, CompanyId,Sex ) values ?";
		var queryArray = [ userArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	function fetchTask(taskID){
		var query = "Select tm.Id, tm.TaskId, tm.FilePath, tm.UserId, ca.CompanyId from TaskMaster tm inner join CompanyAccess ca on tm.UserId = ca.Id where tm.Status = ? and tm.Id = ?";
		var queryArray = ['pending', taskID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function fetchTaskRows(taskID){
		var query = "select if(message is null or message ='', 'correct', 'incorrect') as field, count(*) as cnt from StagingAlumnusMaster where TaskId = ? group by 1 order by message";
		var queryArray = [taskID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	app.post('/initiate/:taskID/start', async function(req, res){
		taskID = req.params.taskID || null;
		try{
			var rows = await fetchTask(taskID)
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
			companyID = rows[0]['CompanyId'];
			var filePath = rows[0]['FilePath'];
			var fileStream = fs.createReadStream(settings.diskStorage+'/'+ filePath, 'utf8');
			// Staging Alumni details
			await new Promise(function(resolve, reject){
				csvToJSON(fileStream, stepExecute, function(data){
					return resolve(data)
				})
			})
			fileStream = fs.createReadStream(settings.diskStorage+'/'+ filePath, 'utf8');
			// Staging education details
			await settings.initiateEducationStaging(userID, taskID, companyID, fileStream);
			fileStream = fs.createReadStream(settings.diskStorage+'/'+ filePath, 'utf8');
			await settings.initiateProfessionStaging(userID, taskID, companyID, fileStream);
			await settings.sanitize(taskID, userID);
			await settings.sanitizeEducation(taskID, userID)
			await settings.sanitizeProfession(taskID, userID);
			var processedRows = await fetchTaskRows(taskID);
			var correctRows = 0;
			var incorrectRows = 0;
			processedRows.forEach(function(aRow){
				if(aRow['field'] && aRow['field']== 'correct')
					return correctRows+=aRow['cnt'];
				return incorrectRows+=aRow['cnt'];
			})
			return updateTask(taskID, correctRows, incorrectRows);
		}
		catch(err){
			cprint(err,1)
			return settings.serviceError(res)
		}

	})

	//csvToJSON(fileStream, stepExecute)

}