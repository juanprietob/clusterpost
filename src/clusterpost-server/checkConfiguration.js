var fs = require('fs');
var path = require('path');

var cwd = process.cwd();
var installdir = path.join(process.cwd(), "../../");

var defaultconfig = fs.readFileSync(path.join(cwd, "conf.default.json"));

try{
	var stats = fs.statSync(path.join(installdir, 'conf.production.json'));
}catch(e){
	console.log("Generating default 'production' configuration file...");
	console.log("Please edit this file with your configuration parameters.");
	fs.writeFileSync(path.join(installdir, 'conf.production.json'), defaultconfig);
}

try{
	var stats = fs.statSync(path.join(installdir, 'conf.test.json'));	
}catch(e){
	console.log("Generating default 'test' configuration file...");
	console.log("Please edit this file with your configuration parameters.");
	fs.writeFileSync(path.join(installdir, 'conf.test.json'), defaultconfig);
}

console.log("tls configuration:");
console.log("\tIf you want to enable https layer for this server application you must either generate a key and certificate or acquire a certificate from a cert authority.");
console.log("\tIf you don't want to use https remove the field 'tls' from the JSON configuration file(s).");
console.log("\tTo generate a self-signed certificate run the following commands on UNIX systems: ");
console.log("\t\topenssl genrsa -out key.pem 2048");
console.log("\t\topenssl req -new -key key.pem -out csr.pem");
console.log("\t\topenssl req -x509 -days 365 -key key.pem -in csr.pem -out certificate.pem");
console.log("\tFinally edit the paths for 'tls' in the configuration section");
console.log("");
console.log("clusterpost-auth configuration:");
console.log("\tprivateKey:");
console.log("\t\tReplace the key 'privateKey' by some unique string of your choice, this will be the key used to encrypt the passwords in the DB.");
console.log("\t\tIf you would like to generate a unique key, run the following command:");
console.log("\t\t\t openssl genrsa 128");
console.log("\t\t Replace the string 'SomeRandomKey'.");
console.log("\tmailer:");
console.log("\t\tThe mailing system will be used to send tokens to the users that forgot their password");
console.log("\t\tCheck nodemailer https://nodemailer.com/2-0-0-beta/setup-smtp/ for configuration options and edit this field accordingly.");
console.log("");
console.log("clusterpost-provider configuration:");
console.log("\tData provider.");
console.log("\t\tEdit the data provider configuration for the couchdb instance (default config should work out of the box)");
console.log("\texecutionservers:");
console.log("\t\t Edit this field with the ssh configuration to connect to your computing grid.");
console.log("\t\t You must generate a pair of private and public keys and be able to connect without entering a password.");
console.log("\t\t 'sourcedir' must point to the installation path of the 'clusterpost-executionserver' package.");
console.log("\t\t To install this package login to your computing grid and run 'npm install clusterpost-executionserver', follow the configuration tutorial for this module.");
console.log("");
console.log("To start the server you must generate an index.js file and add:");
console.log("--------");
console.log("\trequire('clusterpost-server');");
console.log("\tclusterpostserver.server.start(function () {");
console.log("\t\tclusterpostserver.server.log('info', 'Server running at: ' + clusterpostserver.server.info.uri);");
console.log("\t});");
console.log("--------");
console.log("You can also add your own plugins to this Hapi server by adding them to the configuration file, check the Hapi tutorial http://hapijs.com/tutorials/plugins to start developing a new extension.");
console.log("Start the server by running:");
console.log("\tNODE_ENV=<production|test> node index.js");
console.log("\tThe parameter production or test will read the configuration file you just generated.");
console.log("Once you have started the server visit http://localhost:8180/docs to check the API documentation for clusterpost");
