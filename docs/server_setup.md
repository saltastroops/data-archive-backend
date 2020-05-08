# SALT/SAAO Data Archive API Server Setup

The SALT/SAAO Data Archive API is hosted on the Ubuntu 16.04 or higher server.
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
sudo apt-get install -y build-essential python
```

## Install Git

[Git](https://git-scm.com/) is an open source distributed dersion control system.

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

### Setup Nginx

After Nginx is installed, you may create another Nginx config file, because of the default ```nginx.conf``` having a script to include all files that match pattern ```*.conf``` like the following

```
include /etc/nginx/conf.d/*.conf;
include /etc/nginx/sites-enabled/*;
```

That means you can create a new file e.g. ```dassapi.saao.ac.za.conf``` inside the ```/etc/nginx/conf.d``` and everything works perfectly! The file ```dassapi.saao.ac.za.conf``` have only server name, port and match location that set proxy_pass to the port the Node application is running (e.g. port 4000).

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

To make sure that the Nginx allows also HTTPS must add the lines bellow inside the server block.

```conf
server {
  ...;
  listen              443 ssl;
  ssl_certificate     /etc/nginx/cert.crt;
  ssl_certificate_key /etc/nginx/cert.key;
  ...
}
```

You will need to restart Nginx.

```sh
# To verify nginx configuration
sudo nginx -t

# Restart nginx
sudo service nginx restart
```

### Setup the UFW
You might face firewall issues, below is one solution but you may require further steps.

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

Install PM2 globally in the server.

```
yarn global add pm2
```

Make sure PM2 supports TypeScript and TS-Node.

```
pm2 install typescript && pm2 install ts-node
```

To run the Data Archive API with pm2, you should clone this repository first and run yarn start. 

Restarting PM2 with the processes you manage on server boot/reboot is critical. To solve this, you should run pm2 startup after the Data Archive API is started and is running to generate an active startup script.

```sh
pm2 startup
```

To freeze a process list for automatic respawn run
```sh
pm2 save
```