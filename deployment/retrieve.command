#!/bin/bash

################################################################################
# Filename: retrieve.command
# Author: Elijah Claggett
# Date: January 24, 2024
# Description: Retrieves the data recorded by this Empirica experiment
#
# Usage:
#   ./deployment/retrieve.command
#
################################################################################

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")/../" ; pwd -P )
cd "$parent_path"

# Load dotenv
export $(cat .env | xargs)


dt=$(date +%F)
echo "Saving experiment to ${DATA_PATH}"

sftp -b - -i deployment/server.pem $SERVER_SSH <<EOF
	get -r ${PROD_STORE_PATH}/* ${DATA_PATH}/
	exit
EOF

# cp --no-clobber ${DATA_PATH}/ ${PERM_DATA_PATH}