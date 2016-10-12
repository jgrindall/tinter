var express = 			require("express");
var formidable =	 	require("formidable");
var path = 				require('path');
var jimp = 				require('jimp');
var tinycolor2 = 		require("tinycolor2");
var fs = 				require("fs");
var zipFolder = 		require("zip-folder");
var mkdirp = 			require("mkdirp");

var app = express();
var port = Number(process.env.PORT || 5000);
var UPLOAD_DIR = path.join(__dirname, '/public/uploads');

app.configure(function(){
	app.use(express.static(__dirname + "/public"));
});

var MAX_OFFSET = 20;

var zipImages = function(colorList, token, fn){
	var tokenDirectory = path.join(UPLOAD_DIR, "/upload_" + token);
	var zipDirectory = path.join(UPLOAD_DIR, "/upload_" + token + ".zip");
	zipFolder(tokenDirectory, zipDirectory, function(err) {
		fn();
	});
};

var processImg = function(img, colorList, token){
	console.log("p1");
	var data, i, color0, clonedImg;
	var tokenDirectory = path.join(UPLOAD_DIR, "/upload_" + token);
	for(i = 0; i < colorList.length; i++){
		color0 = tinycolor2(colorList[i]);
		console.log("clr", colorList[i]);
		clonedImg = img.clone();
		data = clonedImg.bitmap.data;
		clonedImg.scan(0, 0, clonedImg.bitmap.width, clonedImg.bitmap.height, function (x, y, idx) {
			var newColor;
			var red   = 		data[ idx + 0 ];
			var green = 		data[ idx + 1 ];
			var blue  = 		data[ idx + 2 ];
			var alpha = 		data[ idx + 3 ];
			var amount = 		red - 127;
			if(amount >= 0){
				newColor = 		color0.clone().lighten(Math.round(MAX_OFFSET * amount/127));
			}
			else{
				newColor = 		color0.clone().darken(Math.round(-MAX_OFFSET * amount/127));
			}
			var newRGB = newColor.toRgb();
			data[idx + 0] = 	newRGB.r;
			data[idx + 1] = 	newRGB.g;
			data[idx + 2] = 	newRGB.b;
		});
		clonedImg.write(path.join(tokenDirectory, "new_" + i + ".png"));
	}
	console.log("p4");
};

app.get('/download', function(req, res) {
	var token = req.query.token;
	var zipDirectory = path.join(UPLOAD_DIR, "/upload_" + token + ".zip");
    res.download(zipDirectory, token + '.zip', function(err){
	 	if (err) {
			console.log(err);
	 	}
	 	else {
			console.log('done');
	 	}
	});
});

app.post('/upload', function(req, res) {
    var form = new formidable.IncomingForm();
	form.multiples = true;
	var token = Math.floor(Math.random() * 100000000000);
	var tokenDirectory = path.join(UPLOAD_DIR, "/upload_" + token);
	var filename = "orig.png";
	var fullFilename = path.join(tokenDirectory, filename);
	var colorList = [];
	form.on('file', function(field, file) {
		fs.renameSync(file.path, fullFilename);
	});
	form.on('field', function(name, val){
		if(name === "colors"){
			colorList = val.split(",");
		}
	});
	form.on('error', function(err) {
		console.log('An error has occured: \n' + err);
	});
	form.on('end', function() {
		jimp.read(fullFilename)
		.then(function (img) {
			processImg(img, colorList, token);
			setTimeout(function(){
				console.log("p done");
				zipImages(colorList, token, function(){
					console.log("z done");
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.write(JSON.stringify({ "token": token, "num":colorList.length}));
					res.end();
				});
			}, 1000);
		})
		.catch(function(e){
			console.err(e);
			throw e;
		});
	});
	mkdirp(UPLOAD_DIR, function(err) {
		mkdirp(tokenDirectory, function(err) {
			form.parse(req);
		});
	});
	console.log("parse!");
	
});

app.get('/', function(req, res) {
	app.render(res, "public/src/index.html");
});

app.listen(port, function() {
  console.log("Listening on " + port);
});
