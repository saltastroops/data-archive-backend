-- Create (and use) the database.

CREATE DATABASE IF NOT EXISTS `ssda-admin`;

USE `ssda-admin`;

-- Avoid foreign key issues caused solely by the order of the CREATE statements below.
SET FOREIGN_KEY_CHECKS=0;

--
-- Data request
--
DROP TABLE IF EXISTS `DataRequest`;

CREATE TABLE `DataRequest` (
  `dataRequestId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT "Primary key",
  `dataRequestStatusId` INT(11) UNSIGNED NOT NULL COMMENT "Data requrest status id",
  `madeAt` DATETIME NOT NULL COMMENT "Time when the request was made",
  `userId` INT(11) UNSIGNED NOT NULL COMMENT "User id",
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
  `dataRequestFileId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT "Primary key",
  `dataRequestObservationId` INT(11) UNSIGNED NOT NULL  COMMENT "An Id for a table DataRequestObservation",
  `fileId` BINARY(16) NOT NULL COMMENT "The unique identifier for the data file. This must be the same as the identifier assigned in the SSDA database for this data file.",
  `name` VARCHAR(255) NOT NULL COMMENT "Data request file name",
  PRIMARY KEY (`dataRequestFileId`),
  KEY `fk_DataRequestFileDataRequestObservation_idx` (`dataRequestObservationId`),
  CONSTRAINT `fk_DataRequestFileDataRequestObservation` FOREIGN KEY (`dataRequestObservationId`) REFERENCES `DataRequestObservation` (`dataRequestObservationId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Data request observation
--
DROP TABLE IF EXISTS `DataRequestObservation`;

CREATE TABLE `DataRequestObservation` (
  `dataRequestObservationId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT "Primary key",
  `dataRequestId` INT(11) UNSIGNED NOT NULL COMMENT "Data requrest id",
  `name` VARCHAR(255) NOT NULL COMMENT "Data request observation name",
  PRIMARY KEY (`dataRequestObservationId`),
  KEY `fk_DataRequestObservationDataRequest_idx` (`dataRequestId`),
  CONSTRAINT `fk_DataRequestObservationDataRequest` FOREIGN KEY (`dataRequestId`) REFERENCES `DataRequest` (`dataRequestId`) ON DELETE NO ACTION ON UPDATE NO ACTION

) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Data request status values
--
DROP TABLE IF EXISTS `DataRequestStatus`;

CREATE TABLE `DataRequestStatus` (
  `dataRequestStatusId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT "Primary key",
  `dataRequestStatus` VARCHAR(45) NOT NULL COMMENT "A Data request status, e.g SUCCESSFUL",
  PRIMARY KEY (`dataRequestStatusId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `DataRequestStatus` (`dataRequestStatus`) VALUES ("SUCCESSFUL"), ("PENDING"), ("FAILED"), ("EXPIRED");

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
-- User
--
DROP TABLE IF EXISTS `User`;

CREATE TABLE `User` (
  `userId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `familyName` VARCHAR(255) NOT NULL COMMENT "Family name (surname)",
  `givenName` VARCHAR(255) NOT NULL COMMENT "Given name (first name)",
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT "Email address",
  `affiliation` VARCHAR(255) NOT NULL COMMENT "Affiliation, such as a university or an institute",
  `belongsTo` VARCHAR(255) DEFAULT NULL COMMENT "BelongsTo, an observatory the user is affaliated with e.g. SALT or SAAO",
  `aliasUserId` INT(11) UNSIGNED DEFAULT NULL COMMENT "AliasUserId, a unique identifire of the user from the affaliated observatory",
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


--
-- User admin
-- NB! I am not sure which field has to be the primary key, userId or username? They both will always be unique I think?
DROP TABLE IF EXISTS `UserAdmin`;

CREATE TABLE `UserAdmin` (
  `userId` INT(11) UNSIGNED NOT NULL UNIQUE COMMENT "User admin id as it is in the User table",
  `username` VARCHAR(255) NOT NULL UNIQUE COMMENT "Username, which must not contain upper case letters",
  `password` VARCHAR(255) NOT NULL COMMENT "Password, which must have at least 7 characters",
  `passwordResetToken` VARCHAR(255) UNIQUE COMMENT "Token to reset the user's password",
  `passwordResetTokenExpiry` DATETIME COMMENT "Time when the password reset token will expire",
  PRIMARY KEY (`userId`),
  KEY `fk_UserAdminUser_idx` (`userId`),
  CONSTRAINT `fk_UserAdminUser` FOREIGN KEY (`userId`) REFERENCES `User` (`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

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

SET FOREIGN_KEY_CHECKS=1;
