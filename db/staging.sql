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
		Status enum('pending', 'done'),
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
		Status enum ('pending', 'done'),
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
		CompanyId Bigint unsigned not null
	)
