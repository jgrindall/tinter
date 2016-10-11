var express = require("express");
var app = express();
var fs = require("fs");
var port = Number(process.env.PORT || 5000);
var formidable = require("formidable");
var path = require('path');
var jimp = require('jimp');
var UPLOAD_DIR = path.join(__dirname, '/public/uploads');

app.configure(function(){
	app.use(express.static(__dirname+"/public"));
});

app.post('/upload', function(req, res) {
    var form = new formidable.IncomingForm();
	var filename = "upload" + Math.floor(Math.random()*100000000000) + ".png";
	var editedFilename = "_" + filename;
	var fullFilename = path.join(UPLOAD_DIR, filename);
	var fullEditedFilename = path.join(UPLOAD_DIR, editedFilename);
	form.multiples = true;
	form.on('file', function(field, file) {
		fs.rename(file.path, fullFilename);
	});
	form.on('error', function(err) {
		console.log("error");
		console.log('An error has occured: \n' + err);
	});
	form.on('end', function() {
		setTimeout(function(){
			console.log("END");
			jimp.read(fullFilename)
			.then(function (img) {
				console.log("process");
				img.color(
					[
						{ apply: 'mix', params: [ '#06D', 50 ] }
					]
				);
				img.write(fullEditedFilename);
				console.log("processed");
				res.end(editedFilename);
			});
		}, 1000);
	});
	console.log("parse!");
	form.parse(req);
});

app.get('/', function(req, res) {
	app.render(res, "public/src/index.html");
});

app.listen(port, function() {
  console.log("Listening on " + port);
});

/*
jimp.read(fullFilename)
		.then(function (img) {
			console.log("PROCESS", fullFilename, "->", fullEditedFilename);
			img
			.resize(256, 256)
			.quality(60)
			.greyscale()
			.write(fullEditedFilename);
			console.log("PROCESSED ", fullEditedFilename);
			res.end(fullEditedFilename);
		})
		.catch(function (err) {
			console.error(err);
		});*/
