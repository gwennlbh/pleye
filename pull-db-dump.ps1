set-psdebug -Trace 1

$today = $(Get-Date -Format "yyyy-MM-dd")
$filename = "backup-$today.sql"
$filepath = "~/deployments/pleye/$filename"

# Dump on server and copy to here
ssh ewen@gwen.works "cd ~/deployments/pleye && ./backup-db"
scp "ewen@gwen.works:$filepath" ./dump.sql

# Remove old data
docker compose down db
docker volume rm pleye_pgdata

# Create structure
docker compose up --wait db
sleep 10

# Import dumb
docker compose cp dump.sql db:/dump.sql
docker compose exec db sh -c "psql -U root -d local -h localhost -p 5432 < /dump.sql"

# Cleanup
rm ./dump.sql

set-psdebug -Trace 0
