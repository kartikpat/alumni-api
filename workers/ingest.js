var moment = require('moment');
var sendMessage = require('../Q/sqs/q.js');
function checkDate(aString){
	var d = moment(aString, 'DD/MM/YYYY');
	if(!d.isValid())
		return null;
	return d.valueOf();
}

var validateMap = {
	"firstName": "First Name",
	"email": "Email",
	"companyEmail": "Company Email",
	"doj": "Date Of Joining",
	"dol": "Date Of Leaving",
	"department": "Department",
	"designation": "Designation",
	"salaryLPA": "SalaryLPA"
}

module.exports = function(settings){
	var cprint = settings.cprint;
	var config = settings.config;

	function validateUserFields(anObject){
		var requiredFields = ['firstName', 'email', 'companyEmail', 'doj','dol', 'department', 'designation', 'salaryLPA'];
		var dateFields = [ 'doj','dol']
		var emailFields = ['email', 'companyEmail']
		var missing = [];
		var invalid = [];
		requiredFields.forEach(function(aField){
			if(!anObject[aField])
				missing.push(validateMap[aField])
		})
		dateFields.forEach(function(aField){
			if(anObject[aField])
				if(!checkDate(anObject[aField]))
					invalid.push(validateMap[aField])
				else
					anObject[aField] = checkDate(anObject[aField])
		})
		//TODO add a email validate function her

		var errMessage = '';
		if(missing.length>0)
			errMessage+=('Missing values: '+ missing.join(', ')+'.' );
		if(invalid.length>0)
			errMessage+=('Invalid format: '+invalid.join(', ')+'.');
		if(errMessage && errMessage!='')
			throw new Error(errMessage);
	}

	function fetchAlumnus(entryID, email){
		var query = "Select EntryId, FirstName, MiddleName, LastName, Email, Phone, CompanyEmail, Dob, DateOfJoining, DateOfLeaving, Department, Designation, LinkedinURL, Code, SalaryLPA, CompanyId, Sex from stagingAlumnusDetails where EntryId= ?"
		var queryArray = [entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function sanitizeSingleRecord(aRow, serviceArray){
		var props = {};
		var companyID = aRow["CompanyId"];
		var email = aRow["Email"];
		var entryID = aRow["EntryId"];
		props.serviceArray = serviceArray;
		props.serviceObj = {};
		var alumniDetails = Promise.all([fetchAlumnus(entryID, email)])

		return alumniDetails
		.then(function(dataArray){
			cprint(props.serviceArray)
			var rows = dataArray[0];
			props.firstName = rows[0]["FirstName"] || null;
			props.middleName = rows[0]["MiddleName"];
			props.lastName = rows[0]["LastName"];
			props.email = rows[0]['Email'] || null;
			props.phone = rows[0]['Phone'] || null;
			props.companyEmail = rows[0]['CompanyEmail'] || null;
			props.dob = rows[0]['Dob'];
			props.dateOfBirth = checkDate(rows[0]['Dob']) ? moment(rows[0]['Dob'], 'DD/MM/YYYY').format('YYYY-MM-DD') : null;
			props.doj = rows[0]['DateOfJoining'];
			props.dol = rows[0]['DateOfLeaving'];
			props.department = rows[0]['Department'] || null;
			props.designation = rows[0]['Designation'] || null;
			props.linkedInUrl = rows[0]['LinkedinURL'] || null;
			props.code = rows[0]['Code'] || null;
			props.salaryLPA = rows[0]['SalaryLPA'] || null;
			props.sex = rows[0]['Sex'] || null;
			props.companyID = companyID;
			if(!props.firstName) {
				return Promise.reject(new Error("FirstName is missing, Personal details discarded!"))
			}
			validateUserFields(props);

			var prepareAlumni = Promise.all([addDepartment(props.department, props.companyID), addDesignation(props.designation, props.companyID)]);
			return prepareAlumni;
		})
		.then(function(dataArray){
			var departmentRows = dataArray[0];
			var designationRows = dataArray[1];

			props.departmentID = departmentRows.insertId;
			props.designationID = designationRows.insertId;

			return addUser([props.firstName , props.middleName , props.lastName , props.email , props.phone, props.companyEmail , props.dob , props.dateOfBirth, props.doj , props.dol , props.departmentID , props.designationID , props.linkedInUrl , props.code , props.salaryLPA , props.companyID , props.sex])
		})
		.then(function(rows){
			var alumnusID = rows.insertId;
			props.alumnusID = alumnusID;
			return mapAlumniGroup(alumnusID, props.department, props.companyID)
		})
		.then(function(rows){
			var subscriptionArray = [];
			cprint(props.serviceArray)
			if(props.serviceArray.length <1)
				return Promise.resolve('1');
			props.serviceArray.forEach(function(aService){
				if(!props.dateOfBirth && aService == 1) {
					subscriptionArray.push([
						aService,
						props.alumnusID,
						'unsubscribe'
						])
					props.serviceObj[aService] = aService;
					return
				}
				subscriptionArray.push([
					aService,
					props.alumnusID,
					'active'
					])
				props.serviceObj[aService] = aService;
			})
			cprint(props.serviceObj)
			return subscribe(subscriptionArray);
		})
		.then(function(rows){
			return fetchCompanyDetails(props.companyID)
		})
		.then(function(rows) {
			var companyName = rows[0]["Name"];
			var companyUrl = rows[0]["WebsiteUrl"]
			var logoPath = rows[0]['Logo'].split('-');
			logoPath = [logoPath[0], logoPath[1], logoPath[2]].join('/');
			var logo =	"https://s3." + config["aws"]["credentials"]["region"] + ".amazonaws.com/" + config["aws"]["s3"]["bucket"]+'/'+logoPath+'/'+rows[0]['Logo'];
			if(props.serviceObj[1] && props.dateOfBirth) {
				var qObject = {
					alumnusId: props.alumnusID,
					templateId: 1,
					timestamp: Date.now(),
					firstName: props.firstName,
					middleName: props.middleName,
					lastName: props.lastName,
					dob: settings.formatDate_yyyymmdd(props.dateOfBirth),
					companyId: props.companyID,
					companyUrl : companyUrl,
					companyLogo : logo,
					email: props.email,
					companyName: companyName
				}

				return populateQ(qObject);
			}
			return
		})
		.catch(async function(err){
			cprint(err,1);
			var message = err.message;
			if(err.errno ==1048 ){
				message = err.sqlMessage.match(/[^"]+(?=(" ")|"$)/g);
				message = "Invalid format for "+message;
			}
			await updateError(entryID, err.message)
			if(err.errno = 1062) {
				throw new Error("duplicate entry found.");
			}
			return
		})
	}

	function fetchCompanyDetails(companyID){
		var query = 'Select Name,Logo,WebsiteUrl from CompanyMaster where Id = ? and Status= ?';
		var queryArray = [ companyID, 'active'];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function populateQ(anObj){
		var message = {
			event: 'active',
			id: anObj["alumnusId"],
			email: anObj["email"],
			payload: {
				name: [ anObj["firstName"], anObj["middleName"], anObj["lastName"] ].join(" "),
				company: anObj["companyName"]
			},
			templateId: anObj["templateId"] ,
			groupId: anObj["companyId"],
			companyUrl : anObj["companyUrl"],
			companyLogo : companyLogo,
			dob: anObj["dob"],
			timestamp: anObj["timestamp"]
		}
		sendMessage(message);
	}

	function subscribe(subscriptionArray){
		var query = 'Insert into ServiceSubscription ( ServiceId, AlumnusId, Status) values ?';
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, [subscriptionArray]);
		})
	}

	function addUser(queryArray){
			var query = "Insert into AlumnusMaster (FirstName, MiddleName, LastName, Email, Phone, CompanyEmail, Dob, DateOfBirth, DateOfJoining, DateOfLeaving, DepartmentId, DesignationId, LinkedinURL, Code, SalaryLPA, CompanyId, Sex ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ) on duplicate key update FirstName = values(FirstName), MiddleName = values(MiddleName), LastName= values(LastName), Phone= values(Phone), CompanyEmail = values(CompanyEmail), Dob= values(Dob), DateOfBirth = values(DateOfBirth), DateOfJoining = values(DateOfJoining), DateOfLeaving=values(DateOfLeaving), DepartmentId = values(DepartmentId), DesignationId = values(DesignationId), LinkedinURL= values(LinkedinURL), Code = values(Code), SalaryLPA = values(SalaryLPA), Sex = values(Sex) ";
			return settings.dbConnection().then(function(connection){
				return settings.dbCall(connection, query, queryArray);
			})
		}

	function addDepartment(departmentName, companyID){
		var query = 'Insert into DepartmentMaster (Name, CompanyId) values (? , ?) On Duplicate key Update DepartmentId=LAST_INSERT_ID(DepartmentId), Name = ?, CompanyId = ?';
		var queryArray = [departmentName, companyID, departmentName, companyID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function addDesignation(designationName, companyID){
		var query = 'Insert into DesignationMaster (Name, CompanyId) values (? , ?) On Duplicate key Update DesignationID=LAST_INSERT_ID(DesignationID), Name = ?, CompanyId = ?';
		var queryArray = [designationName, companyID, designationName, companyID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function updateError(entryID, message){
		var query = "Update stagingAlumnusDetails set PersonalErrMsg = ? where EntryId = ?";
		var queryArray = [message, entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function mapAlumniGroup(alumnusID, group, companyID){
		var query = "Insert into AlumniGroupMapping (AlumnusId, `Group`, CompanyId, Status) values(?, ?, ?, ?)";
		var queryArray = [alumnusID, group, companyID, "active"]
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	settings.sanitizeSingleRecord = sanitizeSingleRecord;
}
