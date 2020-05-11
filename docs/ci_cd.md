# Delivery and Deployment

[GitHub Actions](https://github.com/features/actions) are used for Continuous Integration and Continuous Deployment. The [workflows](https://help.github.com/en/actions/configuring-and-managing-workflows/configuring-and-managing-workflow-files-and-runs) are listed below.

## Secrets
To allow the deployment of an updated version of the Data Archive backend to the development or production server, you have to set secrets for connecting to the server.

```TODO UPDATE Differentiate betwen dev and live ssh machines```
Variable | Description | Example
---- | ---- | ----
SSH_MACHINE_PRIVATE_SSH_KEY | The ssh server private key | secret key
SSH_MACHINE_HOST | The ssh server host | http://localhost
SSH_MACHINE_USER | The ssh server user | ssda
SSH_MACHINE_PORT | The ssh server port | 22 

The secrets can be set by the project owner in the project settings.

## Features Workflow

The features workflow is triggered whenever there is a new branch added or there are new commits pushed to that branch. This excludes the master and the development branch.

This workflow is defined in [github/workflows/features.yml](.github/workflows/features.yml).

## Development Workflow

The development workflow is triggered whenever there are new commits pushed to the development branch.

This workflow is defined in [github/workflows/development.yml](.github/workflows/features.yml).

### Master Workflow

The master workflow is triggered whenever there are new commits pushed to the master branch.

This workflow is defined in [github/workflows/master.yml](.github/workflows/features.yml).