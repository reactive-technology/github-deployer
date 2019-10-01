#!/usr/bin/env bash
# exit when any command fails
set -e

echo get certificate
sudo apt-get -y install apt-transport-https ca-certificates
echo update
sudo apt update

echo update
sudo apt-get -y update && sudo apt-get -y upgrade
echo install node
sudo curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -
sudo apt-get -y install nodejs git


echo "install yarnpkg"
#sudo apt install --no-install-recommends yarn
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt-get -y update && sudo apt-get -y install yarn
