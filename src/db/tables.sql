-- Create (and use) the database.

CREATE DATABASE IF NOT EXISTS `ssda-admin`;

USE `ssda-admin`;

-- Avoid foreign key issues caused solely by the order of the CREATE statements below.
SET FOREIGN_KEY_CHECKS=0;

--
-- AuthProvider
--

DROP TABLE IF EXISTS `AuthProvider`;

CREATE TABLE `AuthProvider` (
    `authProviderId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT "Primary key.",
    `authProvider` VARCHAR(32) UNIQUE NOT NULL COMMENT "Name of the authentication provider.",
    `description` VARCHAR(255) NOT NULL COMMENT "Description of the authentication provider.",
    PRIMARY KEY (`authProviderId`)
);

INSERT INTO `AuthProvider` (`authProvider`, `description`) VALUES ("SSDA", "SAAO/SALT Data Archive"), ("SDB", "SALT Science Database");

--
-- Data request
--

DROP TABLE IF EXISTS `DataRequest`;

CREATE TABLE `DataRequest` (
    `dataRequestId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT "Primary key",
    `dataRequestStatusId` INT(11) UNSIGNED NOT NULL COMMENT "Data requrest status id",
    `madeAt` DATETIME NOT NULL COMMENT "Time when the request was made",
    `userId` INT(11) UNSIGNED NOT NULL COMMENT "User id",
    `uri` VARCHAR (255) DEFAULT NULL COMMENT "Download uri",
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
    `dataFileUUID` BINARY(16) NOT NULL COMMENT "The unique identifier (UUID) for the data file. This must be the same as the UUID assigned in the SSDA database for this data file.",
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
-- SSDAUserAuth
--

DROP TABLE IF EXISTS `SSDAUserAuth`;

CREATE TABLE `SSDAUserAuth` (
    `userId` INT(11) UNSIGNED NOT NULL UNIQUE COMMENT "User id, as used in the User table.",
    `username` VARCHAR(255) NOT NULL UNIQUE COMMENT "Username, which must not contain upper case letters",
    `password` VARCHAR(255) NOT NULL COMMENT "Password, which must have at least 7 characters",
    `passwordResetToken` VARCHAR(255) UNIQUE COMMENT "Token to reset the user's password",
    `passwordResetTokenExpiry` DATETIME COMMENT "Time when the password reset token will expire",
    PRIMARY KEY (`userId`),
    KEY `fk_SSDAUserAuthUser_idx` (`userId`),
    CONSTRAINT `fk_SSDAUserAuthUser` FOREIGN KEY (`userId`) REFERENCES `User` (`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- User
--

DROP TABLE IF EXISTS `User`;

CREATE TABLE `User` (
    `userId` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `familyName` VARCHAR(255) NOT NULL COMMENT "Family name (surname)",
    `givenName` VARCHAR(255) NOT NULL COMMENT "Given name (first name)",
    `email` VARCHAR(255) NOT NULL COMMENT "Email address",
    `affiliation` VARCHAR(255) NOT NULL COMMENT "Affiliation, such as a university or an institute",
    `authProviderId` INT(11) UNSIGNED NOT NULL COMMENT "Authentication provider",
    `authProviderUserId` VARCHAR(255) NOT NULL COMMENT "Unique identifier used by the authentication provider to identify the user",
    PRIMARY KEY (`userId`),
    UNIQUE KEY (`email`, `authProviderId`),
    KEY `fk_UserAuthProvider_idx` (`authProviderId`),
    CONSTRAINT `fk_UserAuthProvider` FOREIGN KEY (`authProviderId`) REFERENCES `AuthProvider` (`authProviderId`) ON DELETE NO ACTION ON UPDATE NO ACTION
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

-- Enable foreign keys again.
SET FOREIGN_KEY_CHECKS=1;
