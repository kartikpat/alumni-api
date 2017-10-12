module.exports = function(settings){
	var cprint = settings.cprint;

	function dbCall(connection, query, queryArray){
		return new Promise(function (resolve, reject){
				connection.query(query, queryArray, function(err, rows, fields){
					cprint(this.sql,1)
					connection.release();
					if(err){
						return reject(err);
					}
					return resolve(rows);
				});
			})
	}

	function dbTransactionQuery(connection, query, queryArray){
		return new Promise(function(resolve, reject){
			connection.query(query, queryArray, function(err, rows, fields){
				cprint(this.sql);
				if(err){
					return reject({connection: connection, err:err});
				}
				return resolve({connection: connection, rows: rows});
			})
		})
	}

	settings.dbCall = dbCall;
	settings.dbTransactionQuery = dbTransactionQuery;
}