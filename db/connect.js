var mysql = require('mysql');

module.exports = function(settings){
	var config = settings.config;
	var cprint = settings.cprint;
	/**
	 * configuration options for mysql pooling
	 * @type {Object}
	 */
	var writePoolConfig = {
		connectionLimit: 20,
		user: config["db"]["write"]["user"],
		password: config["db"]["write"]["password"],
		database: config["db"]["write"]["name"],
		host: config["db"]["write"]["host"],
		debug: false,
		connectTimeout: 120000 ,
		timeout: 120000
	};

	var connectionPool = mysql.createPool(writePoolConfig);

	function dbConnection(){
		return new Promise(function(resolve, reject){
			connectionPool.getConnection(function(err, connection){
				if(err){
					return reject(err)
				}
				return resolve(connection);
			})
		});
	}

	function dbTransaction(connection){
		return new Promise(function(resolve, reject){
			connection.beginTransaction(function(err){
				if(err){
					return reject(err);
				}
				return resolve(connection);
			});
		})
	}
	//TODO to be experimented
	// exports.dbTransaction = dbTransaction;
	// exports.dbConnection = dbConnection;

	settings.dbConnection = dbConnection;
	settings.dbTransaction = dbTransaction;
}