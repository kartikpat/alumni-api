
Create table ServicesMaster (
	Id tinyint unsigned Primary Key auto_increment,
	Name char(100) Not null,
	Status enum('active', 'inactive'),
	Token char(100),
	EventQ char(100)
)


Create table ServiceSubscription(
	Id Bigint unsigned Primary Key auto_increment,
	ServiceId tinyint unsigned,
	AlumnusId bigint unsigned not null,
	Status enum('active', 'inactive') not null
)

Insert into ServicesMaster (Name, Status) values ('BirthdayService', 'active')
Insert into ServicesMaster (Name, Status) values ('NewsService', 'active')