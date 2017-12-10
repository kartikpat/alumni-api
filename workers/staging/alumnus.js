var fs = require("fs")
var uuidV4 = require("uuid/v4");
var csvToJSON = require("../../adapters/csv-to-json").csvToJSON;
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

	function stepExecute(rows, parser, companyID, userID, taskID){
		var userArray = [];
		parser.pause();
		var shouldResume = false;
		rows.data.forEach(function(aRow){
			if(!aRow['firstName'])
				shouldResume = true;
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
		if(shouldResume)
			return parser.resume();
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

	function fetchTaskRows(taskID, type){
		var query = "select if(message is null or message ='', 'correct', 'incorrect') as field, count(*) as cnt from StagingAlumnusMaster where TaskId = ? group by 1 order by message";
		var queryArray = [taskID];
		if(type =='education')
			query = "select if(message is null or message ='', 'correct', 'incorrect') as field, count(*) as cnt from StagingEducationDetails where TaskId = ? group by 1 order by message";
		if(type =='profession')
			query = "select if(message is null or message ='', 'correct', 'incorrect') as field, count(*) as cnt from StagingProfessionalDetails where TaskId = ? group by 1 order by message";
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	app.post('/initiate/:taskID/start', async function(req, res){
		var taskID = req.params.taskID ;
		var type = req.body.type || null;
		if(type =='education')
			return educationProcess(req, res);
		if(type == 'profession')
			return professionProcess(req, res);
		return alumniProcess(req, res);

	})
	async function alumniProcess(req, res){
		var taskID = req.params.taskID || null;
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
			var userID = rows[0]['UserId']
			var companyID = rows[0]['CompanyId'];
			var filePath = rows[0]['FilePath'];
			var fileStream = fs.createReadStream(settings.diskStorage+'/'+ filePath, 'utf8');
			// Staging Alumni details
			await new Promise(function(resolve, reject){
				csvToJSON(fileStream, function(rows, parser){
					return stepExecute(rows, parser, companyID, userID, taskID)
				}, function(data){
					return resolve(data)
				})
			})
			fileStream = fs.createReadStream(settings.diskStorage+'/'+ filePath, 'utf8');
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
	}
	async function educationProcess(req, res){
		var taskID = req.params.taskID || null;
		var type = req.body.type || null;
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
			var userID = rows[0]['UserId']
			var companyID = rows[0]['CompanyId'];
			var filePath = rows[0]['FilePath'];
			var fileStream = fs.createReadStream(settings.diskStorage+'/'+ filePath, 'utf8');
			// Staging education details
			await settings.initiateEducationStaging(userID, taskID, companyID, fileStream);
			await settings.sanitizeEducation(taskID, userID)
			var processedRows = await fetchTaskRows(taskID, type);
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
	}
	//csvToJSON(fileStream, stepExecute)
}