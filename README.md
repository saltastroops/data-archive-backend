# SALT/SAAO Data Archive API Server

## Introduction

The SALT/SAAO Data Archive is used for storing and managing the observation data produced with the Southern African Large Telescope (SALT) and other telescopes in Suitherland (South Africa). The stored data is made accessable to the public. The users may search and request data to download for personal use.

A GraphQL API is used to make the data search and retrieval possible. This repository explains in details how to get started and run the API.

The API is run on a [GraphQL-Yoga server](https://github.com/prisma/graphql-yoga) and is using [Prisma](https://www.prisma.io/) for storing and retrieving data.

## Setting up

[NodeJS](https://nodejs.org/en/) and [git](https://git-scm.com/) must be installed on your machine.

Clone this repository to a location of your choice.

```bash
git clone https://github.com/saltastroops/data-archive-backend.git backend
```

Install the required Node packages.

```bash
cd backend
yarn install
```

The server requires the following environment variables.

Variable | Description | Example
---- | ---- | ----
APP_SECRET | The secret key for this server | anothertopsecretkey
FITS_BASE_DIR | Base directory where the fits files are located | /home/user/data
FRONTEND_URL | The URL of the frontend accessing this server | https://ssda.saao.ac.za
PORT | Port on which the server should be listening | 4000
PRISMA_ENDPOINT | The URL of the Prisma server | https://ssdadb.saao.ac.za
PRISMA_SECRET | The secret key for the Prisma server | topsecretkey
SENTRY_DSN | The Sentry DSN (Data Source Name) | https://d6251ee8232d4au0b57cbhy38c059af6@sentry.io/237524
SESSION_SECRET | The secret key for for signing the session ID cookie | anothertopsecretkey

The [Sentry](https://sentry.io) DSN (Data Source Name) can be obtained from the client keys tab in your Sentry project's settings.

## Deploying Prisma

Install prisma globally using yarn.

```bash
yarn install -g prisma
```

Run the following command in the project's root directory.

```
yarn run deploy
```

## Running the server and tests

You can start the server in development mode by executing 

```bash
yarn dev
```

The server will be listening to file changes. To start the server in production mode, execute

```bash
yarn start
```

To run the tests, executes the usual npm test command,

```bash
yarn test
```

## Using the server with nginx and PM2

In a production environment you may use [nginx](https://www.nginx.com/) as the outward facing server and let [PM2](http://pm2.keymetrics.io/) handle launching the GraphQL-Yoga server and keeping tabs on the logs.

Install nginx and add a configuration file with the following content.

```
server {
  listen              80;
  listen              443 ssl;
  ssl_certificate     /etc/nginx/cert.crt;
  ssl_certificate_key /etc/nginx/cert.key;
  server_name        your_domain.com;
  location / {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
   }
}
```

`/etc/nginx/cert.crt` and `/etc/nginx/cert.key` must be valid SSL certificate files.

The name and location of the configuration file depends on your nginx installation. On Ubuntu, you may put it in the directory

```
/etc/nginx/sites-available
```

with a name like `ssdaapi.saao.ac.za.conf`, and then activate it by creating a symbolic link to it,

```bash
ln -s /etc/nginx/sites-available/ssdaapi.saao.ac.za.conf /etc/nginx/sites-enabled/
```

You may test your configuration by executing

```bash
nginx -t
```

For your configuration to take effect, nginx has to be restarted. On Ubuntu, you may restart nginx using

```bash
service nginx restart
```

PM2 can be installed globally via yarn.

```bash
yarn global add -g pm2
```

Support for TypeScript and ts-node needs to be enabled.

```bash
pm2 install typescript
pm2 install ts-node
```

The server can then be started by running

```bash
pm2 start
```
If the pm2 is running already you can restart with 

```bash
pm2 restart all
```

If you want to the server to launch automatically after a system reboot, you may use PM2's startup command.

```bash
pm2 startup
```

To disable automatic startup again, run

```bash
pm2 unstartup
```

See [http://pm2.keymetrics.io/docs/usage/quick-start/](http://pm2.keymetrics.io/docs/usage/quick-start/) for more details about PM2.
