--
-- Table structure for table `Role`
--

DROP TABLE IF EXISTS `Role`;
CREATE TABLE `Role` (
  `roleId` INT(11) NOT NULL AUTO_INCREMENT,
  `role` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`roleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `Role` (`roleId`, `role`) values (1, "ADMIN")

--
-- Table structure for table `DataRequestStatus`
--

DROP TABLE IF EXISTS `DataRequestStatus`;
CREATE TABLE `DataRequestStatus` (
  `dataRequestStatusId` INT(11) NOT NULL AUTO_INCREMENT,
  `dataRequestStatus` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`dataRequestStatusId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
INSERT INTO `dataRequestStatus` (`dataRequestStatus`) values ("SUCCESSFUL"), ("PENDING"), ("FAILED")

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
CREATE TABLE `User` (
  `userId` INT(11) NOT NULL AUTO_INCREMENT,
  `familyName` VARCHAR(255) NOT NULL COMMENT "Family name (surname)",
  `givenName` VARCHAR(255) NOT NULL COMMENT "Given name (first name)",
  `username` VARCHAR(255) NOT NULL UNIQUE COMMENT "Username, which must not contain upper case letters",
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT "Email address",
  `affiliation` VARCHAR(255) NOT NULL COMMENT "Affiliation, such as a university or an institute",
  `password` VARCHAR(255) NOT NULL COMMENT "Password, which must have at least 7 characters",
  `passwordResetToken` VARCHAR(255) UNIQUE COMMENT "A Token to reset a password",
  `passwordResetTokenExpiry` VARCHAR(255) COMMENT "Date a tocken will expire",
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `UserRole`;
CREATE TABLE `UserRole` (
  `userId` INT(11) NOT NULL,
  `roleId` INT(11) NOT NULL,
  PRIMARY KEY (`userId`, `roleId`),
  KEY `fk_UserRoleUser_idx` (`userId`),
  KEY `fk_UserRoleRole_idx` (`roleId`),
  CONSTRAINT `fk_UserRoleUser` FOREIGN KEY (`userId`) REFERENCES `User` (`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_UserRoleRole` FOREIGN KEY (`roleId`) REFERENCES `Tole` (`roleId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


--
-- Table structure for table `DataRequest`
--

DROP TABLE IF EXISTS `DataRequest`;
CREATE TABLE `dataRequest` (
  `dataRequestId` INT(11) NOT NULL AUTO_INCREMENT,
  `userId` INT(11) NOT NULL,
  `dataRequestStatusId` INT(11) NOT NULL,
  `dataRequest` VARCHAR(45) NOT NULL,
  `madeAt` CURRENT_DATE NOT NULL,
  PRIMARY KEY (`dataRequestId`),
  KEY `fk_DataRequestUser_idx` (`userId`),
  KEY `fk_DataRequestStatus_idx` (`statusId`),
  CONSTRAINT `fk_DataRequestUser` FOREIGN KEY (`userId`) REFERENCES `User` (`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_DataRequestDataRequestStatus` FOREIGN KEY (`dataRequestStatusId`) REFERENCES `DataRequestStatus` (`dataRequestStatusId`) ON DELETE NO ACTION ON UPDATE NO ACTION

) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Table structure for table `DataRequestFiles`
--

DROP TABLE IF EXISTS `DataRequestFiles`;
CREATE TABLE `dataRequest` (
  `dataRequestId` INT(11) NOT NULL ,
  `fileId` INT(11) NOT NULL,
  PRIMARY KEY (`dataRequestId`,`fileId` ),
  KEY `fk_DataRequestFileDataRequest_idx` (`dataRequestId`),
  CONSTRAINT `fk_DataRequestFilesDataRequest` FOREIGN KEY (`dataRequestId`) REFERENCES `DataRequest` (`dataRequestId`) ON DELETE NO ACTION ON UPDATE NO ACTION

) ENGINE=InnoDB DEFAULT CHARSET=utf8;
