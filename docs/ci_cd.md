# Delivery and Deployment

In favor of employing Continuous Integration and Continuous Deployment, GitHub Actions feature is used to achieved this.

Continuous Integration is the process of building your application continuously in bits and pieces. It involves code compilation and validation, code review, testing and packaging your application ready for release.
Continuous Integration is the process of building your application continuously in bits and pieces. It involves code compilation and validation, code review, testing and packaging your application ready for release.
Continuous Deployment further extends from continuouos delivery. If all the steps (compiling, building, reviewing, testing) in the production pipeline succeed, the changes are automatically made live to the public with no human interaction.

# GitHub Actions

It is a new GitHub feature used to automate your workflow from software development to production.
It makes it easy to automate all your software workflows with Continuous Integration, Continuous Delivery and Continuous Deployment out of the box. 
It enables building, testing, packaging, delivering and deploying your code right from GitHub.

## GitHub Actions Execution

To execute GitHub Actions, you must define a workflow.

A workflow is a configurable automated process for compiling, building, testing, packaging, delivering or deploying your project right on GitHub.

A workflow contains actions, which are the actual processes to be carried out.

In order for GitHub to know about any defined workflow, in your repository root directory, there must be a .github/workflow/ directory.

Inside the workflow/ directory you may define *.yml or *.yaml files, which are the actual workflow configuration files.

Predefined actions are available, but you can define your own actions as well.

## Workflows
In order to reach the development or production server and actually deploy the updated version of the Data Archive API we should set gitHub secret vairables for connecting to the development server.

```TODO UPDATE Differentiate betwen dev and live ssh machines```
Variable | Description | Example
---- | ---- | ----
SSH_MACHINE_PRIVATE_SSH_KEY | The ssh server private key | secret key
SSH_MACHINE_HOST | The ssh server host | http://localhost
SSH_MACHINE_USER | The ssh server user | ssda
SSH_MACHINE_PORT | The ssh server port | 22 

####  The Data Archive API Features Workflow

Create a file ```feature.yml``` inside the ```.github/worflows``` directory and add the content below to it.

```yml
#  The Data Archive API Features Workflow
name: Data Archive API Features Workflow

# This workflow is triggered whenever there are new commits pushed to the features branch.
on:
  push:
    branches:
      - '*'
      - '!development'
      - '!master'

jobs:
  job1:
    # The job for building, testing and deploy the code inside the github virtual machine.
    name: Build, test and run the app on the github virtual machine
    # This job is executed on the Linux machine.
    runs-on: ubuntu-latest

    # The matrix strategy is used to specify the nodejs version to use for the node packages management.
    strategy:
      # In this case, nodejs version 10.x is used.
      # To include more versions, you add them as follows: [8.x, 10.x, 12.x, ...].
      matrix:
        node-version: [10.x]

    # The steps to be executed for this job.
    steps:
      # This step uses the checkout action to make sure the latest code is used.
      - name: Use the latest code
        uses: actions/checkout@v1
      # This step uses the setup-node action to setup the nodejs environment.
      - name: Setup the nodejs environment
        uses: actions/setup-node@v1
        # The setup-node action accepts parameters.
        # In this case, the nodejs version parameter specifying the version of nodejs to use is supplied.
        with:
          node-version: ${{ matrix.node-version }}
      # This specifies the commands to run after the build is done.
      # The first command is for installing the nodejs packages.
      # The second command is for typescript linting.
      # The third command is for executing the tests.
      - run: |
          yarn install
          yarn lint
          yarn test
        shell: bash
```

### The Data Archive API Development Workflow

Create a file ```development.yml``` inside the ```.github/worflows``` directory and add the content below to it.

```yml
# The Data Archive API Development Workflow
name: Data Archive API Development Workflow

# This workflow is triggered whenever there are new commits pushed to the development branch.
on:
  push:
    branches:
      - development

jobs:
  job1:
    # The job for building, testing and deploy the code inside the github virtual machine.
    name: Build, test and run the app on the github virtual machine
    # This job is executed on the Linux machine.
    runs-on: ubuntu-latest

    # The matrix strategy is used to specify the nodejs version to use for the node packages management.
    strategy:
      # In this case, nodejs version 10.x is used.
      # To include more versions, you add them as follows: [8.x, 10.x, 12.x, ...].
      matrix:
        node-version: [10.x]

    # The steps to be executed for this job.
    steps:
      # This step uses the checkout action to make sure the latest code is used.
      - name: Use the latest code
        uses: actions/checkout@v1
      # This step uses the setup-node action to setup the nodejs environment.
      - name: Setup the nodejs environment
        uses: actions/setup-node@v1
        # The setup-node action accepts parameters.
        # In this case, the nodejs version parameter specifying the version of nodejs to use is supplied.
        with:
          node-version: ${{ matrix.node-version }}
      # This specifies the commands to run after the build is done.
      # The first command is for installing the nodejs packages.
      # The second command is for typescript linting.
      # The third command is for executing the tests.
      - run: |
          yarn install
          yarn lint
          yarn test
        shell: bash

  job2:
    # This job is only executed when job1 executed successfully
    needs: job1

    # The job for building, testing and deploy the code to the development server.
    name: Build, test and deploy on the development server
    # This job is executed on the Linux machine.
    runs-on: ubuntu-latest

    # The steps to be executed for this job.
    steps:
      # This step uses the checkout action to make sure the latest code is used.
      - name: Use the latest code
        uses: actions/checkout@v1
      # This step uses the fifsky ssh action to setup a ssh server used to ssh into the development server.
      - name: Fifsky ssh server
        uses: fifsky/ssh-action@master
        # The fifsky ssh action accepts parameters.
        # These parameters are secretly stored in GitHub secrete store.
        # In this case, the following parameters are supplied
        # key, the client ssh private key
        # host, the host to ssh into
        # user, the host username to ssh into
        # port, the host port to ssh into
        # command, the command to be executed inside the remote host.
        with:
          key: ${{ secrets.SSH_MACHINE_PRIVATE_SSH_KEY }}
          host: ${{ secrets.SSH_MACHINE_HOST }}
          user: ${{ secrets.SSH_MACHINE_USER }}
          port: ${{ secrets.SSH_MACHINE_PORT }}
          # The ssh action logs into a gateway server,
          # and we still have to connect to the machine on which the data archive is hosted.
          command: |
            ssh -o StrictHostKeyChecking=no -tt ${{ secrets.DEV_USER}}@${{ secrets.DEV_HOST}} -p ${{ secrets.DEV_PORT}} """
              set -eu
              cd /home/ssda/data-archive-backend &&
              git checkout . &&
              git checkout development &&
              git pull &&
              yarn install &&
              yarn lint &&
              yarn test &&
              yarn restart &&
              exit
            """
```

### The Data Archive API Master Workflow

Create a file ```master.yml``` inside the ```.github/worflows``` directory and add the content below to it.

```yml
# The Data Archive API Master Workflow
name: Data Archive API Master Workflow

# This workflow is triggered whenever there are new commits pushed to the master branch.
on:
  push:
    branches:
      - master

jobs:
  job1:
    # The job for building, testing and deploy the code inside the github virtual machine.
    name: Build, test and run the app on the github virtual machine
    # This job is executed on the Linux machine.
    runs-on: ubuntu-latest

    # The matrix strategy is used to specify the nodejs version to use for the node packages management.
    strategy:
      # In this case, nodejs version 10.x are used.
      # To include more versions, you can add them as follows: [8.x, 10.x, 12.x, ...].
      matrix:
        node-version: [10.x]

    # The steps to be executed for this job.
    steps:
      # This step uses the checkout action to make sure the latest code is used.
      - name: Use the latest code
        uses: actions/checkout@v1
      # This step uses the setup-node action to setup the nodejs environment.
      - name: Setup the nodejs environment
        uses: actions/setup-node@v1
        # The setup-node action accepts parameters.
        # In this case, the nodejs version parameter specifying the version of nodejs to use is supplied.
        with:
          node-version: ${{ matrix.node-version }}
      # This specifies the commands to run after the build is done.
      # The first command is for installing the nodejs packages.
      # The second command is for typescript linting.
      # The third command is for executing the tests.
      - run: |
          yarn install
          yarn lint
          yarn test
        shell: bash

  job2:
    # This job is only executed when job1 executed successfully
    needs: job1

    # The job for building, testing and deploy the code to the production server.
    name: Build, test and deploy on the production server
    # This job is executed on the Linux machine.
    runs-on: ubuntu-latest

    # The steps to be executed for this job.
    steps:
      # This step uses the checkout action to make sure the latest code is used.
      - name: Use the latest code
        uses: actions/checkout@v1
      # This step uses the fifsky ssh action to setup a ssh server used to ssh into the production server.
      - name: Fifsky ssh server
        uses: fifsky/ssh-action@master
        # The fifsky ssh action accepts parameters.
        # These parameters are secretly stored in GitHub secrete store.
        # In this case, the following parameters are supplied
        # key, the client ssh private key
        # host, the host to ssh into
        # user, the host username to ssh into
        # port, the host port to ssh into
        # command, the command to be executed inside the remote host.
        with:
          key: ${{ secrets.SSH_MACHINE_PRIVATE_SSH_KEY }}
          host: ${{ secrets.SSH_MACHINE_HOST }}
          user: ${{ secrets.SSH_MACHINE_USER }}
          port: ${{ secrets.SSH_MACHINE_PORT }}
          # The ssh action logs into a gateway server,
          # and we still have to connect to the machine on which the data archive is hosted.
          command: |
            ssh -o StrictHostKeyChecking=no -tt ${{ secrets.PROD_USER}}@${{ secrets.PROD_HOST}} -p ${{ secrets.PROD_PORT}} """
              set -eu
              cd /home/ssda/data-archive-backend &&
              git checkout . &&
              git checkout master &&
              git pull &&
              yarn install &&
              yarn lint &&
              yarn test &&
              yarn restart &&
              exit
            """
```