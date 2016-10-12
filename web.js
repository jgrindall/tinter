var express = 			require("express");
var formidable =	 	require("formidable");
var path = 				require('path');
var jimp = 				require('jimp');
var tinycolor2 = 		require("tinycolor2");
var fs = 				require("fs");
var zipFolder = 		require("zip-folder");
var mkdirp = 			require("mkdirp");
var Promise = 			require("bluebird");

var app = 				express();
var port = 				Number(process.env.PORT || 5000);
var UPLOAD_DIR = 		path.join(__dirname, '/public/uploads');

app.configure(function(){
	app.use(express.static(__dirname + "/public"));
});

var Deferred = function(){
    var _this = this;
    this.promise = new Promise(function resolver(resolve, reject) {
        _this.resolve = resolve;
        _this.reject = reject;
    });
};

var MAX_OFFSET = 20;

var zipImages = function(token, fn){
	var tokenDirectory = path.join(UPLOAD_DIR, "/upload_" + token);
	var zipDirectory = path.join(UPLOAD_DIR, "/upload_" + token + ".zip");
	zipFolder(tokenDirectory, zipDirectory, function(err) {
		fn();
	});
};

var processAll = function(files, colorList, token){
	var def = new Deferred();
	var loadPromises = files.map(function(file){
		return jimp.read(file);
	});
	Promise.all(loadPromises)
	.then(function(imgs){
		var processPromises = imgs.map(function(img, imgIndex){
			return processImg(img, imgIndex, colorList, token);
		});
		Promise.all(processPromises)
		.then(function(){
			zipImages(token, function(){
				def.resolve();
			});
		});
	});
	return def.promise;
};

var processOneImg = function(img, imgIndex, colorIndex, color, token){
	var data, color0, clonedImg, def = new Deferred();
	var tokenDirectory = path.join(UPLOAD_DIR, "/upload_" + token);
	color0 = tinycolor2(color);
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
	clonedImg.write(path.join(tokenDirectory, "new_" + imgIndex + "_" + colorIndex + ".png"), function(){
		def.resolve();
	});
	return def.promise;
};

var processImg = function(img, imgIndex, colorList, token){
	var promises = colorList.map(function(color, colorIndex){
		return processOneImg(img, imgIndex, colorIndex, color, token);
	});
	return Promise.all(promises);
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
	var colorList = [];
	var files = [];
	form.on('file', function(field, file) {
		var fullFilename = path.join(tokenDirectory, "orig_" + files.length + ".png");
		files.push(fullFilename);
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
		processAll(files, colorList, token)
		.then(function(){
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.write(JSON.stringify({"token": token, "numFiles":files.length, "numColors":colorList.length}));
			res.end();
		});
	});
	mkdirp(UPLOAD_DIR, function(err) {
		mkdirp(tokenDirectory, function(err) {
			form.parse(req);
		});
	});
});

app.get('/', function(req, res) {
	app.render(res, "public/src/index.html");
});

app.listen(port, function() {
  console.log("Listening on " + port);
});
