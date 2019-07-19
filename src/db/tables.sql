use `ssda-admin`;
SET FOREIGN_KEY_CHECKS=0;
--
-- User roles
--

DROP TABLE IF EXISTS `Role`;

CREATE TABLE `Role` (
  `roleId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT "Primary key",
  `role` VARCHAR(45) NOT NULL COMMENT "Role for the user, e.g ADMIN",
  PRIMARY KEY (`roleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `Role` (`roleId`, `role`) VALUES (1, "ADMIN");

--
-- Data request status values
--
DROP TABLE IF EXISTS `DataRequestStatus`;

CREATE TABLE `DataRequestStatus` (
  `dataRequestStatusId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT "Primary key",
  `dataRequestStatus` VARCHAR(45) NOT NULL COMMENT "A Data request status, e.g SUCCESSFUL",
  PRIMARY KEY (`dataRequestStatusId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `DataRequestStatus` (`dataRequestStatus`) VALUES ("SUCCESSFUL"), ("PENDING"), ("FAILED");

--
-- User
--

DROP TABLE IF EXISTS `User`;

CREATE TABLE `User` (
  `userId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `familyName` VARCHAR(255) NOT NULL COMMENT "Family name (surname)",
  `givenName` VARCHAR(255) NOT NULL COMMENT "Given name (first name)",
  `username` VARCHAR(255) NOT NULL UNIQUE COMMENT "Username, which must not contain upper case letters",
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT "Email address",
  `affiliation` VARCHAR(255) NOT NULL COMMENT "Affiliation, such as a university or an institute",
  `password` VARCHAR(255) NOT NULL COMMENT "Password, which must have at least 7 characters",
  `passwordResetToken` VARCHAR(255) UNIQUE COMMENT "Token to reset the user's password",
  `passwordResetTokenExpiry` DATETIME COMMENT "Time when the password reset token will expire",
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Remote account which is for a user of this database, e.g. an account in the SALT Science Database.
--

DROP TABLE IF EXISTS `RemoteUserAccount`;

CREATE TABLE `RemoteUserAccount` (
    `userId` INT(11) UNSIGNED NOT NULL COMMENT "User id for this database",
    `remoteUserId` VARCHAR(255) NOT NULL COMMENT "User id for the remote account",
    `remoteInstitutionId` INT(11) UNSIGNED NOT NULL COMMENT "Id of the remote institution",
    PRIMARY KEY (`userId`, `remoteUserId`, `remoteInstitutionId`),
    KEY `fk_RemoteUserAccountUser_idx` (`userId`),
    KEY `fk_RemoteUserAccountRemoteInstitution_idx` (`remoteInstitutionId`),
    CONSTRAINT `fk_RemoteUserAccountUser` FOREIGN KEY (`userId`) REFERENCES `User` (`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT `fk_RemoteUserAccountRemoteInstitution` FOREIGN KEY (`remoteInstitutionId`) REFERENCES `Institution` (`institutionId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- An institution to whose accounts a user can be linked
--

DROP TABLE IF EXISTS `Institution`;

CREATE TABLE `Institution` (
    `institutionId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT "Primary key",
    `institution` VARCHAR(255) NOT NULL COMMENT "Name of the institution",
    PRIMARY KEY (`institutionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `Institution` (`institution`) VALUES ("SAAO"), ("SALT");

--
-- User role. A user can have multiple roles.
--
DROP TABLE IF EXISTS `UserRole`;
CREATE TABLE `UserRole` (
  `userId` INT(11) UNSIGNED NOT NULL COMMENT "User id`",
  `roleId` INT(11) UNSIGNED NOT NULL COMMENT "User role ide",
  PRIMARY KEY (`userId`, `roleId`),
  KEY `fk_UserRoleUser_idx` (`userId`),
  KEY `fk_UserRoleRole_idx` (`roleId`),
  CONSTRAINT `fk_UserRoleUser` FOREIGN KEY (`userId`) REFERENCES `User` (`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_UserRoleRole` FOREIGN KEY (`roleId`) REFERENCES `Role` (`roleId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Data request
--

DROP TABLE IF EXISTS `DataRequest`;

CREATE TABLE `DataRequest` (
  `dataRequestId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT "Primary key",
  `userId` INT(11) UNSIGNED NOT NULL COMMENT "User id",
  `dataRequestStatusId` INT(11) UNSIGNED NOT NULL COMMENT "Data requrest status id",
  `madeAt` DATETIME NOT NULL COMMENT "Time when the request was made",
  PRIMARY KEY (`dataRequestId`),
  KEY `fk_DataRequestUser_idx` (`userId`),
  KEY `fk_DataRequestStatus_idx` (`dataRequestStatusId`),
  CONSTRAINT `fk_DataRequestUser` FOREIGN KEY (`userId`) REFERENCES `User` (`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_DataRequestDataRequestStatus` FOREIGN KEY (`dataRequestStatusId`) REFERENCES `DataRequestStatus` (`dataRequestStatusId`) ON DELETE NO ACTION ON UPDATE NO ACTION

) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- File in a data request.
--

DROP TABLE IF EXISTS `DataRequestFile`;

CREATE TABLE `DataRequestFile` (
  `dataRequestId` INT(11) UNSIGNED NOT NULL  COMMENT "An Id for a table ``DataRequest",
  `fileId` INT(11) UNSIGNED NOT NULL COMMENT "An id from SSDA for a data file this need to be checked before it is created",
  PRIMARY KEY (`dataRequestId`,`fileId` ),
  KEY `fk_DataRequestFileDataRequest_idx` (`dataRequestId`),
  CONSTRAINT `fk_DataRequestFilesDataRequest` FOREIGN KEY (`dataRequestId`) REFERENCES `DataRequest` (`dataRequestId`) ON DELETE NO ACTION ON UPDATE NO ACTION

) ENGINE=InnoDB DEFAULT CHARSET=utf8;

SET FOREIGN_KEY_CHECKS=1;
