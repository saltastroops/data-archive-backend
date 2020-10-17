# SALT/SAAO Data Archive API Server

## Introduction

The SALT/SAAO Data Archive is used for storing and managing the observation data produced with the Southern African Large Telescope (SALT) and other telescopes in Suitherland (South Africa). The stored data is made accessable to the public. The users may search and request data to download for personal use.

A GraphQL API is used to make the data search and retrieval possible. This repository explains in details how to get started and run the API.

The API is run on a [GraphQL-Yoga server](https://github.com/prisma/graphql-yoga) and is using [PostgreQL](https://www.postgresql.org/) for storing and retrieving data.

## Setting up

Before proceeding you need to have set up a server as described in [docs/server_setup.md](docs/server_setup.md).

Clone this repository to a location of your choice.

```bash
git clone https://github.com/saltastroops/data-archive-backend.git data-archive-backend
```

or using ssh

```bash
git clone git@github.com:saltastroops/data-archive-backend.git data-archive-backend
```

Install the required Node packages.

```bash
cd data-archive-backend
yarn install
```

The server requires the following environment variables. 

Variable | Description | Example
---- | ---- | ----
FRONTEND_HOST | The host of the frontend accessing this server | https://ssda.saao.ac.za
TZ | The timezone, which must be UTC. | UTC
SESSION_SECRET | The secret key for for signing the session ID cookie | anothertopsecretkey
APP_SECRET | The secret key for this server | anothertopsecretkey
API_KEY | The API key for authenticating API requests | yetanothersecretkey
PORT | Port on which the server should be listening | 443
SENTRY_DSN | The Sentry DSN (Data Source Name) | https://d6251ee8232d4au0b57cbhy38c059af6@sentry.io/237524
SSDA_DATABASE_NAME | The ssda database name | ssda
SSDA_DATABASE_HOST | The sdda database host | http://localhost
SSDA_DATABASE_PASSWORD | The ssda database host password | password
SSDA_DATABASE_USER | The ssda host user name | username
SDB_DATABASE_NAME | The sdb database name | ssda
SDB_DATABASE_HOST | The sdb database host | http://localhost
SDB_DATABASE_PASSWORD | The sdb database host password | password
SDB_DATABASE_USER | The sdb host user name | username
PREVIEW_BASE_DIR | The preview base diractory | base/directory/to/previews
FITS_BASE_DIR | The FITS file base directory | base/directory/to/fits
DATA_REQUEST_BASE_DIR | The data request file base directory | base/directory/to/data_request
MAIL_HOST | The mail server address | smtp.mail.host
MAIL_USER | The mail server username | mail-username
MAIL_PASSWORD | The mail server user password | mail-password
MAIL_PORT | The mail server port | 2525
MAIL_SSL | Securing the mail server SMTP | true/false

These must be defined in a file ```.env``` in the root directory. *This file should not be committed to the git repository.*

The `SSDA_DATABASE_USER` should have the `admin_editor` and `archive_user` roles in the SSDA database.

The `SDB_DATABASE_USER` should have SELECT permissions for the tables in the SDB.

The `TZ` variable needs to be set to ensure that Node and the PostgreSQL driver use UTC when converting `DATE` database entries to a JavaScript `Date` object.

The [Sentry](https://sentry.io) DSN (Data Source Name) can be obtained from the client keys tab in your Sentry project's settings.

## Running the server and tests

You can start the server in development mode by executing 

```bash
yarn dev
```

The server will be listening to file changes. 


To start the server in production mode, execute

```bash
yarn start
```

To restart the server in production mode, execute

```bash
yarn restart
```

To run the tests, executes the usual yarn test command,

```bash
yarn test
```

## Deploying on a production server

See [docs/server_setup.md](docs/server_setup.md) for instructions.
