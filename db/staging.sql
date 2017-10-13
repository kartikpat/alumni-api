Create table StagingAlumnusMaster (
		EntryId Bigint unsigned Primary key auto_increment,
		TaskId char(32),
		FirstName varchar(100),
		LastName varchar(100),
		MiddleName varchar(100),
		Email varchar(254) Not null ,
		Phone varchar(20),
		CompanyEmail varchar(254) Not null,
		Dob Date Not null,
		DateOfJoining bigint unsigned Not null,
		DateOfLeaving bigint unsigned not null,
		Department varchar(250) not null,
		Designation varchar(250) not null,
		LinkedinURL varchar(255),
		Code varchar(100),
		SalaryLPA float,
		CompanyId bigint unsigned not null,
		Status enum('pending', 'done') default 'pending',
		Sex enum ('male', 'female', 'other', 'not-specified')
	)

Create table StagingEducationDetails(
		EntryId Bigint unsigned Primary key auto_increment,
		TaskId char(32),
		Email varchar(254) Not null ,
		Course varchar(250) Not null,
		Institute varchar(250) Not null,
		BatchFrom smallint unsigned,
		BatchTo smallint unsigned,
		CourseType enum( 'full-time', 'part-time', 'distance', 'executive', 'certification' ),
		Status enum ('pending', 'done') default 'pending',
		CompanyId Bigint unsigned not null
	)

Create table StagingProfessionalDetails(
		EntryId Bigint unsigned Primary key auto_increment,
		TaskId char(32),
		Email varchar(254) Not null ,
		Designation varchar(200),
		Organisation varchar(200),
		FromTimestamp bigint unsigned not null,
		ToTimestamp bigint unsigned not null,
		Status enum ('pending', 'done') default 'pending',
		CompanyId Bigint unsigned not null
	)
 CREATE TABLE `AlumnusMaster` (
  `AlumnusId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `FirstName` varchar(100) DEFAULT NULL,
  `LastName` varchar(100) DEFAULT NULL,
  `MiddleName` varchar(100) DEFAULT NULL,
  `Email` varchar(254) NOT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `CompanyEmail` varchar(254) NOT NULL,
  `Dob` bigint(20) unsigned NOT NULL,
  `DateOfJoining` bigint(20) unsigned NOT NULL,
  `DateOfLeaving` bigint(20) unsigned NOT NULL,
  `DepartmentId` bigint(20) unsigned NOT NULL,
  `DesignationId` bigint(20) unsigned NOT NULL,
  `LinkedinURL` varchar(255) DEFAULT NULL,
  `Code` varchar(100) DEFAULT NULL,
  `SalaryLPA` float DEFAULT NULL,
  `CompanyId` bigint(20) unsigned NOT NULL,
  `Sex` enum('male','female','other','not-specified') DEFAULT NULL,
  PRIMARY KEY (`AlumnusId`),
  UNIQUE KEY `company_email` (`CompanyEmail`),
  UNIQUE KEY `email_companyid` (`Email`,`CompanyId`)
)
