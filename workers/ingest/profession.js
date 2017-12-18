var moment = require('moment');
function checkDate(aString){
	var d = moment(aString, 'DD/MM/YYYY');
	if(!d.isValid())
		return null;
	return d.valueOf();

}

module.exports = function(settings){
	var cprint = settings.cprint;


	function sanitize(taskID, companyID){
		return fetchRecords(taskID, companyID)
		.then( sanitizeEachRecord )
		.catch(function(err){
			cprint(err,1);
			return
		})
	}

	function fetchRecords(taskID, companyID){
		var query = "Select EntryId, Email, Designation, Organisation, DateOfJoining, DateOfLeaving , CompanyId from StagingProfessionalDetails where TaskId = ? and UserId = ? and Status = ? ";
		var queryArray = [taskID, companyID, 'pending'];
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

	async function sanitizeEachRecord(rows){
		var len = rows.length;
		for(var i=0; i < len; i++){
			await sanitizeSingleRecord(rows[i])
		}
		return Promise.resolve(1)
	}

	function sanitizeSingleRecord(aRow){
		var props = {};
		props.entryID = aRow["EntryId"];
		props.email =aRow["Email"];
		props.designation = aRow["Designation"];
		props.organisation = aRow["Organisation"];
		props.doj = checkDate(aRow["DateOfJoining"]);
		props.dol = checkDate(aRow["DateOfLeaving"]);
		props.companyID = aRow["CompanyId"];

		var alumniDetails = fetchAlumnus(props.email, props.companyID)
		return alumniDetails
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
		.then(function(rows){
			return	updateStaging(props.entryID)
		})
		.catch(function(err){
			cprint(err,1)
			updateError(props.entryID, err.message);
			return
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
		var query = "Update StagingProfessionalDetails set Message = ? where EntryId = ?";
		var queryArray = [message, entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}
	settings.sanitizeProfession = sanitize;
}