# SALT/SAAO Data Archive API Server

## Introduction

The SALT/SAAO Data Archive is used for storing and managing the Observations data previously observed using the SALT and steerable telescopes. The stored data is made accessable to the public. The users may search and request data to download for personal use.

A GraphQL API is used to make the data search and retrieval possible. This repository explains in details how to get started and run the API.

## Overview

The SALT/SAAO GraphQl API is built using a [GraphQL-Yoga server](https://github.com/prisma/graphql-yoga) which is a fully featured GraphQL server, simplifying server setup with better perfomance and developer experience. 

The GrapgQL-Yoga is integrated with the [Prisma](https://www.prisma.io/) data layer which is an Auto-generated and type-safe database client.

## Project Folder Structure

```
data-archive-backend
├── README.md
├── node_modules
├── package.json
├── tsconfig.json
├── tslint.json
├── jest.config.js
├── .env
├── .travis.yml
├── .prettierignore
├── .gitignore
├── docs
|   ├── project_setup.md
|   ├── server_setup.md
├── __tests__
│   ├── filename1.spec.ts
|   ├── filename2.spec.ts
└── src
    ├── index.ts
    ├── resolvers.ts
    ├── datamodel.prisma
    ├── schema.graphql
    ├── prisma.yml
    ├── generated
    |   ├── prisma.graphql
    |   └── prisma-client
    |       ├── index.ts
    |       ├── prisma-schema.ts
    └── resolvers
        ├── index.ts
        ├── Mutations.ts
        ├── Query.ts
```

## Deploying Prisma
This setup assumes that you have node.js installed which ships with the npm for installing node packages. If not please install it [node.js](https://nodejs.org/en/)

It also assumes that you have git installed. If not. please install it [git](https://git-scm.com/)

Clone this repository to your choice of location using the git command.

Make sure to create the .env file with the following environment variables and their correct values.
```
- FRONTEND_URL="The front end url the will be accessing the api endpoint"
- PRISMA_ENDPOINT="put in the generated prisma endpoint after running prisma init"
- PRISMA_SECRET="any-prisma-key"
- APP_SECRET="any-app-secrete-key"
- PORT=an unused port
- SENTRY_DSN="Sentry url"
```

Install prisma globally using npm.
```
npm install -g prisma
```

Go to the root directory of the cloned repository.

```sh
cd data-archive-backend
```

Assuming that prisma was installed successfuly and the environment variables are set correclty, 
then, deploy prisma using the deploy command.

```
npm run deploy
```

## Running GraphQl-Yoga server

Go to the root directory and execute npm install, which will install all the dependencies required.
```
npm install
```

Then start the server by executing npm run dev for watch mode (develpment)
```
npm run dev
```

OR

Start the server by executing npm run start (production)
```
npm run start
```

## Running tests

To run the tests, executes the npm test command
```
npm run test
```
