MAIN=server.js
MEMORY=512
VERSION=recommended
DISPLAY_NAME=Priquito
AUTOSTART=true
START=npx prisma generate && npx prisma migrate deploy && NODE_ENV=production node server.js
