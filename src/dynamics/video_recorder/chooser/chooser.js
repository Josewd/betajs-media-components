Scoped.define("module:VideoRecorder.Dynamics.Chooser", [
    "dynamics:Dynamic",
    "module:Assets",
    "browser:Info"
], [
    "dynamics:Partials.RepeatPartial",
    "dynamics:Partials.ClickPartial",
    "dynamics:Partials.IfPartial"
], function(Class, Assets, Info, scoped) {

    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<%= template(dirname + '/video_recorder_chooser.html') %>",

                attrs: {
                    "css": "ba-videorecorder",
                    "csscommon": "ba-commoncss",
                    "cssrecorder": "ba-recorder",
                    "allowrecord": true,
                    "allowupload": true,
                    "allowscreen": false,
                    "allowmultistreams": false,
                    "facecamera": true,

                    "primaryrecord": true,
                    "recordviafilecapture": false,

                    "allowcustomupload": true,
                    "allowedextensions": null,
                    "onlyaudio": false,
                    "parentpopup": false,

                    /* Messages */
                    "initialmessages": []
                },

                types: {
                    "allowedextensions": "array",
                    "recordviafilecapture": "boolean",
                    "facecamera": "boolean",
                    "parentpopup": "boolean",
                    "initialmessages": "array"
                },

                collections: ["actions"],

                create: function() {
                    var custom_accept_string = "";
                    if (this.get("allowedextensions") && this.get("allowedextensions").length > 0) {
                        var browser_support = Info.isEdge() || Info.isChrome() || Info.isOpera() || (Info.isFirefox() && Info.firefoxVersion() >= 42) || (Info.isInternetExplorer() && Info.internetExplorerVersion() >= 10);
                        if (browser_support)
                            custom_accept_string = "." + this.get("allowedextensions").join(",.");
                    } else if (!this.get("allowcustomupload")) {
                        custom_accept_string = "video/*,video/mp4";
                    }

                    var order = [];
                    if (this.get("primaryrecord")) {
                        if (this.get("allowrecord"))
                            order.push("record");
                        if (this.get("allowscreen"))
                            order.push("screen");
                        if (this.get("allowmultistreams"))
                            order.push("multistream");
                        if (this.get("allowupload"))
                            order.push("upload");
                    } else {
                        if (this.get("allowscreen"))
                            order.push("screen");
                        if (this.get("allowupload"))
                            order.push("upload");
                        if (this.get("allowrecord"))
                            order.push("record");
                        if (this.get("allowmultistreams"))
                            order.push("multistream");
                    }
                    var actions = this.get("actions");
                    order.forEach(function(act, index) {
                        switch (act) {
                            case "record":
                                actions.add({
                                    type: "record",
                                    index: index,
                                    icon: !this.get("onlyaudio") ? 'videocam' : 'volume-up',
                                    label: this.string(this.get("onlyaudio") ? "record-audio" : "record-video"),
                                    select: Info.isMobile() && !(Info.isAndroid() && Info.isCordova()) && this.get("recordviafilecapture"),
                                    capture: true,
                                    accept: "video/*,video/mp4;capture=camcorder",
                                    // capture attribute value
                                    // If this attribute is missing, the user agent is free to decide on its own what to do.
                                    // If the requested facing mode isn't available, the user agent may fall back to its preferred default mode
                                    switchcamera: this.get("facecamera") ? "user" : "environment"
                                });
                                break;
                            case "upload":
                                actions.add({
                                    type: "upload",
                                    index: index,
                                    icon: "upload",
                                    label: this.string("upload-video"),
                                    select: !(Info.isiOS() && Info.isCordova()) && !this.get("parentpopup"),
                                    accept: Info.isMobile() && !(Info.isAndroid() && Info.isCordova()) ? "video/*,video/mp4" : custom_accept_string
                                });
                                break;
                            case "screen":
                                actions.add({
                                    type: "screen",
                                    index: index,
                                    icon: "television",
                                    label: this.string("record-screen")
                                });
                                break;
                            case "multistream":
                                actions.add({
                                    type: "multistream",
                                    index: index,
                                    icon: "plus",
                                    label: this.string("multi-stream")
                                });
                                break;
                        }
                    }, this);
                },

                functions: {
                    click_action: function(action) {
                        if (action.get("select"))
                            return;
                        if (action.get("type") === "screen" || action.get("type") === "multistream") {
                            this.trigger("record-screen", action.get("type") === "multistream");
                            return;
                        }
                        if (Info.isMobile() && Info.isCordova()) {
                            var self = this;
                            if (Info.isAndroid()) {
                                navigator.device.capture.captureVideo(function(mediaFiles) {
                                    self.trigger("upload", mediaFiles[0]);
                                }, function(error) {}, {
                                    limit: 1,
                                    duration: this.get("timelimit")
                                });
                            } else if (Info.isiOS()) {
                                navigator.camera.getPicture(function(url) {
                                    self.trigger("upload", {
                                        localURL: url,
                                        fullPath: url
                                    });
                                }, function(error) {}, {
                                    destinationType: Camera.DestinationType.FILE_URI,
                                    sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                                    mediaType: Camera.MediaType.VIDEO
                                });
                            }
                        } else
                            this.trigger("record");
                    },

                    select_file_action: function(action, domEvent) {
                        if (!action.get("select"))
                            return;
                        this.trigger("upload", domEvent[0].target);
                    },

                    close_message: function(id) {
                        if (typeof Array.prototype.filter !== 'undefined')
                            this.set("initialmessages", this.get("initialmessages").filter(function(item) {
                                return item.id !== id;
                            }));
                    }

                }

            };
        })
        .registerFunctions({
            /*<%= template_function_cache(dirname + '/video_recorder_chooser.html') %>*/
        })
        .register("ba-videorecorder-chooser")
        .attachStringTable(Assets.strings)
        .addStrings({
            "record-video": "Record Video",
            "record-audio": "Record Audio",
            "record-screen": "Record Screen",
            "multi-stream": "Multi Stream",
            "upload-video": "Upload Video"
        });
});