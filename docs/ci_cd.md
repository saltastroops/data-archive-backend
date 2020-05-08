# Delivery and Deployment

In order to employ Continuous Integration and Continuous Deployment, [GitHub Actions](https://github.com/features/actions) feature is used to achieved this.

## GitHub Actions Execution

[GitHub Actions Workflows](https://help.github.com/en/actions/configuring-and-managing-workflows/configuring-and-managing-workflow-files-and-runs) are defined below for this project on how its migrate from development up until it is live to the end user.

## Workflows
In order to reach the development or production server and actually deploy the updated version of the Data Archive API you should set secrets for connecting to the development server.

```TODO UPDATE Differentiate betwen dev and live ssh machines```
Variable | Description | Example
---- | ---- | ----
SSH_MACHINE_PRIVATE_SSH_KEY | The ssh server private key | secret key
SSH_MACHINE_HOST | The ssh server host | http://localhost
SSH_MACHINE_USER | The ssh server user | ssda
SSH_MACHINE_PORT | The ssh server port | 22 

The secrets can be set by the project owner in the project settings.

####  The Data Archive API Features Workflow

It is triggered whenever there is a new branch added or there are new commits pushed to that branch. This excludes the master and the development branch.

For detailed information click [here](https://github.com/saltastroops/data-archive-backend/blob/development/.github/workflows/features.yml)

### The Data Archive API Development Workflow

It is triggered whenever there are new commits pushed to the development branch.

For detailed information click [here](https://github.com/saltastroops/data-archive-backend/blob/development/.github/workflows/development.yml)

### The Data Archive API Master Workflow

It is triggered whenever there are new commits pushed to the master branch.

For detailed information click [here](https://github.com/saltastroops/data-archive-backend/blob/development/.github/workflows/master.yml)