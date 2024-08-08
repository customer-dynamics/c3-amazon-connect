#!/bin/bash

# Compresses the content of all of the folders starting with "asset." inside of cdk.out into separate .zip files.

# Get the list of all asset folders
ASSET_FOLDERS=$(find cdk.out -type d -name "asset.*");

for ASSET_FOLDER in $ASSET_FOLDERS; do
  # Set the correct name for the .zip file
  ZIP_FILE_NAME="${ASSET_FOLDER}.zip"
  ZIP_FILE_NAME=$(echo $ZIP_FILE_NAME | sed 's#cdk.out/asset.##')

  # Compress the content of each asset folder into a .zip file
  echo "Compressing the content of ${ASSET_FOLDER} into exports/${ZIP_FILE_NAME}"
  cd $ASSET_FOLDER && zip -r "../../exports/$ZIP_FILE_NAME" . && cd -
done;
