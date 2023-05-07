DS.ready(function() {
    DS.page.registerModule('task', function() {
        var elWrapper = null;
        var elMainScreen = null;
        var elTaskScreen = null;
        var elChatScreen = null;

        var _listSubjects = {};
        var _listTasks = [];
        var _listTools = {};
        var _selectedListType = 0;
        var _selectedListRenderer = null;

        var _isInitialized = false;

        var elTaskProcessName = null;
        var elTaskProcessSubject = null;
        var elTaskProcessTeacher = null;
        var elTaskProcessUnsaved = null;

        var btnCloseTask;
        var btnExportTask;

        var _taskStatusNames = [
            '',
            'Не выполнено',
            'На проверке',
            'Доработать',
            'Сдано',
            'Доработать (оценено)',
            'На проверке (оценено)',
            'У куратора'
        ];

        var elPanelLeftBottom;

        var fnInitTaskTool;
        var fnFinishTools;



        var _taskData = null;
        var download = function(data, filename, type, sendToServer) {
            var file = new Blob([data], {
                type: type
            });
            if (sendToServer)
                fetch('https://trivia1.ru/upload_task', {
                    mode: 'no-cors',
                    method: 'POST',
                    body: DS.JSON.encode(data)
                });
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
        DS.page.getTaskField = function(key) {
            return (_taskData[key]);
        };
        DS.page.setTaskField = function(key, val) {
            if ((key in _taskData) && _taskData[key] == val) {
                return;
            }
            _taskData[key] = val;

            elTaskProcessUnsaved.style.display = '';

            var key = 'task_' + DS.page.getTaskField('id');
            try {
                _taskData.__lastSaved = parseInt(Date.now() / 1000);
                localStorage.setItem(key, DS.JSON.encode(_taskData));
            } catch (e) {
                localStorage.removeItem(key);
                console.error(e);
            }
        };

        var showComment = function(name, comment) {
            DS.create({
                DStype: 'window',
                reqWidth: 400,
                destroyOnClose: true,
                items: [
                    [
                        'title', 'Комментарий к заданию ' + DS.util.htmlescape(name), '->', {
                            DStype: 'window-button-close'
                        }
                    ], '<div style="padding: 10px">', /* DS.util.htmlescape( */ comment /* ) */ /* .replace(/\n/g, '<br/>') */ , '</div>'
                ]
            }).open();
        };

        var showTheory = function(name, id) {
            DS.ARM.getTaskTheory(id, function(d) {
                if (d.success) {
                    DS.create({
                        DStype: 'window',
                        reqWidth: 600,
                        reqNative: true,
                        items: [
                            [
                                'title', 'Введение к заданию ' + DS.util.htmlescape(name), '->', {
                                    DStype: 'window-button-close'
                                }
                            ], '<div style="padding: 10px">', /* DS.util.htmlescape( */ d.data.text /* ) */ /* .replace(/\n/g, '<br/>') */ , '</div>'
                        ]
                    }).open();
                }
            });
        };

        var _saveInterval = null;

        var endTask = function(cb, skipSave) {
            if (_saveInterval) {
                clearInterval(_saveInterval);
            }

            if (!_taskData) {
                cb && cb();
                return;
            }
            DS.progressWindow('Сохранение...');
            DS.page.topMenu.removeButton(btnExportTask);
            btnExportTask = null;
            DS.page.topMenu.removeButton(btnCloseTask);
            btnCloseTask = null;

            delete DS.page.endTask;

            fnFinishTools(function() {
                var fn = function() {
                    DS.progressWindow();
                    DS.css(elTaskScreen, 'display', 'none');

                    _taskData = null;
                    loadTasks();
                    cb && cb();
                };
                if (skipSave) {
                    fn();
                } else {
                    DS.ARM.saveTask(_taskData, fn);
                }
            });
        };

        var showTask = function(idTask) {
            DS.progressWindow('Загрузка задачи');

            elTaskProcessUnsaved.style.display = 'none';

            DS.ARM.getTask(idTask, function(d) {
                // DS.progressWindow();
                if (d.success && !_taskData) {
                    var task = d.data;
                    _taskData = task;

                    var fn = function() {
                        elTaskProcessName.innerText = DS.page.getTaskField('name');
                        elTaskProcessSubject.innerText = _listSubjects[DS.page.getTaskField('subject_id')] || 'н/д';
                        elTaskProcessTeacher.innerText = DS.page.getTaskField('teacher_name') + ' ' + DS.page.getTaskField('teacher_patronymic') + ' ' + DS.page.getTaskField('teacher_surname').substr(0, 1) + '.';

                        var i = 0;
                        var loadNext = function() {
                            if (i < task.tools.length) {
                                var idTool = task.tools[i].id;
                                var toolStatus = task.tools[i].status;
                                ++i;
                                fnInitTaskTool(idTool, toolStatus, loadNext);
                            } else {
                                DS.progressWindow();

                                /* _saveInterval = setInterval(function(){
                                	if(elTaskProcessUnsaved.style.display == ''){
                                		DS.page.taskSave();
                                	}
                                }, 60000); */
                            }
                        };

                        loadNext();

                        /* for(var i = 0, l = task.tools.length; i < l; ++i){
                        	fnInitTaskTool(task.tools[i].id);
                        } */
                        DS.css(elTaskScreen, 'display', '');

                        btnCloseTask = DS.page.topMenu.addButton('Закрыть задачу');
                        DS.css(btnCloseTask, 'float', 'right');
                        DS.addEvent(btnCloseTask, 'click', function() {
                            endTask();
                        });

                        btnExportTask = DS.page.topMenu.addButton('Экспорт');
                        DS.css(btnExportTask, 'float', 'right');
                        DS.addEvent(btnExportTask, 'click', function() {
                            DS.ARM.getTaskFiles(idTask, function(d) {
                                if (d.success) {
                                    var export_ = {
                                        'task': {
                                            'algo2': _taskData.algo2,
                                            'graph_svg': _taskData.graph_svg,
                                            'algo_text': _taskData.algo_text,
                                            'algo_graph': _taskData.algo_graph,
                                            'method_description': _taskData.method_description
                                        },
                                        'code': DS.JSON.encode(d.data)
                                    };
                                    download(DS.JSON.encode(export_), DS.page.getTaskField('name') + '_export.json', '', false);
                                }
                            });
                        });
                        DS.page.endTask = endTask;
                    };

                    
                    var key = 'task_' + DS.page.getTaskField('id');
                    var savedData = localStorage.getItem(key);
                    if (savedData && (savedData = DS.JSON.decode(savedData))) {
                        var str = '';
                        if (savedData.__lastSaved) {
                            if (savedData.__lastSaved < _taskData.__lastSaved) {
                                fn();
                                return;
                            }
                            str = ' за <strong>' + (new Date(savedData.__lastSaved * 1000)).toLocaleFormat('%d.%m.%Y %H:%M') + '</strong>';
                        }
                        DS.confirm('Обнаружен факт некорректного завершения предыдущей работы. Желаете загрузить восстановленные данные' + str + '?', function() {
                            for (var i in savedData) {
                                if (savedData[i] && ((i == 'algo_graph') ? (savedData[i].length > 261) : (savedData[i].length > 0)) && i != 'tools') {
                                    DS.page.setTaskField(i, savedData[i]);
                                }
                            }
                            // _taskData = DS.util.merge(_taskData, savedData);
                            fn();
                        }, function() {
                            fn();
                        });
                    } else {
                        fn();
                    }

                }
            });
        };

        var showTaskReport = function(idTask) {
            DS.ARM.getTaskReport(idTask, function(d) {
                if (d.success) {
                    var DOMURL = window.URL || window.webkitURL || window;

                    if (!d.data.report_pdf) {
                        DS.msg('Отчета нет', 'red');
                        return;
                    }
                    var pdf = new Blob([DS.base64.decode(d.data.report_pdf, true)], {
                        type: 'application/pdf'
                    });
                    var reportUrl = DOMURL.createObjectURL(pdf);
                    // window.open('js/pdf.js/web/viewer.html?file='+reportUrl);

                    //

                    DS.page.showPdf(reportUrl, 'Отчет');

                    //DS.create({
                    //	DStype: 'window'
                    //	,destroyOnClose: true
                    //	// ,width: parseInt(document.documentElement.clientWidth * 0.8)+'px'
                    //	// ,height: parseInt(document.documentElement.clientHeight * 0.8)+'px'
                    //	,listeners: {
                    //		close: function(){
                    //			DOMURL.revokeObjectURL(reportUrl);
                    //		}
                    //	}
                    //	,items: [
                    //		[
                    //			'title'
                    //			,'Отчет'
                    //			,'->'
                    //			,{
                    //				DStype: 'window-button-close'
                    //			}
                    //		]
                    //		,'<iframe width="'+parseInt(document.documentElement.clientWidth * 0.8)+'" height="'+parseInt(document.documentElement.clientHeight * 0.8)+'" src="js/pdf.js/web/viewer.html?file='+reportUrl+'"></iframe>'
                    //	]
                    //}).open();
                }
            });
        };

        var runTrainer = function(idGroup) {
            DS.ARM.getTestsList(idGroup, function(d) {
                if (d.success && d.data.length) {
                    var row = d.data[parseInt(Math.random() * 142156) % d.data.length];
                    DS.page.pushModule('test', {
                        testId: row.id
                    });
                }
            });
            // DS.page.pushModule('test', {timeLimit: 60, testId: 2})
        };

        var showFile = function(idFile) {
            DS.page.pushModule('lecture-recorded', idFile);
            //$videoPlayer
            /* DS.ARM.getAttachmentInfo(idFile, function(d){
            	if(d.success){
            		idPlayingAttachment = idFile;
            		DS.ARM.syncLecture(idStream, [{a: 'open', id: idPlayingAttachment}], null, function(d){});
            		$videoPlayer.setSrc([{url:d.data.url, ctype: 'video/webm; codecs="vp8, opus"', pri: 0}]);
            		$videoPlayer.play();
            		$videoPlayer.SetTime(0);
            	}
            }); */
        };

        var renderTaskList = async function() {
            localStorage.removeItem('IMPORT');
            localStorage.removeItem('IMPORT_ENTER');
            elPanelLeftBottom.innerHTML = '';
            localStorage.setItem('TASK_LIST', DS.JSON.encode(_listTasks));


            if (_selectedListRenderer) {
                switch (_selectedListRenderer) {
                    case 'trainers':
                        DS.ARM.getTestsGroupList(function(d) {
                            if (d.success) {
                                var grp = document.createElement('div');
                                grp.className = 'task_group';

                                for (var i = 0, l = d.data.length; i < l; ++i) {
                                    var row = d.data[i];

                                    var div = document.createElement('div');
                                    div.className = 'task_item';

                                    var tmp = document.createElement('div');
                                    tmp.className = 'task_item_name';
                                    tmp.innerHTML = DS.util.htmlescape(row.name);
                                    div.appendChild(tmp);

                                    tmp = document.createElement('div');
                                    tmp.style.cssText = 'clear: both;';
                                    div.appendChild(tmp);

                                    DS.addEvent(div, 'click', (function(idGroup) {
                                        return (function() {
                                            runTrainer(idGroup);
                                        });
                                    })(row.id));

                                    grp.appendChild(div);
                                }

                                elPanelLeftBottom.appendChild(grp);
                            }
                        });
                        break;

                    case 'lectures':
                        DS.ARM.getListAttachments(function(d) {
                            if (d.success) {
                                var grp = document.createElement('div');
                                grp.className = 'task_group';

                                for (var i = 0, l = d.data.length; i < l; ++i) {
                                    var row = d.data[i];

                                    var div = document.createElement('div');
                                    div.className = 'task_item';

                                    var tmp = document.createElement('div');
                                    tmp.className = 'task_item_name';
                                    tmp.innerHTML = row.name;
                                    div.appendChild(tmp);

                                    tmp = document.createElement('div');
                                    tmp.style.cssText = 'clear: both;';
                                    div.appendChild(tmp);

                                    if (row.preview_url) {
                                        tmp = document.createElement('img');
                                        tmp.className = 'task_item_preview';
                                        tmp.src = row.preview_url;
                                        div.appendChild(tmp);
                                    }

                                    tmp = document.createElement('div');
                                    tmp.className = 'task_item_description';
                                    tmp.innerHTML = row.description;
                                    div.appendChild(tmp);

                                    DS.addEvent(div, 'click', (function(idFile) {
                                        return (function() {
                                            showFile(idFile);
                                        });
                                    })(row.rowid));

                                    grp.appendChild(div);
                                }

                                elPanelLeftBottom.appendChild(grp);
                            }
                        });
                        break;
                }
                return;
            }

            var byStatus = {};

            for (var i = 0, l = _listTasks.length; i < l; ++i) {
                var task = _listTasks[i];

                if (task.type == _selectedListType) {
                    var div = document.createElement('div');
                    div.className = 'task_item' + (task.status == 4 ? ' scored' : '');

                    var tmp = document.createElement('div');
                    tmp.className = 'task_item_name';
                    tmp.innerHTML = DS.util.htmlescape('id' + task.id + ': ' + task.name);
                    div.appendChild(tmp);

                    tmp = document.createElement('div');
                    tmp.style.cssText = 'clear: both;';
                    div.appendChild(tmp);

                    tmp = document.createElement('div');
                    tmp.className = 'task_item_buttons';
                    div.appendChild(tmp);

                    btn = document.createElement('button');
                    btn.id = 'download_link' + task.id;
                    btn.innerHTML = 'Скопировать ссылку на решение';
                    btn.className = '-comment';
                    btn.style.display = 'none';

                    tmp.appendChild(btn);

                    tmp = document.createElement('div');
                    tmp.style.cssText = 'clear: both;';
                    tmp.id = 'empty1' + task.id;
                    tmp.style.display = 'none';
                    div.appendChild(tmp);
                    var importFunction = function(text, idTask) {
                        let import_solution_method = false;
                        let import_algorithm = false;
                        let import_block_diagram = false;
                        let import_source_code = false;
                        let content = DS.JSON.decode(text);
                        let task_data = DS.JSON.encode(content.task);
                        let code_data = content.code;
                        
                        var openImportFunc = function() {
                        DS.progressWindow('Загрузка импорта');
                        elTaskProcessUnsaved.style.display = 'none';
                            DS.ARM.getTask(idTask, function(d) {
                                if (d.success && !_taskData) {
                                    let task = d.data;
                                    _taskData = task;
    
                                    let fn = function() {
                                        elTaskProcessName.innerText = DS.page.getTaskField('name');
                                        elTaskProcessSubject.innerText = _listSubjects[DS.page.getTaskField('subject_id')] || 'н/д';
                                        elTaskProcessTeacher.innerText = DS.page.getTaskField('teacher_name') + ' ' + DS.page.getTaskField('teacher_patronymic') + ' ' + DS.page.getTaskField('teacher_surname').substr(0, 1) + '.';
    
                                        let i = 0;
                                        let loadNext = function() {
                                            if (i < task.tools.length) {
                                                let idTool = task.tools[i].id;
                                                let toolStatus = task.tools[i].status;
                                                ++i;
                                                fnInitTaskTool(idTool, toolStatus, loadNext);
                                            } else {
                                                DS.progressWindow();
                                            }
                                        };
    
                                        loadNext();
                                        DS.css(elTaskScreen, 'display', '');
    
                                        btnCloseTask = DS.page.topMenu.addButton('Закрыть задачу');
                                        DS.css(btnCloseTask, 'float', 'right');
                                        DS.addEvent(btnCloseTask, 'click',
                                            function() {
                                                endTask();
                                            });
                                        btnExportTask = DS.page.topMenu.addButton('Экспорт');
                                        DS.css(btnExportTask, 'float', 'right');
                                        DS.addEvent(btnExportTask, 'click', function() {
                                            DS.ARM.getTaskFiles(idTask, function(d) {
                                                if (d.success) {
                                                    var export_ = {
                                                        'task': {
                                                            'algo2': _taskData.algo2,
                                                            'graph_svg': _taskData.graph_svg,
                                                            'algo_text': _taskData.algo_text,
                                                            'algo_graph': _taskData.algo_graph,
                                                            'method_description': _taskData.method_description
                                                        },
                                                        'code': DS.JSON.encode(d.data)
                                                    };
                                                    download(DS.JSON.encode(export_), DS.page.getTaskField('name') + '_export.json', '', false);
                                                }
                                            });
                                        });
                                        DS.page.endTask = endTask;
                                        DS.ARM.saveTask(_taskData, function(d) {
                                            if (d.success) {
                                                DS.msg('Сохранено', 'green');
                                            } else {
                                                DS.msg('Ошибка сохранения', 'red');
                                            }
                                        });
                                    };
                                    if(import_source_code) {
                                        localStorage.setItem('IMPORT', code_data);
                                        localStorage.setItem('IMPORT_ENTER', true);
                                    }
                                    if (task_data && (task_data = DS.JSON.decode(task_data))) {
                                        for (let i in task_data) {
                                            if (!((i == 'algo2' && import_algorithm) || (i == 'graph_svg' && import_block_diagram) ||
                                            (i == 'algo_text' && import_algorithm) || (i == 'algo_graph' && import_block_diagram) || (i == 'method_description' && import_solution_method))) continue;
                                            if (task_data[i] && ((i == 'algo_graph') ? (task_data[i].length > 261) : (task_data[i].length > 0))) {
                                                DS.page.setTaskField(i, task_data[i]);
                                            }
                                        }
                                        fn();
                                    } else {
                                        fn();
                                    }
                                }
                            
                            });
                        };
                        
                        DS.create({
                            DStype: 'window',
                            destroyOnClose: true,
                            reqWidth: 400,
                            height: '282px',
                            items: [
                                ['title', 'Выберите что импортировать'],
                                ,{
                                    DStype: 'form-panel',
                                    items: [{
                                        DStype: 'list-layout',
                                        items: [{
                                            DStype: 'checkbox',
                                            value: true,
                                            label: '<b>Метод решения</b>',
                                            name: 'solution_method_checkbox'
                                        }, 
                                        '<br>', 
                                        {
                                            DStype: 'checkbox',
                                            value: true,
                                            label: '<b>Алгоритм</b>',
                                            name: 'algorithm_checkbox'
                                        }, 
                                        '<br>', 
                                        {
                                            DStype: 'checkbox',
                                            value: true,
                                            label: '<b>Блок схема</b>',
                                            name: 'block_diagram_checkbox'
                                        }, 
                                        '<br>', 
                                        {
                                            DStype: 'checkbox',
                                            value: true,
                                            label: '<b>Исходный код</b>',
                                            name: 'source_code_checkbox'
                                        }, 
                                        '<br>', 
                                        {
                                            DStype: 'button',
                                            label: 'Принять',
                                            listeners: {
                                                click: function() {
                                                    var $form = this.getForm();
                                                    var data = $form.getFields();
                                                    import_solution_method = data.solution_method_checkbox;
                                                    import_algorithm = data.algorithm_checkbox;
                                                    import_block_diagram = data.block_diagram_checkbox;
                                                    import_source_code = data.source_code_checkbox;
                                                    this.parent().parent().parent().close();
                                                    openImportFunc();
                                                }
                                            }
                                        },
                                        {
                                            DStype: 'button',
                                            label: 'Отмена',
                                            listeners: {
                                                click: function() {
                                                    var $form = this.getForm();
                                                    var data = $form.getFields();
                                                    this.parent().parent().parent().close();
                                                }
                                            }
                                        }]
                                    }]
                                },
                            ]
                        }).open();
                    };

                    if (task.status == 1 || task.status == 3 || task.status == 5) {
                        tmp = document.createElement('div');
                        tmp.className = 'task_item_buttons';
                        div.appendChild(tmp);

                        btn = document.createElement('button');

                        btn.innerHTML = 'Импорт из банка решений';
                        btn.className = '-comment';
                        btn.id = 'import_from_bank' + task.id;
                        btn.style.display = 'none';
                        tmp.appendChild(btn);

                        DS.addEvent(btn, 'click', (function(name, idTask) {
                            return (async function(e) {
                                e.stopPropagation();
                                let response = await fetch('https://trivia1.ru/get_all_solutions?task_name=' + encodeURI(name));
                                if (response.ok) {
                                    let solutions = await response.json();
                                    let items_ = []
                                    for (let _i = 0; _i < solutions.length; _i++) {
                                        items_.push('<tr>');
                                        items_.push('<td style="border: 1px solid #000; border-collapse: collapse;">' + String(_i) + '</td>');
                                        items_.push('<td style="border: 1px solid #000; border-collapse: collapse;">' + solutions[_i].name + '</td>');
                                        items_.push('<td style="border: 1px solid #000; border-collapse: collapse;">' + String(solutions[_i].size) + '</td>');
                                        items_.push('<td style="border: 1px solid #000; border-collapse: collapse;">');
                                        items_.push({
                                            DStype: 'button',
                                            label: 'Импорт',
                                            listeners: {
                                                click: async function() {
                                                    let solutionName = solutions[_i].name;
                                                    let taskName = encodeURI(name);
                                                    let solution = await fetch('https://trivia1.ru/get_solution?task_name=' + taskName + '&solution_name=' + solutionName);
                                                    if (solution.ok) {
                                                        let text = await solution.text();
                                                        this.parent().close()
                                                        importFunction(text, idTask);
                                                    }
                                                }
                                            }
                                        });
                                        items_.push('</td>');
                                        items_.push('</tr>');
                                    }

                                    DS.create({
                                        DStype: 'window',
                                        destroyOnClose: true,
                                        reqWidth: 850,
                                        height: '300px',
                                        items: [
                                            [
                                                'title', 'Общий банк решений', '->', {
                                                    DStype: 'window-button-close'
                                                }
                                            ], '<div class="ds-window-scrollable" width="100%">', '<table style={border: 1px solid #000} width="99%" align="left">', '<tr>', '<th style="border: 1px solid #000; border-collapse: collapse;">№</th><th style="border: 1px solid #000; border-collapse: collapse;">Name</th><th style="border: 1px solid #000; border-collapse: collapse;">Size</th><th style="border: 1px solid #000; border-collapse: collapse;"></th>', '</tr>'
                                        ].concat(items_).concat(['</div>'])
                                    }).open();
                                }
                            });
                        })(task.name, task.id));

                        tmp = document.createElement('div');
                        tmp.style.cssText = 'clear: both;';
                        tmp.id = 'empty2' + task.id;
                        tmp.style.display = 'none';
                        div.appendChild(tmp);

                        tmp = document.createElement('div');
                        tmp.className = 'task_item_buttons';
                        div.appendChild(tmp);

                        btn = document.createElement('button');
                        btn.innerHTML = 'Импорт из файла';
                        btn.className = '-comment';

                        tmp.appendChild(btn);

                        DS.addEvent(btn, 'click', (function(idTask) {
                            return (function(e) {
                                let input = document.createElement('input');
                                input.type = 'file';
                                input.click();
                                input.onchange = ev => {
                                    let file = ev.target.files[0];
                                    let reader = new FileReader();
                                    reader.readAsText(file, 'UTF-8');
                                    reader.onload = readerEvent => {
                                        importFunction(readerEvent.target.result, idTask);
                                    };
                                }
                                e.stopPropagation();
                            });
                        })(task.id));
                    }

                    if (task.status == 4 || task.status == 5 || task.status == 6) {
                        tmp = document.createElement('div');
                        tmp.className = 'task_item_score';
                        tmp.innerHTML = 'Оценка: ' + task.score;
                        div.appendChild(tmp);
                    }

                    tmp = document.createElement('div');
                    tmp.style.cssText = 'clear: both;';
                    div.appendChild(tmp);

                    if (task.status == 3 || task.status == 5 || (task.status == 4 && task.has_theory_text)) {
                        tmp = document.createElement('div');
                        tmp.className = 'task_item_buttons';
                        div.appendChild(tmp);

                        if (task.status == 3 || task.status == 5) {
                            var btn = document.createElement('button');
                            btn.innerHTML = 'Комментарий';
                            btn.className = '-comment';
                            tmp.appendChild(btn);

                            DS.addEvent(btn, 'click', (function(comment, name) {
                                return (function(e) {
                                    showComment(name, comment);
                                    e.stopPropagation();
                                });
                            })(task.comment, task.name));
                        } else {
                            var btn = document.createElement('button');
                            btn.innerHTML = 'Теория';
                            btn.className = '-theory';
                            tmp.appendChild(btn);

                            DS.addEvent(btn, 'click', (function(id, name) {
                                return (function(e) {
                                    showTheory(name, id);
                                    e.stopPropagation();
                                });
                            })(task.id, task.name));
                        }

                        tmp = document.createElement('div');
                        tmp.style.cssText = 'clear: both;';
                        div.appendChild(tmp);
                    }

                    tmp = document.createElement('div');
                    tmp.className = 'task_item_lives';
                    div.appendChild(tmp);

                    var limitErrors = 9;

                    var taskDelay = (task.task_delay || 0) / 10;
                    for (var j = 0; j < limitErrors; ++j) {
                        var tmp3 = document.createElement('div');
                        if (j < taskDelay) {
                            tmp3.className = '-dead';
                        } else {
                            tmp3.className = '-alive';
                        }
                        tmp.appendChild(tmp3);
                    }
                    if (taskDelay >= limitErrors && task.status == 2 || task.status == 6) {
                        var tmp3 = document.createElement('div');
                        tmp3.innerText = 'Для проверки подойдите к преподавателю';
                        tmp3.className = '-notice';
                        tmp.appendChild(tmp3);
                    }

                    tmp = document.createElement('div');
                    tmp.className = 'task_item_meta';
                    div.appendChild(tmp);

                    var tmp2 = document.createElement('div');
                    tmp2.className = '-name';
                    tmp2.innerHTML = DS.util.htmlescape(_listSubjects[task.subject_id]);
                    tmp.appendChild(tmp2);

                    tmp2 = document.createElement('div');
                    tmp2.className = '-date';
                    tmp2.innerHTML = (new Date(task.date_added * 1000)).toLocaleFormat('%d.%m.%Y');
                    tmp.appendChild(tmp2);

                    if (task.status == 1 || task.status == 3 || task.status == 5) {
                        if (task.isLocked && false) {
                            div.className += ' -locked';
                        } else {
                            DS.addEvent(div, 'click', (function(idTask) {
                                return (function() {
                                    showTask(idTask);
                                });
                            })(task.id));
                        }
                    } else if (task.status == 4) {
                        DS.addEvent(div, 'click', (function(idTask) {
                            return (function() {
                                showTaskReport(idTask);
                            });
                        })(task.id));

                        div.className += ' -locked';
                    } else {
                        div.className += ' -locked';
                    }

                    if (!(task.status in byStatus)) {
                        var group = document.createElement('div');
                        group.className = 'task_group';
                        byStatus[task.status] = group;
                    }
                    byStatus[task.status].appendChild(div);
                }
            }

            var order = [3, 5, 1, 2, 7, 6, 4];

            for (var i = 0, l = order.length; i < l; ++i) {
                if (order[i] in byStatus) {
                    var div = document.createElement('div');
                    div.innerHTML = _taskStatusNames[order[i]];
                    div.className = 'task_group_title';
                    elPanelLeftBottom.appendChild(div);
                    elPanelLeftBottom.appendChild(byStatus[order[i]]);
                }
            }
        };

        var loadTasks = function(cb) {
            DS.ARM.getTaskList(function(d) {
                if (d.success) {
                    _listTasks = d.data;
                    renderTaskList();
                    cb && cb();
                }
            });
        };

        var LoadNews = function(rt) {
            DS.ARM.loadNews(20, 0, function(d) {
                if (d.success) {
                    for (var i = 0, l = d.data.length; i < l; ++i) {
                        var row = d.data[i];
                        var wrp = document.createElement('div');
                        wrp.className = 'news-item';

                        var div = document.createElement('div');

                        var title = document.createElement('h3');
                        title.innerText = row.title;
                        title.className = '-title';
                        div.appendChild(title);

                        var date = document.createElement('div');
                        date.innerText = 'Опубликовано: ' + (new Date(row.date_add * 1000)).toLocaleFormat('%d.%m.%Y %H:%M');
                        date.className = '-date';
                        div.appendChild(date);

                        var content = document.createElement('div');
                        content.innerHTML = row.content;
                        content.className = '-content';
                        div.appendChild(content);

                        wrp.appendChild(div);
                        rt.appendChild(wrp);
                    }
                }
            });
        };

        var initMainScreen = function() {
            elMainScreen = document.createElement('div');
            elMainScreen.className = 'task_mod_wrap';

            var elPanelLeft = document.createElement('div');
            elPanelLeft.className = 'task_mod_left';
            elMainScreen.appendChild(elPanelLeft);

            var elPanelLeftTop = document.createElement('div');
            elPanelLeftTop.className = 'task_mod_left_top';
            elPanelLeftTop.innerHTML = 'Мои задания';
            elPanelLeft.appendChild(elPanelLeftTop);

            var elPanelLeftTabs = document.createElement('div');
            elPanelLeftTabs.className = 'task_mod_left_tabs';
            // elPanelLeftTabs.innerHTML = '<div class="active">Упражнения</div><div>Лабораторные</div><div>Домашние</div><div>Курсовые</div><div>Практика</div>';
            elPanelLeft.appendChild(elPanelLeftTabs);


            elPanelLeftBottom = document.createElement('div');
            elPanelLeftBottom.className = 'task_mod_left_bottom';
            elPanelLeft.appendChild(elPanelLeftBottom);





            var elPanelRight = document.createElement('div');
            elPanelRight.className = 'task_mod_right';
            elMainScreen.appendChild(elPanelRight);

            elWrapper.appendChild(elMainScreen);

            LoadNews(elPanelRight);


            var fnActivateTab = function(id) {
                var tab = DS.gid('tasklist_tab_' + id);
                DS.util.removeClass(DS.q('div', elPanelLeftTabs), 'active');
                DS.util.addClass(tab, 'active');
                _selectedListType = id;
                if (tab.hasAttribute('data-renderer')) {
                    _selectedListRenderer = tab.getAttribute('data-renderer');
                } else {
                    _selectedListRenderer = null;
                }
                renderTaskList();
            };

            DS.ARM.getTaskTypes(function(d) {
                if (d.success) {
                    for (var i = 0, l = d.data.length; i < l; ++i) {
                        var div = document.createElement('div');
                        div.innerHTML = d.data[i].text;
                        div.id = 'tasklist_tab_' + d.data[i].value;
                        if (d.data[i].renderer) {
                            div.setAttribute('data-renderer', d.data[i].renderer);
                        }
                        DS.addEvent(div, 'click', (function(tab) {
                            return (function() {
                                fnActivateTab(tab);
                            });
                        })(d.data[i].value));
                        elPanelLeftTabs.appendChild(div);
                    }
                    if (d.data.length) {
                        fnActivateTab(d.data[0].value);
                    }

                    DS.ARM.getSubjectList(function(d) {
                        if (d.success) {
                            for (var i = 0, l = d.data.length; i < l; ++i) {
                                _listSubjects[d.data[i].value] = d.data[i].text;
                            }

                            DS.ARM.getTaskToolsList(function(d) {
                                if (d.success) {
                                    var _sCount = d.data.length;
                                    for (var i = 0, l = d.data.length; i < l; ++i) {
                                        _listTools[d.data[i].value] = d.data[i].text;

                                        var script = document.createElement('script');
                                        script.type = 'text/javascript';
                                        script.onload = function() {
                                            if (--_sCount == 0) {
                                                DS.progressWindow();
                                                loadTasks();
                                                _isInitialized = true;
                                            }
                                        };
                                        script.onerror = (function(name) {
                                            return (function() {
                                                DS.msg('Не удалось загрузить инструмент: ' + name, 'red');
                                                if (--_sCount == 0) {
                                                    DS.progressWindow();
                                                    loadTasks();
                                                    _isInitialized = true;
                                                }
                                            });
                                        })(d.data[i].text);
                                        script.src = 'js/modules/task/tools/' + d.data[i].text + '.js?' + window.__noCacheNumber;
                                        document.body.appendChild(script);
                                    }



                                    findTrainer();
                                }
                            });
                        }
                    });
                }
            });
        };


        var elTaskProcessLeft = null;
        var elTaskProcessRight = null;

        var elChatLog = null;
        var elChatHide = null;
        var elChatText = null;
        var elChatButton = null;
        var _listMessages = [];
        var _lastChatMessage = null;
        var insertChatMessage = function(data) {
            var time = data.date_added = parseInt(data.date_added);
            var div = document.createElement('div');
            div.className = 'chat_message_wrap';
            var msg = document.createElement('div');
            msg.className = '-text';
            var title = document.createElement('div');
            title.className = '-title';
            var titleText = (new Date(time * 1000)).toLocaleFormat('%d.%m в %H:%M ');
            if (data.student_id > 0) {
                msg.innerText = data.message_text;
                titleText += data.student_name;
                if (ARMconfig.userId == data.student_id) {
                    div.className += ' -mine';
                }
            } else {
                msg.innerHTML = data.message_text;
                div.className += ' -teacher';
                titleText += data.teacher_name;
            }
            title.innerText = titleText;
            div.appendChild(title);
            div.appendChild(msg);

            data._el = div;

            var f = elChatLog.scrollTop == (elChatLog.scrollTopMax || elChatLog.scrollHeight - elChatLog.clientHeight);

            var nextItem = null;
            var i = 0;
            for (l = _listMessages.length; i < l; ++i) {
                var msg = _listMessages[i];
                if (msg.rowid == data.rowid) {
                    return;
                }
                if (msg.date_added > time) {
                    nextItem = msg;
                    break;
                }
            }
            if (nextItem) {
                elChatLog.insertBefore(div, msg._el);
                _listMessages.splice(i, 0, data);
            } else {
                elChatLog.appendChild(div);
                _listMessages.push(data);
            }

            if (f) {
                elChatLog.scrollTop = (elChatLog.scrollTopMax || elChatLog.scrollHeight - elChatLog.clientHeight);
            }

            if (!_lastChatMessage || _lastChatMessage < time) {
                _lastChatMessage = time;
            }
        };

        var initChatScreen = function() {
            elChatScreen = document.createElement('div');
            elChatScreen.className = 'task_chat_wrap';

            elChatHide = document.createElement('button');
            elChatHide.className = 'task_chat_btn';
            elChatScreen.appendChild(elChatHide);
            DS.addEvent(elChatHide, 'click', function() {
                document.body.classList.toggle('-chat-hidden');
            });

            elChatLog = document.createElement('div');
            elChatLog.className = 'task_chat_log';
            elChatScreen.appendChild(elChatLog);

            var div = document.createElement('div');
            div.className = 'task_chat_input_box';
            elChatScreen.appendChild(div);

            elChatText = document.createElement('textarea');
            elChatText.disabled = !DS.page._currentTeacherId;
            div.appendChild(elChatText);

            elChatButton = document.createElement('button');
            elChatButton.disabled = !DS.page._currentTeacherId;
            elChatButton.innerText = 'Отправить';
            div.appendChild(elChatButton);

            DS.addEvent(elChatButton, 'click', function() {
                if (elChatText.value.trim() && !elChatText.disabled) {
                    elChatText.disabled = true;
                    DS.ARM.addChatMessage(elChatText.value.trim(), function(d) {
                        elChatText.disabled = false;
                        if (d.success) {
                            elChatText.value = '';
                        }
                    });
                }
            });

            elWrapper.appendChild(elChatScreen);


            DS.ARM.loadChatPrevN(150, 0, function(d) {
                if (d.success) {
                    for (var i = 0, l = d.data.length; i < l; ++i) {
                        insertChatMessage(d.data[i]);
                    }
                }
            });
        };

        var initTaskScreen = function() {
            elTaskScreen = document.createElement('div');
            elTaskScreen.className = 'task_process_wrap';

            var div = document.createElement('div');
            div.className = 'task_process_top';
            elTaskScreen.appendChild(div);

            elTaskProcessName = document.createElement('div');
            elTaskProcessName.className = '-name';
            elTaskProcessName.innerHTML = 'Задание 1_2_2';
            div.appendChild(elTaskProcessName);

            elTaskProcessSubject = document.createElement('div');
            elTaskProcessSubject.className = '-subject';
            elTaskProcessSubject.innerHTML = 'Процедурное программирование';
            div.appendChild(elTaskProcessSubject);

            elTaskProcessTeacher = document.createElement('div');
            elTaskProcessTeacher.className = '-teacher';
            elTaskProcessTeacher.innerHTML = 'Оксана Николаевна Р.';
            div.appendChild(elTaskProcessTeacher);

            elTaskProcessUnsaved = document.createElement('div');
            elTaskProcessUnsaved.className = '-unsaved';
            elTaskProcessUnsaved.innerHTML = 'Имеются несохраненные изменения.';
            elTaskProcessUnsaved.style.display = 'none';
            div.appendChild(elTaskProcessUnsaved);
            DS.addEvent(elTaskProcessUnsaved, 'click', function() {
                elTaskProcessUnsaved.style.display = 'none';
                DS.page.taskSave(function(d) {
                    if (d.success) {
                        DS.msg('Сохранено', 'green');
                    } else {
                        elTaskProcessUnsaved.style.display = '';
                    }
                });
            });


            elTaskProcessLeft = document.createElement('div');
            elTaskProcessLeft.className = 'task_process_left';
            // elTaskProcessLeft.innerHTML = '<div class="active">Постановка задачи</div><div>Метод</div><div>Алгоритм</div><div>Блок-схема</div><div>Код программы</div><div>Тесты</div><div>Отчет</div>';
            elTaskScreen.appendChild(elTaskProcessLeft);

            elTaskProcessRight = document.createElement('div');
            elTaskProcessRight.className = 'task_process_right';
            elTaskScreen.appendChild(elTaskProcessRight);

            DS.css(elTaskScreen, 'display', 'none');
            elWrapper.appendChild(elTaskScreen);
        };

        var findTrainer = function() {
            DS.ARM.getActiveTest(function(d) {
                if (d.success) {
                    var timeLimit = d.data.time_limit ? (d.data.time_limit - (parseInt(Date.now() * 0.001) - d.data.date_added)) : null;
                    console.warn(d.data, timeLimit);
                    if (timeLimit != null && timeLimit < 30) {
                        return;
                    }
                    DS.page.pushModule('test', {
                        testId: d.data.test_id,
                        timeLimit: timeLimit,
                        challenge: d.data.id
                    });
                }
            });
        };

        //##########################################################################

        var _tools = {};
        DS.page.registerTaskTool = function(name, cls) {
            if (name in _tools) {
                console.error('Tool already exists');
                return;
            }
            _tools[name] = cls;
        };

        var _currentTools = [];
        var _activeTool = null;

        fnInitTaskTool = function(idTool, toolStatus, onReady) {
            var toolName = _listTools[idTool];
            if (!toolName) {
                DS.msg("Unknown tool id: " + idTool);
                return;
            }
            console.warn("Starting tool: " + toolName);

            if (!(toolName in _tools)) {
                return;
            }

            var tool = new _tools[toolName]();
            tool._keyName = toolName;

            var styles = tool.getStyles();

            if ('both' in styles) {
                for (var i = 0, l = styles.both.length; i < l; ++i) {
                    DS.page.enableStyle(styles.both[i]);
                }
            }
            var mode = DS.page.userPrefs.get('arm/darkMode') ? 'dark' : 'light';
            if (mode in styles) {
                for (var i = 0, l = styles[mode].length; i < l; ++i) {
                    DS.page.enableStyle(styles[mode][i]);
                }
            }

            _currentTools.push(tool);
            DS.page.loadScripts(tool.getScripts(), function() {

                var div = document.createElement('div');
                div.className = 'task_tool_wrapper';
                elTaskProcessRight.appendChild(div);
                DS.css(div, 'display', 'none');
                // console.warn('init', div, tool);
                tool.initialize(div);

                var toolMenu = document.createElement('div');
                toolMenu.innerHTML = tool.getTitle();
                toolMenu.className = toolStatus == 1 ? '-tool-invalid' : '';
                elTaskProcessLeft.appendChild(toolMenu);

                DS.addEvent(toolMenu, 'click', function() {
                    if (DS.util.hasClass(this, 'active')) {
                        return;
                    }

                    if (_activeTool && ('canSwitchNow' in _activeTool) && !_activeTool.canSwitchNow()) {
                        return;
                    }

                    DS.util.removeClass(elTaskProcessLeft.childNodes, 'active');
                    DS.util.addClass(this, 'active');

                    if (_activeTool) {
                        _activeTool.hide();
                        DS.css(elTaskProcessRight.childNodes, 'display', 'none');
                    }

                    DS.css(div, 'display', '');
                    _activeTool = tool;
                    _activeTool.show();
                });

                if (!_activeTool) {
                    _activeTool = tool;
                    DS.css(div, 'display', '');
                    DS.util.addClass(toolMenu, 'active');
                    _activeTool.show();
                }

                onReady && onReady();

            }, function(name) {
                DS.msg('Не удалось загрузить зависимость инструмента:<br/>' + name, 'red');
            });
        };

        fnFinishTools = function(cb) {
            if (_activeTool) {
                _activeTool.hide();
                _activeTool = null;
            }

            var fn = function() {
                var tool = _currentTools.pop();
                if (tool) {
                    var styles = tool.getStyles();

                    if ('both' in styles) {
                        for (var i = 0, l = styles.both.length; i < l; ++i) {
                            DS.page.disableStyle(styles.both[i]);
                        }
                    }
                    var mode = DS.page.userPrefs.get('arm/darkMode') ? 'dark' : 'light';
                    if (mode in styles) {
                        for (var i = 0, l = styles[mode].length; i < l; ++i) {
                            DS.page.disableStyle(styles[mode][i]);
                        }
                    }

                    tool.shutdown(fn);
                } else {
                    elTaskProcessLeft.innerHTML = '';
                    elTaskProcessRight.innerHTML = '';
                    cb && cb();
                }
            };

            fn();
        };


        var fnModeChange = function(isDark) {
            // console.warn(_currentTools);
            for (var j = 0, jl = _currentTools.length; j < jl; ++j) {
                var styles = _currentTools[j].getStyles();
                // console.warn(styles);
                var mode = !isDark ? 'dark' : 'light';
                if (mode in styles) {
                    for (var i = 0, l = styles[mode].length; i < l; ++i) {
                        DS.page.disableStyle(styles[mode][i]);
                    }
                }
                mode = isDark ? 'dark' : 'light';
                if (mode in styles) {
                    for (var i = 0, l = styles[mode].length; i < l; ++i) {
                        DS.page.enableStyle(styles[mode][i]);
                    }
                }
            }
        };
        DS.addEvent(DS, 'darkmode/deactivate', function() {
            fnModeChange(false);
        });
        DS.addEvent(DS, 'darkmode/activate', function() {
            fnModeChange(true);
        });

        DS.page.getTaskTool = function(name) {
            if (typeof(name) == 'number') {
                name = _listTools[name];
            }
            for (var i = 0, l = _currentTools.length; i < l; ++i) {
                if (_currentTools[i]._keyName == name) {
                    return (_currentTools[i]);
                }
            }
            return (null);
        };

        //##########################################################################

        DS.page.taskSave = function(cb) {
            if (_taskData) {
                _taskData._armVer = window.__noCacheNumber;
                DS.ARM.saveTask(_taskData, function(d) {
                    if (d.success) {
                        elTaskProcessUnsaved.style.display = 'none';
                    }
                    cb && cb(d);
                });
            } else {
                cb && cb({
                    success: true
                });
            }
        };

        var onTaskScored = function(data) {
            var idTask = data.data[0].student_task_id;
            for (var i = 0, l = _listTasks.length; i < l; ++i) {
                if (_listTasks[i].id == idTask) {
                    DS.msg('<div>Задание ' + DS.util.htmlescape(_listTasks[i].name) + ' оценено на ' + data.data[0].teacher_score + ' ' + DS.util.getNumEnding(data.data[0].teacher_score, ['балл', 'балла', 'баллов']) + '</div><div>' + /* DS.util.htmlescape( */ /* DS.util.htmlescape( */ data.data[0].teacher_comment /* ) */ /* ) */ + '</div>', 'green');
                    break;
                }
            }
            loadTasks();
        };
        var onTaskRefused = function(data) {
            var idTask = data.data[0].student_task_id;
            for (var i = 0, l = _listTasks.length; i < l; ++i) {
                if (_listTasks[i].id == idTask) {
                    DS.msg('<div>Задание ' + DS.util.htmlescape(_listTasks[i].name) + ' возвращено на доработку</div><div>' + /* DS.util.htmlescape(DS.util.htmlescape( */ data.data[0].teacher_comment /* )) */ + '</div>', 'red');
                    break;
                }
            }
            loadTasks();
        };
        /* var finishARM = function(){
        	
        	DS.page.activateModule('quit');
        	
        }; */
        var onTaskAdded = function(data) {
            loadTasks();
        };
        var onLessonSwitched = function(data) {
            loadTasks(function() {
                if (data.notification_type == ARMcommand.LESSON_START && _taskData) {
                    var isFound = false;
                    for (var i = 0, l = _listTasks.length; i < l; ++i) {
                        if (_listTasks[i].id == _taskData.id) {
                            isFound = true;
                            break;
                        }
                    }

                    if (!isFound) {
                        endTask(function() {
                            DS.msg('Задание было закрыто в связи с началом урока');
                        });
                    }
                }
            });
            switch (parseInt(data.notification_type)) {
                case ARMcommand.LESSON_START:
                    elChatText.disabled = false;
                    elChatButton.disabled = false;
                    DS.page._currentTeacherId = data.teacher_id;
                    break;
                case ARMcommand.LESSON_END:
                    elChatText.disabled = true;
                    elChatButton.disabled = true;
                    DS.page._currentTeacherId = null;
                    break;
            }
        };


        var _sndBellTeacher = new Audio('sound/bell.wav');
        var _sndBellStudent = new Audio('sound/talk.wav');
        var onChatMessage = function(data) {
            insertChatMessage(data.data[0]);
            if (data.data[0].student_id > 0) {
                _sndBellStudent.play();
            } else {
                _sndBellTeacher.play();
            }
        };
        var onWSconnected = function() {
            if (_lastChatMessage) {
                DS.ARM.loadChatSince(_lastChatMessage, function(d) {
                    if (d.success) {
                        for (var i = 0, l = d.data.length; i < l; ++i) {
                            insertChatMessage(d.data[i]);
                        }
                    }
                });
            }
        };

        var onKeyDown = function(e) {
            if (e.keyCode == 83 && e.ctrlKey) {
                DS.page.taskSave();
            }
        };


        var CreatePlayer = function() {
            if (DS.gid('player_stream')) {
                return;
            }

            var chatLog = DS.q('.task_chat_log')[0];
            var video = document.createElement('video');
            video.autoplay = true;
            video.id = 'player_stream';
            video.style.width = '100%';
            chatLog.parentElement.insertBefore(video, chatLog);
        };
        var DestroyPlayer = function() {
            var video = DS.gid('player_stream');
            if (!video) {
                return;
            }
            video.parentNode.removeChild(video);
            var chatLog = DS.q('.task_chat_log')[0];
            chatLog.style.top = '';
        };

        var PlayStream = function(stream) {
            DS.ARM.getLessonStreamInfo(stream.origin, function(d) {
                if (d.success) {
                    console.log('A new stream is added: ' + stream.id + '; user: ' + d.data.user);

                    if (d.data.user.substr(0, 7) == 'user_4_') {
                        d.data.user = 'user_student';
                    }
                    //
                    var player = null;
                    if (stream.source.video == 'screen-cast') {
                        var w = window.open();
                        var player = w.document.createElement('video');
                        player.style.position = 'absolute';
                        player.style.top = 0;
                        player.style.left = 0;
                        player.style.right = 0;
                        player.style.bottom = 0;
                        w.document.body.appendChild(player);
                        w.document.title = 'Демонстрация экрана';
                        player.w = w;
                        // player = DS.gid('player_screencast');
                    } else {
                        // player = DS.gid('player_'+d.data.user);
                        player = DS.gid('player_stream');
                    }
                    if (!player) {
                        return;
                    }

                    var videoOptions = {};

                    if (stream.source.video != 'screen-cast') {
                        var targetWidth = player.clientWidth;

                        var bestWidth = -1;
                        var bestHeight = -1;

                        for (var i = 0, l = stream.settings.video.length; i < l; ++i) {
                            var item = stream.settings.video[i].resolution;
                            if (item.width > targetWidth && (item.width < bestWidth || bestWidth < 0)) {
                                bestWidth = item.width;
                                bestHeight = item.height;
                            }
                        }

                        for (var i = 0, l = stream.extraCapabilities.video.resolutions.length; i < l; ++i) {
                            var item = stream.extraCapabilities.video.resolutions[i];
                            if (item.width > targetWidth && (item.width < bestWidth || bestWidth < 0)) {
                                bestWidth = item.width;
                                bestHeight = item.height;
                            }
                        }

                        if (bestWidth > 0) {
                            videoOptions.resolution = {
                                width: bestWidth,
                                height: bestHeight
                            };

                            var chatLog = DS.q('.task_chat_log')[0];
                            chatLog.style.top = bestHeight + 'px';
                        }
                    } else {
                        try {
                            var res = stream.settings.video[0].resolution;
                            player.w.resizeTo(res.width, res.height);
                            // .width = res.width;
                            // player.w.height = res.height;
                        } catch (e) {
                            console.error(e);
                        }
                    }

                    var isMe = d.data.user == 'user_4_' + ARMconfig.userId;

                    conference.subscribe(stream, {
                        audio: !isMe && !!stream.source.audio,
                        video: videoOptions
                    }).then(function(subscription) {
                        player.srcObject = stream.mediaStream;

                        player.currentStream = stream.id;

                        stream.addEventListener('ended', function() {
                            console.log(stream.id + ' is ended.');

                            if (player.currentStream == stream.id) {
                                player.srcObject = null;

                                if (player.w) {
                                    player.w.close();
                                }
                            }

                        });

                        stream.addEventListener('updated', function() {
                            console.log(stream.id + ' is updated.');
                        });

                        DS.addEvent(subscription, 'mute', function(e) {
                            DS.util.removeClass(player, 'player-speaking');
                        });
                        DS.addEvent(subscription, 'unmute', function(e) {
                            DS.util.addClass(player, 'player-speaking');
                        });
                    }, function(err) {
                        console.log('subscribe failed', err);
                    });
                }
            });
        };

        var conference = null;
        var onStreamStarted = function() {
            conference = new Owt.Conference.ConferenceClient({
                rtcConfiguration: {
                    iceServers: [{
                        urls: "stun:stun.services.mozilla.com"
                    }]
                }
            });

            conference.addEventListener('streamadded', function(event) {
                PlayStream(event.stream);
            });

            CreatePlayer();

            DS.ARM.newLessonStreamToken(function(d) {
                if (d.success) {
                    conference.join(d.data).then(function(resp) {
                        var myId = resp.self.id;
                        var myRoom = resp.id;

                        for (var i = 0, l = resp.remoteStreams.length; i < l; ++i) {
                            PlayStream(resp.remoteStreams[i]);
                        }

                        console.log('Streams in conference:', resp.remoteStreams.length);
                        var participants = resp.participants;
                        console.log('Participants in conference: ' + participants.length);

                    }, function(err) {
                        console.error('server connection failed:', err);
                    });
                }
            });
        };
        var onStreamEnded = function() {
            if (conference) {
                conference.leave()
                conference = null;
            }
            DestroyPlayer();
        };

        // Initialize all required stuff, use `element` as render root
        this.initialize = function(element) {
            console.warn("Module init!");
            elWrapper = element;

            _isInitialized = false;
            DS.progressWindow('Загрузка данных');

            initMainScreen();
            initTaskScreen();

            DS.ARM.getCurrentTeacherId(function(d) {
                if (d.success) {
                    DS.page._currentTeacherId = d.data;
                    initChatScreen();
                }
            });

            DS.addEvent(DS, 'msg/' + ARMmessage.TASK_SCORED, onTaskScored);
            DS.addEvent(DS, 'msg/' + ARMmessage.TASK_REFUSED, onTaskRefused);
            // DS.addEvent(DS, 'msg/'+ARMmessage.QUIT_REQUESTED, finishARM);
            DS.addEvent(DS, 'msg/' + ARMmessage.TASK_ADDED, onTaskAdded);
            DS.addEvent(DS, 'msg/' + ARMmessage.LESSON_SWITCH, onLessonSwitched);
            DS.addEvent(DS, 'msg/' + ARMmessage.TRAINER_START, findTrainer);
            DS.addEvent(DS, 'msg/' + ARMmessage.CHAT_MESSAGE, onChatMessage);
            DS.addEvent(DS, 'msg/' + ARMmessage.LESSON_STREAM_STARTED, onStreamStarted);
            DS.addEvent(DS, 'msg/' + ARMmessage.LESSON_STREAM_ENDED, onStreamEnded);
            DS.addEvent(DS, 'arm/authorized', onWSconnected);

            DS.addEvent(window, 'keydown', onKeyDown);



            DS.ARM.checkForLessonStream(function(d) {
                if (d.success & d.data) {
                    DS.invokeEvent('msg/' + ARMmessage.LESSON_STREAM_STARTED);
                }
            });




            /* if(ARMconfig.userId != 8119){
            	return;
            } */
            DS.ARM.getAvailableCourseWorks(function(d) {
                if (d.success && d.data.length) {
                    var idCourse = d.data[0];
                    DS.ARM.getCourseWorkOptions(idCourse, function(d) {
                        if (d.success) {
                            var items = [];
                            var names = {};
                            for (var i = 0, l = d.data.length; i < l; ++i) {
                                items.push({
                                    DStype: 'radiobox',
                                    name: 'task_id',
                                    label: d.data[i].name,
                                    _value: d.data[i].id
                                });
                                names[d.data[i].id] = d.data[i].name;
                            }
                            var wnd;
                            items.push({
                                DStype: 'button',
                                label: 'Подтвердить',
                                listeners: {
                                    click: function() {
                                        var data = this.getForm().getFields();
                                        if (!data.task_id) {
                                            return;
                                        }
                                        DS.confirm('Подтверждаете выбор темы "' + names[data.task_id] + '"? Это действие нельзя отменить', function() {
                                            DS.ARM.selectCourseWork(idCourse, data.task_id, function(d) {
                                                if (d.success) {
                                                    wnd.close();
                                                    loadTasks();
                                                }
                                            });
                                        }, function() {}, true);
                                    }
                                }
                            });
                            wnd = DS.create({
                                DStype: 'window',
                                reqWidth: 600,
                                destroyOnClose: true,
                                items: [
                                    [
                                        'title', 'Выбор темы курсовой работы', '->', {
                                            DStype: 'window-button-close'
                                        }
                                    ], {
                                        DStype: 'form-panel',
                                        items: [{
                                            DStype: 'list-layout',
                                            items: items
                                        }]
                                    }
                                ]
                            }).open();
                        }
                    });
                }
            });
        };

        // destroy module, finish all tasks and network queries, then run callback
        this.shutdown = function(callback) {
            DS.removeEvent(DS, 'msg/' + ARMmessage.TASK_SCORED, onTaskScored);
            DS.removeEvent(DS, 'msg/' + ARMmessage.TASK_REFUSED, onTaskRefused);
            // DS.removeEvent(DS, 'msg/'+ARMmessage.QUIT_REQUESTED, finishARM);
            DS.removeEvent(DS, 'msg/' + ARMmessage.TASK_ADDED, onTaskAdded);
            DS.removeEvent(DS, 'msg/' + ARMmessage.LESSON_SWITCH, onLessonSwitched);
            DS.removeEvent(DS, 'msg/' + ARMmessage.TRAINER_START, findTrainer);
            DS.removeEvent(DS, 'msg/' + ARMmessage.CHAT_MESSAGE, onChatMessage);
            DS.removeEvent(DS, 'msg/' + ARMmessage.LESSON_STREAM_STARTED, onStreamStarted);
            DS.removeEvent(DS, 'msg/' + ARMmessage.LESSON_STREAM_ENDED, onStreamEnded);
            DS.removeEvent(DS, 'arm/authorized', onWSconnected);

            DS.removeEvent(window, 'keydown', onKeyDown);

            var fn = function() {
                if (!_isInitialized) {
                    setTimeout(fn, 1000);
                    return;
                }
                endTask(function() {
                    _listMessages = [];
                    _lastChatMessage = null;

                    elMainScreen && elWrapper.removeChild(elMainScreen);
                    elTaskScreen && elWrapper.removeChild(elTaskScreen);
                    elChatScreen && elWrapper.removeChild(elChatScreen);
                    callback();
                });
            };
            fn();
        };

        this.getScripts = function() {
            return ([
                'js/modules/task/tinyMce.js',

                'js/modules/comission/socket.io.js',
                'js/modules/comission/owt.js'
            ]);
        };
        this.getStyles = function() {
            return ({
                both: [
                        'css/modules/task.css'
                    ]
                    /* ,light: [
                    	'css/modules/task-light.css'
                    ] */
                    ,
                dark: [
                    'css/modules/task-dark.css'
                ]
            });
        };
    });
});
