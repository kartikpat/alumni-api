module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function getQuarter(timestamp) {
		var d = (timestamp)? new Date(timestamp) : new Date();
		var q = [1,2,3,4];
		return { 
			quarter:q[Math.floor(d.getMonth() / 3)],
			year: d.getFullYear()
		};
	}
	function fetchEmployees(companyID){
		var query = "Select * from AlumnusMaster where companyID = ?";
		var queryArray = [companyID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	app.get("/company/:companyID/states", function(req, res){
		var companyID = req.params.companyID;
		var fetchingEmployees = fetchEmployees(companyID);
		var props ={};
		fetchingEmployees.then(function(rows){
			rows.forEach(function(anAlumnus){
				if(anAlumnus["DateOfJoining"]){
					var joiningState = getQuarter(anAlumnus["DateOfJoining"]);
					if(props[joiningState['year']]){
						if (props[joiningState['year']][joiningState['quarter']]){
							props[joiningState['year']][joiningState['quarter']]['hired']++;
						}
						else
							props[joiningState['year']][joiningState['quarter']]={
								hired: 1,
								relieved:0
							}
					}
					else {
						props[joiningState['year']] = {};
						props[joiningState['year']][joiningState['quarter']]={
								hired: 1,
								relieved:0
							};
					}
				}
				if(anAlumnus["DateOfLeaving"]){
					var relievingState = getQuarter(anAlumnus["DateOfLeaving"]);
					if(props[relievingState['year']]){
						if (props[relievingState['year']][relievingState['quarter']]){
							props[relievingState['year']][relievingState['quarter']]['relieved']++;
						}
						else
							props[relievingState['year']][relievingState['quarter']]={
								relieved: 1
							}
					}
					else {
						props[relievingState['year']] = {};
						props[relievingState['year']][relievingState['quarter']]={
								relieved: 1
							};
					}
				}

			});

			var data = [];
			for(var key in props){
				var ob ={};
				ob[key] = props[key];
				data.push(ob);
			}
			return res.json({
				status: "success",
				data: data
			})
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	})


}