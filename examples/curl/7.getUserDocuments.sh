
if [ ! -z "$1" ];
then

echo "Get user document: optionally specify the status as well as a query parameter jobstatus=[RUN, FAIL, UPLOADING]'
command='curl localhost:8180/dataprovider/user?userEmail=juanprietob@gmail.com'
echo $command
eval $command

else
	echo "Use the document id : _id to add get the job document created: sh getDocument.sh _id"	
fi