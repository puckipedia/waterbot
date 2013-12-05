/* Waterbot -- Module "gci-info"
 * Get lots of info with few text!
 *
 * Copyright 2013 :Puckipedia.
 * Licensed under the MIT license.
 *
 */

var http = require("http");
var cheerio = require ("cheerio");

exports.shouldRun = function(msg, configObj) {
  console.log(configObj);
  return msg.indexOf(configObj.gcikeyword) != -1;
};

function getData(organisation, limit, callback) {
	http.request({
		hostname: 'www.google-melange.com',
		port: 80,
		path: '/gci/org/google/gci2013/'+organisation+'?fmt=json&limit='+limit+'&idx=1',
		method: 'GET'
	}, function(res) {
		var d = "";
		res.on("data", function(a) {
			d += a;
		});
		res.on("end", function() {
			var data = JSON.parse(d);
			var da = [];
			data = data.data[""];
			for(var i in data) {
				var obj = new Object();
				obj.key = data[i].columns.key;
				obj.student = data[i].columns.student;
				obj.types = data[i].columns.types;
				obj.title = data[i].columns.title;
				da.push(obj);
			}
			callback(da);
		});
	}).end();
}
function sortstring(a, b) {
    a = a.key.toLowerCase();
    b = b.key.toLowerCase();
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
}
function parseTask(task) {
	task.toString = function() {
		return task.title;
	}
	return task;
}
var dataModifiers = {
	tasks: function(data, modifiers) {
		return data.map(function(a) {return {key: a.key, value: [parseTask(a)]}}).slice(0, parseInt(modifiers.parsed.limit));
	},
	users: function(data, modifiers) {
		var users = {};
		for(var taski in data) {
			if(users[data[taski].student] == undefined)
				users[data[taski].student] = [];
			users[data[taski].student].push(parseTask(data[taski]));
		}
		var userl = [];
		for(var useri in users) {
			userl.push({key: useri, value: users[useri]})
		}
		return userl.slice(0, parseInt(modifiers.parsed.limit));
	}
}
var mods = {
	select: {
		"_order": 1,
		length: function(data, modifiers) {
			var dat = dataModifiers[modifiers.parsed.of](data, modifiers);
			return dat.map(function(val) {
				return {key: val.key, value: [val.value.length]};
			});
		},
		"*": function(data, modifiers) {
			return dataModifiers[modifiers.parsed.of](data, modifiers);
		}
	},
	orderby: {
		"_order": 2,
		"value-asc": function(data, modifiers) {
			return data.sort(function(a,b) {
				return a.value - b.value;
			});
		},
		"value-desc": function(data, modifiers) {
			return data.sort(function(a,b) {
				return b.value - a.value;
			});
		},
		"count-asc": function(data, modifiers) {
			return data.sort(function(a, b) {
				return a.value.length - b.value.length;
			});
		},
		"count-desc": function(data, modifiers) {
			return data.sort(function(a, b) {
				return b.value.length - a.value.length;
			});
		},
		"key": function(data, modifiers) {
			return data.sort(sortstring);
		}
	}
};
function parse(text, keyword, say, callback) {
	var splits = text.split(" ");
	var startSplit = -1;
	for(var i in splits) {
		if(splits[i] == keyword) {
			startSplit = i+1;
			break;
		}
	}
	if(startSplit == -1)
		return {};
	splits = splits.slice(startSplit);
	if(splits[0] == "info") {
		var Table = require("cli-table");
		var tb = new Table();
		for(var modi in mods) {
			var first = true;
			for(var funi in mods[modi]) {
				if(funi == "_order")
					continue;
				tb.push([first ? modi : "", funi]);
				first = false;
			}
		}
		var lines = tb.toString().split("\n");
		for(var i in lines) {
			say(lines[i]);
		}
		return;
	}
	var info = {parsed: {}};
	var key = "";
	for(var i in splits) {
		if(key == "") {
			key = splits[i];
		} else {
			if(mods[key] != undefined && mods[key][splits[i]] != undefined)
				info[key] = mods[key][splits[i]];
			info.parsed[key] = splits[i];
			key = "";
		}
	}
	var count = 0;
	var keyType = {};
	for(var i in info) {
		if(i != "parsed") {
			keyType[mods[i]["_order"]] = info[i];
			var order = mods[i]["_order"];
			if(order > count)
				count = order;
		}
	}
	getData("haiku", 1000, function(data) {
		var logData = [{type: "orig", data: data}];
		for(var i = 0; i <= count; i++) {
			if(keyType[i+""] != undefined) {
				data = keyType[i+""](data, info);
				logData.push({type: keyType[i+""], data: data});
			}
		}
		callback({
			modifiers: info,
			data: data });
	});
}

exports.run = function(from, msg, channel, topic, bot, nick, configObj) {
	var say = function(text) {bot.say(channel, text)}
	parse(msg, configObj.gcikeyword, say, function(data) {
		say("key: value");
		var da = data.data.map(function(a) {
			return a.key+": "+(a.value.map(function(b){
						return b.toString()
					}).join(", "));
		});
		for(var i in da) {
			say(da[i]);
		}
	});
};
