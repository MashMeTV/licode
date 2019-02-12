FROM ubuntu:16.04

MAINTAINER Lynckia

WORKDIR /opt/licode

# Download latest version of the code and install dependencies
RUN  apt-get update && apt-get install -y git wget curl

COPY . /opt/licode

RUN ./scripts/installUbuntuDeps.sh --cleanup --fast

RUN ./scripts/installErizo.sh -dfeacs && \
    ./nuve/installNuve.sh && \
    ./scripts/installBasicExample.sh

ENTRYPOINT ["./extras/docker/initDockerLicode.sh"]
