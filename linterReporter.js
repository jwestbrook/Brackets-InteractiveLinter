/**
 * Interactive Linter Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require, exports, module) {
    'use strict';

    require('string');


    function reporter() {
        var _self = this;
        _self.marks = {};
    }


    /**
    * Routine that goes through all the jshint messages and generates data
    * that can be consumed by codemirror (cm).
    *
    * @param messages {Array} jshint messages
    * @param cm {CodeMirror} codemirror instance
    * @param settings {Object} jshint settings to further refine what does and doesn't
    *                       get reported
    */
    reporter.prototype.report = function(cm, messages) {
        var _self = this;
        var token;
        _self.clearMarks();
        _self.checkFatal(messages);
        _self.cm = cm;
        _self.messages = messages;

        $.each(messages.slice(0), function (index, message) {
            if (!message) {
                return;
            }

            token = message.token;

            if (token){
                // Add marks to gutter and line
                _self.addGutterMarks(message, token);
            }
        });

        return this;
    };


    /**
    * Add reporting information in code mirror's document
    *
    * Message requires:
    * - type,
    * - code,
    * - raw,
    * - reason,
    * - href
    */
    reporter.prototype.addGutterMarks = function(message, token) {
        var _self = this, mark;

        if( !_self.marks[token.start.line] ) {
            _self.marks[token.start.line] = {
                warnings: [],
                errors: [],
                lineMarks:[],
                gutterMark: {
                    element: $("<div class='interactive-linter-gutter-messages' title='Click for details'>&nbsp;</div>")
                }
            };

            mark = _self.marks[token.start.line];
            mark.gutterMark.line = _self.cm.setGutterMarker(token.start.line, "interactive-linter-gutter", mark.gutterMark.element[0]);
        }

        // Add marks to the line that is reporting messages
        mark = _self.marks[token.start.line];
        mark.lineMarks.push({
            line: _self.cm.markText(token.start, token.end, {className: "interactive-linter-" + message.type}),
            message: message
        });

        // Increment errors/warnings count
        if ( mark[message.type + "s"] ) {
            mark[message.type + "s"].push(message);
        }

        // If we have errors in this line, then we will add a class to the gutter to
        //highlight this fact.  Further more, I make sure I add this class only once...
        if ( message.type === "error" && mark.errors.length === 1 ) {
            mark.gutterMark.element.addClass('interactive-linter-gutter-errors');
        }
    };


    /**
    * Clears all warning/errors from codemirror's document
    */
    reporter.prototype.clearMarks = function() {
        var _self = this;

        if (!_self.cm ){
            return;
        }

        _self.cm.clearGutter("interactive-linter-gutter");

        $.each( _self.marks, function( index, mark ) {
            $.each( mark.lineMarks.slice(0), function(i1, textMark) {
                textMark.line.clear();
            });

            if (mark.lineWidget) {
                mark.lineWidget.widget.clear();
                delete mark.lineWidget;
            }

            delete mark.errors;
            delete mark.warnings;
            delete mark.lineMarks;
            delete mark.gutterMarks;
        });

        _self.marks = {};
    };


    reporter.prototype.showLineDetails = function(cm, lineIndex) {
        var mark = this.marks[lineIndex];

        // We don't have mark on this line, so we don't do anything...
        // This is just a line without any JSHint messages
        if (!mark) {
            return;
        }

        // Check if we have a line widget.  If we don't, then we set one up
        if (!mark.lineWidget) {
            mark.lineWidget = {
                visible: false,
                element: $("<div class='interactive-linter-line-messages'></div>")
            };

            $.each([].concat(mark.errors, mark.warnings), function(index, message) {
                var messageContent = "<div class='interactive-linter-line-{0} interactive-linter-line-{1}'>{2}</div>".format(message.type, message.code, message.reason);
                var $messageContent = $(messageContent);

                if (message.href) {
                    $messageContent.append(" - <a href='{0}' target='interactivelinter'>Details</a>".format(message.href));
                }

                mark.lineWidget.element.append($messageContent);
            });
        }

        if (mark.lineWidget.visible !== true) {
            var widgetSettings = {
                coverGutter: false,
                noHScroll: false,
                above: false,
                showIfHidden: false
            };

            mark.lineWidget.visible = true;
            mark.lineWidget.widget = this.cm.addLineWidget(lineIndex, mark.lineWidget.element[0], widgetSettings);
        }
        else {
            mark.lineWidget.visible = false;
            mark.lineWidget.widget.clear();
        }
    };


    /**
    * Checks messages to figure out if JSHint report a fatal failue.
    */
    reporter.prototype.checkFatal = function(messages) {
        // If the last message created by jshint is null, that means
        // that we have encoutered a fatal error...
        //
        /*
        * TODO: I would like to report the fact there is a fatal error
        * in a visual manner to the user
        */
        if (messages.length > 2 && !messages[messages.length - 1]) {
            // Get the last real error...
            var message = messages[messages.length - 2];
            console.log("Fatal failure", message);
            return true;
        }

        return false;
    };


    var linterReporter = (function () {
        var _reporter = new reporter();

        function report(cm, messages) {
            return _reporter.report(cm, messages);
        }

        function showLineDetails(cm, lineNumber, gutterId, event) {
            _reporter.showLineDetails(cm, lineNumber, gutterId, event);
        }

        return {
            report: report,
            showLineDetails: showLineDetails
        };
    })();


    return linterReporter;
});
