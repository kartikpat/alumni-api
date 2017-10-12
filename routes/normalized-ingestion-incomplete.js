module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;

	app.post("/company/:companyID/ingest", handleIngest);


	function validate(req, res){

	}

	function authenticate(req, res){

	}

	function ingest(anObj){
		settings.dbTransaction()
		.then(function(connection){
			return addUser(anObj, connection)
		})
		.then(function(props){
			var insertID = props.rows.insertId;
			var educationArray = [] // arrays pushed into one
			var professionalArray = []

			var addingEducation = addEducationDetails(educationArray, props.connection)
			var addingProfession = addProfessionalDetails(professionalArray, props.connection);

			var additionalDetailsPromiseArray = [ educationArray, professionalArray ];
			var additionalDetailsPromise = Promise.all(additionalDetailsPromiseArray);
			return additionalDetailsPromise;
		})
	}

	function fetchInstituteID(name, connection){
		var query = 'INSERT INTO InstituteMaster (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), email=?';
		var queryArray = [ name, name];
		return settings.dbTransactionQuery(connection, query, queryArray);
	}

	function addUser(dataOb, connection){
		var query = "Insert into AlumniMaster (name) values (?)";
		var queryArray = dataOb["name"];
		
		return dbTransactionQuery(connection, query, queryArray);
	}

	function addEducationDetails(educationArray, connection){
		var query = "Insert into EducationDetails (name) values ?";
		var queryArray = [ educationArray ];
		return dbTransactionQuery(connection, query, queryArray);
	}
	function addProfessionalDetails(professionalArray, connection){
		var query = "Insert into ProfessionDetails (name) values ?";
		var queryArray = [ professionalArray ];
		return dbTransactionQuery(connection, query, queryArray);
	}
}