# SALT/SAAO Data Archive API Server Setup

The SALT/SAAO Data Archive API is hosted on a server running under Ubuntu 16.04 or higher.
Various packges which are required to be installed to get the Data Archive API server up and running.


## Install Node JS Using a PPA

[NodeJS](https://nodejs.org/en/) version 12.x should be installed.

```sh
cd ~

curl -sL https://deb.nodesource.com/setup_12.x -o nodesource_setup.sh
```

The PPA will be added to your configuration and your local package cache will be updated automatically. Should be able to install the Node.js package by running the following commands.

```sh
sudo apt-get update

sudo apt-get install nodejs
```

Verify that Node.js was installed successfuly.

```sh
nodejs -v
```

Install [Yarn](https://classic.yarnpkg.com/en/) by executing the following commands

```sh
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
```

```sh
sudo apt update && sudo apt install yarn
```

To confirm yarn was installed you should run the following command
```sh
yarn --version
```

The Data Archive API uses a [bcrypt](https://www.npmjs.com/package/bcrypt) package which is installed via `yarn` along other specified packages in the `package.json` file. For it to install successfuly, a python build essential should be installed first. 

To install it run

```sh
sudo apt install build-essential
```

## Install Git

[Git](https://git-scm.com/) is an open source distributed version control system.

```sh
sudo apt update

sudo apt install git
```

Verify that Git was installed successfuly.

```sh
git --version
```

## Install Nginx

[Nginx](https://www.nginx.com/) is one of the most popular web servers. It can be used as a web server or a reverse proxy. 

```sh
sudo apt update

sudo apt install nginx
```

Verify that Nginx was installed successfuly.

```sh
nginx -V
```

### Configuring Nginx

After installing Nginx you should add your server configuration in a file (`your.domain.conf`, say) in the folder `/etc/nginx/sites-available`. Afterwards you need to create a symbolic link in the folder `/etc/nginx/sites-enabled` which points to your configuration file. For example:

```sh
cd /etc/nginx/sites-enabled
ln -s /etc/nginx/sites-available/your.domain.conf your.domain.conf
```

The content of the configuration file depends on your particular needs. If the Data Archive backend is the only webservice running on the server, it might look as follows.

```conf
server {
  listen 80;
  server_name your_domain.com;
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

If you are running both the Data Archive frontend and backend on the same server, it could look as follows.

```conf
server {
  listen 80 default_server;
  server_name your.domain;

  location / {
    root /var/www/frontend/build;
    index index.html index.htm;
    try_files $uri /index.html;
  }

  location /api {
    proxy_pass http://localhost:4000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
  }
```

This setup assumes that all backend URLs are relative to `/api`. Note the slash at the end of proxy_pass `http://localhost:4001/`. This absolutely crucial, as otherwise Nginx won't drop the `/api` prefix when passing through requests.

To support HTTPS you must add the lines below inside the server block.

```conf
server {
  ...
  listen              443 ssl;
  ssl_certificate     /etc/nginx/cert.crt;
  ssl_certificate_key /etc/nginx/cert.key;
  ...
}
```

You will need to restart Nginx.

#### To verify nginx configuration

```sh
sudo nginx -t
```

#### Restart nginx

```sh
sudo service nginx restart
```

### Setup the UFW

You might face firewall issues. Below is one solution but you may require further steps.

Enable [UFW](https://help.ubuntu.com/community/UFW) (a firewall configuration tool for iptables that is included with Ubuntu by default) with the default set of rules.

```sh
sudo ufw enable
```

Check the statu of UWF

```sh
sudo ufw status verbose
```

Check the available ufw application profiles

```sh
sudo ufw app list
```

Allow and Deny (specific rules)

```sh
sudo ufw allow <port>/<optional: protocol>
```

## Install PM2

In production, you should use a daemon process. For Node.js you can use [PM2](http://pm2.keymetrics.io/) to set this up.

Install PM2 globally on the server.

```
yarn global add pm2
```

Make sure PM2 supports TypeScript and TS-Node.

```
pm2 install typescript && pm2 install ts-node
```

To run the Data Archive API with PM2, you should clone this repository, install packages and run yarn start. 

#### Clone the repository

```bash
git clone https://github.com/saltastroops/data-archive-backend.git data-archive-backend
```

or using ssh

```bash
git clone git@github.com:saltastroops/data-archive-backend.git data-archive-backend
```

#### Install packages

```bash
cd data-archive-backend
yarn install
```

#### Run the API

```bash
yarn start
```

To ensure that PM2 restarts your process after a server reboot and automatically respawns the process, execute the following commands after starting the server with `yarn start`.

```sh
pm2 startup
```

To freeze a process list for automatic respawn run
```sh
pm2 save
```