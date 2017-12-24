var getSignedUrl = require('../../lib/get-signed-url.js')
module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.get("/company/:companyID/search",settings.isAuthenticated, async function(req, res){
		var companyID = req.params.companyID;
		var searchString = req.query.searchString || null;
		if(!searchString)
			return settings.unprocessableEntity(res);
		var promiseArray = [searchAlumni(companyID, searchString)]
		var initialPromise = Promise.all(promiseArray);
		initialPromise.then(async function(dataArray){
			var alumniRows = dataArray[0];
			var resData = {
				alumni : [],
				news : [],
				events: []
			};
			var data = {}
			var alumniArray = [];
			alumniRows.forEach(function(aRow){
				alumniArray.push(aRow["AlumnusId"]);
				var profileImage = null;
				if(aRow['Image']){
					var image = aRow['Image'].split('-');
					image = [image[0], image[1], image[2]].join('/')
					profileImage = getSignedUrl.getObjectSignedUrl(config["aws"]["s3"]["bucket"],'profileImages/'+image+'/'+aRow['Image'], 120)
				}
				data[aRow["AlumnusId"]] = {
					id: aRow["AlumnusId"],
					firstName: aRow["FirstName"],
					middleName: aRow["MiddleName"],
					lastName: aRow["LastName"],
					doj: aRow["DateOfJoining"],
					dol: aRow["DateOfLeaving"],
					designation: aRow["Designation"],
					department: aRow["Department"],
					image: profileImage,
					services: []
				}
			});
			var subscriptionRows = [];
			if(alumniArray.length >0)
				subscriptionRows = await fetchSubscriptions(alumniArray);
			subscriptionRows.forEach(function(aSubscription){
				if(data[aSubscription['AlumnusId']]){
					data[aSubscription['AlumnusId']]['services'].push({
						id: aSubscription['Id'],
						name: aSubscription['Name']
					})
				}
			});

			for(var alumnus in data){
				resData['alumni'].push(data[alumnus]);
			}
			return res.json({
				status: 'success',
				data: resData
			});
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	});

	function fetchSubscriptions(alumniArray){
		var query = "Select sm.Name, sm.Id, ss.AlumnusId from ServiceSubscription ss inner join ServicesMaster sm on ss.ServiceId = sm.Id where AlumnusId in (?) and ss.Status = ? and sm.Status = ?"
		var queryArray = [alumniArray, 'active', 'active'];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function searchAlumni(companyID, searchString){
		var query = "Select FirstName, MiddleName, LastName, Phone, Email, CompanyEmail, DateOfLeaving, DateOfJoining, dsg.Name as Designation , dm.Name as Department, am.AlumnusId, Image from AlumnusMaster am inner join DepartmentMaster dm on am.DepartmentId = dm.DepartmentId inner join DesignationMaster dsg on dsg.DesignationId = am.DesignationId where (am.FirstName like ? or am.MiddleName like ? or am.LastName like ? or am.Phone like ? or am.Email like ? or am.CompanyEmail like ? or dm.Name like ? or dsg.Name like ?) and am.CompanyId = ?"
		var queryArray =["%"+searchString+"%", "%"+searchString+"%", "%"+searchString+"%", "%"+searchString+"%", "%"+searchString+"%", "%"+searchString+"%","%"+searchString+"%", "%"+searchString+"%", companyID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray)
		})
	}
}
