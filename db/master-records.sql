Create table DepartmentMaster(
	DepartmentId Bigint unsigned Primary key auto_increment,
	CompanyId bigint unsigned not null,
	Name varchar(255) not null,
	Status enum('active', 'inactive'),
	Unique key (CompanyId, Name)
)

Create table DesignationMaster(
	DesignationId Bigint unsigned Primary key auto_increment,
	CompanyId bigint unsigned not null,
	Name varchar(255) not null,
	Status enum('active', 'inactive'),
	Unique key (CompanyId, Name)	
)

Create table CourseMaster (
	CourseId Bigint unsigned Primary key auto_increment,
	Name varchar(255),
	Status enum ('active', 'inactive'),
	Unique key (Name, Status)
)

Create table InstituteMaster (
	InstituteId Bigint unsigned Primary key auto_increment,
	Name varchar(255),
	Status enum ('active', 'inactive'),
	Unique key (Name, Status)
)
Create table OrganisationMaster (
	OrganisationId Bigint unsigned Primary key auto_increment,
	Name varchar(255),
	Status enum ('active', 'inactive'),
	Unique key (Name, Status)
)

Create table RoleMaster(
	RoleId Bigint unsigned Primary key auto_increment,
	Name varchar(255),
	Status enum ('active', 'inactive'),
	Unique key (Name, Status)
)

Create table EducationDetails(
		EntryId Bigint unsigned Primary key auto_increment,
		AlumnusId Bigint unsigned Not null,
		CompanyId bigint unsigned not null,
		CourseId Bigint unsigned Not null,
		InstituteId Bigint unsigned Not null,
		BatchFrom smallint unsigned,
		BatchTo smallint unsigned,
		CourseType enum( 'full-time', 'part-time', 'distance', 'executive', 'certification' ),
		Unique Key course_institute_alumnus (CourseId, InstituteId, AlumnusId)
	)

Create table ProfessionDetails(
		EntryId Bigint unsigned Primary key auto_increment,
		AlumnusId bigint unsigned not null,
		CompanyId bigint unsigned not null,
		DesignationId bigint unsigned not null,
		OrganisationId bigint unsigned not null,
		FromTimestamp bigint unsigned not null,
		ToTimestamp bigint unsigned not null
	)

Create table AccessMaster (
	Id Bigint unsigned Primary Key auto_increment,
	CompanyId Bigint unsigned,
	Username char(254),
	Password char(100),
	Role enum('admin', 'read', 'write'),
	Status enum('active', 'inactive')
)

Create table AlumniGroupMapping (
	Id Bigint unsigned Primary Key auto_increment,
	CompanyId Bigint unsigned not null,
	AlumnusId Bigint unsigned Not null,
	Status enum('active', 'inactive'),
	`Group` char(50) not null
)
Alter table TaskMaster add Column CorrectRowCount tinyint unsigned
Alter table TaskMaster add Column IncorrectRowCount tinyint unsigned
ALTER TABLE `AlumniGroupMapping` ADD INDEX `group_name` (`Group`)
