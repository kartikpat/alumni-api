var fs = require("fs")
var uuidV4 = require("uuid/v4");
var csvToJSON = require("../../adapters/csv-to-json").csvToJSON;
var serviceArray = [];
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
				companyID,
				aRow['sex'] ? aRow['sex'] : null,
				aRow['course'],
				aRow['institute'],
				aRow['batchFrom'] ? aRow['batchFrom'] : null,
				aRow['batchTo'] ? aRow['batchTo'] : null,
				aRow['type'] ? aRow['type'].replace(/ /g, '-').toLowerCase() : null,
				aRow['previous_designation'],
				aRow['previous_organisation'],
				aRow['from'] ? aRow['from'] : null,
				aRow['to'] ? aRow['to'] : null
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
		var query = "Insert into stagingAlumnusDetails (TaskId, FirstName, MiddleName, LastName, Email, Phone, CompanyEmail, Dob, DateOfJoining, DateOfLeaving, Department, Designation, LinkedinURL, Code, SalaryLPA, UserId, CompanyId,Sex,Course, Institute, BatchFrom, BatchTo, CourseType, PreviousDesignation, PreviousOrganisation, OrganisationFrom, OrganisationTo ) values ?";
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

	function fetchTaskRows(taskID, userID){
		// var query = "select if((professionalErrMsg is null) or (PersonalErrMsg is null) or (educationErrMsg is null)as field, count(*) as cnt from StagingAlumnusMaster where TaskId = ? group by 1 order by message";
		var query = "SELECT COUNT(IF(status='pending',1, NULL)) 'pending', COUNT(IF(status='done',1, NULL)) 'done' FROM stagingAlumnusDetails where TaskId = ? and UserId = ?";
		var queryArray = [taskID, userID];
		// if(type =='education')
		// 	query = "select if(message is null or message ='', 'correct', 'incorrect') as field, count(*) as cnt from StagingEducationDetails where TaskId = ? group by 1 order by message";
		// if(type =='profession')
		// 	query = "select if(message is null or message ='', 'correct', 'incorrect') as field, count(*) as cnt from StagingProfessionalDetails where TaskId = ? group by 1 order by message";
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	app.post('/initiate/:taskID/start', async function(req, res){
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

			await new Promise(function(resolve, reject){
				csvToJSON(fileStream, function(rows, parser){
					return stepExecute(rows, parser, companyID, userID, taskID)
				}, function(data){
					return resolve(data)
				})
			})

			await fetchAllRecords(taskID, userID);

			var processedRows = await fetchTaskRows(taskID, userID);
			cprint(processedRows)
			var correctRows = processedRows[0]["done"];
			var incorrectRows = processedRows[0]["pending"];
			return updateTask(taskID, correctRows, incorrectRows);
		}
		catch(err){
			cprint(err,1)
			return settings.serviceError(res)
		}
	}


	function updateStatus(aRow) {
		var entryID = aRow["EntryId"];
		var query = "Update stagingAlumnusDetails set Status = ? where entryID = ? and (PersonalErrMsg is NULL) and (professionalErrMsg is NULL) and (educationErrMsg is NULL)";
		var queryArray = ['done', entryID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray)
		})
	}

	function fetchServices(userID){
		var query = 'Select ServiceId from ServicesAccess sa inner join ServicesMaster sm on sa.ServiceId = sm.Id inner join CompanyAccess ca on ca.CompanyId = sa.CompanyId inner join CompanyMaster cm on ca.CompanyId = cm.Id where ca.Id = ? and sa.Status = ? and ca.Status = ? and cm.Status = ? ';
		var queryArray = [userID , 'active', 'active', 'active'];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function fetchRecords(taskID, userID){
		var query = "Select sad.EntryId, sad.FirstName, sad.Email, sad.PreviousDesignation, sad.PreviousOrganisation, sad.Course, sad.Institute, ca.CompanyId from stagingAlumnusDetails sad inner join TaskMaster tm on sad.TaskId = tm.Id inner join CompanyAccess ca on ca.Id = tm.UserId inner join CompanyMaster cm on cm.Id = ca.CompanyId  where tm.Id = ? and tm.UserId = ? and sad.Status = ? ";
		var queryArray = [taskID, userID, 'pending'];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	async function sanitizeEachRecord(rows){
		var len = rows.length;
		for(var i=0; i < len; i++){
			try {
				if(rows[i]["FirstName"]) {
					
					await settings.sanitizeSingleRecord(rows[i],serviceArray);
				}
				if(rows[i]["Institute"] || rows[i]["Course"]) {
					await settings.sanitizeSingleEducationRecord(rows[i]);
				}
				if(rows[i]["PreviousDesignation"] || rows[i]["PreviousOrganisation"]) {
					await settings.sanitizeSingleProfessionRecord(rows[i]);
				}
				await updateStatus(rows[i]);
			}
			catch(err) {
				cprint(err,1)
				continue
			}
		}
		return Promise.resolve(1)
	}

	function fetchAllRecords(taskID, userID){
		return fetchServices(userID)
		.then(function(rows){
			serviceArray = []
			rows.forEach(function(aService){
				serviceArray.push(aService['ServiceId'])

			});
			return fetchRecords(taskID, userID)
		})
		.then( sanitizeEachRecord )
		.catch(function(err){
			cprint(err,1);
			return
		})
	}

}
