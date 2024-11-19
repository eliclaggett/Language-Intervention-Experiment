#!/bin/bash

################################################################################
# Filename: start.command
# Author: Elijah Claggett
# Date: January 24, 2024
# Description: Starts this Empirica experiment on the server
#
# Usage:
#   ./deployment/start.command
#
# Notes:
#   Please deploy the latest version of the experiment before running this script
#
################################################################################

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")/../" ; pwd -P )
cd "$parent_path"

# Load dotenv
export $(cat .env | xargs)

ssh -i deployment/server.pem $SERVER_SSH -tt bash << HERE
 cd $SERVER_PATH
 nohup ./start.sh &
 exit 
HERE

# Run NLP Server
{ ./deployment/run_nlp.command &> log_nlp.log & }
pid2=$!

# Stop all child processes when we stop this script
function cleanup()
{
    echo ""
    echo "You are leaving the server, but Empirica is still running"
    echo "Bye bye!"
    # /bin/bash ./stop.command
}

# Keep script open until an interrupt is sent
trap cleanup EXIT

ssh -i deployment/server.pem $SERVER_SSH -tt bash << HERE
    cd $SERVER_PATH
    clear
    tail -f nohup.out
HERE