var fs = require("fs");
var Papa = require('papaparse');

var fileStream = fs.createReadStream(__dirname+'/test-data.csv', 'utf8')
var data= [];
           
fileStream.on('open', function(){
	console.log("opened")
})
fileStream.on('error', function(err){
	// this.close();
	console.log(err)
});
fileStream.on('end',function(){
	console.log('end')
});
fileStream.on('data', function(data){
	// console.log(data)
})

var mapper = {
	"Employee Name": 	 "firstName",
	"": 	 "lastName",
	"": 	 "middleName",
	"Personal email id": 	 "email",
	"Contact Details": 	 "phone",
	"Email id": 	 "companyEmail",
	"": 	 "dob",
	"DOJ": 	 "doj",
	"Relieved Date": 	 "dol",
	"Department": 	 "department",
	"Designation": 	 "designation",
	"": 	 "linkedInURL",
	"HOC Code": 	 "code",
	"": 	 "salaryLPA",
	"": 	 "sex",
	"": 	 "companyId"
}

function csvToJSON(inputStream, stepCallback, doneCallback){
	inputStream = inputStream || fileStream;
	if(typeof(callback)!=="function"){
		console.log("Please pass a callback")
		return 
	}
	Papa.parse(fileStream ,{
		header: true,
		delimiter: ",",
		error: function(err){
			console.log(err)
		},
		beforeFirstChunk: function(chunk) {
	        var rows = chunk.split( /\r\n|\r|\n/ );
	        var headings = rows[0]
	        for(var key in mapper){
	        	if(key){
	        		headings =headings.replace(RegExp(key, "g"), mapper[key])
	        	}
	        }
	        rows[0] = headings;
	        return rows.join("\r\n");
	    },
		step: stepCallback,
		// TODO: waiting for support from papaparse
		// chunk: function(row, parser){
		// 	parser.pause();
		// 	if(row.data.length <1){
		// 		parser.abort();
		// 	}
		// 	 setTimeout(function() {
		// 		data.push(row.data[0]);
		// 		console.log(".............................")
		// 		console.log(row.data.length)
		// 		console.log(".............................")
		// 		parser.resume();
		// 		return
		// 	}, 100);
		// },
		complete: doneCallback
	})
}

exports.csvToJSON = csvToJSON;

