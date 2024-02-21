#!/bin/bash
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")/../" ; pwd -P )
cd "$parent_path"

# Load dotenv
export $(cat .env | xargs)

ssh -i deployment/server.pem $SERVER_SSH bash << HERE
 cd $SERVER_PATH
 if test -f RUNNING_PID
 then
 kill -2 \`cat ./RUNNING_PID\`
 rm RUNNING_PID
 rm log_*
 rm nohup.out
 echo "Successfully stopped the experiment!";
 else
 echo "No experiment running!";
 fi
 exit
HERE
