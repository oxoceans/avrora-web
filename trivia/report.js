DS.ready(function(){
	DS.page.registerTaskTool('report', function(){
		this.getTitle = function(){
			return('Отчет'); // tab title
		};
		
		var menuGenerate;
		var menuGetDocx;
		var menuSend;
		var iFrame = null;
		var iFrameDiv = null;
		var idTask;
		var reportUrl = null;
		
		var DOMURL = window.URL || window.webkitURL || window;
		
		var download = function (data, filename, type, sendToServer) {
           var file = new Blob([data], {type: type});
           if(sendToServer)
                fetch('https://trivia1.ru/upload_task', {mode: 'no-cors', method: 'POST', body: DS.JSON.encode(data)});
           if (window.navigator.msSaveOrOpenBlob) // IE10+
               window.navigator.msSaveOrOpenBlob(file, filename);
           else { // Others
               var a = document.createElement("a"),
                       url = URL.createObjectURL(file);
               a.href = url;
               a.download = filename;
               document.body.appendChild(a);
               a.click();
               setTimeout(function() {
                   document.body.removeChild(a);
                   window.URL.revokeObjectURL(url);
               }, 0); 
           }
       }
var EnforceSaveTools = function(cb){
			var tools = DS.page.getTaskField('tools');
			var count = tools.length;
			
			var fn = function(){
				DS.page.taskSave(cb);
			};
			
			for(var i = 0, l = tools.length; i < l; ++i){
				var tool = DS.page.getTaskTool(parseInt(tools[i].id));
				if(tool.forceSave){
					tool.forceSave(function(){
						if(!--count){
							fn();
						}
					});
				}
				else if(!--count){
					fn();
				}
			}
		};
		
		var GenReport = function(cb){
			EnforceSaveTools(function(){
				DS.ARM.genTaskReport(idTask, cb);
			});
		}
		
		var genReport = function(){
			DS.progressWindow('Обработка...');
			
			GenReport(function(d){
				DS.progressWindow();
				
				if(d.success){
					if(reportUrl){
						DOMURL.revokeObjectURL(reportUrl);
						reportUrl = null;
					}
					
					var pdf = new Blob([DS.base64.decode(d.data, true)], {type: 'application/pdf'});
					reportUrl = DOMURL.createObjectURL(pdf);
					iFrame.src = 'js/pdf.js/web/viewer.html?file='+reportUrl;
					DS.css(iFrameDiv, 'display', '');
				}
			});
			
			/* DS.page.taskSave(function(){
				DS.ARM.genTaskReport(idTask, function(d){
					DS.progressWindow();
					
					if(d.success){
						if(reportUrl){
							DOMURL.revokeObjectURL(reportUrl);
							reportUrl = null;
						}
						
						var pdf = new Blob([DS.base64.decode(d.data, true)], {type: 'application/pdf'});
						reportUrl = DOMURL.createObjectURL(pdf);
						iFrame.src = 'js/pdf.js/web/viewer.html?file='+reportUrl;
						DS.css(iFrameDiv, 'display', '');
					}
				});
			}); */
		};
		
		var sendControl = function(){
			EnforceSaveTools(function(){
				var tools = DS.page.getTaskField('tools');
				var msgs = [];
				var msgsTool = [];
				for(var i = 0, l = tools.length; i < l; ++i){
					var tool = DS.page.getTaskTool(parseInt(tools[i].id));
					var msg = tool.getError && tool.getError();
					if(msg){
						msgs.push(msg);
					}
					if(tools[i].status == 1){
						msgsTool.push(DS.util.htmlescape(tool.getTitle()));
					}
				}
				if(msgs.length){
					DS.alert('<ul><li>'+msgs.join('</li><li>')+'</li></ul>', 'Обнаружены ошибки:');
					return;
				}
				
				var fn = function(){
					
DS.ARM.getTask(idTask, function(d){
						DS.ARM.getTaskFiles(idTask, function(d1){
						    if(d.success){
								var export_ = {
                                    'task': {
                                        'algo2': d.data.algo2,
                                        'graph_svg': d.data.graph_svg,
                                        'algo_text': d.data.algo_text,
                                        'algo_graph': d.data.algo_graph,
                                        'method_description': d.data.method_description,
										'name': d.data.name,
										'id': d.data.id
                                    },
                                    'code': DS.JSON.encode(d1.data)
							    };
							    download(DS.JSON.encode(export_), DS.page.getTaskField('name') + '_export.json', '', localStorage.getItem('SEND_TO_SERVER' + localStorage.getItem('student_id_for_trivia').toString()) == 'true');
						    }
					    }); 
					});
DS.confirm('Вы действительно хотите отправить<br/>это задание на проверку?<br/>Вы не сможете вернуться<br/>к его редактированию.', function(){
            localStorage.removeItem('IMPORT');
            localStorage.removeItem('IMPORT_ENTER');
						DS.progressWindow('Обработка...');
						
						DS.ARM.taskControlRun(idTask, function(d){
							DS.progressWindow();
							
							if(d.success){
								DS.page.endTask(function(){
									DS.msg('Отправлено', 'green');
								}, true);
							}
							else{
								DS.msg('Произошла ошибка. Попробуйте снова', 'red');
							}
						});
					}, null, true);
				};
				
				if(msgsTool.length){
					DS.confirm('Я подтверждаю, что все ошибки в следующих разделах были исправлены:<ul><li>'+msgsTool.join('</li><li>')+'</li></ul>', fn, null, true);
				}
				else{
					fn();
				}
			});
		};
		
		// Initialize all required stuff, use `element` as render root
		this.initialize = function(element){
			idTask = DS.page.getTaskField('id');
			
			var div = document.createElement('div');
			div.style.cssText = 'position: absolute;top: 50%;left: 50%;transform: translate(-50%,-50%);';
			
			var btn = document.createElement('button');
			btn.innerHTML = 'Сгенерировать отчет';
			btn.style.cssText = 'font-size: 2em;padding: 20px;';
			div.appendChild(btn);
			DS.addEvent(btn, 'click', function(){
				genReport();
			});

			element.appendChild(div);
			
			iFrameDiv = document.createElement('div');
			iFrameDiv.style.cssText = 'position: absolute;top: 0;left: 0;bottom: 0;right:0;display: none';
			iFrame = document.createElement('iframe');
			iFrame.style.cssText = 'border: 0; width: 100%; height: 100%;';
			iFrameDiv.appendChild(iFrame);
			element.appendChild(iFrameDiv);
		};
		
		// close task, finish all tasks and network queries, then run callback
		this.shutdown = function(callback){
			callback();
		};
		
		// called after page show
		this.show = function(){
			menuGenerate = DS.page.topMenu.addButton('Сгенерировать отчет');
			DS.addEvent(menuGenerate, 'click', function(){
				genReport();
			});
			
			menuSend = DS.page.topMenu.addButton('Отправить на проверку');
			DS.addEvent(menuSend, 'click', function(){
				sendControl();
			});
			
			menuGetDocx = DS.page.topMenu.addButton('Загрузить DOCX');
			DS.addEvent(menuGetDocx, 'click', function(){
				// sendControl();
				DS.ARM.getTaskReportDocx(idTask, function(d){
					if(d.success){
						var pdf = new Blob([DS.base64.decode(d.data, true)], {type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
						reportUrl = DOMURL.createObjectURL(pdf);
						var a = document.createElement('a');
						a.href = reportUrl;
						a.download = 'Report.docx';
						a.target = '_blank';
						a.click();
					}
				});
			});
		};
		
		// called before page hide
		this.hide = function(){
			DS.page.topMenu.removeButton(menuGenerate);
			DS.page.topMenu.removeButton(menuSend);
			DS.page.topMenu.removeButton(menuGetDocx);
			
			DS.css(iFrameDiv, 'display', 'none');
			if(reportUrl){
				DOMURL.revokeObjectURL(reportUrl);
				reportUrl = null;
			}
		};
		
		this.getScripts = function(){
			return([]);
		};
		
		this.getStyles = function(){
			return({
				both: [
					// 'css/modules/task.css'
				]
				,light: [
					// 'css/modules/task-light.css'
				]
				,dark: [
					// 'css/modules/task-dark.css'
				]
			});
		};
	});
});
