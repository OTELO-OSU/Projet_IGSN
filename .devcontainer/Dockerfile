FROM node:24-trixie

RUN apt update && apt install -y sudo build-essential

ARG USERNAME=node
RUN echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

USER node

ENV DEVCONTAINER=true
