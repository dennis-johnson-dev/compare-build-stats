#!/bin/bash

if [ -f settings.sh ]; then
  . settings.sh
else
  echo "You need to add a settings.sh file containg the required environment variables"
  exit 1
fi

nodemon src/index.ts
