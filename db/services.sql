
Create table ServicesMaster (
	Id tinyint unsigned Primary Key auto_increment,
	Name char(100) Not null,
	Status enum('active', 'inactive'),
	Token char(100),
	EventQ char(100)
)