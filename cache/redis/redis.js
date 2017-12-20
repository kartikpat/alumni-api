var redis = require('redis');


module.exports = function(settings){
    var config = settings.config;
    var redisClient = redis.createClient({host : config["redis"]["host"], port : config["redis"]["port"]});

    // redisClient.on('ready',function() {
    //     console.log("Redis is ready");
    // });
    //
    // redisClient.on('error',function() {
    //     console.log("Error in Redis");
    // });
    //
    // redisClient.set("almustToken:"+id+":"+companyID+"",token,'EX', 60 * 60,function(err,reply) {
    //     console.log(err);
    //     console.log(reply);
    // });

    function setKey(key, value){
		return new Promise(function(resolve, reject){
			redisClient.set(key,value,'EX', value,function(err,reply){
				if(err){
					return reject(err);
				}
				return resolve(reply);
			});
		})
	}

    function setExpiry(key, expiresIn){
		return new Promise(function(resolve, reject){
			redisClient.set(key,expiresIn,function(err,reply){
				if(err){
					return reject(err);
				}
				return resolve(reply);
			});
		})
	}

    function keyExists(key){
		return new Promise(function(resolve, reject){
			redisClient.exists(key,function(err,reply){
				if(err){
					return reject(err);
				}
				return resolve(reply);
			});
		})
	}



    settings.setKey = setKey;
    settings.setExpiry = setExpiry;
    settings.keyExists = keyExists;
}
