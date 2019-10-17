#Download base image ubuntu 18.04
FROM ubuntu:18.04

LABEL "repository"="https://github.com/saltastroops/data-archive-backend.git"
LABEL "maintainer"="SALT ASTRO OPS Software Team"

# Update Ubuntu Software repository
RUN apt-get update && \
apt-get install -y \
openssh-client

ADD entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]