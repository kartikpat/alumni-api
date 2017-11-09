var crypto = require('crypto');

function getHash(aString){
	if(!aString)
		return "";
	return crypto.createHash('md5').update(aString).digest('hex');
}
const Multer = require('multer');
const multer = Multer({
  storage: Multer.diskStorage({
  	destination: function(req, file, callback){
  		callback(null, './storage/company/logo/')
  	},
  	filename: function(req, file, callback){
  		callback(null, Date.now()+'.jpg')
  	}
  }),
  // limits: {
  //   fileSize: 5 * 1024 * 1024 // no larger than 5mb
  // },
  onError : function(err, next) {
      console.log('error', err);
      next(err);
    }
});
module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.post("/company/:companyID/register", function(req, res){
		var companyID = req.params.companyID;
		var email = req.body.email || null,
			name = req.body.name || null,
			password = req.body.password || null,
			accessLevel = req.body.accessLevel || null;
		if(!(email && password && accessLevel && name))
			return settings.unprocessableEntity(res);

		registerAccess(companyID, name, email, accessLevel, password)
		.then(function(rows){
			return res.json({
				status: "success"
			});
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	})

	app.post("/company/add",multer.single('logo'), function(req, res){
		var name = req.body.name || null,
			logo = req.body.logo || null,
			email = req.body.email || null,
			wUrl = req.body.wUrl || null,
			organisation = req.body.organisation || null;
		if(!(name && email && wUrl &&  organisation && req.file)){
			return settings.unprocessableEntity(res);
		}
		// if(!(name && email ));
		// 	return settings.unprocessableEntity(res);
		var logoPath = req.file.path;
		var password = getHash('1234');	
		addCompany(organisation, logoPath, wUrl)	
		.then(function(rows){
			var insertID = rows.insertId;
			return registerAccess(insertID, name, email, 'master', password)
		})
		.then(function(rows){
			res.json({
				status: 'success'
			})
			var link = "http://localhost:8080/verify-registration?e="+email+"&k="+password;
			var text = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/><meta name="format-detection" content="telephone=no"> <meta name="viewport" content="width=device-width; initial-scale=1.0; maximum-scale=1.0; user-scalable=no;"><meta http-equiv="X-UA-Compatible" content="IE=9; IE=8; IE=7; IE=EDGE" />    <title>Page title</title>    <style type="text/css">     	@import url("https://fonts.googleapis.com/css?family=Roboto");    </style></head><body style="padding:0; margin:0"><table align="center" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;margin: 0 auto; padding: 0; border:1px solid #e8e8e8" width="100%">    <tr class="header" style="background:#252e3e;">        <td align="left" valign="middle">        	<img src="https://i.imgur.com/b04sDwd.png" style="margin:10px 15px;">        </td>    </tr>    <tr class="body" style="background:#fff;">    	<td align="left" valign="middle" colspan="2">    		<p style="color:#555; padding:50px 15px 0;font-family:"Roboto",arial; font-size:16px;">Welcome to Alumni Connect!</p>    		<p style="padding:0px 15px 0;font-family:"Roboto",arial; font-size:16px;">You have been successfully registered with username " ".</p>    		<p style="color:#555;padding:0px 15px;font-family:"Roboto,arial; font-size:16px;">Please click on the link below to verify your account and set a password:<br/>                <a style="padding:0px 0 0px 0; display:block;font-family:"Roboto",arial; font-size:16px;" href="%recipient.link%">Link</a>        		<br/>            </p>    		<p style="color:#555;padding:0 15px;font-family:"Roboto",arial; font-size:16px;">Happy Re-connecting!</p>            <p style="padding:0px 15px 50px;font-family:"Roboto",arial; font-size:16px;">Team Alumni connect</p>    	</td>    </tr>    <tr class="footer" style="background:#efefef;">    	<td align="center" valign="middle"  cellspacing="10"  colspan="2" class="link">    		<p style="color:#535353;font-family:"Roboto",arial; font-size:13px;"><a href="#" style="color:#939393;text-decoration: none;">Why am I getting this mail?</a><br/>    		You have been previously associated with (company name) who is reconnecting with you.</p>    	</td>    </tr>    <tr class="footer" style="background:#efefef;">    	<td align="center" valign="middle" colspan="2"  cellspacing="10" class="text">    		<p style="color:#535353;font-family:"Roboto",arial; font-size:13px;"><a href="#" style="color:#535353;text-decoration: none;">Unsubscribe</a> | <a href="#" style="color:#535353;text-decoration: none;">Privacy Policy</a> | <a href="#" style="color:#535353;text-decoration: none;">Contact</a></p>    	</td>    </tr>    <tr class="footer" style="background:#efefef;">    	<td align="center" valign="middle" colspan="2"  cellspacing="10" class="text">    		<p style="color:#939393;font-family:"Roboto",arial; font-size:11px;">Copyright &copy; 2017 Alumni Connect All rights reserved</p>    	</td>    </tr></table></body></html>'
			if(email.indexOf('@iimjobs.com') >-1){
				var ob = {};
				ob[email] = {
					link: link
				}
				return settings.sendMail("Welcome", text, email, ob).then(function(rows){
					cprint(rows)
				})
				.catch(function(err){
					return cprint(err,1)
				})
			}
			return
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})

	})

	app.post('/reset-password', function(req, res){
		var password = req.body.password || null,
			email = req.body.email || null,
			newPassword = req.body.newPassword || null;

		if(! (password && newPassword && id)){
			return settings.unprocessableEntity(res);
		};
		password = getHash(password);
		var validatingPassword = validatePassword(email, password);
		validatingPassword.then(function(rows){
			if(rows.length<1){
				return Promise.reject(new Error("incorrect"));
			}
			return updatePassword(id, newPassword);
		})
		.then(function(updationRows){
			return res.json({
				status: "success",
				message: 'updated successfully'
			});
		})
		.catch(function(err){
			if(err.message == 'incorrect')
				return settings.unAuthorised(res);
			cprint(err,1);
			return settings.serviceError(res);
		});
	});

	app.post('/verify', function(req, res){
		var key = req.body.key || null,
			email = req.body.email || null,
			password = req.body.password || null;

		if(! (key && password && email)){
			return settings.unprocessableEntity(res);
		};
		password = getHash(password);
		var validatingPassword = validatePassword(email, key);
		validatingPassword.then(function(rows){
			if(rows.length<1){
				return Promise.reject(new Error("incorrect"));
			}
			return updatePassword(email, password);
		})
		.then(function(updationRows){
			return res.json({
				status: "success",
				message: 'updated successfully'
			});
		})
		.catch(function(err){
			if(err.message == 'incorrect')
				return settings.unAuthorised(res);
			cprint(err,1);
			return settings.serviceError(res);
		});
	});

	function updatePassword(email, password){
		password = getHash(password);
		var query = "Update CompanyAccess set Password = ? where Email= ?";
		var queryArray = [password, email];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		});
	}

	function validatePassword(email, password){
		var query = "Select Id, Email from CompanyAccess where Email = ? and Password = ?";
		var queryArray = [email, password]
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function registerAccess(companyID, name, email, accessLevel, password){
		var query = "Insert into CompanyAccess (CompanyId, Name, Email, AccessLevel, Password, Status) values (?, ?, ?, ?, ?, ?)";
		var queryArray = [companyID, name, email, accessLevel, password, 'active'];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function addCompany(name, logoPath, websiteUrl){
		var query = "Insert into CompanyMaster (Name, Logo, WebsiteUrl,Status) values (?, ?, ?, ?)";
		var queryArray = [ name, logoPath, websiteUrl, 'active']
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}