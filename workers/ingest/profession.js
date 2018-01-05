var moment = require('moment');
function checkDate(aString){
	var d = moment(aString, 'DD/MM/YYYY');
	if(!d.isValid())
		return null;
	return d.valueOf();

}

module.exports = function(settings){
	var cprint = settings.cprint;

	function validateUserFields(anObject){
		var requiredFields = ['designation', 'organisation'];
		var dateFields = [ 'doj','dol']
		var missing = [];
		var invalid = [];
		requiredFields.forEach(function(aField){
			if(!anObject[aField])
				missing.push(aField)
		})
		dateFields.forEach(function(aField){
			if(anObject[aField])
				if(!checkDate(anObject[aField]))
					invalid.push(aField)
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



	function fetchRecord(entryID){
		var query = "Select EntryId, Email, PreviousDesignation, PreviousOrganisation, OrganisationFrom, OrganisationTo , CompanyId from stagingAlumnusDetails where EntryId = ? ";
		var queryArray = [entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function fetchAlumnus(email, companyID){
		var query = "Select AlumnusId from AlumnusMaster where Email = ? and CompanyId = ?"
		var queryArray = [email, companyID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}



	function sanitizeSingleProfessionRecord(aRow){
		var props = {};
		var companyID = aRow["CompanyId"];
		var email = aRow["Email"];
		var entryID = aRow["EntryId"];

		var alumniProfessionDetails = Promise.all([fetchRecord(entryID)])
		return alumniProfessionDetails
		.then(function(dataArray){
			var rows = dataArray[0];
		props.entryID = rows[0]["EntryId"];
		props.email = rows[0]["Email"];
		props.designation = rows[0]["PreviousDesignation"];
		props.organisation = rows[0]["PreviousOrganisation"];
		props.doj = rows[0]["OrganisationFrom"];
		props.dol = rows[0]["OrganisationTo"];
		props.companyID = rows[0]["CompanyId"];
		if(!props.email) {
			return Promise.reject(new Error("Email is missing, Professional details discarded!"))
		}
		validateUserFields(props)
		var alumniDetails = fetchAlumnus(props.email, props.companyID)
		return alumniDetails
		})
		.then(function(rows){
			if(rows.length <1)
				return Promise.reject(-1);

			props.alumnusID = rows[0]["AlumnusId"]
			var prepareAlumni = Promise.all([ addOrganisation(props.organisation), addPastRole(props.designation)]);
			return prepareAlumni;
		})
		.then(function(dataArray){
			var organisationID = dataArray[0]["insertId"];
			var designationID = dataArray[1]["insertId"];
			var educationRowsArray = [];
			return addProfessionalDetails(props.alumnusID, designationID, organisationID, props.doj, props.dol, props.companyID)
		})
		.catch(function(err){
			cprint(err,1)
			return updateError(props.entryID, err.message);
		})
	}

	function updateStaging(entryID){
		var query = "Update StagingProfessionalDetails set Status = ? where EntryId = ?";
		var queryArray = ['done',entryID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function addProfessionalDetails(alumnusID, designationID, organisationId, fromTimestamp, toTimestamp, companyID){
		var query = "Insert into ProfessionDetails (AlumnusId, DesignationID, OrganisationId, FromTimestamp,ToTimestamp, CompanyId) values ( ?, ?, ?, ?, ?, ? ) on duplicate key update FromTimestamp = values(FromTimestamp), ToTimestamp = values(ToTimestamp)";
		var queryArray = [ alumnusID, designationID, organisationId, fromTimestamp, toTimestamp, companyID ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function addOrganisation(organisation){

		var query = "Insert into OrganisationMaster (Name) values(?) on duplicate key update OrganisationId = LAST_INSERT_ID(OrganisationId)"
		var queryArray = [organisation]
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	};

	function addPastRole(role){
		var query = "Insert into RoleMaster (Name) values(?) on duplicate key update RoleId = LAST_INSERT_ID(RoleId)"
		var queryArray = [ role ]
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	};

	function updateError(entryID, message){
		var query = "Update stagingAlumnusDetails set professionalErrMsg = ? where EntryId = ?";
		var queryArray = [message, entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}
	settings.sanitizeSingleProfessionRecord = sanitizeSingleProfessionRecord;
}
