#!/bin/bash

################################################################################
# Filename: run_nlp.command
# Author: Elijah Claggett
# Date: January 24, 2024
# Description: Runs a Python server that generates text for this Empirica experiment
#
# Usage:
#   Do not call directly. This script shall be called by start.command
#
################################################################################

tput sc
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")/../" ; pwd -P )
cd "$parent_path"

# Load dotenv
export $(cat .env | xargs)

# sftp -b - -i deployment/server.pem $SERVER_SSH <<EOF
# 	put "$parent_path/nlp/nlp.py" "$SERVER_PATH/nlp/nlp.py"
# 	put -r "$parent_path/nlp/util" "$SERVER_PATH/nlp"
# 	exit
# EOF

# Run ML server
ssh -i deployment/server.pem $SERVER_SSH << HERE
cd $SERVER_PATH
if test -f NLP_RUNNING_PID
then
kill \`cat NLP_RUNNING_PID\`
rm NLP_RUNNING_PID
echo "Killed previously running NLP"
fi
HERE
tput rc
ssh -i deployment/server.pem $SERVER_SSH -tt bash << HERE

cd $SERVER_PATH
cd ./nlp
pyenv activate eli
nohup python3 nlp.py &
echo \$! > ../NLP_RUNNING_PID
exit
HERE

tput rc
tput ed
echo "Succesfully started NLP server!"