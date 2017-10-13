var uuidV4 = require("uuid/v4");
function myError(err, data){
	var i = new Error(err);
	i.data = data;
	return i;
}
function checkDate(aString){
	try{
		var d = new Date(aString);
			if(d=="Invalid Date")
				return null;
		return d.getTime();
	}catch(err){
		return null
	}

}
module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.post("/company/:companyID/ingest", function(req, res){
		var companyID = req.params.companyID;
		var taskID = uuidV4().replace(/\-/g,"");
		var props = {
			taskID : taskID,
			companyID: companyID
		};
		var checkRequest = Promise.all([validate(req, res, props), authenticate(req, res, props)])
		checkRequest.then(function(dataArray){
			props.data = dataArray[0];
			return Promise.resolve(props);
		})
		.then(ingest)
		.then(function(dataArray){
			var userArray = dataArray[3]['userArray']
			var errorResponse = generateErrorResponse(userArray);
			return res.json({
				status: errorResponse.status,
				data: errorResponse.errorArray,
				message: errorResponse.message
			});
		})
		.catch(function(err){
			switch(err.message){
				case "noRecords":
					return res.status(422).json({
						status: err.data.status,
						data: err.data.errorArray,
						message: err.data.message
					});
					break;
			}
			cprint(err,1);
			return settings.serviceError(res);
		})
	})

	function validate(req, res, props){
		var payload = req.body.payload || null;
		var errorMessage= null;
		var errorArray = [];
		try {
			var temp = JSON.parse(payload);
		}
		catch(err){
			cprint(err,1);
			errorMessage = invalidFormat
		}
		payload = JSON.parse(payload);
		
		if(payload.length<1)
			errorMessage = invalidFormat
	
		return checkUser(payload, props);
	}

	function authenticate(req, res){
		// TODO add auth logic here
		return true
	}

	function checkUser(userArray, props){
		props['alumni'] = [];
		props['educationArray'] = [];
		props['professionArray'] = [];
		userArray.forEach(function(aUser){
			if(!(aUser["firstName"] && aUser["email"] && aUser["phone"] && aUser['companyEmail'] && aUser['department'] && aUser['designation'])){
				aUser.valid = "invalid";
				return
			}

			// TODO add other user fields as well
			var userDetailArray = [
				props.taskID,
				aUser['firstName'],
				aUser['middleName'] ? aUser['middleName'] : null,
				aUser['lastName'] ? aUser['lastName'] : null,
				aUser['email'],
				aUser['phone'],
				aUser['companyEmail'],
				aUser['dob'] ? checkDate(aUser['dob']): null,
				aUser['doj'] ? checkDate(aUser['doj']) : null,
				aUser['dol'] ? checkDate(aUser['doj']) : null,
				aUser['department'],
				aUser['designation'],
				aUser['lUrl'] ? aUser['lUrl']: null,
				aUser['code'] ? aUser['code'] : null,
				aUser['salary'] ? aUser['salary'] : null,
				props.companyID,
				aUser['sex'] ? aUser['sex'] : null
			]

			props.alumni.push(userDetailArray);

			if(aUser["education"] && aUser["education"].length >0 )
				aUser["education"].forEach(function(aRow){
					var educationDetailArray = checkQualification(aRow);
					if(!educationDetailArray)
						aUser.valid = "partial"
					if(aRow["valid"] == "invalid")
						return
					var educationDetailArray = [
						props.taskID,
						aUser['email'],
						aRow['course'],
						aRow['institute'],
						aRow['from'] ? aRow['from'] : null,
						aRow['to'] ? aRow['to'] : null,
						aRow['type'] ? aRow['type'] : null,
						props.companyID
					];
					props.educationArray.push(educationDetailArray);
				})

			if(aUser["profession"] && aUser["profession"].length >0 )
				aUser["profession"].forEach(function(aRow){
					if(!checkProfession(aRow))
						aUser.valid = "partial"
					if( aRow['valid'] == "invalid" )
						return
					var professionDetailArray = [
						props.taskID,
						aUser['email'],
						aUser['designation'],
						aRow['company'],
						checkDate(aUser['from']),
						checkDate(aUser['to']),
						props.companyID
					]
					props.professionArray.push(professionDetailArray);
				})
		});
		props.userArray = userArray;
		return props;
	}

	function checkProfession(aProfession){
		if( !(aProfession["designation"] && aProfession["company"] ) ){
			aProfession.valid = "invalid"
			cprint('.......1')
			return false
		}
		if(!(aProfession["from"] && aProfession["to"] && aProfession["designation"] )){
			aProfession.valid = "partial"
			cprint('.......2')
			return false
		}
		return true
	}

	function checkQualification(aQualifictaion){
		if( !(aQualifictaion["course"] && aQualifictaion["institute"] ) ){
			aQualifictaion.valid = "invalid"
			cprint('.......3')
			return false
		}
		if(!(aQualifictaion["from"] && aQualifictaion["to"] &&  aQualifictaion["type"])){
			aQualifictaion.valid = "partial"
			cprint('.......4')
			return false
		}
		return true
	}

	function ingest(props){
		var alumniArray = props.alumni;
		var educationArray = props.educationArray;
		var professionArray = props.professionArray;
		if( !(alumniArray && alumniArray.length>1) )
			return Promise.reject(new myError("noRecords", generateErrorResponse(props.userArray) ))

		var addingUsers = addUser(alumniArray);
		var addingEducation = Promise.resolve(1);
		var addingProfession = Promise.resolve(1);
		if(educationArray.length > 0)
			addingEducation = addEducationDetails(educationArray)
		if(professionArray.length > 0)
			addingProfession = addProfessionalDetails(professionArray);
		var statusPromise = Promise.resolve(props)
		var ingestionPromiseArray = [ addingUsers, addingEducation, addingProfession, statusPromise	 ];
		var ingestionPromise = Promise.all(ingestionPromiseArray.map(p => p.catch(e => e)));
		return ingestionPromise;
	}

	function generateErrorResponse(userArray){
		var errorArray = [];
		var status = 'partial';
		var message = "Records inserted successfully. Additional information is still pending."
		userArray.forEach(function(aUser){
			if(aUser['valid'])
				errorArray.push(aUser['valid'])
			else
				errorArray.push("success")
		})
		var distinctErrors = Array.from(new Set(errorArray));
		if(distinctErrors.length==1){
			status = distinctErrors[0];
			if(status == "invalid")
				message = "No processable records found. Please verify the format."
			else if(status == "success")
				message = "Records inserted successfully"
		}
		return {
			status: status,
			errorArray: errorArray,
			message: message
		}
	}

	function addUser(userArray){
		var query = "Insert into StagingAlumnusMaster (TaskId, FirstName, MiddleName, LastName, Email, Phone, CompanyEmail, Dob, DateOfJoining, DateOfLeaving, Department, Designation, LinkedinURL, Code, SalaryLPA, CompanyId, Sex ) values ?";
		var queryArray = [ userArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function addEducationDetails(educationArray){
		var query = "Insert into StagingEducationDetails (TaskId, Email, Course, Institute, BatchFrom, BatchTo, CourseType, CompanyId) values ?";
		var queryArray = [ educationArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	function addProfessionalDetails(professionalArray){
		var query = "Insert into StagingProfessionalDetails (TaskId, Email, Designation, Organisation, FromTimestamp,ToTimestamp, CompanyId) values ?";
		var queryArray = [ professionalArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}