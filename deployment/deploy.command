#!/bin/bash

################################################################################
# Filename: deploy.command
# Author: Elijah Claggett
# Date: January 24, 2024
# Description: Deploys this Empirica experiment along with its associated files
#
# Usage:
#   ./deployment/deploy.command
#
# Dependencies:
#   - Empirica
#   - Python 3
#   - Pyenv
#   - Pyenv Virtualenv
#
# Notes:
#   Please run this file from the parent directory.
#
################################################################################

tput sc
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")/../" ; pwd -P )
cd "$parent_path"

# Load dotenv
export $(cat .env | xargs)

emp bundle

echo $SERVER_SSH;
echo $SERVER_PATH;

sftp -b - -i deployment/server.pem $SERVER_SSH <<EOF
	put -r "$parent_path/$EXPERIMENT_NAME.tar.zst" "$SERVER_PATH"
	put "$parent_path/start.sh" "$SERVER_PATH/start.sh"
	put "$parent_path/.env_prod" "$SERVER_PATH/.env"
	put "$parent_path/texts.json" "$SERVER_PATH/texts.json"
	put "$parent_path/nlp/nlp.py" "$SERVER_PATH/nlp/nlp.py"
	put -r "$parent_path/nlp/util" "$SERVER_PATH/nlp"
	put "$parent_path/deployment/install_custom_empirica.sh" "$SERVER_PATH/../install_custom_empirica.sh"
	exit
EOF

tput rc
tput el
echo "Done deploying the experiment!";