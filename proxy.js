DS.ready(function(){
    DS.msg("Методы переопределены", "green")
	// var ArmUserId = DS.util.urlParam('ArmUserId');
	// ARMconfig.isDebugMode = ArmUserId == '' || DS.util.urlParam('isDebug');
	// ARMconfig.userId = ArmUserId || 10;
	// ARMconfig.userId = ArmUserId || 25;
	// ARMconfig.groupId = 1;
	
	// if(DS.util.urlParam('isDPC')){
		// ARMconfig.serverHost = ARMconfig.serverHostDPC;
		// DS.config.websocket.registry_url = (ARMconfig.serverSecure ? 'wss' : 'ws')+'://'+ARMconfig.serverHost+':'+ARMconfig.serverPort+'/';
	// }
	// else if(DS.util.urlParam('isLocal')){
		// ARMconfig.serverHost = ARMconfig.serverHostLocal;
		// DS.config.websocket.registry_url = (ARMconfig.serverSecure ? 'wss' : 'ws')+'://'+ARMconfig.serverHost+':'+ARMconfig.serverPort+'/';
	// }
	// if(DS.util.urlParam('isProxy')){
		// ARMconfig.serverPort = 55566;
		// DS.config.websocket.registry_url = (ARMconfig.serverSecure ? 'wss' : 'ws')+'://'+ARMconfig.serverHost+':'+ARMconfig.serverPort+'/';
	// }
	
	var authUserPassword = null;
	
	DS.util.websocket.init(function(){
		if(ARMconfig.userId && authUserPassword){
			DS.ARM.authorize(ARMconfig.userId, authUserPassword, function(d){
				if(d.success){
					DS.invokeEvent('arm/authorized', d);
				}
			});
		}
	});
	
	// var _isAuthorized = false;
	
	
	DS.pg_quote = function(str){
		return("'"+str.toString().split("'").join("''")+"'");
	};
	
	DS.ARM = {};
	
	// Unauthorized commands:
	DS.ARM.getAuthGroupList = function(institute_id, course, cb){
		DS.armCmd('getAuthGroupList', {
			institute_id: institute_id
			,course: course
		}, cb);
	};
	
	DS.ARM.getAuthInstituteList = function(cb){
		DS.armCmd('getAuthInstituteList', {}, cb);
	};
	
	DS.ARM.getAuthUserList = function(idGroup, cb){
		DS.armCmd('getAuthUserList', idGroup, cb);
	};
	
	DS.ARM.getArmVersion = function(cb){
		DS.armCmd('getStudentArmVersion', {}, cb);
	};
	
	var _clgGen = 0;
	DS.ARM.authorize = function(idUser, password, cb){
		DS.armCmd('newChallenge', {}, function(d){
			if(d.success){

				var fn = function(h){
					DS.armCmd('authorize', {
						user_id: idUser
						,password: password
						,key: h
						,gen: _clgGen
						,g2a: (window.g2a || localStorage.institute_id) ? 1 : 0
					}, function(d){
						if(d.success){
							ARMconfig.userId = idUser;
							authUserPassword = password;
		
							DS.util.setTitle(d.student.group_name+' - '+d.student.student_suname+' '+d.student.student_name+' '+d.student.student_patronymic, true)
							// _isAuthorized = true;
						}
						cb(d);
					});
				};
				
				var hash = CryptoJS.MD5(_clgGen+'_'+password+'_'+d.data).toString();
				console.warn(hash);
				if(DS.ArmAPI){
					var t = setTimeout(function(){
						fn('timeout');
					}, 10000);
					try{
						// console.error('signRequest');
						DS.ArmAPI.signRequest(idUser, hash, function(d){
							fn(d);
							clearTimeout(t);
						});
					}
					catch(e){
						fn(e.toString());
						clearTimeout(t);
					}
				}
				else{
                    data = {
                      userId: idUser,
                      hash: hash
                    };
                    
                    fetch("http://localhost:8080/bridge", {
                      method: "POST",
                      body: JSON.stringify(data)
                    })
                      .then(response => {
                        return response.json();
                      })
                      .then(data => {
                        if (data.error) {
                            DS.msg(`Не удалось авторизоваться через ARM_Bridge: ${data.error}`, 'red')
                        } else {
                            fn(data.key);
                        }
                      })
				}
				return;
			}
			
			cb(d);
		});
	};

	// Authorized commands:
	DS.ARM.loadUserPreferences = function(cb){
		DS.armCmd('loadUserPreferences', {}, cb);
	};
	
	DS.ARM.saveUserPreferences = function(data, cb){
		DS.armCmd('saveUserPreferences', data, cb);
	};
	
	DS.ARM.changePassword = function(oldPassword, newPassword, cb){
		DS.armCmd('changePassword', {
			old_password: oldPassword
			,user_password: newPassword
		}, function(d){
			if(d.success){
				authUserPassword = newPassword;
			}
			cb(d);
		});
	};
	
	// Module 'task' commands:
	DS.ARM.getTaskTypes = function(cb){
		DS.armCmd('getTaskTypes', {}, cb);
	};
	
	DS.ARM.getSubjectList = function(cb){
		DS.armCmd('getSubjectList', {}, cb);
	};
	
	DS.ARM.getTaskToolsList = function(cb){
		DS.armCmd('getTaskToolsList', {}, cb);
	};
	
	DS.ARM.getTaskList = function(cb){
		DS.armCmd('getTaskList', {}, cb);
	};
	
	/*
	tool status:
		0: initial
		1: invalid
	*/
	
	DS.ARM.getTask = function(idTask, cb){
		DS.armCmd('getTask', idTask, cb);
	};
	
	DS.ARM.getTaskReport = function(idTask, cb){
		DS.armCmd('getTaskReport', idTask, cb);
	};
	
	DS.ARM.saveTask = function(data, cb){
		DS.armCmd('saveTask', data, function(d){
			if(d.success){
				try{
					var key = 'task_'+data.id;
					localStorage.removeItem(key);
				}
				catch(e){
					console.error(e);
				}
			}
			
			cb(d);
		});
	};
	
	DS.ARM.getTaskFiles = function(idTask, cb){
		DS.armCmd('getTaskFiles2', idTask, function(d){
			if(d.success){
				var log = [];
				try{
					var key = 'files_'+idTask;
					var data = DS.JSON.decode(localStorage.getItem(key) || '{}');
					log.push(DS.JSON.encode(d.data));
					for(var i in data){
						log.push('='+i+';');
						for(var j = 0, jl = d.data.length; j < jl; ++j){
							log.push('+'+j+';');
							if(d.data[j].name == i){
								if(d.data[j].file != data[i]){
									d.data.push({name: i+'.bak', file: data[i]});
								}
								break;
							}
						}
					}
				}
				catch(e){
					DS.ARM.logError('2: '+e.toString()+'; '+log.join("\n"));
					console.error(e);
				}
			}
			// console.error(d);
			cb(d);
		});
	};
	
	DS.ARM.renameTaskFile = function(idTask, oldName, newName, cb){
		DS.armCmd('renameTaskFile', {
			idTask: idTask
			,oldName: oldName
			,newName: newName
		}, cb);
	};
	
	DS.ARM.removeTaskFile = function(idTask, name, cb){
		DS.armCmd('removeTaskFile', {
			idTask: idTask
			,name: name
		}, cb);
	};
	
	var _addCachedFile = function(idTask, name, file){
		var key = 'files_'+idTask;
		var data = DS.JSON.decode(localStorage.getItem(key) || '{}');
		data[name] = file;
		try{
			localStorage.setItem(key, DS.JSON.encode(data));
		}
		catch(e){
			console.error(e);
		}
	};
	var _removeCachedFile = function(idTask, name){
		var key = 'files_'+idTask;
		var data = DS.JSON.decode(localStorage.getItem(key) || '{}');
		delete(data[name]);
		try{
			localStorage.setItem(key, DS.JSON.encode(data));
		}
		catch(e){
			console.error(e);
		}
	};
	
	DS.ARM.saveTaskFile = function(idTask, name, file, cb){
		_addCachedFile(idTask, name, file);
		DS.armCmd('saveTaskFile', {
			idTask: idTask
			,name: name
			,file: file
		}, function(d){
			if(d.success){
				_removeCachedFile(idTask, name);
			}
			cb(d);
		});
	};
	
	
	var _testsNextId = 1238;
	var _tests = [
		{
			rowid: 1234
			,test_comment: 'comментарий'
			,test_input_data: '27\n14'
			,test_output_data: '    1    2    3'
		}
		,{
			rowid: 1237
			,test_comment: ''
			,test_input_data: '11 23'
			,test_output_data: '   23   11'
		}
	];
	DS.ARM.getTaskTests = function(idTask, cb){
		DS.armCmd('getTaskTests', idTask, cb);
	};
	
	// test = {test_input_data, test_output_data, test_comment}
	DS.ARM.addTaskTest = function(idTask, test, cb){
		DS.armCmd('addTaskTest', {
			idTask: idTask
			,test: test
		}, cb);
	};
	
	// test = {test_input_data, test_output_data, test_comment}
	DS.ARM.editTaskTest = function(idTask, idTest, test, cb){
		DS.armCmd('editTaskTest', {
			idTask: idTask
			,idTest: idTest
			,test: test
		}, cb);
	};
	
	DS.ARM.runTaskTests = function(idTask, cb){
		DS.armCmd('runTaskTests', idTask, cb);
	};
	DS.ARM.runTaskWithInput = function(idTask, input, cb){
		DS.armCmd('runTaskWithInput', {idTask: idTask, input: input}, cb);
	};
	
	DS.ARM.genTaskReport = function(idTask, cb){
		DS.armCmd('genTaskReport', idTask, cb);
	};
	
	DS.ARM.taskControlRun = function(idTask, cb){
		DS.armCmd('taskControlRun', idTask, cb);
	};
	
	
	// Module 'test' commands:
	
	DS.ARM.getTest = function(idTest, cb){
		DS.armCmd('getTest', idTest, cb);
	};
	
	/*
	{
		test_id: 2
		,challenge: 1241241
		,time_started: 1424124157
		,answers: { 
			// teacher_question_task_fragment:question_answer_id
			1: 2,
			2: 3,
			3: 3
		}
	}
	*/
	DS.ARM.doneTest = function(data, cb){
		DS.armCmd('doneTest', data, cb);
	};
	
	DS.ARM.getTestsGroupList = function(cb){
		DS.armCmd('getTestsGroupList', {}, cb);
	};
	DS.ARM.getTaskTheory = function(id, cb){
		DS.armCmd('getTaskTheory', id, cb);
	};
	
	DS.ARM.getTestsList = function(idGroup, cb){
		DS.armCmd('getTestsList', idGroup, cb);
	};
	
	DS.ARM.getActiveTest = function(cb){
		DS.armCmd('getActiveTest', {}, cb);
	};
	
	DS.ARM.getCurrentTeacherId = function(cb){
		DS.armCmd('getCurrentTeacherId', {}, cb);
	};
	
	DS.ARM.addChatMessage = function(message, cb){
		DS.armCmd('addChatMessage', message, cb);
	};
	
	DS.ARM.loadChatSince = function(startTime, cb){
		DS.armCmd('loadChatSince', startTime, cb);
	};
	
	DS.ARM.loadChatPrevN = function(numToLoad, firstId, cb){
		DS.armCmd('loadChatPrevN', {count: numToLoad, first_id: firstId}, cb);
	};
	
	DS.ARM.addChatMessageStream = function(message, cb){
		DS.armCmd('addChatMessageStream', message, cb);
	};
	
	DS.ARM.loadChatSinceStream = function(startTime, cb){
		DS.armCmd('loadChatSinceStream', startTime, cb);
	};
	
	DS.ARM.loadChatPrevNStream = function(numToLoad, firstId, cb){
		DS.armCmd('loadChatPrevNStream', {count: numToLoad, first_id: firstId}, cb);
	};
	
	DS.ARM.getAttachmentInfo = function(idAttach, cb){
		DS.armCmd('getAttachmentInfo', idAttach, cb);
	};
	
	DS.ARM.loadNews = function(numToLoad, offset, cb){
		DS.armCmd('loadNews', {count: numToLoad, offset: offset}, cb);
	};
	
	DS.ARM.getListAttachments = function(cb){
		DS.armCmd('getListAttachments', {}, cb);
	};

	DS.ARM.getComissionCount = function(cb){
		DS.armCmd('getComissionCount', {}, cb);
	};

	DS.ARM.joinComission = function(cb){
		DS.armCmd('joinComission', {}, cb);
	};

	DS.ARM.getComissionQueueLength = function(cb){
		DS.armCmd('getComissionQueueLength', {}, cb);
	};
	
	DS.ARM.getComissionDetails = function(cb){
		DS.armCmd('getComissionDetailsStudent', {}, cb);
	};
	
	DS.ARM.getComissionStreamInfo = function(origin, cb){
		DS.armCmd('getComissionStreamInfoStudent', origin, cb);
	};

	DS.ARM.getLessonStreamInfo = function(origin, cb){
		DS.armCmd('getLessonStreamInfoStudent', origin, cb);
	};

	DS.ARM.newLessonStreamToken = function(cb){
		DS.armCmd('newLessonStreamTokenStudent', {}, cb);
	};

	DS.ARM.checkForLessonStream = function(cb){
		DS.armCmd('checkForLessonStreamStudent', {}, cb);
	};

	DS.ARM.sendKBE = function(data, cb){
		DS.armCmd('sendKBE', data, cb);
	};

	DS.ARM.buildSchemeFromAlgo2 = function(idTask, cb){
		DS.armCmd('buildSchemeFromAlgo2', idTask, cb);
	};
	
	DS.ARM.logError = function(err, cb){
		DS.armCmd('logError', err, cb);
	};

	DS.ARM.getNews = function(id, cb){
		DS.armCmd('getStudentNews', id, cb);
	};

	DS.ARM.getNewsSince = function(id, cb){
		DS.armCmd('getStudentNewsSince', id, cb);
	};

	DS.ARM.debugStart = function(idTask, breakPoints, cb){
		DS.armCmd('debugStart', {idTask: idTask, breakPoints: breakPoints}, cb);
	};

	DS.ARM.debugStartWithInput = function(idTask, sInput, cb){
		DS.armCmd('debugStart', {idTask: idTask, sInput: sInput}, cb);
	};
	
	DS.ARM.debugEnd = function(cb){
		DS.armCmd('debugEnd', {}, cb);
	};
	
	DS.ARM.debugContinue = function(cb){
		DS.armCmd('debugAction', 'continue', cb);
	};
	
	DS.ARM.debugNext = function(cb){
		DS.armCmd('debugAction', 'next', cb);
	};
	
	DS.ARM.debugStep = function(cb){
		DS.armCmd('debugAction', 'step', cb);
	};
	
	DS.ARM.debugFinish = function(cb){
		DS.armCmd('debugAction', 'finish', cb);
	};
	
	DS.ARM.debugInterrupt = function(cb){
		DS.armCmd('debugAction', 'interrupt', cb);
	};
	
	DS.ARM.debugInput = function(line, cb){
		DS.armCmd('debugInput', line, cb);
	};
	
	DS.ARM.debugListBreakpoints = function(cb){
		DS.armCmd('debugListBreakpoints', {}, cb);
	};
	
	DS.ARM.debugToggleBreakpoint = function(file, line, cb){
		DS.armCmd('debugToggleBreakpoint', {file, line}, cb);
	};
	
	DS.ARM.debugEvalExpression = function(expr, cb){
		DS.armCmd('debugEvalExpression', expr, cb);
	};
	
	DS.ARM.getCodeLint = function(idTask, fileName, files, cb){
		DS.armCmd('getCodeLint', {idTask: idTask, fileName: fileName, files: files}, cb);
	};
	
	DS.ARM.getTaskReportDocx = function(idTask, cb){
		DS.armCmd('getTaskReportDocx', idTask, cb);
	};
	
	DS.ARM.getAvailableCourseWorks = function(cb){
		DS.armCmd('shouldSelectCourseWork', {}, cb);
	};
	
	DS.ARM.getCourseWorkOptions = function(idCourse, cb){
		DS.armCmd('getCourseWorkOptions', idCourse, cb);
	};
	
	DS.ARM.selectCourseWork = function(idCourse, idTask, cb){
		DS.armCmd('selectCourseWork', {course_id: idCourse, task_id: idTask}, cb);
	};
});
