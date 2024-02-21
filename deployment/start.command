#!/bin/bash
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")/../" ; pwd -P )
cd "$parent_path"

# Load dotenv
export $(cat .env | xargs)

ssh -i deployment/server.pem -tt $SERVER_SSH bash << HERE
 cd $SERVER_PATH
 nohup ./start.sh &
 sleep 1
 tail -f nohup.out
HERE

# Stop all child processes when we stop this script
function cleanup()
{
    /bin/bash ./stop.command
}

# Keep script open until an interrupt is sent
trap cleanup SIGINT
wait