var  timeout=function(i){
	return new Promise(function(resolve, reject){
		setTimeout(function() {
			console.log(i*10)
			resolve(i);
	 	}, i*1000);
	})
	 	
}
async function testFunc(){
	for(var i=0; i<3; i++){
		try{
			console.log(await sanitize(i))
		}
		catch(err){
			console.log(err);
		}
	}
}

var dummyPromise = function(i){
	return new Promise(function(resolve, reject){
		setTimeout(function() {
			console.log(i*100)
			resolve(i);
	 	}, i*100);
	})
}

function sanitize(index){
	return 	timeout(index)
	.then(function(index){
		return dummyPromise(index);
	})
	.catch(function(err){
		console.log(err);
	})
}

testFunc();