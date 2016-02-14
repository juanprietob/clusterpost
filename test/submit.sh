

command="curl -H 'Content-Type: application/json' -X POST localhost:8180/executionserver/"$1" -d '{\"executionserver\" : \""$2"\"}'"
echo $command
eval $command