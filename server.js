iMarionette = {};

Array.prototype.compact = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

iMarionette.Util = {
	url: require("url"),
	
	parsePostParams: function(query) {
		return this.url.parse("http://stubbed?"+query, true).query;
	}
}

iMarionette.Redis = {
	redis: require("/usr/local/lib/node/redis"),

	initialize: function() {
		this.client = this.redis.createClient();
		this.listKey = this.key('callQueue');
		
		this.client.on("error", function (err) {
			console.log("Redis connection error: " + err);
		});				
	},
	
	addToCallQueue: function(params) {		
		var value = params.faceTimeID;
		var now = (new Date()).getTime();
		this.client.zadd(this.listKey, now, value);
		return true;
	},
	
	getCallQueue: function(processData) {
		this.client.zrange(this.listKey, 0, -1, processData);
	},
	
	addHash: function(hashKey, json) {
		for(key in json) {
			var value = json[key];
			this.client.hset(hashKey, key, value);
		}
	},
	
	addReceiver: function(params) {
		var hashKey = this.key('receiver', params.faceTimeID);
		this.addHash(hashKey, params);
	},
	
	getReceiver: function(id, processData) {
		var hashKey = this.key('receiver', id);			
		this.client.hgetall(hashKey, processData);
	},
	
	unbuffer: function(params) {
		return {'name': params.name+'', 'faceTimeID': params.faceTimeID+''};
	},
	
	key: function(part1, part2) {
		return ['iMarionette', part1, part2].compact().join(':');
	}
}

var sys = require("sys"),  
		http = require("http"),  
		url = require("url"),  
		path = require("path"),  
		io = require('./socket.io'),
		fs = require("fs");
		
var server = http.createServer(function (request, response) {
	var requestParams = url.parse(request.url, true);
	var uri = requestParams.pathname;
	var params = requestParams.query;	
	
	if (request.method == 'POST') {
		request.on('data', function(data){			
			var params = iMarionette.Util.parsePostParams(data);
			iMarionette.Redis.addReceiver(params);
			iMarionette.Redis.addToCallQueue(params);
		});
		
		response.writeHead(200);
		response.write('{}');
		response.end();
				
	} else {				
		if (uri == '/') {uri = '/index.html'};
		if (uri == '/party') {uri = '/party.html'};
		
		var filename = path.join(process.cwd(), uri);
		
		path.exists(filename, function(exists) {  		
			if(!exists) {  
				response.writeHead(404, {"Content-Type": "text/plain"});  
				response.write("404 Not Found\n");  
				response.end();  
				return;  
			}  

			fs.readFile(filename, "binary", function(err, file) {

				if (err) {  
					response.writeHead(500, {"Content-Type": "text/plain"});  
					response.write(err + "\n");  
					response.end();  
					return;  
				}

				response.writeHead(200);
				response.write(file, "binary");
				response.end();
			});  
		});
	}	
});

server.listen(80);

var socket = io.listen(server); 

socket.on('connection', function(client) {	
	client.broadcast({announcement: client.sessionId + ' connected'});
	
	iMarionette.Redis.getCallQueue(function(err, faceTimeIDs) {
   	faceTimeIDs.forEach(function(faceTimeID, i) {
			iMarionette.Redis.getReceiver(faceTimeID, function (err, s) {
				client.send(iMarionette.Redis.unbuffer(s));
			});
   	});		
	});	
	
	
});

iMarionette.Redis.initialize();

sys.puts("iMarionette server started on port 80...")