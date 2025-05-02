FROM ubuntu:22.04

RUN apt update

RUN apt install -y curl

RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -

RUN apt-get upgrade -y

RUN apt install -y nodejs

RUN apt install -y npm

RUN apt install -y postgresql postgresql-contrib

RUN apt install -y mongodb

COPY . /app
WORKDIR /app

RUN npm install

ENTRYPOINT ["npm", "start"]