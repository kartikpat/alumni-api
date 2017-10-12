function myError(err, data){
	var i = new Error(err);
	i.data = data;
	return i;
}
module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.post("/company/:companyID/ingest", function(req, res){
		var companyID = req.params.companyID;
		var checkRequest = Promise.all([validate(req, res), authenticate(req, res)])
		checkRequest.then(function(dataArray){
			var props = dataArray[0];
			return Promise.resolve(props);
		})
		.then(ingest)
		.then(function(){
			return res.json({
				status: "success",
				message: "rows inserted"
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

	function validate(req, res){
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
	
		return checkUser(payload);
	}

	function authenticate(req, res){
		// TODO add auth logic here
		return true
	}

	function checkUser(userArray){
		var props = {
			alumni : [],
			educationArray: [],
			professionArray: []
		};
		userArray.forEach(function(aUser){
			if(!(aUser["firstName"] && aUser["email"] && aUser["phone"])){
				aUser.valid = "invalid";
				return
			}

			// TODO add other user fields as well
			var userDetailArray = [
				aUser['firstName'],
				aUser['email'],
				aUser['phone'],
				aUser['lastName'] ? aUser['lastName'] : null,
				aUser['middleName'] ? aUser['middleName'] : null,
				aUser['dob'] ? aUser['dob'] : null
			]

			props.alumni.push(userDetailArray);

			if(aUser["education"] && aUser["education"].length >0 )
				aUser["education"].forEach(function(aRow){
					var educationDetailArray = checkQualification(aRow);
					if(!educationDetailArray)
						aUser.valid = partial
					if(aRow["valid"] == "invalid")
						return
					var educationDetailArray = [
						aUser['email'],
						aRow['name'],
						aRow['institute'],
						aRow['from'] ? aRow['from'] : null,
						aRow['to'] ? aRow['to'] : null,
						aRow['type'] ? aRow['type'] : null
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
						aUser['email'],
						aRow['name'],
						aRow['company'],
						aUser['from'],
						aUser['to'],
						aUser['designation']
					]
					props.professionArray.push(professionDetailArray);
				})
		});
		props.userArray = userArray;
		return props;
	}

	function checkProfession(aProfession){
		if( !(aProfession["name"] && aProfession["company"] ) ){
			aProfession.valid = "invalid"
			return false
		}
		if(!(aProfession["from"] && aProfession["to"] && aProfession["designation"] )){
			aProfession.valid = "partial"
			return false
		}
		return true
	}

	function checkQualification(aQualifictaion){
		if( !(aQualifictaion["name"] && aQualifictaion["institute"] ) ){
			aQualifictaion.valid = "invalid"
			return false
		}
		if(!(aQualifictaion["from"] && aQualifictaion["to"] &&  aQualifictaion["type"])){
			aQualifictaion.valid = "partial"
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
		var addingEducation = addEducationDetails(educationArray);
		var addingProfession = addProfessionalDetails(professionArray);
		var ingestionPromiseArray = [ addingUsers, addingEducation, addingProfession ];
		var ingestionPromise = Promise.all(ingestionPromiseArray);
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
		var query = "Insert into AlumniMaster (name) values ?";
		var queryArray = [ userArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function addEducationDetails(educationArray, connection){
		var query = "Insert into EducationDetails (name) values ?";
		var queryArray = [ educationArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	function addProfessionalDetails(professionalArray, connection){
		var query = "Insert into ProfessionDetails (name) values ?";
		var queryArray = [ professionalArray ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}