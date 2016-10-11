var express = require("express");
var app = express();
var fs = require("fs");
var port = Number(process.env.PORT || 5000);
var formidable = require("formidable");
var path = require('path');
var jimp = require('jimp');
var UPLOAD_DIR = path.join(__dirname, '/public/uploads');
var tinycolor2 = require("tinycolor2");

app.configure(function(){
	app.use(express.static(__dirname+"/public"));
});

app.post('/upload', function(req, res) {
    var form = new formidable.IncomingForm();
	var filename = "upload" + Math.floor(Math.random()*100000000000) + ".png";
	var editedFilename = "_" + filename;
	var color0;
	var fullFilename = path.join(UPLOAD_DIR, filename);
	var fullEditedFilename = path.join(UPLOAD_DIR, editedFilename);
	form.multiples = true;
	form.on('file', function(field, file) {
		fs.rename(file.path, fullFilename);
	});
	form.on('field', function(){
		console.log("FIELD??", arguments);
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
				console.log("process", img.bitmap.width, img.bitmap.height);
				var data = img.bitmap.data;
				var MAX_OFFSET = 30;
				var color0 = { r: 216, g: 118, b: 22 };
				img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
					var newColor;
					var red   = 		data[ idx + 0 ];
					var green = 		data[ idx + 1 ];
					var blue  = 		data[ idx + 2 ];
					var alpha = 		data[ idx + 3 ];
					var amount = 		red - 127;
					if(amount >= 0){
						newColor = 		tinycolor2(color0).lighten(Math.round(MAX_OFFSET * amount/127));
					}
					else{
						newColor = 		tinycolor2(color0).darken(Math.round(-MAX_OFFSET * amount/127));
					}
					var newRGB = newColor.toRgb();
					data[idx + 0] = 	newRGB.r;
					data[idx + 1] = 	newRGB.g;
					data[idx + 2] = 	newRGB.b;
				});
				img.write(fullEditedFilename);
				res.end(editedFilename);
			})
			.catch(function(e){
				console.err(e);
				throw e;
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
			
			
			
			
			app.get('/upload', function(req, res) {
	var file = __dirname + '/upload/upload.txt';
    res.download(file, 'upload.txt', function(err){
	 	if (err) {
	   	console.log(err);
	 	}
	 	else {
	   	console.log('done');
	 	}
	});
});


<a href='/upload'>Download</a>





		});*/
