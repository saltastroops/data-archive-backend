# SALT/SAAO Data Archive API Server Setup

The SALT/SAAO Data Archive API is hosted on the Ubuntu 16.04 server.
Various packges which are required to be installed to get the Data Archive API server up and running.


## Install Node JS Using a PPA

This will allow you to install the latest [NodeJS](https://nodejs.org/en/) or may choose the version of node.js you want to install. By the time of writing this document, version 12.16.2 was the latest.

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

```
Output
v10.16.2
```

The nodejs package contains the nodejs binary as well as npm, so you don't need to install npm separately.

```sh
npm --version
```

```
Output
6.6.0
```

Alternatively on using npm, one can use yarn. To istall [Yarn](https://classic.yarnpkg.com/en/) run the following commands

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

```
Output
1.22.4
```

## Install Git

[Git](https://git-scm.com/) is an **Open Source Distributed Version Control System**.

```sh
sudo apt update

sudo apt install git
```

Verify that Git was installed successfuly.

```sh
git --version
```

```
Output
2.17.1
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

```
Output
nginx version: nginx/1.14.0 (Ubuntu)
```

### Setup NGINX

After NGINX installed, you may create another NGINX config file, because of the default ```nginx.conf``` having a script to include all files that match pattern ```*.conf``` like the following

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
You migh face firewall issues, below is one solution but you may required further steps.

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

When you want to long run Node.js, you need daemon process, and Node.js uses [PM2](http://pm2.keymetrics.io/) to achieve that. 

Just Install PM2 globally in the server.

```
yarn global add pm2
```

Make sure PM2 supports TypeScript and TS-Node.

```
pm2 install typescript && pm2 install ts-node
```

After the app has been ran, you can  set the startup and save the PM2 process for when a machine restarts/reboots/crashes so that the same configurations are kept.
When the machine starts, the process of the app is started also.

***After running the app, then can execute the following commands***

Set up the startup
```sh
pm2 startup
```

Save the configurations
```sh
pm2 save
```