var getSignedUrl = require('../../lib/get-signed-url.js')
module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;


	app.get("/company/:companyID/user/:userID", function(req, res){
		var companyID = req.params.companyID;
		var userID = req.params.userID;
		fetchUser(companyID, userID)
		.then(function(rows){
			if(rows.length<1)
				return settings.unAuthorised(res);
			var logoPath = rows[0]['Logo'].split('-');
			logoPath = [logoPath[0], logoPath[1], logoPath[2]].join('/')
			var logo = getSignedUrl.getObjectSignedUrl(config["aws"]["s3"]["bucket"],logoPath+'/'+rows[0]['Logo'], 120) 
			var data = {
				name :rows[0]['Name'],
				email : rows[0]['Email'],
				access : rows[0]['AccessLevel'],
				logo: logo
			} 
			return res.json({
				status: 'success',
				data: data
			})

		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	});

	function fetchUser(companyID, userID){
		var query = "Select ca.Name, ca.Email, ca.AccessLevel, cm.Logo from CompanyAccess ca inner join  CompanyMaster cm on ca.CompanyId = cm.Id where cm.Id = ? and ca.Id = ? and cm.Status = ? and ca.Status = ?" ;
		var queryArray = [ companyID, userID, 'active', 'active'  ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

}