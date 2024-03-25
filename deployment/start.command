#!/bin/bash
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")/../" ; pwd -P )
cd "$parent_path"

# Load dotenv
export $(cat .env | xargs)

ssh -i deployment/server.pem $SERVER_SSH -tt bash << HERE
 cd $SERVER_PATH
 nohup ./start.sh &
 exit 
HERE

# Stop all child processes when we stop this script
function cleanup()
{
    echo ""
    echo "You are leaving the server, but Empirica is still running"
    echo "Bye bye!"
    # /bin/bash ./stop.command
}

# Keep script open until an interrupt is sent
trap cleanup SIGINT

ssh -i deployment/server.pem $SERVER_SSH -tt bash << HERE
    cd $SERVER_PATH
    clear
    tail -f nohup.out
HERE