#!/bin/bash

root_dir=pwd

cd empirica
npm i
cd ./lib/@empirica/core && npm run build
cd "$root_dir/empirica"
cd ./lib/admin-ui && npm i && npm run build

cd $root_dir
cd tajriba/lib/tajriba
npm i
npm run prebuild
npm run build

cd $root_dir/tajriba
modd -p

cd $root_dir/empirica
modd -p
