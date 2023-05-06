'use strict';
DS.ready(function() {
    DS.page.registerTaskTool('code', function() {
        var themes = ['vs', '3024-day', '3024-night', 'abcdef', 'ambiance', 'base16-dark', 'bespin', 'base16-light', 'blackboard', 'cobalt', 'colorforth', 'dracula', 'duotone-dark', 'duotone-light', 'eclipse', 'elegant', 'erlang-dark',
            // 'gruvbox-dark',
            'hopscotch', 'icecoder', 'isotope', 'lesser-dark', 'liquibyte', 'material', 'mbo', 'mdn-like', 'midnight', 'monokai', 'neat', 'neo', 'night', 'oceanic-next', 'panda-syntax', 'paraiso-dark', 'paraiso-light', 'pastel-on-dark', 'railscasts', 'rubyblue', 'seti', 'shadowfox', 'solarized', 'the-matrix', 'tmrw-night-bright', 'tmrw-night-eighties', 'ttcn', 'twilight', 'vibrant-ink', 'xq-dark', 'xq-light', 'yeti', 'zenburn',
        ];
        var self = this;
        var cmStyle = document.createElement('style');
        cmStyle.type = 'text/css';
        var rootWidget;
        var editor;
        var $menuTheme;
        var $menuSize;
        var topMenuTheme;
        var topMenuSize;
        var topMenuRun;
        var topMenuDebugRun;
        var topMenuDebugStop;
        var topMenuDebugStep;
        var topMenuDebugNext;
        var topMenuDebugFinish;
        var topMenuDebugContinue;
        var idTask;
        var userTheme;
        var debugOutput;
        var debugInput;
        var localsWnd = null;
        var UpdateBreakpoints;
        var formatFragment = function(code, baseIndent) {
            return (code);
        };
        var Tokenize = function(streamOfText) {
            streamOfText += '\n';
            var streamOfTokens = [];
            var cur = 0;
            var PushTok = function(lexeme, tokenClass) {
                // console.log(lexeme);
                streamOfTokens.push({
                    lexeme: lexeme,
                    tokenClass: tokenClass ? tokenClass : lexeme
                });
            };
            var ReadOneline = function() {
                var start = cur;
                var len = 0;
                while (streamOfText[cur] != '\n' && streamOfText[cur] != '\r' && streamOfText.length > cur) {
                    ++len;
                    ++cur;
                }
                var str = streamOfText.substr(start, len);
                // memcpy(str, start, sizeof(char)* len);
                // str[len] = 0;
                if (streamOfText[start + 2] == '!' || streamOfText[start + 2] == '*') {
                    // PushTok(start[3] == '<' ? LTYPE_COMMENT_ONELINE_BACK : LTYPE_COMMENT_ONELINE, str + (start[3] == '<' ? 4 : 3));
                    PushTok(str, 'COMMENT');
                }
                return (cur - 1);
            };
            var ReadMultiline = function() {
                var start = cur;
                var len = 0;
                while (streamOfText[cur] && streamOfText[cur + 1] && !(streamOfText[cur] == '*' && streamOfText[cur + 1] == '/')) {
                    ++len;
                    ++cur;
                }
                var str = streamOfText.substr(start, len + 2);
                if (streamOfText[start + 2] == '!' || streamOfText[start + 2] == '*') {
                    // PushTok(str.substr(3), 'COMMENT');
                    PushTok(str, 'COMMENT');
                }
                ++cur;
                // return(cur + 1);
            };
            var ReadInt = function() {
                var start = cur;
                var len = 0;
                while (streamOfText[cur].charCodeAt(0) >= '0'.charCodeAt(0) && streamOfText[cur].charCodeAt(0) <= '9'.charCodeAt(0)) {
                    ++len;
                    ++cur;
                }
                PushTok(streamOfText.substr(start, len), 'INT');
                --cur;
            };
            var ReadSym = function() {
                var start = cur;
                var len = 0;
                var ccode;
                while ((ccode = streamOfText[cur].charCodeAt(0)) && ((ccode >= '0'.charCodeAt(0) && ccode <= '9'.charCodeAt(0)) || (ccode >= 'a'.charCodeAt(0) && ccode <= 'z'.charCodeAt(0)) || (ccode >= 'A'.charCodeAt(0) && ccode <= 'Z'.charCodeAt(0)) || (ccode == '_'.charCodeAt(0)))) {
                    ++len;
                    ++cur;
                }
                var str = streamOfText.substr(start, len);
                var found = false;
                /*for(var i = 0, l = sizeof(g_pszKeyWords) / sizeof(g_pszKeyWords[0]); i < l; ++i)
                {
                	if(!strcmp(g_pszKeyWords[i], str))
                	{
                		PushTok(LTYPE_KW, str);
                		found = true;
                		break;
                	}
                }*/
                if (!found) {
                    PushTok(str, 'IDENTIFIER');
                }
                --cur;
            };
            var ReadSym2 = function() {
                ++cur;
                var start = cur;
                var len = 0;
                while (streamOfText[cur] != '"' && streamOfText.length > cur) {
                    ++len;
                    ++cur;
                }
                var str = [];
                var szSrc = start;
                for (var i = 0; i < len; ++i) {
                    if (streamOfText[szSrc] == '\\') {
                        ++szSrc;
                        switch (streamOfText[szSrc]) {
                            case '"':
                            case '\'':
                            case '\\':
                            case '/':
                                str.push(streamOfText[szSrc]);
                                break;
                            case 'b':
                                str.push('\b');
                                break;
                            case 'f':
                                str.push('\f');
                                break;
                            case 'n':
                                str.push('\n');
                                break;
                            case 'r':
                                str.push('\r');
                                break;
                            case 't':
                                str.push('\t');
                                break;
                        }
                    } else {
                        str.push(streamOfText[szSrc]);
                    }
                    ++szSrc;
                }
                //memcpy(str, start, sizeof(char)* len);
                PushTok(str.join(''), 'CONSTANT');
                // return(cur);
            };
            while (streamOfText[cur]) {
                // console.log(cur, streamOfText[cur]);
                switch (streamOfText[cur]) {
                    case ' ':
                    case '\t':
                    case '\n':
                    case '\r':
                        // Skip it
                        break;
                    case '(':
                        PushTok("(");
                        break;
                    case ')':
                        PushTok(")");
                        break;
                    case '{':
                        PushTok("{");
                        break;
                    case '}':
                        PushTok("}");
                        break;
                    case ':':
                        PushTok(":");
                        break;
                    case '/':
                        if (streamOfText[cur + 1] == '/') {
                            ReadOneline();
                        } else if (streamOfText[cur + 1] == '*') {
                            ReadMultiline();
                        } else {
                            PushTok("/");
                        }
                        break;
                    case ',':
                        PushTok(",");
                        break;
                    case '"':
                        ReadSym2();
                        break;
                    default:
                        var ccode = streamOfText[cur].charCodeAt(0);
                        if (ccode >= '0'.charCodeAt(0) && ccode <= '9'.charCodeAt(0)) {
                            ReadInt();
                            break;
                        }
                        if (
                            (ccode >= 'a'.charCodeAt(0) && ccode <= 'z'.charCodeAt(0)) || (ccode >= 'A'.charCodeAt(0) && ccode <= 'Z'.charCodeAt(0)) || (ccode == '_'.charCodeAt(0))) {
                            ReadSym();
                            break;
                        }
                        //fprintf(stderr, "Unexpected token '%c'\n", *cur);
                        //return(false);
                }
                ++cur;
            }
            return (streamOfTokens);
        };
        var VisualizeSpaces = function(d) {
            d = d.replace(/\n/g, '↵\n');
            d = d.replace(/ /g, '˽');
            return (d);
        };
        var folders = ['Header Files', 'Source Files'];
        var isDebugging = false;
        this.testCode = function() {
            var err = [];
            editor.foreach(function(file) {
                // console.log(file);
                if (file.name.substr(-2) == '.c' || file.name.substr(-2) == '.h' || file.name.substr(-4) == '.cpp' || file.name.substr(-4) == '.hpp') {
                    var code = file.content.split('\n');
                    if (file.name.substr(-2) == '.h' || file.name.substr(-4) == '.hpp') {
                        if (code[0].substr(0, 7) != '#ifndef' || code[1].substr(0, 7) != '#define') {
                            err.push(['Ожидался <a href="#" onclick="DS.page.help(\'header-guards\');">Header guards</a>', file.name, 1]);
                        }
                    }
                    var tcPrev = 0;
                    for (var i = 0, l = code.length; i < l; ++i) {
                        var str = code[i];
                        var pFound = false;
                        for (var j = 0, jl = str.length; j < jl; ++j) {
                            if (/\s/.test(str[j])) {
                                continue;
                            }
                            if (pFound) {
                                if (str.substr(j, 7) == 'include' && /\.(c|cpp)["\>]/.test(str.substr(j + 7))) {
                                    err.push(['Включать можно только заголовочные файлы', file.name, i + 1]);
                                }
                                break;
                            }
                            if (str[j] == '#') {
                                pFound = true;
                            }
                        }
                        var tc = 0;
                        for (var j = 0, jl = str.length; j < jl; ++j) {
                            if (str[j] == '\t') {
                                ++tc;
                            } else if (str[j] == ' ') {
                                err.push(['Выравнивание должно выполняться табуляцией', file.name, i + 1]);
                                break;
                            } else {
                                break;
                            }
                        }
                        // console.log(tc);
                        if (Math.abs(tc - tcPrev) > 1) {
                            // err.push(['Количество отступов в соседних строках не должно отличаться больше чем на 1', file.name, i + 1]);
                        }
                        tcPrev = tc;
                        /* var bFound = false;
                        var cFound = false;
                        var inDC = false;
                        var inSC = false;
                        for(var j = 0, jl = str.length; j < jl; ++j){
                        	if(str[j] == '"'){
                        		inDC = !inDC;
                        	}
                        	if(inDC){
                        		continue;
                        	}
                        	if(str[j] == '\''){
                        		inSC = !inSC;
                        	}
                        	if(inSC){
                        		continue;
                        	}
                        	
                        	if(!bFound && (str[j] == '{' || str[j] == '}')){
                        		bFound = true;
                        	}
                        	else if(str[j] != '\t' && str[j] != ' '){
                        		cFound = true;
                        	}
                        }
                        if(bFound && cFound){
                        	err.push(['Фигурная скобка должна быть на отдельной строке', file.name, i + 1]);
                        } */
                    }
                    var lexs = Tokenize(file.content);
                    console.log(lexs);
                    var validClass = null;
                    var countOpenBraces = 0;
                    var structUnionsCount = 0;
                    for (var i = 0, l = lexs.length; i < l; ++i) {
                        var lex = lexs[i];
                        if (lex.tokenClass == 'IDENTIFIER' && i + 2 < l && (lexs[i + 2].tokenClass == '{' || lexs[i + 2].tokenClass == ':')) {
                            var className = lexs[i + 1].lexeme;
                            if (lex.lexeme == 'class') {
                                if (file.name != className + '.h' && file.name != className + '.hpp') {
                                    err.push(['Класс ' + className + ' должен быть описать в файлах ' + className + '.h и ' + className + '.cpp', file.name, 0]);
                                } else {
                                    validClass = className;
                                }
                            } else if (lex.lexeme == 'struct' || lex.lexeme == 'union' || lex.lexeme == 'enum') {
                                ++structUnionsCount;
                            }
                            // console.error(className);
                        }
                        if (lex.tokenClass == '{') {
                            ++countOpenBraces;
                        }
                    }
                    if (validClass && (countOpenBraces - structUnionsCount) > 1) {
                        err.push(['Методы класса ' + validClass + ' должны быть реализованы в файле ' + validClass + '.cpp', file.name, 0]);
                    }
                }
            });
            return (err.length ? err : null);
        };
        var PromptTestRun = function(reallyPrompt) {
            var RunWithInput = function(input) {
                DS.progressWindow('Выполнение...');
                editor.saveAll(function() {
                    var test = self.testCode();
                    if (test) {
                        var msg = [];
                        for (var i = 0, l = test.length; i < l; ++i) {
                            msg.push(test[i][1] + ':' + test[i][2] + ' - ' + test[i][0]);
                        }
                        DS.invokeEvent('arm/error', msg.join("\n"));
                        DS.progressWindow();
                        DS.msg('Найдены ошибки оформления кода', 'red');
                        return;
                    }
                    DS.ARM.runTaskWithInput(idTask, input, function(d) {
                        console.warn(d);
                        DS.progressWindow();
                        if (d.success) {
                            DS.invokeEvent('arm/info', 'Вывод программы\n' + '---------------\n' + VisualizeSpaces(d.data.test_run_text) + '\n' + '---------------\n' + 'Код возврата: ' + d.data.exit_code + '\n');
                        }
                    });
                });
            };
            var input = DS.page.getTaskField('test-input') || '';
            if (input && !reallyPrompt) {
                RunWithInput(input);
                DS.msg('Для установки входных данных удерживайте Shift при нажатии');
                return;
            }
            var wnd = DS.create({
                DStype: 'window',
                position: 'auto',
                destroyOnClose: true,
                reqWidth: 600,
                items: [
                    ['title', 'Запуск', '->', {
                        DStype: 'window-button-close'
                    }], {
                        DStype: 'form-panel',
                        items: [{
                            DStype: 'list-layout',
                            items: [{
                                DStype: 'textarea',
                                editor: false,
                                label: 'Входные данные',
                                'class': 'monotype code',
                                name: 'input_data'
                            }, {
                                DStype: 'column-layout',
                                items: [{
                                    DStype: 'button',
                                    label: 'Запуск!',
                                    listeners: {
                                        click: function() {
                                            var $form = this.getForm();
                                            var data = $form.getFields();
                                            DS.page.setTaskField('test-input', data.input_data);
                                            $form.parent().close();
                                            RunWithInput(data.input_data);
                                        }
                                    }
                                }, {
                                    DStype: 'button',
                                    label: 'Отладка',
                                    listeners: {
                                        click: function() {
                                            var $form = this.getForm();
                                            var data = $form.getFields();
                                            DS.page.setTaskField('test-input', data.input_data);
                                            $form.parent().close();
                                            // RunWithInput(data.input_data);
                                            self.saveAll(function() {
                                                if (data.input_data.length) {
                                                    DS.ARM.debugStartWithInput(idTask, data.input_data, function(d) {});
                                                } else {
                                                    DS.ARM.debugStart(idTask, function(d) {});
                                                }
                                            });
                                        }
                                    }
                                }]
                            }]
                        }]
                    }
                ]
            }).open();
            wnd.find('form-panel')[0].setFields({
                input_data: input
            });
        };
        var initWidget = function(element) {
            rootWidget = DS.create({
                DStype: 'list-layout',
                renderTo: element
                    // ,blockstyle: 'position: relative;height: 100%;overflow: hidden;'
                    ,
                wrapClass: 'code-base',
                items: [{
                    DStype: 'div'
                        // ,blockstyle: 'position: absolute; top: 30px; left: 0; bottom: 30px; right: 0;'
                        ,
                    blockstyle: 'position: absolute; top: 0; left: 0; bottom: 30px; right: 0;',
                    items: [{
                        DStype: 'div'
                            // ,blockstyle: 'background-color: rgba(0,255,0,0.3);position: absolute;top: 0; left: 0; width: 300px; bottom: 0'
                            ,
                        id: 'editor_area_left',
                        items: [{
                            DStype: 'tree',
                            root: 'Проект'
                                // ,editable: true
                                ,
                            name: 'files_tree',
                            items: [],
                            listeners: {
                                click: function(data) {
                                    data = DS.gel(data.object).getData();
                                    if (data.isFile) {
                                        editor.openFile(data.id);
                                    }
                                    // console.warn(data);
                                }
                            },
                            menuObj: DS.create({
                                DStype: 'menu',
                                display: false,
                                items: [{
                                    text: _('Добавить новый файл'),
                                    name: 'add',
                                    listeners: {
                                        click: function(o) {
                                            var data = DS.gel(this.parent().obj).getData();
                                            if (data.isFolder) {
                                                var folderId = data.id.substr(2);
                                                DS.create({
                                                    DStype: 'window',
                                                    position: 'auto',
                                                    destroyOnClose: true,
                                                    reqWidth: 300,
                                                    items: [
                                                        ['title', {
                                                            DStype: 'html',
                                                            html: '<span style="cursor: default">Новый файл</span>'
                                                        }, '->', {
                                                            DStype: 'window-button-close'
                                                        }], {
                                                            DStype: 'form-panel',
                                                            items: [{
                                                                DStype: 'list-layout',
                                                                items: [{
                                                                    DStype: 'combo',
                                                                    label: 'Раздел',
                                                                    items: (function() {
                                                                        var items = [];
                                                                        for (var i = 0, l = folders.length; i < l; ++i) {
                                                                            items.push({
                                                                                text: folders[i],
                                                                                value: i
                                                                            });
                                                                        }
                                                                        return (items);
                                                                    })(),
                                                                    value: folderId,
                                                                    name: 'folder'
                                                                }, {
                                                                    DStype: 'textfield',
                                                                    label: 'Имя файла',
                                                                    name: 'filename'
                                                                }, {
                                                                    DStype: 'button',
                                                                    label: 'Добавить',
                                                                    listeners: {
                                                                        click: function() {
                                                                            var form = this.getForm();
                                                                            var data = form.getFields();
                                                                            var bad = false;
                                                                            data.filename = data.filename.trim();
                                                                            if (!data.filename) {
                                                                                form.find('=filename')[0].AddError('Необходимо ввести имя файла');
                                                                                bad = true;
                                                                            }
                                                                            if (data.folder === '') {
                                                                                form.find('=folder')[0].AddError('Необходимо выбрать раздел');
                                                                                bad = true;
                                                                            }
                                                                            if (!bad) {
                                                                                var cont = '';
                                                                                if (data.filename.substr(-2) == '.h' || data.filename.substr(-4) == '.hpp') {
                                                                                    var len = 1;
                                                                                    if (data.filename.substr(-1) == 'p') {
                                                                                        len = 3;
                                                                                    }
                                                                                    editor.createFile(data.filename.substr(0, data.filename.length - len) + 'cpp', -1, '#include "' + data.filename + '"\n\n', true);
                                                                                    var ident = '__' + data.filename.substr(0, data.filename.length - len).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() + '_H';
                                                                                    cont = '#ifndef ' + ident + '\n#define ' + ident + '\n\n\n\n#endif\n';
                                                                                }
                                                                                editor.createFile(data.filename, data.folder, cont, true);
                                                                                form.parent().close();
                                                                            }
                                                                        }
                                                                    }
                                                                }]
                                                            }]
                                                        }
                                                    ]
                                                }).open();
                                            }
                                        }
                                    }
                                }, '-', {
                                    text: _('Копировать'),
                                    name: 'copy',
                                    listeners: {
                                        click: function(o) {
                                            var data = DS.gel(this.parent().obj).getData();
                                            var fileId = data.id;
                                            DS.create({
                                                DStype: 'window',
                                                position: 'auto',
                                                destroyOnClose: true,
                                                reqWidth: 300,
                                                items: [
                                                    ['title', {
                                                        DStype: 'html',
                                                        html: '<span style="cursor: default">Скопировать</span>'
                                                    }, '->', {
                                                        DStype: 'window-button-close'
                                                    }], {
                                                        DStype: 'form-panel',
                                                        items: [{
                                                            DStype: 'list-layout',
                                                            items: [{
                                                                DStype: 'textfield',
                                                                label: 'Имя файла',
                                                                name: 'filename'
                                                            }, {
                                                                DStype: 'button',
                                                                label: 'Сохранить',
                                                                listeners: {
                                                                    click: function() {
                                                                        var form = this.getForm();
                                                                        var data = form.getFields();
                                                                        var bad = false;
                                                                        data.filename = data.filename.trim();
                                                                        if (!data.filename) {
                                                                            form.find('=filename')[0].AddError('Необходимо ввести имя файла');
                                                                            bad = true;
                                                                        }
                                                                        if (!editor.cloneFile(fileId, data.filename)) {
                                                                            form.find('=filename')[0].AddError('Файл с таким именем уже существует');
                                                                            bad = true;
                                                                        }
                                                                        if (!bad) {
                                                                            form.parent().close();
                                                                        }
                                                                    }
                                                                }
                                                            }]
                                                        }]
                                                    }
                                                ]
                                            }).open().find('form-panel')[0].setFields({
                                                filename: editor.getFileName(fileId)
                                            });
                                        }
                                    }
                                }, {
                                    text: _('Переименовать'),
                                    name: 'ren',
                                    listeners: {
                                        click: function(o) {
                                            var data = DS.gel(this.parent().obj).getData();
                                            var fileId = data.id;
                                            DS.create({
                                                DStype: 'window',
                                                position: 'auto',
                                                destroyOnClose: true,
                                                reqWidth: 300,
                                                items: [
                                                    ['title', {
                                                        DStype: 'html',
                                                        html: '<span style="cursor: default">Переименовать</span>'
                                                    }, '->', {
                                                        DStype: 'window-button-close'
                                                    }], {
                                                        DStype: 'form-panel',
                                                        items: [{
                                                            DStype: 'list-layout',
                                                            items: [{
                                                                DStype: 'textfield',
                                                                label: 'Имя файла',
                                                                name: 'filename'
                                                            }, {
                                                                DStype: 'button',
                                                                label: 'Сохранить',
                                                                listeners: {
                                                                    click: function() {
                                                                        var form = this.getForm();
                                                                        var data = form.getFields();
                                                                        var bad = false;
                                                                        data.filename = data.filename.trim();
                                                                        if (!data.filename) {
                                                                            form.find('=filename')[0].AddError('Необходимо ввести имя файла');
                                                                            bad = true;
                                                                        }
                                                                        if (!editor.renameFile(fileId, data.filename)) {
                                                                            form.find('=filename')[0].AddError('Файл с таким именем уже существует');
                                                                            bad = true;
                                                                        }
                                                                        if (!bad) {
                                                                            form.parent().close();
                                                                        }
                                                                    }
                                                                }
                                                            }]
                                                        }]
                                                    }
                                                ]
                                            }).open().find('form-panel')[0].setFields({
                                                filename: editor.getFileName(fileId)
                                            });
                                        }
                                    }
                                }, {
                                    text: _('Удалить'),
                                    name: 'del',
                                    listeners: {
                                        click: function(o) {
                                            var data = DS.gel(this.parent().obj).getData();
                                            DS.confirm('Вы действительно хотите удалить этот файл? Это действие нельзя отменить.', function() {
                                                editor.removeFile(data.id);
                                            });
                                            console.warn(data);
                                        }
                                    }
                                }]
                            })
                        }]
                    }, {
                        DStype: 'div'
                            // ,blockstyle: 'background-color: rgba(0,0,255,0.3);position: absolute;top: 0; left: 300px; width: 10px; bottom: 0; cursor: ew-resize;'
                            ,
                        id: 'editor_area_drag'
                    }, {
                        DStype: 'div',
                        blockstyle: 'position: absolute;top: 6px; left: 210px; right: 0; bottom: 0',
                        id: 'editor_area_right',
                        items: [{
                            DStype: 'div',
                            blockstyle: 'position: absolute; top: 0; left: 0; height: 30px; right: 0;',
                            name: 'tabs_header'
                                /* ,items: [
                                	'<div class="editor_tab changed">main.cpp* <i></i></div>'
                                	,'<div class="editor_tab active">main.cpp <i></i></div>'
                                	,'<div class="editor_tab">main.h <i></i></div>'
                                ] */
                        }, {
                            DStype: 'div',
                            blockstyle: 'position: absolute; top: 30px; left: 0; bottom: 0; right: 0;' // background-color: rgba(255,0,0,0.3);
                                ,
                            name: 'tabs_code',
                            items: ['Выберите файл или создайте новый']
                        }]
                    }]
                }, {
                    DStype: 'div',
                    blockstyle: 'top: auto;bottom: 0;',
                    wrapClass: 'menu-wrapper'
                        // ,name: 'tabs_code'
                        ,
                    items: ['<div class="bbar-debug">Debug</div>']
                }, {
                    DStype: 'div',
                    blockstyle: 'height: 300px; bottom: 24px;',
                    wrapClass: 'debug-window'
                        // ,name: 'tabs_code'
                        ,
                    items: ['<div class="window-drag"></div>', '<div class="menu-wrapper"></div>', '<div class="debug-log"></div>', '<input class="debug-input" />']
                }]
            });
            debugOutput = DS.q('.debug-log', rootWidget.getObject())[0];
            (function() {
                var isResising = false;
                var mposX = 0;
                var dposX = 0;
                var divLeft = DS.gid('element-editor_area_left');
                var divDrag = DS.gid('element-editor_area_drag');
                var divRight = DS.gid('element-editor_area_right');
                DS.addEvent(divDrag, 'mousedown', function(event) {
                    isResising = true;
                    console.log(event);
                    mposX = event.clientX;
                    dposX = parseInt(DS.css(divDrag, 'left'));
                    event.stopPropagation();
                });
                DS.addEvent(window, 'mouseup', function(event) {
                    isResising = false;
                });
                DS.addEvent(window, 'mousemove', function(event) {
                    if (isResising) {
                        var left = (event.clientX - mposX + dposX);
                        if (left < 100) {
                            left = 100;
                        }
                        if (left > 600) {
                            left = 600;
                        }
                        DS.css(divDrag, 'left', left + 'px');
                        DS.css(divLeft, 'width', left + 'px');
                        DS.css(divRight, 'left', (left + 10) + 'px');
                        document.getSelection().removeAllRanges();
                    }
                });
            })();
            (function() {
                var isResising = false;
                var mposX = 0;
                var dposX = 0;
                var divLeft = DS.q('.debug-window', rootWidget.getObject())[0];
                var divDrag = DS.q('.window-drag', divLeft)[0];
                // var divRight = DS.gid('element-editor_area_right');
                DS.addEvent(divDrag, 'mousedown', function(event) {
                    isResising = true;
                    console.log(event);
                    mposX = -event.clientY;
                    dposX = parseInt(DS.css(divLeft, 'height'));
                    event.stopPropagation();
                });
                DS.addEvent(window, 'mouseup', function(event) {
                    isResising = false;
                });
                DS.addEvent(window, 'mousemove', function(event) {
                    if (isResising) {
                        var left = (-event.clientY - mposX + dposX);
                        if (left < 100) {
                            left = 100;
                        }
                        if (left > 600) {
                            left = 600;
                        }
                        // DS.css(divDrag, 'left', left+'px');
                        DS.css(divLeft, 'height', left + 'px');
                        // DS.css(divRight, 'left', (left + 10)+'px');
                        document.getSelection().removeAllRanges();
                    }
                });
            })();
            (function() {
                var btnDebug = DS.q('.bbar-debug', rootWidget.getObject())[0];
                var divWindow = DS.q('.debug-window', rootWidget.getObject())[0];
                debugInput = DS.q('.debug-input', rootWidget.getObject())[0];
                debugInput.disabled = true;
                // var divDrag = DS.q('.window-drag', divLeft)[0];
                DS.addEvent(debugInput, 'keypress', function(e) {
                    if (e.keyCode == DS.KEY.ENTER) {
                        DS.ARM.debugInput(debugInput.value + '\n', function(d) {
                            if (d.success) {
                                var span = document.createElement('span');
                                span.innerText = debugInput.value;
                                span.className = '-user-input';
                                debugOutput.appendChild(span);
                                debugOutput.appendChild(document.createElement('br'));
                                debugInput.value = '';
                                debugOutput.scrollTop = debugOutput.scrollTopMax;
                            }
                        });
                    }
                });
                DS.addEvent(btnDebug, 'click', function() {
                    divWindow.classList.add('-show');
                });
                DS.addEvent(window, 'click', function(e) {
                    var el = e.target;
                    while (el) {
                        if (el == divWindow || el == btnDebug) {
                            return;
                        }
                        el = el.parentNode;
                    }
                    divWindow.classList.remove('-show');
                    console.warn(e);
                });
            })();
        };
        var initEditor = function() {
            editor = new(function() {
                var files = [];
                var tabs = [];
                var activeTab = -1;
                window.tabs = tabs;
                var tabs_header = rootWidget.find('=tabs_header')[0].getObject();
                var tabs_code = rootWidget.find('=tabs_code')[0].getObject();
                this.createFile = function(name, folder, content, open, noUpdate) {
                    for (var i = 0, l = files.length; i < l; ++i) {
                        if (files[i] && files[i].name == name) {
                            DS.msg('Файл с таким именем уже существует', 'red');
                            return;
                        }
                    }
                    if (folder < 0) {
                        folder = 1;
                        var ext = name.substr(name.lastIndexOf('.') + 1);
                        switch (ext) {
                            case 'h':
                            case 'hpp':
                                folder = 0;
                                break;
                        }
                    }
                    files.push({
                        name: name,
                        folder: folder,
                        content: formatFragment(content)
                    });
                    if (open) {
                        this.openFile(files.length - 1, true);
                    }
                    if (!noUpdate) {
                        this.updateFilesTree();
                    }
                };
                this.updateFilesTree = function() {
                    var _folders = [];
                    for (var i = 0, l = folders.length; i < l; ++i) {
                        _folders.push({
                            title: folders[i],
                            opened: true,
                            menuconf: DS.util.htmlescape(DS.JSON.encode({
                                _default: false,
                                add: true
                            })),
                            data: {
                                isFolder: true,
                                id: 'f_' + i
                            },
                            items: []
                        });
                    }
                    for (var i = 0, l = files.length; i < l; ++i) {
                        var file = files[i];
                        if (file) {
                            _folders[file.folder].items.push({
                                title: file.name,
                                menuconf: DS.util.htmlescape(DS.JSON.encode({
                                    _default: false,
                                    del: true,
                                    ren: true,
                                    copy: true
                                })),
                                data: {
                                    isFile: true,
                                    id: i
                                },
                                items: []
                            });
                        }
                    }
                    var edt = rootWidget.find('=files_tree')[0];
                    edt.config._savedItems = _folders;
                    edt = edt.reRender();
                    edt.parent().childrens[0] = edt;
                };
                var makeMarker = function() {
                    var marker = document.createElement("div");
                    marker.style.color = "rgb(255, 0, 0)";
                    marker.style.fontSize = "24px";
                    marker.style.position = "absolute";
                    marker.style.top = "-7px";
                    marker.style.left = "-30px";
                    marker.innerHTML = "●";
                    return (marker);
                };
                this.openFile = function(id, doSave) {
                    for (var i = 0, l = tabs.length; i < l; ++i) {
                        if (tabs[i] && tabs[i].fileId == id) {
                            this.activateTab(i);
                            return;
                        }
                    }
                    var elTab = document.createElement('div');
                    //<div class="editor_tab changed">main.cpp* <i></i></div>
                    elTab.className = 'editor_tab';
                    elTab.appendChild(document.createTextNode(files[id].name + ' '));
                    var cls = document.createElement('i');
                    elTab.appendChild(cls);
                    DS.addEvent(elTab, 'click', (function(tid) {
                        return (function() {
                            this.activateTab(tid);
                        }.bind(this));
                    }.bind(this))(tabs.length));
                    DS.addEvent(cls, 'click', (function(tid) {
                        return (function(e) {
                            this.closeTab(tid);
                            e.stopPropagation();
                        }.bind(this));
                    }.bind(this))(tabs.length), true);
                    tabs_header.appendChild(elTab);
                    var div = document.createElement('div');
                    div.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0;';
                    tabs_code.appendChild(div);
                    var edt = CodeMirror(div, {
                        mode: "text/x-csrc",
                        indentWithTabs: true,
                        lineNumbers: true,
                        indentUnit: 4,
                        lineWiseCopyCut: true,
                        resetSelectionOnContextMenu: false,
                        styleActiveLine: true,
                        matchBrackets: true,
                        autoEnabled: true,
                        foldGutter: true,
                        scrollPastEnd: true,
                        highlightSelectionMatches: true,
                        gutters: ["CodeMirror-linenumbers", "breakpoints", "codeflow", "CodeMirror-lint-markers", "CodeMirror-foldgutter"],
                        extraKeys: {
                            "Ctrl-Space": "autocomplete",
                            "Ctrl-D": function(cm) {
                                    console.warn(cm);
                                    var selectedText = cm.getSelection(); // Need to grab the Active Selection
                                    if (selectedText) {
                                        var head = cm.getCursor('head');
                                        var anchor = cm.getCursor('anchor');
                                        cm.replaceSelection(selectedText + selectedText);
                                        cm.focus();
                                        cm.setSelection(head, anchor);
                                    } else {
                                        window.cm = cm;
                                        var cursor = cm.getCursor();
                                        selectedText = cm.getLine(cursor.line);
                                        var oldLine = cursor.line;
                                        var oldCh = cursor.ch;
                                        cursor.ch = selectedText.length;
                                        cm.replaceSelection('\n' + selectedText);
                                        cm.focus();
                                        cm.setCursor(oldLine, oldCh);
                                    }
                                }
                                /* ,"'('": function(cm) {
                                	cm.autoFormat(cm, '(');
                                },
                                "')'": function(cm) {
                                	cm.autoFormat(cm, ')');
                                },
                                "'\''": function(cm) {
                                	cm.autoFormat(cm, '\'');
                                },
                                "'\"'": function(cm) {
                                	cm.autoFormat(cm, '\"');
                                },
                                "'{'": function(cm) {
                                	cm.autoFormat(cm, '{');
                                },
                                "'['": function(cm) {
                                	cm.autoFormat(cm, '[');
                                },
                                "']'": function(cm) {
                                	cm.autoFormat(cm, ']');
                                }, */
                                /* "Enter": function(cm) {
                                	cm.autoFormat(cm, '13');
                                },
                                "Backspace": function(cm) {
                                	cm.autoFormat(cm, '12');
                                }, */
                                /* "Ctrl-D": function(cm) {
                                	cm.autoFormat(cm, 'CtrlD');
                                }, */
                                /* "Ctrl-Up": function(cm) {
                                	cm.autoFormat(cm, 'CtrlUp');
                                },
                                "Ctrl-Down": function(cm) {
                                	cm.autoFormat(cm, 'CtrlDown');
                                }, */
                                /* "Shift-Ctrl-Down": function(cm) {
                                	cm.autoFormat(cm, 'CtrlShiftDown');
                                } */
                        },
                        value: formatFragment(files[id].content),
                        theme: userTheme || 'vs'
                            // ,lint: true
                            ,
                        lint: {
                            getAnnotations: function(code, updateLinting, options) {
                                //debugger;
                                var listFiles = [];
                                for (var i = 0, l = tabs.length; i < l; ++i) {
                                    if (tabs[i]) {
                                        files[tabs[i].fileId].content = tabs[i].editor.getValue()
                                    }
                                }
                                for (var i = 0, l = files.length; i < l; ++i) {
                                    if (files[i]) {
                                        listFiles.push([files[i].name, files[i].content]);
                                    }
                                }
                                DS.ARM.getCodeLint(idTask, files[id].name, listFiles, function(d) {
                                    if (d.success) {
                                        var list = [];
                                        for (var i = 0, l = d.data.length; i < l; ++i) {
                                            var el = d.data[i];
                                            list.push({
                                                from: CodeMirror.Pos(el[2] - 1, el[3] - 1),
                                                to: CodeMirror.Pos(el[4] - 1, el[5]),
                                                message: el[1],
                                                severity: el[0] == 0 ? 'warning' : 'error'
                                            });
                                            // [0/1 (w/e), "msg", LineFrom, CharFrom, LineTo, CharTo]
                                        }
                                        updateLinting(list);
                                    }
                                });
                                // console.info(code, options);
                                // DS.ARM.getCodeLint
                                // updateLinting([{from: CodeMirror.Pos(1, 1),to: CodeMirror.Pos(1, 7),message: 'error',severity:'warning'}]);
                                // var found =[];
                                // var start_line = 3, end_line = 3, start_char = 2, end_char = 5;
                                // found.push({
                                // from: CodeMirror.Pos(start_line - 1, start_char),
                                // to: CodeMirror.Pos(end_line - 1, end_char),
                                // message: 'error'
                                // });
                                // console.error(found);
                                // window.updateLinting = updateLinting;
                                // window.found = found;
                                // window.cm = cm;
                                // updateLinting(cm, found);
                            },
                            'async': true
                        }
                    });
                    edt.on('change', (function(tid) {
                        return (function(e) {
                            this.updateTabs();
                        }.bind(this));
                    }.bind(this))(tabs.length));
                    (function(canPaste) {
                        edt.on('paste', function(o, e) {
                            // console.error('cmpaste', e);
                            // console.warn(e.clipboardData.getData('text/plain'));
                            // console.warn(e.clipboardData.getData('text/html'));
                            if (!canPaste(e.clipboardData.getData('text/plain')) && !canPaste(e.clipboardData.getData('text/html'), true)) {
                                e.preventDefault();
                                DS.msg('Вставка запрещена', 'red');
                                return (false);
                            }
                        });
                        edt.on('drop', function(o, e) {
                            // console.warn(e, q, w);
                            /* console.warn(e);
                            e.preventDefault();
                            return(false); */
                            if (!canPaste(e.dataTransfer.getData('text/plain')) && !canPaste(e.clipboardData.getData('text/html'), true)) {
                                e.preventDefault();
                                DS.msg('Вставка запрещена', 'red');
                                return (false);
                            }
                        });
                    })(DS.page.cb.canPaste);
                    edt.on('copy', function(o, e) {
                        // console.warn(e, q, w);
                        DS.page.cb.onCopy(e.target.value);
                        // lastCopied = e.target.value;
                    });
                    edt.on('cut', function(o, e) {
                        //DS.alert(e.target.value, 'cut');
                        // lastCopied = e.target.value;
                        DS.page.cb.onCopy(e.target.value);
                    });
                    edt.on('save', (function(tid) {
                        return (function(d) {
                            var cm = d.cm;
                            var content = files[tabs[tid].fileId].content = cm.getValue();
                            cm.doc.markClean();
                            this.updateTabs();
                            this.onSave && this.onSave(files[tabs[tid].fileId].name, content, d.cb);
                        }.bind(this));
                    }.bind(this))(tabs.length));
                    edt.on("gutterClick", (function(tid) {
                        return (function(cm, n, gutter) {
                            if (gutter != 'CodeMirror-linenumbers') {
                                return;
                            }
                            var info = cm.lineInfo(n);
                            // console.warn(info.gutterMarkers);
                            cm.setGutterMarker(n, "breakpoints", info.gutterMarkers && info.gutterMarkers.breakpoints ? null : makeMarker());
                            // cm.setGutterMarker(n, "codeflow", info.gutterMarkers ? null : makeMarker2());
                            if (isDebugging) {
                                DS.ARM.debugToggleBreakpoint(files[tabs[tid].fileId].name, n + 1, function(d) {
                                    UpdateBreakpoints();
                                });
                            }
                        });
                    })(tabs.length));
                    tabs.push({
                        fileId: id,
                        elTab: elTab,
                        elTabContent: div,
                        editor: edt
                    });
                    // window.edt = edt;
                    this.activateTab(tabs.length - 1);
                    if (doSave) {
                        // edt.doc.changeGeneration(true);
                        this.onSave && this.onSave(files[tabs[tabs.length - 1].fileId].name, files[tabs[tabs.length - 1].fileId].content);
                    }
                };
                this.activateTab = function(id) {
                    activeTab = id;
                    this.updateTabs();
                    var cm = tabs[activeTab].editor;
                    cm.refresh();
                    // load editor
                };
                this.getFileName = function(id) {
                    return (files[id] && files[id].name);
                };
                this.removeFile = function(id) {
                    if (!files[id]) {
                        return;
                    }
                    for (var i = 0, l = tabs.length; i < l; ++i) {
                        if (tabs[i] && tabs[i].fileId == id) {
                            this.closeTab(i);
                            break;
                        }
                    }
                    this.onRemove(files[id].name);
                    files[id] = false;
                    this.updateFilesTree();
                }
                this.renameFile = function(id, new_name) {
                    if (!files[id]) {
                        return (false);
                    }
                    for (var i = 0, l = files.length; i < l; ++i) {
                        if (files[i] && files[i].name == new_name) {
                            DS.msg('Файл с таким именем уже существует', 'red');
                            return (false);
                        }
                    }
                    this.onRename(files[id].name, new_name);
                    files[id].name = new_name;
                    this.updateTabs();
                    this.updateFilesTree();
                    return (true);
                };
                this.cloneFile = function(id, new_name) {
                    if (!files[id]) {
                        return (false);
                    }
                    for (var i = 0, l = files.length; i < l; ++i) {
                        if (files[i] && files[i].name == new_name) {
                            DS.msg('Файл с таким именем уже существует', 'red');
                            return (false);
                        }
                    }
                    this.createFile(new_name, files[id].folder, files[id].content, true);
                    return (true)
                };
                this.closeTab = function(id) {
                    if (activeTab == id) {
                        activeTab = -1;
                    }
                    var fn = function() {
                        tabs_header.removeChild(tabs[id].elTab);
                        tabs_code.removeChild(tabs[id].elTabContent);
                        tabs[id] = false;
                        this.updateTabs();
                    }.bind(this);
                    if (!tabs[id].editor.doc.isClean()) {
                        DS.confirm('Имеются несохраненные изменения. Закрыть?', fn);
                    } else {
                        fn();
                    }
                };
                this.updateTabs = function() {
                    for (var i = 0, l = tabs.length; i < l; ++i) {
                        var tab = tabs[i];
                        if (tab) {
                            DS.util[!tab.editor.doc.isClean() ? 'addClass' : 'removeClass'](tab.elTab, 'changed');
                            DS.util[i == activeTab ? 'addClass' : 'removeClass'](tab.elTab, 'active');
                            DS.css(tab.elTabContent, 'display', [i == activeTab ? 'block' : 'none']);
                            tab.elTab.firstChild.textContent = files[tab.fileId].name + (!tab.editor.doc.isClean() ? '*' : '') + ' ';
                        }
                    }
                };
                this.setTheme = function(theme) {
                    for (var i = 0, l = tabs.length; i < l; ++i) {
                        tabs[i] && tabs[i].editor.setOption('theme', theme);
                    }
                    userTheme = theme;
                };
                this.saveAll = function(cb) {
                    var count = tabs.length;
                    if (!count) {
                        cb && cb();
                        return;
                    }
                    for (var i = 0, l = count; i < l; ++i) {
                        if (tabs[i] && !tabs[i].editor.doc.isClean()) {
                            CodeMirror.signal(tabs[i].editor, 'save', {
                                cm: tabs[i].editor,
                                cb: function() {
                                    if (!--count) {
                                        cb && cb();
                                    }
                                }
                            });
                        } else {
                            if (!--count) {
                                cb && cb();
                            }
                        }
                    }
                };
                this.closeAll = function() {
                    for (var i = 0, l = tabs.length; i < l; ++i) {
                        tabs[i] && this.closeTab(i);
                    }
                };
                this.clear = function() {
                    this.closeAll();
                    tabs = [];
                    files = [];
                    this.updateFilesTree();
                };
                this.refresh = function() {
                    for (var i = 0, l = tabs.length; i < l; ++i) {
                        tabs[i] && tabs[i].editor.refresh();
                    }
                };
                this.foreach = function(cb) {
                    for (var i = 0, l = files.length; i < l; ++i) {
                        files[i] && cb(files[i]);
                    }
                };
                this.onSave = function(name, code, cb) {
                    DS.ARM.saveTaskFile(idTask, name, code, function(d) {
                        if (d.success) {
                            DS.msg('Файл ' + DS.util.htmlescape(name) + ' успешно сохранен', 'green');
                        } else {
                            DS.msg('Не удалось сохранить файл ' + DS.util.htmlescape(name), 'red');
                        }
                        cb && cb(d);
                    });
                };
                /* this.getCM = function(tab){
                	return(tabs[tab].editor);
                }; */
                this.onRemove = function(name) {
                    DS.ARM.removeTaskFile(idTask, name, function(d) {
                        if (d.success) {
                            DS.msg('Файл ' + DS.util.htmlescape(name) + ' успешно удален', 'green');
                        } else {
                            DS.msg('Не удалось удалить файл ' + DS.util.htmlescape(name), 'red');
                        }
                    });
                };
                this.onRename = function(old_name, new_name) {
                    DS.ARM.renameTaskFile(idTask, old_name, new_name, function(d) {
                        if (d.success) {
                            DS.msg('Файл ' + DS.util.htmlescape(name) + ' успешно переименован', 'green');
                        } else {
                            DS.msg('Не удалось переименовать файл ' + DS.util.htmlescape(name), 'red');
                        }
                    });
                };
                this.getBreakPoints = function() {
                    var bps = {};
                    for (var i = 0, l = tabs.length; i < l; ++i) {
                        if (tabs[i]) {
                            var cm = tabs[i].editor;
                            var fileName = files[tabs[i].fileId].name;
                            for (var j = 0;; ++j) {
                                var line = cm.lineInfo(j);
                                if (!line) {
                                    break;
                                }
                                if (line.gutterMarkers && line.gutterMarkers.breakpoints) {
                                    if (!(fileName in bps)) {
                                        bps[fileName] = [];
                                    }
                                    bps[fileName].push(line.line + 1);
                                }
                            }
                        }
                    }
                    return (bps);
                };
                this.setBreakPoints = function(bps) {
                    for (var i = 0, l = tabs.length; i < l; ++i) {
                        if (tabs[i]) {
                            var cm = tabs[i].editor;
                            for (var j = 0;; ++j) {
                                var line = cm.lineInfo(j);
                                if (!line) {
                                    break;
                                }
                                if (line.gutterMarkers && line.gutterMarkers.breakpoints) {
                                    cm.setGutterMarker(line.line, "breakpoints", null);
                                }
                            }
                        }
                    }
                    for (var file in bps) {
                        var cm = null;
                        for (var i = 0, l = tabs.length; i < l; ++i) {
                            if (tabs[i] && files[tabs[i].fileId].name == file) {
                                cm = tabs[i].editor;
                                break;
                            }
                        }
                        if (cm) {
                            var lines = bps[file];
                            for (var i = 0, l = lines.length; i < l; ++i) {
                                cm.setGutterMarker(lines[i] - 1, "breakpoints", makeMarker());
                            }
                        }
                    }
                    /* for(var i = 0, l = tabs.length; i < l; ++i){
                    	if(tabs[i]){
                    		var cm = tabs[i].editor;
                    		cm.refresh();
                    	}
                    } */
                };
                var makeMarker2 = function() {
                    var marker = document.createElement("div");
                    marker.style.color = "rgb(255, 179, 0)";
                    marker.style.fontSize = "21px";
                    marker.style.position = "absolute";
                    marker.style.top = "-9px";
                    marker.style.left = "-27px";
                    marker.innerHTML = "❱";
                    // color: rgb(255, 179, 0); font-size: 21px; position: absolute; top: -9px; left: -27px;
                    return (marker);
                };
                var _runlineEditor = null;
                var _runlineNo = -1;
                this.setRunLine = function(file, line) {
                    if (_runlineEditor) {
                        // _runlineEditor
                        _runlineEditor.setGutterMarker(_runlineNo, "codeflow", null);
                    }
                    var idFile = -1;
                    for (var i = 0, l = files.length; i < l; ++i) {
                        if (files[i].name == file) {
                            idFile = i;
                            break;
                        }
                    }
                    if (idFile >= 0) {
                        this.openFile(idFile);
                        for (var i = 0, l = tabs.length; i < l; ++i) {
                            if (tabs[i] && tabs[i].fileId == idFile) {
                                var cm = tabs[i].editor;
                                _runlineEditor = cm;
                                _runlineNo = parseInt(line);
                                cm.setGutterMarker(_runlineNo, "codeflow", makeMarker2());
                                return;
                            }
                        }
                        // var info = cm.lineInfo(n);
                        // console.warn(info.gutterMarkers);
                        // cm.setGutterMarker(n, "breakpoints", info.gutterMarkers && info.gutterMarkers.breakpoints ? null : makeMarker());
                        // editor
                    }
                };
            })();
        };
        this.setRunLine = function(file, line) {
            editor.setRunLine(file, line);
        };
        this.getTitle = function() {
            return ('Исходный код'); // tab title
        };
        var fnModeChange = function() {
            var isDark = DS.page.userPrefs.get('arm/darkMode');
            userTheme = DS.page.userPrefs.get('task/codeTheme/' + (isDark ? 'dark' : 'bright')) || (isDark ? 'cobalt' : 'vs');
            if ($menuTheme) {
                var list = $menuTheme.find('checkbox');
                for (var i = 0, l = list.length; i < l; ++i) {
                    list[i].checked(false);
                }
                editor.setTheme(userTheme);
                list = $menuTheme.find('topmenu-item');
                for (var i = 0, l = list.length; i < l; ++i) {
                    if (list[i].config.text == userTheme) {
                        list[i].find('checkbox')[0].checked(true);
                        break;
                    }
                }
            }
        };
        var IsButtonEnabled = function(b) {
            return (topMenuDebugNext && !DS.util.hasClass(topMenuDebugNext, '-disabled'));
        }
        var HandleHotkey = function(e) {
            if (e.key == 'F5') {
                if (e.ctrlKey) {
                    if (IsButtonEnabled(topMenuRun)) {
                        PromptTestRun(e.shiftKey);
                    }
                } else if (IsButtonEnabled(topMenuDebugRun)) {
                    if (e.shiftKey) {
                        PromptTestRun(e.shiftKey);
                    } else {
                        topMenuDebugRun.click();
                    }
                } else {
                    if (e.shiftKey) {
                        if (IsButtonEnabled(topMenuDebugStop)) {
                            topMenuDebugStop.click();
                        }
                    } else {
                        if (IsButtonEnabled(topMenuDebugContinue)) {
                            topMenuDebugContinue.click();
                        }
                    }
                }
            } else if (e.key == 'F10') {
                if (IsButtonEnabled(topMenuDebugNext)) {
                    topMenuDebugNext.click();
                }
            } else if (e.key == 'F11') {
                if (e.shiftKey) {
                    if (IsButtonEnabled(topMenuDebugFinish)) {
                        topMenuDebugFinish.click();
                    }
                } else {
                    if (IsButtonEnabled(topMenuDebugStep)) {
                        topMenuDebugStep.click();
                    }
                }
            }
        };
        var EnableButton = function(b, yesNo) {
            if (b) {
                DS.util[yesNo ? 'removeClass' : 'addClass'](b, '-disabled');
            }
        }
        UpdateBreakpoints = function() {
            DS.ARM.debugListBreakpoints(function(d) {
                if (d.success) {
                    editor.setBreakPoints(d.data);
                }
            });
        };
        var self = this;
        var _curFrameFile = null;
        var _curFrameFunc = null;
        var _watchLocalState = {};
        var _states = {
            hidden: new function() {
                this.on = function() {
                    isDebugging = false;
                    DS.page.topMenu.removeButton(topMenuDebugStep);
                    topMenuDebugStep = null;
                    DS.page.topMenu.removeButton(topMenuDebugNext);
                    topMenuDebugNext = null;
                    DS.page.topMenu.removeButton(topMenuDebugFinish);
                    topMenuDebugFinish = null;
                    DS.page.topMenu.removeButton(topMenuDebugContinue);
                    topMenuDebugContinue = null;
                    DS.page.topMenu.removeButton(topMenuDebugStop);
                    topMenuDebugStop = null;
                    DS.page.topMenu.removeButton(topMenuRun);
                    topMenuRun = null;
                    DS.page.topMenu.removeButton(topMenuDebugRun);
                    topMenuDebugRun = null;
                    DS.removeEvent(window, 'keyup', HandleHotkey);
                    localsWnd.close();
                };
                this.off = function() {
                    topMenuRun = DS.page.topMenu.addButton('<img src="/static/images/start-icon.png" style="height: 22px;vertical-align: middle;"> Запуск');
                    DS.addEvent(topMenuRun, 'click', function(e) {
                        PromptTestRun(e.shiftKey);
                    });
                    topMenuRun.title = '[Ctrl+F5]';
                    DS.addEvent(window, 'keyup', HandleHotkey);
                    topMenuDebugRun = DS.page.topMenu.addButton('<img src="/static/images/debug-icon.png" style="height: 22px;vertical-align: middle;"> Отладка');
                    topMenuDebugRun.title = '[F5]';
                    DS.addEvent(topMenuDebugRun, 'click', function(e) {
                        debugOutput.innerHTML = '';
                        if (e.shiftKey) {
                            PromptTestRun(e.shiftKey);
                        } else {
                            self.saveAll(function() {
                                DS.ARM.debugStart(idTask, editor.getBreakPoints(), function(d) {
                                    if (d.success) {
                                        // SetState();
                                        UpdateBreakpoints();
                                    }
                                });
                            });
                        }
                    });
                    if (!topMenuDebugNext) {
                        topMenuDebugNext = DS.page.topMenu.addButton('<img src="/static/images/step-over-24.png" style="height: 24px;vertical-align: middle;">');
                        DS.addEvent(topMenuDebugNext, 'click', function(e) {
                            DS.ARM.debugNext(function(d) {});
                        });
                        topMenuDebugNext.title = 'Шаг с обходом [F10]';
                        EnableButton(topMenuDebugNext, false);
                    }
                    if (!topMenuDebugStep) {
                        topMenuDebugStep = DS.page.topMenu.addButton('<img src="/static/images/step-into-24.png" style="height: 24px;vertical-align: middle;">');
                        DS.addEvent(topMenuDebugStep, 'click', function(e) {
                            DS.ARM.debugStep(function(d) {});
                        });
                        topMenuDebugStep.title = 'Шаг с заходом [F11]';
                        EnableButton(topMenuDebugStep, false);
                    }
                    if (!topMenuDebugFinish) {
                        topMenuDebugFinish = DS.page.topMenu.addButton('<img src="/static/images/step-out-24.png" style="height: 24px;vertical-align: middle;">');
                        DS.addEvent(topMenuDebugFinish, 'click', function(e) {
                            DS.ARM.debugFinish(function(d) {});
                        });
                        topMenuDebugFinish.title = 'Выход [Shift+F11]';
                        EnableButton(topMenuDebugFinish, false);
                    }
                    if (!topMenuDebugContinue) {
                        topMenuDebugContinue = DS.page.topMenu.addButton('<img src="/static/images/play-24.png" style="height: 24px;vertical-align: middle;">');
                        DS.addEvent(topMenuDebugContinue, 'click', function(e) {
                            DS.ARM.debugContinue(function(d) {});
                        });
                        topMenuDebugContinue.title = 'Продолжить [F5]';
                        EnableButton(topMenuDebugContinue, false);
                    }
                    if (!topMenuDebugStop) {
                        topMenuDebugStop = DS.page.topMenu.addButton('<img src="/static/images/stop-24.png" style="height: 24px;vertical-align: middle;">');
                        DS.addEvent(topMenuDebugStop, 'click', function(e) {
                            DS.ARM.debugEnd(function(d) {
                                // if(d.success){
                                // onDebugStarted();
                                // }
                            });
                        });
                        topMenuDebugStop.title = 'Остановить [Shift+F5]';
                        EnableButton(topMenuDebugStop, false);
                    }
                    isDebugging = true;
                };
            },
            stopped: new function() {
                this.on = function() {
                    EnableButton(topMenuRun, true);
                    EnableButton(topMenuDebugRun, true);
                    localsWnd.close();
                    _curFrameFile = null;
                    _curFrameFunc = null;
                    _watchLocalState = {};
                };
                this.off = function() {
                    EnableButton(topMenuRun, false);
                    EnableButton(topMenuDebugRun, false);
                    localsWnd.open();
                };
            },
            running: new function() {
                this.on = function() {
                    debugInput.disabled = false;
                    EnableButton(topMenuDebugStop, true);
                    DS.q('.debug-window', rootWidget.getObject())[0].classList.add('-show');
                };
                this.off = function() {
                    debugInput.disabled = true;
                    EnableButton(topMenuDebugStop, false);
                };
            },
            paused: new function() {
                this.on = function() {
                    EnableButton(topMenuDebugNext, true);
                    EnableButton(topMenuDebugStep, true);
                    EnableButton(topMenuDebugContinue, true);
                    // EnableButton(topMenuDebugFinish, true);
                    EnableButton(topMenuDebugStop, true);
                };
                this.off = function() {
                    editor.setRunLine(null);
                    EnableButton(topMenuDebugNext, false);
                    EnableButton(topMenuDebugStep, false);
                    EnableButton(topMenuDebugContinue, false);
                    EnableButton(topMenuDebugFinish, false);
                    EnableButton(topMenuDebugStop, false);
                };
            }
        };
        var _currentState = null;
        var SetState = function(s) {
            if (_currentState) {
                if (_currentState[0] == s) {
                    return;
                }
                _currentState[1].off();
            }
            console.info('State: ' + (_currentState ? _currentState[0] : 'null') + ' -> ' + s);
            if (!(s in _states)) {
                throw 'Unknown state ' + s;
            }
            _currentState = [s, _states[s]];
            _currentState[1].on();
        };
        var onDebugOutput = function(d) {
            if ( /* d.data[0][0] == 'CONSOLE' ||  */ d.data[0][0] == 'STDOUT' || d.data[0][0] == 'STDERR') {
                debugOutput.appendChild(document.createTextNode(d.data[0][1]));
                debugOutput.scrollTop = debugOutput.scrollTopMax;
            } else if (d.data[0][0] == 'CONSOLE') {
                var i = document.createElement('i');
                i.innerText = d.data[0][1];
                debugOutput.appendChild(i);
                debugOutput.scrollTop = debugOutput.scrollTopMax;
            }
            console.log('onDebugOutput', d);
        };
        var onDebugStarted = function() {
            DS.page.topMenu.removeButton(topMenuDebugRun);
            topMenuDebugRun = null;
            topMenuDebugStop = DS.page.topMenu.addButton('<img src="/static/images/debug-icon.png" style="height: 22px;vertical-align: middle;"> Остановить');
            DS.addEvent(topMenuDebugStop, 'click', function(e) {
                DS.ARM.debugEnd(function(d) {
                    // if(d.success){
                    // onDebugStarted();
                    // }
                });
            });
            // var topMenuDebugStep;
            // var topMenuDebugNext;
            // var topMenuDebugFinish;
        };
        var onDebugStopped = function(d) {
            console.log('onDebugStopped', d);
            // debugInput.disabled = true;
            SetState('paused');
        };
        var onDebugRunning = function(d) {
            console.log('onDebugRunning', d);
            SetState('running');
            // editor.setRunLine(null);
            // debugInput.disabled = false;
            // DS.page.topMenu.removeButton(topMenuDebugStep);
            // topMenuDebugStep = null;
            // DS.page.topMenu.removeButton(topMenuDebugNext);
            // topMenuDebugNext = null;
            // DS.page.topMenu.removeButton(topMenuDebugFinish);
            // topMenuDebugFinish = null;
            // DS.page.topMenu.removeButton(topMenuDebugContinue);
            // topMenuDebugContinue = null;
        };
        var onDebugExited = function(d) {
            console.log('onDebugExited', d);
            SetState('stopped');
        };
        var onDebugFrameChanged = function(d) {
            console.log('onDebugFrameChanged', d);
            if (d.data[0]) {
                editor.setRunLine(d.data[0].file, d.data[0].line - 1);
                EnableButton(topMenuDebugFinish, d.data[0].func != 'main');
                var locals = d.data[0].locals;
                var grid = localsWnd.find('grid')[0];
                var oldStore = grid.config.store;
                var store = [];
                for (var i = 0, l = locals.length; i < l; ++i) {
                    var loc = locals[i];
                    loc.__hidden = (oldStore.length == locals.length) ? (oldStore[i].__hidden) : (loc.level != 0);
                    store.push(loc);
                }
                grid.config.store = store;
                grid.render();
            }
        };
        // var onAuthorized = function(){
        // DS.ARM.debugQueryState();
        // };
        var onDisconnected = function() {
            onDebugExited();
        };
        var _hasFiles = false;
        // Initialize all required stuff, use `element` as render root
        this.initialize = function(element) {
            idTask = DS.page.getTaskField('id');
            CodeMirror.commands.save = function(editor) {
                CodeMirror.signal(editor, 'save', {
                    cm: editor,
                    cb: function() {}
                });
            };
            element.classList.add('-debugger');
            document.body.appendChild(cmStyle);
            initWidget(element);
            initEditor();
            //cobalt
            var isDark = DS.page.userPrefs.get('arm/darkMode');
            userTheme = DS.page.userPrefs.get('task/codeTheme/' + (isDark ? 'dark' : 'bright')) || (isDark ? 'cobalt' : 'vs');
            var menuItems = [];
            for (var i = 0, l = themes.length; i < l; ++i) {
                menuItems.push({
                    text: themes[i],
                    icon: {
                        DStype: 'checkbox',
                        value: userTheme == themes[i]
                    },
                    listeners: {
                        click: function() {
                            var list = this.find('!checkbox');
                            for (var j = 0, jl = list.length; j < jl; ++j) {
                                list[j].checked(false);
                            }
                            var cb = this.find('checkbox')[0];
                            var isDark = DS.page.userPrefs.get('arm/darkMode');
                            DS.page.userPrefs.set('task/codeTheme/' + (isDark ? 'dark' : 'bright'), this.config.text);
                            DS.page.userPrefs.save();
                            cb.checked(true);
                            editor.setTheme(this.config.text);
                        }
                    }
                });
            }
            DS.addEvent(DS, 'darkmode/deactivate', fnModeChange);
            DS.addEvent(DS, 'darkmode/activate', fnModeChange);
            $menuTheme = DS.create({
                DStype: 'topmenu',
                items: menuItems
            });
            var userSize = DS.page.userPrefs.get('task/codeTheme/size') || 13;
            cmStyle.innerHTML = '.CodeMirror{font-size: ' + userSize + 'px}';
            menuItems = [];
            for (var i = 12; i <= 36; ++i) {
                menuItems.push({
                    text: i,
                    icon: {
                        DStype: 'checkbox',
                        value: userSize == i
                    },
                    listeners: {
                        click: function() {
                            var list = this.find('!checkbox');
                            for (var j = 0, jl = list.length; j < jl; ++j) {
                                list[j].checked(false);
                            }
                            var cb = this.find('checkbox')[0];
                            DS.page.userPrefs.set('task/codeTheme/size', this.config.text);
                            DS.page.userPrefs.save();
                            cb.checked(true);
                            cmStyle.innerHTML = '.CodeMirror{font-size: ' + this.config.text + 'px}';
                            editor && editor.refresh();
                        }
                    }
                });
            }
            $menuSize = DS.create({
                DStype: 'topmenu',
                items: menuItems
            });
            DS.ARM.getTaskFiles(idTask, function(d) {
                if (d.success) {
                    if (localStorage.getItem('IMPORT') && localStorage.getItem('IMPORT_ENTER')) {
                        localStorage.setItem('IMPORT_ENTER', false);
                        for (var i = 0, l = d.data.length; i < l; ++i) {
                            DS.ARM.removeTaskFile(idTask, d.data[i].name, function() {});
                        }
                        d.data = DS.JSON.decode(localStorage.getItem('IMPORT'));
                    }
                    for (var i = 0, l = d.data.length; i < l; ++i) {
                        _hasFiles = true;
                        editor.createFile(d.data[i].name, -1, d.data[i].file, false, true);
                        DS.ARM.saveTaskFile(idTask, d.data[i].name, d.data[i].file, function() {});
                        editor.updateFilesTree();
                    }
                }
            });
            // editor.createFile('main.cpp', 0, 'void main(){}', false, true);
            // editor.createFile('main.h', 1, '#ifndef _MAIN_H_');
            DS.addEvent(DS, 'msg/' + ARMmessage.DBG_OUTPUT, onDebugOutput);
            DS.addEvent(DS, 'msg/' + ARMmessage.DBG_STOPPED, onDebugStopped);
            DS.addEvent(DS, 'msg/' + ARMmessage.DBG_RUNNING, onDebugRunning);
            DS.addEvent(DS, 'msg/' + ARMmessage.DBG_EXITED, onDebugExited);
            DS.addEvent(DS, 'msg/' + ARMmessage.DBG_FRAME_CHANGED, onDebugFrameChanged);
            // DS.addEvent(DS, 'arm/authorized', onAuthorized);
            DS.addEvent(DS, 'ws/disconnected', onDisconnected);
            localsWnd = DS.create({
                DStype: 'window'
                    // ,destroyOnClose: true
                    ,
                reqWidth: 600,
                items: [
                    ['title', 'Locals'], {
                        DStype: 'grid',
                        'class': 'debugger-watch',
                        store: [
                            /*{
                            	name: 'argc'
                            	,value: '0'
                            	,type: 'int'
                            	,level: 0
                            	,__hidden: false
                            }
                            ,{
                            	name: 'argv'
                            	,value: '0x0000000000000000'
                            	,type: 'char**'
                            	,level: 0
                            	,__hidden: false
                            }
                            ,{
                            	name: ''
                            	,value: '<Unable to read memory>'
                            	,type: 'char*'
                            	,level: 1
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDesc'
                            	,value: ''
                            	,type: 'GXBlendDesc'
                            	,level: 0
                            	,__hidden: false
                            }
                            ,{
                            	name: 'useAlphaToCoverage'
                            	,value: '0'
                            	,type: 'int'
                            	,level: 1
                            	,__hidden: true
                            }
                            ,{
                            	name: 'useIndependentBlend'
                            	,value: '0'
                            	,type: 'int'
                            	,level: 1
                            	,__hidden: true
                            }
                            ,{
                            	name: 'renderTarget'
                            	,value: '0x0000002f2bb3f318'
                            	,type: 'GXBlendDesc::GXBlendRTdesc[8]'
                            	,level: 1
                            	,__hidden: true
                            }
                            ,{
                            	name: '[0]'
                            	,value: ''
                            	,type: 'GXBlendDesc::GXBlendRTdesc'
                            	,level: 2
                            	,__hidden: true
                            }
                            ,{
                            	name: 'useBlend'
                            	,value: '1'
                            	,type: 'int'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcColor'
                            	,value: 'GXBLEND_SRC_ALPHA (5)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstColor'
                            	,value: 'GXBLEND_INV_SRC_ALPHA (6)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpColor'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcAlpha'
                            	,value: 'GXBLEND_SRC_ALPHA (5)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstAlpha'
                            	,value: 'GXBLEND_INV_SRC_ALPHA (6)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpAlpha'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'u8RenderTargetWriteMask'
                            	,value: '15 \'\\xf\''
                            	,type: 'unsigned char'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: '[1]'
                            	,value: ''
                            	,type: 'GXBlendDesc::GXBlendRTdesc'
                            	,level: 2
                            	,__hidden: true
                            }
                            ,{
                            	name: 'useBlend'
                            	,value: '0'
                            	,type: 'int'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcColor'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstColor'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpColor'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcAlpha'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstAlpha'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpAlpha'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'u8RenderTargetWriteMask'
                            	,value: '15 \'\\xf\''
                            	,type: 'unsigned char'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: '[2]'
                            	,value: ''
                            	,type: 'GXBlendDesc::GXBlendRTdesc'
                            	,level: 2
                            	,__hidden: true
                            }
                            ,{
                            	name: 'useBlend'
                            	,value: '0'
                            	,type: 'int'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcColor'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstColor'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpColor'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcAlpha'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstAlpha'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpAlpha'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'u8RenderTargetWriteMask'
                            	,value: '15 \'\\xf\''
                            	,type: 'unsigned char'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: '[3]'
                            	,value: ''
                            	,type: 'GXBlendDesc::GXBlendRTdesc'
                            	,level: 2
                            	,__hidden: true
                            }
                            ,{
                            	name: 'useBlend'
                            	,value: '0'
                            	,type: 'int'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcColor'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstColor'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpColor'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcAlpha'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstAlpha'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpAlpha'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'u8RenderTargetWriteMask'
                            	,value: '15 \'\\xf\''
                            	,type: 'unsigned char'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: '[4]'
                            	,value: ''
                            	,type: 'GXBlendDesc::GXBlendRTdesc'
                            	,level: 2
                            	,__hidden: true
                            }
                            ,{
                            	name: 'useBlend'
                            	,value: '0'
                            	,type: 'int'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcColor'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstColor'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpColor'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcAlpha'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstAlpha'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpAlpha'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'u8RenderTargetWriteMask'
                            	,value: '15 \'\\xf\''
                            	,type: 'unsigned char'
                            	,__hidden: true
                            }
                            ,{
                            	name: '[5]'
                            	,value: ''
                            	,type: 'GXBlendDesc::GXBlendRTdesc'
                            	,level: 2
                            	,__hidden: true
                            }
                            ,{
                            	name: 'useBlend'
                            	,value: '0'
                            	,type: 'int'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcColor'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstColor'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpColor'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcAlpha'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstAlpha'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpAlpha'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'u8RenderTargetWriteMask'
                            	,value: '15 \'\\xf\''
                            	,type: 'unsigned char'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: '[6]'
                            	,value: ''
                            	,type: 'GXBlendDesc::GXBlendRTdesc'
                            	,level: 2
                            	,__hidden: true
                            }
                            ,{
                            	name: 'useBlend'
                            	,value: '0'
                            	,type: 'int'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcColor'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstColor'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpColor'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcAlpha'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstAlpha'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpAlpha'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'u8RenderTargetWriteMask'
                            	,value: '15 \'\\xf\''
                            	,type: 'unsigned char'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: '[7]'
                            	,value: ''
                            	,type: 'GXBlendDesc::GXBlendRTdesc'
                            	,level: 2
                            	,__hidden: true
                            }
                            ,{
                            	name: 'useBlend'
                            	,value: '0'
                            	,type: 'int'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcColor'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstColor'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpColor'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendSrcAlpha'
                            	,value: 'GXBLEND_ONE (2)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendDstAlpha'
                            	,value: 'GXBLEND_ZERO (1)'
                            	,type: 'GXBLEND'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'blendOpAlpha'
                            	,value: 'GXBLEND_OP_ADD (1)'
                            	,type: 'GXBLEND_OP'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'u8RenderTargetWriteMask'
                            	,value: '15 \'\\xf\''
                            	,type: 'unsigned char'
                            	,level: 3
                            	,__hidden: true
                            }
                            ,{
                            	name: 'i'
                            	,value: '4'
                            	,type: 'unsigned int'
                            	,level: 0
                            	,__hidden: false
                            }*/
                        ],
                        fields: [{
                            header: 'Name',
                            dataIndex: 'name',
                            width: '20%',
                            renderer: function(d, row, j) {
                                var grid = this;
                                var store = this.config.store;
                                var hasNestedRows = store.length > j + 1 && store[j + 1].level > row.level;
                                var isCollapsed = hasNestedRows && store[j + 1].__hidden;
                                var imgUrl = 'url(' + DS.config.img_url + 'tree-button-' + (isCollapsed ? 'open' : 'close') + '.png)';
                                var df = document.createDocumentFragment();
                                for (var i = 0; i < row.level; ++i) {
                                    var spacer = document.createElement('div');
                                    spacer.className = '-collapse-button-spacer';
                                    df.appendChild(spacer);
                                }
                                var div = document.createElement('div');
                                if (hasNestedRows) {
                                    div.style.backgroundImage = imgUrl;
                                    div.className = '-collapse-button';
                                    DS.addEvent(div, 'click', function() {
                                        var lvl = row.level;
                                        var newState = !store[j + 1].__hidden;
                                        for (var i = j + 1, l = store.length; i < l; ++i) {
                                            if (store[i].level <= lvl) {
                                                break;
                                            }
                                            if (newState || store[i].level == lvl + 1) {
                                                store[i].__hidden = newState;
                                            }
                                        }
                                        grid.render();
                                    });
                                } else {
                                    div.className = '-collapse-button-spacer';
                                }
                                df.appendChild(div);
                                var t = document.createTextNode(d);
                                df.appendChild(t);
                                // return(df);
                                var div = document.createElement('div');
                                div.appendChild(df);
                                div.className = '-debugger-cell';
                                div.title = div.textContent;
                                return (div);
                            }
                        }, {
                            header: 'Value',
                            dataIndex: 'value',
                            renderer: function(d, row, j) {
                                var store = this.config.store;
                                var hasNestedRows = store.length > j + 1 && store[j + 1].level > row.level;
                                var text = [d];
                                if (hasNestedRows) {
                                    var lvl = row.level;
                                    text.push(' {');
                                    var countFields = 0;
                                    for (var i = j + 1, l = store.length; i < l; ++i) {
                                        if (store[i].level <= lvl) {
                                            break;
                                        }
                                        if (store[i].level == lvl + 1) {
                                            if (countFields > 3) {
                                                text.push(', ...');
                                                break;
                                            }
                                            if (countFields) {
                                                text.push(', ');
                                            }
                                            if (store[i].name.length) {
                                                text.push(store[i].name);
                                                text.push('=');
                                            }
                                            text.push(store[i].value);
                                            if (i + 1 < l && store[i].level + 1 == store[i + 1].level) {
                                                text.push(store[i].value.length ? ' {...}' : '{...}');
                                            }
                                            ++countFields;
                                        }
                                    }
                                    text.push('}');
                                }
                                var div = document.createElement('div');
                                div.appendChild(document.createTextNode(text.join('')));
                                div.className = '-debugger-cell';
                                div.title = div.textContent;
                                return (div);
                                // return(document.createTextNode(text.join('')));
                                return (document.createTextNode(text.join('')));
                            }
                        }, {
                            header: 'Type',
                            dataIndex: 'type',
                            width: '15%',
                            renderer: function(d) {
                                var div = document.createElement('div');
                                div.appendChild(document.createTextNode(d));
                                div.className = '-debugger-cell';
                                div.title = div.textContent;
                                return (div);
                            }
                        }]
                    }
                ]
            });
            SetState('hidden');
            window.editor = editor;
        };
        // close task, finish all tasks and network queries, then run callback
        this.shutdown = function(callback) {
            DS.removeEvent(DS, 'msg/' + ARMmessage.DBG_OUTPUT, onDebugOutput);
            DS.removeEvent(DS, 'msg/' + ARMmessage.DBG_STOPPED, onDebugStopped);
            DS.removeEvent(DS, 'msg/' + ARMmessage.DBG_RUNNING, onDebugRunning);
            DS.removeEvent(DS, 'msg/' + ARMmessage.DBG_EXITED, onDebugExited);
            DS.removeEvent(DS, 'msg/' + ARMmessage.DBG_FRAME_CHANGED, onDebugFrameChanged);
            // DS.removeEvent(DS, 'arm/authorized', onAuthorized);
            DS.removeEvent(DS, 'ws/disconnected', onDisconnected);
            DS.removeEvent(DS, 'darkmode/deactivate', fnModeChange);
            DS.removeEvent(DS, 'darkmode/activate', fnModeChange);
            $menuSize.remove();
            $menuTheme.remove();
            DS.ARM.debugEnd(function() {
                SetState('hidden');
                localsWnd.remove();
                editor.saveAll(function() {
                    editor.closeAll();
                    document.body.removeChild(cmStyle);
                    rootWidget.remove();
                    callback();
                });
            });
        };
        // called after page show
        this.show = function() {
            topMenuTheme = DS.page.topMenu.addButton('Тема');
            $menuTheme.attach(topMenuTheme, 'click');
            topMenuSize = DS.page.topMenu.addButton('Шрифт');
            $menuSize.attach(topMenuSize, 'click');
            SetState('stopped');
            /* topMenuRun = DS.page.topMenu.addButton('<img src="/static/images/start-icon.png" style="height: 22px;vertical-align: middle;"> Запуск');
            DS.addEvent(topMenuRun, 'click', function(e){
            	PromptTestRun(e.shiftKey);
            });
            topMenuRun.title = 'F5';
			
            DS.addEvent(window, 'keyup', HandleF5); */
            if (!DS.page.getTaskField('is_code_available') && !_hasFiles) {
                DS.alert('Редактирование кода будет доступно после того, как предыдущая задача будет сдана');
            }
        };
        // called before page hide
        this.hide = function() {
            DS.page.topMenu.removeButton(topMenuTheme);
            DS.page.topMenu.removeButton(topMenuSize);
            DS.ARM.debugEnd(function() {
                SetState('hidden');
            });
        };
        this.getScripts = function() {
            return (['CodeMirror/lib/codemirror.js', 'CodeMirror/mode/clike/clike.js', 'CodeMirror/addon/hint/show-hint.js', 'CodeMirror/addon/hint/anyword-hint.js', 'CodeMirror/addon/edit/matchbrackets.js', 'CodeMirror/addon/edit/auto-format.js', 'CodeMirror/addon/lint/lint.js', 'CodeMirror/addon/fold/brace-fold.js', 'CodeMirror/addon/fold/foldcode.js', 'CodeMirror/addon/fold/foldgutter.js', 'CodeMirror/addon/search/match-highlighter.js', 'CodeMirror/addon/scroll/scrollpastend.js', ]);
        };
        this.getStyles = function() {
            var list = ['CodeMirror/lib/codemirror.css', 'CodeMirror/addon/hint/show-hint.css', 'CodeMirror/addon/lint/lint.css', 'css/modules/task-code.css', 'CodeMirror/addon/fold/foldgutter.css', ];
            for (var i = 0, l = themes.length; i < l; ++i) {
                if (themes[i] != 'default') {
                    list.push('CodeMirror/theme/' + themes[i] + '.css');
                }
            }
            return ({
                both: list,
                light: [
                    // 'css/modules/task-light.css'
                    'css/modules/task-code-dark.css'
                ],
                dark: []
            });
        };
        this.saveAll = function(cb) {
            editor.saveAll(cb);
        };
    });
});
