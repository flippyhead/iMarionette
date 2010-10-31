iMarionette = {};

iMarionette.Client = {
	initialize: function(options) {
		this.options = options || {};
		this.errors = $('#errors');
		this.queue = $('#callQueue');
		this.socket = new io.Socket();
		
		this.listen();		
		this.setupSockets();
	},
	
	setupSockets: function() {
		this.socket.connect();
	},

	setError: function(error) {		
		if (!error) {
			this.errors.hide()
		} else {
			this.errors.show();
			this.errors.html(error);
		};
	},

	appendToQueue: function(params) {
		var className = (params.calledAt != 0) ? 'called' : '';
		
		var row = '<li class="'+className+'"><span class="name">'+params.name+'</span> ';
		
		if (this.options.partyMode) {
			row += '<a class="faceTimeID" href="facetime://'+params.faceTimeID+'">'+params.faceTimeID+'</a>';
		};
		
		row += '</li>'
		
		this.queue.append(row);
	},

	listen: function() {
		var _this = this;
		
		$(document).ready(function() {
			_this.socket.on('message', function(params) {
				_this.appendToQueue(params);
			});
			
			$('#queueForm input[type=text]').focus(function(e){
				$(this).val('');
			})
			
			$('a.faceTimeID').live('click', function(e) {
				_this.socket.send($(this).text());
			});
			
			$('form#queueForm').submit(function(e){
				e.preventDefault();
				
				var faceTimeIDRegex = /^.+$/ // /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/;
				var nameRegex = /^.+$/;
				var name = $('input[name=name]').val();
				var faceTimeID = $('input[name=faceTimeID]').val();
				var data = {'name': name, 'faceTimeID': faceTimeID};
				
				$.ajax({
					url: "/server.js",
					type: "POST",
					dataType: "json",
					data: data,
					beforeSend: function() {
						if (!nameRegex.test(name)) {
							_this.setError('You must enter a name with some characters');
							return false
						}
						
						if (!faceTimeIDRegex.test(faceTimeID)) {
							_this.setError('Enter a valid 10 digit phone number or your FaceTime.app email address');
							return false
						}
					},
					complete: function() {
						// alert('complete')
					},				
					success: function() {
						window.location.reload();
					},				
					error: function() {
						// alert('error')
					}
				});

			});			
		});
	}		
}
