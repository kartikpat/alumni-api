var fs = require('fs')
var emailArray = ["aayush.jain@gep.com", "vrindasinhal2002@gmail.com", "aasthaverma66@gmail.com", "geetspisces@gmail.com", "megha.madan28@gmail.com", "raniachatterjee@gmail.com", "uddiptag@gmail.com", "ambarsingh10@yahoo.com", "upasana.gautam3054@gmail.com", "manojpillai89@gmail.com", "supreet47@gmail.com", "rishabjolly24@gmail.com", "himgovil@gmail.com", "sarvagyanayak@gmail.com", "leninanthony1@gmail.com", "er.lokendrasinghtomar@gmail.com", "arnav.varma@gmail.com", "anm1grover@gmail.com", "harshitadmail@yahoo.com", "shatakshidhawan3@yahoo.in", "aneeshawarrier@gmail.com", "ankitadalvi7@gmail.com", "nehastudent25@gmail.com", "saharsh.bhushan@gmail.com", "pooja3190@gmail.com", "siddharth.chughs@gmail.com", "nikita.chaturvedi89@gmail.com", "nishantgauraveie@gmail.com", "jebby.joe@live.com", "shaunikgrover27@gmail.com", "vivekbehani@mail.com", "kunal.gautam26@gmail.com", "vimalwebcreater@gmail.com", "priyankakhandelwal134@gmail.com", "skanan94@gmail.com", "pooja.1811@gmail.com", "mayank.narula22@gmail.com", "bhagi.shravani@gmail.com", "", "srrangnekar@gmail.com", "nidhigarg158@gmail.com", "mayanknarayan93@gmail.com", "tanuragchowdhary@gmail.com", "bibek.bhandary@gmail.com", "im.abidshaikh@gmail.com", "miglani.piyush@gmail.com", "deepshikha.work26@gmail.com", "pallavi2012gupta@gmail.com", "kritiaggarwal2012@gmail.com", "kureshnayak92@gmail.com", "supratim.roy1993@gmail.com", "14shreya89@gmail.com", "baishwarya17@gmail.com", "mrugank.deshpande@gmail.com", "mansi@iimjobs.com", "upasanathapar14@gmail.com", "vincy64@gmail.com", "bhardwajvikalp@gmail.com", "sujan.parkash@yahoo.com", "roy.debarun@gmail.com", "kulshresthJagrati@gmail.com", "shubham.5.pandey@gmail.com", "mishra.vaishnavi22@gmail.com", "stuti.aggarwal@hotmail.com", "divyaalwingeorge@gmail.com", "puneetnagpal.83@gmail.com", "shrus23sharma@gmail.com", "kotumsrujan@gmail.com", "katta5prasad@gmail.com", "anjalijain181991@gmail.com", "sethadvit.004@gmail.com", "saumilshah_14@nirmauni.ac.in", "anupamarya47@gmail.com", "   nitishgemini14692@gmail.com", "manish.C43al@gmail.com", "angad.sindhu@icloud.com", "praritvashisht@gmail.com", "ayush909910@gmail.com", "rachelpaul.2593@gmail.com", "roumitroy14127@gmail.com", " vivekmishra1211@gmail.com", "ravindrasinghsolanki41@gmail.com", "hemrom.johny@gmail.com", "irfatmatto@gmail.com", "sagarmohan.92@gmail.com", "Nikita.thenua@yahoo.com ", "lakshitasapra13793@gmail.com", "deepak.nayak@iitp.ac.in", "archit.singh@hotmail.com", "ankurvashisht90@gmail.com", "sanjay.cheruvu@gmail.com", "priya111990@gmail.com", "shikhar.sc1993@gmail.com", "kiran.mutharaju@gmail.com", "  mathyrahul2008@hotmail.com", "batra.sonakshi93@gmail.com", "aribanajib11@gmail.com", "divyankbansallvis@gmail.com", "priyanka2065@gmail.com", "pom817@gmail.com", "kritigulati15@gmail.com", "vipinbhargav@yahoo.com", "mohitmittal188@gmail.com", "parultyagi135@gmail.com", "praptiryanrajput@gmail.com", "snehashish_chowdhury@rediffmail.com", "ysaini.15@stu.ard.ac.in", "ayushi0902@gmail.com", "aditi.lfs01@gmail.com", "skshreyakohli@gmail.com"];
var instituteArray = ["IIT-D", "IIT-B", "IIT-K", "IIT-J", "IIM-M", "IIM-A", "IIM-B", "IIM-C", "MIT", "Stanford", "DU"];
var courseArray = ["B.Tech", "B.Comm", "Diploma", "BCA", "MBA", "M.Tech", "BBA", "BA"]
var type = ['full-time','part-time','distance','executive','certification']
var batchTo = ['2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015'];
var str = 'email,institute,course,type,to,from \n';
for(var i=0; i < emailArray.length; i++){
	str+= emailArray[i]+ ",";
	str+= instituteArray[ i % (instituteArray.length-1)]+ ",";
	str+= courseArray[ i % (courseArray.length-1)]+ ",";
	str+= type[ i % (type.length-1)]+ ",";
	str+= batchTo[ i % (batchTo.length-1)]+ ",";
	str+= parseInt( batchTo[ i %(batchTo.length-1)]) + 2 ;

	str+='\n';
}


fs.writeFile(__dirname+'/education.csv', str, function(err){
	if(err)
		console.log(err);
	console.log("done");
})