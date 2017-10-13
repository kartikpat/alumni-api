var payload = [];
var fs = require ('fs');
var department = ["Tech", "Sales", "Operations", "HR"];
var designation = ["developer", "engineer", "scientist", "associates", "consultants", "product developers"];
var sex = ['male','female','other','not-specified'];
var type = ['full-time','part-time','distance','executive','certification'];
for(var i=0; i<10; i++){
	var dep = department[(Math.floor(Math.random())* department.length)];
	var des = designation[(Math.floor(Math.random()) *designation.length)];
	var s = sex[(Math.floor(Math.random())*sex.length)];
	var t = type[ (Math.floor(Math.random())*type.length) ];
	var user = {
		firstName : "user-"+i,
		middleName: "middleName-"+i,
		lastName: "lastName-"+i,
		phone: "99887766"+i,
		dob: Date.now()- (i*100 + 100000),
		doj: Date.now() - (i*20000),
		dol: Date.now() - (i*10000),
		email: "user-"+i+"@gmail.com",
		companyEmail: "user-"+i+"@gmail.com",
		department:  dep,
		designation: des,
		sex: s,
		education: [],
		profession: []
	}
	for(var j=0; j<3; j++){
		user.education.push({
			course: "Course - "+i,
			institute: "Institute - "+i,
			from: Date.now() - (i*20000),
			to: Date.now() - (i*10000),
			type: t
		})
	}
	for(var j=0; j<3; j++){
		user.profession.push({
			designation: "Role - "+i,
			company: "Company - "+i,
			from: Date.now() - (i*20000),
			to: Date.now() - (i*10000)
		})
	}
	payload.push(user);
}
fs.writeFile(__dirname+"/payload.json" ,JSON.stringify(payload), function(err){
	if(err)
		return console.log(err);
	console.log("All done.")
})	