


echo Get job document:
command='curl localhost:8180/dataprovider/'$1
echo $command
eval $command

echo Get job data:
command='curl localhost:8180/dataprovider/'$1'/pic.jpg > pic2.jpg'
echo $command
eval $command