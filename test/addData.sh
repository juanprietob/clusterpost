

echo Add data: 
command="curl -H 'Content-Type: application/octet-stream' -X PUT --data-binary @pic.jpg localhost:8180/dataprovider/$1/pic.jpg"
echo $command
eval $command



