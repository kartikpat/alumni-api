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
		var organisation = req.body.organisation || null,
			designation = req.body.designation || null,
			fromTimestamp = req.body.from || null,
			toTimestamp = req.body.to || null,
            email = req.body.email || null;
		if(!(organisation && designation && email))
			return settings.unprocessableEntity(res);
		return next();
	}


	app.post("/company/:companyID/entry/:entryID/alumni/profession", validate, async function(req, res){
		var companyID = req.params.companyID,
			entryID = req.params.entryID;

		var organisation = req.body.organisation || null,
			designation = req.body.designation || null,
			fromTimestamp = req.body.from || null,
			toTimestamp = req.body.to || null,
            email = req.body.email || null;

		try{
            var alumniDetails = await fetchAlumnus(email, companyID)
            if(alumniDetails.length < 1) {
                throw new Error("Alumni email doesn't exist")
            }
            var alumnusID = alumniDetails[0]["AlumnusId"]
			var prepareEducation = await Promise.all([ addOrganisation(organisation), addPastRole(designation) ]);
			var organisationID = prepareEducation[0].insertId;
			var designationID = prepareEducation[1].insertId;
			await addProfessionalDetails(alumnusID, designationID, organisationID, fromTimestamp, toTimestamp, companyID);
            await updateStaging(entryID);
			return res.json({
				status: "success",
                message: "record inserted successfully"
			});
		}
		catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}
	});

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

    function fetchAlumnus(email, companyID){
        var query = "Select AlumnusId from AlumnusMaster where Email = ? and CompanyId = ?"
        var queryArray = [email, companyID];
        return settings.dbConnection().then(function(connecting){
            return settings.dbCall(connecting, query, queryArray);
        })
    }

    function updateStaging(entryID){
		var query = "Update stagingAlumnusDetails set professionalErrMsg = ? where EntryId = ?";
		var queryArray = [null, entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

}
