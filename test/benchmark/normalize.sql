Create table testUser(
	id  bigint unsigned primary key auto_increment,
	email varchar(250),
	payload varchar(100),
	dob  smallint unsigned
)
create table testBirthday (
	dob  smallint unsigned,
	userID 	bigint unsigned,
	Primary key(dob, userID)
)

DELIMITER $$
CREATE PROCEDURE generate_data()
BEGIN
  DECLARE i INT DEFAULT 0;
  DECLARE day int default 0;
  DECLARE month int default 0;
  WHILE i < 1000000 DO
  	set day = i%31;
  	set month = i%12;
  	if (day=0) then
  		set day = 31;
  	End IF;
  	if(month = 0) then
  		set month = 12;
  	end if;
  	If(day<10) then
  		set day = concat("0",day);
  	end if;
  	if(month <10) then
  		set month = concat("0",month);
  	end if;
    INSERT INTO `testUser` (email, payload, dob) VALUES (
    	CONCAT("user-", i, "@gmail.com"),
    	"Some random message body. Al long text. Long text.",
    	CONCAT(day,month )
    );
    Insert into testBirthday (dob, userID) values(CONCAT(day,month ), LAST_INSERT_ID());
    SET i = i + 1;
  END WHILE;
END$$
DELIMITER ;