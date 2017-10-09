# hapi-jwt-couch

Hapi plugin to validate users using [hapi-auth-jwt](https://github.com/ryanfitz/hapi-auth-jwt), storing user information and encrypted passwords 
in a couchdb instance. 

This plugin also provides a 'recover my password' option by setting up an email account using [nodemailer](https://github.com/nodemailer/nodemailer).

Edit the "message" portion of the configuration. The strings @USERNAME@, @SERVER@ and @TOKEN@ are replaced before sending the email. 

## Usage 

----
	npm install hapi-jwt-couch-lib
----

### Usage and available functions implemented with promises

----
	var hapijwtcouch = require("hapi-jwt-couch-lib");
----

#### setServer(uri)

Set the server uri ex. http://localhost:9090

#### getServer()

Returns the server uri

#### setAgentOptions

Set the request object with specific options documentation at https://www.npmjs.com/package/request

#### promptUsernamePassword

Use a terminal to prompt for user name and password

#### promptServer

Use the terminal to prompt for server URI

#### start

Function to prompt for username, password and server

#### setUserToken

Set the user authentication token to use the request library

#### getUserToken

Gets the user token

#### createUser

Creates a user in the database

#### resetPassword

Sends an email to recover the password with a link

#### userLogin

Logs in the user and returns a token

#### getUser

Gets the user currently logged in the application.

#### getUsers

Gets all the users in the database uses admin scope

#### updateUser

Update basic user information

#### updateUsers

Updates user must have admin scope. 

#### deleteUser

Deletes self from the DB

#### deleteUsers

Deletes a user from the DB, must be admin

## Testing 

### Start the test server

----
	node testserver.js
----

### Run all tests

----
	npm test
----

