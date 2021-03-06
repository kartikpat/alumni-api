var getSignedUrl = require('../../lib/get-signed-url.js');
module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;


	app.get("/company/:companyID/alumni/:alumnusID",settings.isAuthenticated, async function(req, res){
		var companyID = req.params.companyID;
		var alumnusID = req.params.alumnusID;

		try{
			var alumniRows = await fetchAlumni(companyID, alumnusID);
			if(alumniRows.length<1)
				return settings.notFound(res);
			var data = {};
			data.firstName =  alumniRows[0]["FirstName"],
			data.lastName = alumniRows[0]["LastName"],
			data.middleName = alumniRows[0]["MiddleName"],
			data.dob = alumniRows[0]['DateOfBirth'],
			data.designation = alumniRows[0]["Designation"],
			data.department = alumniRows[0]['Department'],
			data.dol = alumniRows[0]['DateOfLeaving'],
			data.doj = alumniRows[0]['DateOfJoining'];
			data.phone = alumniRows[0]['Phone'],
			data.email = alumniRows[0]['Email'],
			data.companyEmail = alumniRows[0]['CompanyEmail'],
			data.education = [];
			data.profession = [];
			data.services = [];
			var profileImage = null;
			// if(alumniRows[0]['Image']){
			// 	console.log(alumniRows[0]['Image'])
			// 	var image = alumniRows[0]['Image'].split('-');
			// 	console.log(image)
			// 	image = [image[0], image[1], image[2]].join('/')
			// 	profileImage = getSignedUrl.getObjectSignedUrl(config["aws"]["s3"]["bucket"],'profileImages/'+image+'/'+alumniRows[0]['Image'], 120)
			// 	data.image = profileImage;
			// }

			var otherDetails = await  Promise.all([ fetchEducation(companyID, alumnusID), fetchProfession(companyID, alumnusID), fetchSubscriptions(alumnusID) ]);
			var educationRows = otherDetails[0];
			var professionRows = otherDetails[1];
			var subscriptionRows = otherDetails[2]

			educationRows.forEach(function(aRow){
				data.education.push({
					id: aRow['EntryId'],
					institute: aRow['Institute'],
					course: aRow['Course'],
					from: aRow['BatchFrom'],
					to: aRow["BatchTo"],
					type: aRow["CourseType"]
				});
			});
			professionRows.forEach(function(aRow){
				data.profession.push({
					id: aRow['EntryId'],
					designation: aRow["Designation"],
					organisation: aRow["Organisation"],
					from: aRow["FromTimestamp"],
					to: aRow["ToTimestamp"]
				})
			})
			subscriptionRows.forEach(function(aSubscription){
				data.services.push({
					id: aSubscription['Id'],
					name: aSubscription['Name']
				})
			});

			return res.json({
				status: "success",
				data: data
			})
		}
		catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}

	});

	function fetchSubscriptions(alumnusID){
		var query = "Select sm.Name, sm.Id, ss.AlumnusId from ServiceSubscription ss inner join ServicesMaster sm on ss.ServiceId = sm.Id where AlumnusId =? and ss.Status = ? and sm.Status = ?"
		var queryArray = [alumnusID, 'active', 'active'];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function fetchAlumni(companyID, userID){
		var query = "Select AlumnusId,FirstName, MiddleName, LastName, DateOfBirth, dsg.Name as Designation, dep.Name as Department, DateOfLeaving, DateOfJoining, Phone, Email, Image, CompanyEmail from AlumnusMaster am inner join DepartmentMaster dep on am.DepartmentId=dep.DepartmentId inner join DesignationMaster dsg on dsg.DesignationId = am.DesignationId where am.CompanyId = ?  and AlumnusId = ?  "
		var queryArray = [ companyID, userID, 'active', 'active'  ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function fetchEducation(companyID, alumnusID){
		var query = "Select ed.EntryId,cm.Name as Course, im.Name as Institute, CourseType, BatchFrom, BatchTo from EducationDetails ed inner join CourseMaster cm on ed.CourseId=cm.CourseId inner join InstituteMaster im on ed.InstituteId = im.InstituteId where ed.AlumnusId = ? and ed.CompanyId = ? and ed.Status = ?";
		var queryArray = [ alumnusID, companyID, 'active' ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function fetchProfession(companyID, alumnusID){
		var query = "Select pd.EntryId, om.Name as Organisation, rm.Name as Designation, pd.FromTimestamp, pd.ToTimestamp from ProfessionDetails pd inner join OrganisationMaster om on pd.OrganisationId = om.OrganisationId inner join RoleMaster rm on pd.DesignationId = rm.RoleId where pd.AlumnusId = ? and pd.CompanyId = ? and pd.Status = ?";
		var queryArray = [ alumnusID, companyID, 'active' ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}
