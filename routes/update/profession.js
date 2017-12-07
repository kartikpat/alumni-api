var moment = require('moment');
function checkDate(aString){
	var d = moment(aString, 'DD-MM-YYYY');
	if(!d.isValid())
		return null;
	return d.valueOf();

}
function checkDateUTC(aNumber){
	var d = moment(aNumber, 'x')
	if(!d.isValid())
		return null
	return aNumber;
}

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

	function validate(req, res, next){
		var course = req.body.course || null,
			institute = req.body.institute || null,
			batchFrom = req.body.batchFrom || null,
			batchTo = req.body.batchTo || null,
			type = req.body.type || null;
		if(!(institute && course))
			return settings.unprocessableEntity(res);
		if(type && ['full-time','part-time','distance','executive','certification'].indexOf(type) == -1)
			return settings.unprocessableEntity(res, 'invalid course type');
		return next();
	}


	app.post("/company/:companyID/alumni/:alumnusID/profession", validate, async function(req, res){
		var companyID = req.params.companyID,
			alumnusID = req.params.alumnusID;
		var organisation = req.body.organisation || null,
			designation = req.body.designation || null,
			fromTimestamp = req.body.from || null,
			toTimestamp = req.body.to || null;
		try{
			var prepareEducation = await Promise.all([ addCourse(course), addInstitute(institute) ]);
			var courseID = prepareEducation[0].insertId;
			var instituteID = prepareEducation[1].insertId;
			await addProfessionalDetails(alumnusID, designationID, organisationId, fromTimestamp, toTimestamp, companyID)
			return res.json({
				status: success
			});
		}
		catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}
	});

	app.post("/company/:companyID/alumni/:alumnusID/profession/:entryID", validate, async function(req, res){
		var companyID = req.params.companyID,
			alumnusID = req.params.alumnusID,
			entryID = req.params.entryID;
		var organisation = req.body.organisation || null,
			designation = req.body.designation || null,
			fromTimestamp = req.body.from || null,
			toTimestamp = req.body.to || null;
		try{
			var preparePofession = await Promise.all([ addOrganisation(organisation), addPastRole(designation) ]);
			var organisationID = preparePofession[0].insertId;
			var designationID = preparePofession[1].insertId;
			await  updateProfessionalDetails(entryID, designationID, organisationId, fromTimestamp, toTimestamp, companyID)
			return res.json({
				status: 'success'
			})
		}
		catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}
	})
	
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
	function addProfessionalDetails(alumnusID, designationID, organisationId, fromTimestamp, toTimestamp, companyID){
		var query = "Insert ignore into ProfessionDetails (AlumnusId, DesignationID, OrganisationId, FromTimestamp,ToTimestamp, CompanyId) values ( ?, ?, ?, ?, ?, ? )";
		var queryArray = [ alumnusID, designationID, organisationId, fromTimestamp, toTimestamp, companyID ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})	
	}
	function updateProfessionalDetails(entryID, designationID, organisationId, fromTimestamp, toTimestamp, companyID){
		var query = "Insert ignore into ProfessionDetails (AlumnusId, DesignationID, OrganisationId, FromTimestamp,ToTimestamp, CompanyId) values ( ?, ?, ?, ?, ?, ? )";
		var query = "Update ProfessionDetails Set DesignationId = ?, OrganisationId = ?, FromTimestamp = ?, ToTimestamp = ? where EntryId = ?"
		var queryArray = [ designationID, organisationId, fromTimestamp, toTimestamp, companyID, entryID ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})	
	}

}