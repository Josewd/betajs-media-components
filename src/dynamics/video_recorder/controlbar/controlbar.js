Scoped.define("module:VideoRecorder.Dynamics.Controlbar", [
    "dynamics:Dynamic",
    "module:Assets",
    "base:Timers.Timer",
    "browser:Info"
], [
    "dynamics:Partials.ShowPartial",
    "dynamics:Partials.RepeatPartial"
], function(Class, Assets, Timer, Info, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<%= template(dirname + '/video_recorder_controlbar.html') %>",

                attrs: {
                    "css": "ba-videorecorder",
                    "csscommon": "ba-commoncss",
                    "cssrecorder": "ba-recorder",
                    "hovermessage": "",
                    "videoselectnotification": null,
                    "ismobile": false,
                    "recordingindication": true,
                    "covershot_accept_string": "image/*,image/png,image/jpg,image/jpeg"
                },

                events: {
                    "change:settingsopen": function(visible) {
                        if (visible) {
                            var availableCamerasCount = this.get("cameras").count();
                            if (this.get("cameras").count() < 1) {
                                this.set("videoselectnotification", this.string('no-video-source'));
                            } else {
                                if (availableCamerasCount > 1 && this.get("addstreamdeviceid")) {
                                    this.set("videoselectnotification", this.string('stream-already-selected'));
                                    return;
                                }
                                this.get("cameras").iterate(function(item) {
                                    if (availableCamerasCount === 1 && this.get("addstreamdeviceid") === item.data().id) {
                                        this.set("videoselectnotification", this.string('stream-already-selected'));
                                    }
                                }, this);
                            }
                        } else {
                            this.set("videoselectnotification", null);
                        }
                    }
                },

                create: function() {
                    this.set("ismobile", Info.isMobile());
                    this.auto_destroy(new Timer({
                        context: this,
                        fire: function() {
                            this.set("recordingindication", !this.get("recordingindication") && !this.__parent.__paused);
                        },
                        delay: 500
                    }));
                },

                functions: {
                    selectCamera: function(cameraId) {
                        this.trigger("select-camera", cameraId);
                    },
                    selectMicrophone: function(microphoneId) {
                        this.trigger("select-microphone", microphoneId);
                    },
                    toggleFaceMode: function() {
                        this.trigger("toggle-face-mode");
                    },
                    addNewStream: function(deviceId) {
                        this.set("settingsopen", false);
                        this.set("hovermessage", "");
                        this.trigger("add-new-stream", deviceId);
                    },
                    hover: function(text) {
                        this.set("hovermessage", text);
                    },
                    unhover: function() {
                        this.set("hovermessage", "");
                    },
                    record: function() {
                        this.trigger("invoke-record");
                    },
                    rerecord: function() {
                        this.trigger("invoke-rerecord");
                    },
                    stop: function() {
                        this.trigger("invoke-stop");
                    },
                    pause: function() {
                        this.trigger("invoke-pause");
                    },
                    resume: function() {
                        this.trigger("invoke-resume");
                    },
                    skip: function() {
                        this.trigger("invoke-skip");
                    },
                    cancel: function() {
                        this.trigger("invoke-cancel");
                    },
                    uploadCovershot: function(domEvent) {
                        this.trigger("upload-covershot", domEvent[0].target);
                    }
                }

            };
        })
        .register("ba-videorecorder-controlbar")
        .registerFunctions({
            /*<%= template_function_cache(dirname + '/video_recorder_controlbar.html') %>*/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "settings": "Settings",
            "camerahealthy": "Lighting is good",
            "cameraunhealthy": "Lighting is not optimal",
            "microphonehealthy": "Sound is good",
            "microphoneunhealthy": "Cannot pick up any sound",
            "record": "Record",
            "record-tooltip": "Click here to record.",
            "rerecord": "Redo",
            "rerecord-tooltip": "Click here to redo.",
            "upload-covershot": "Upload Cover",
            "upload-covershot-tooltip": "Click here to upload custom cover shot",
            "stop": "Stop",
            "stop-tooltip": "Click here to stop.",
            "skip": "Skip",
            "skip-tooltip": "Click here to skip.",
            "stop-available-after": "Minimum recording time is %d seconds",
            "cancel": "Cancel",
            "cancel-tooltip": "Click here to cancel.",
            "add-stream": "Add Stream",
            "pause-recorder": "Pause Recorder",
            "resume-recorder": "Resume Recorder",
            "no-video-source": "Missing additional video input source",
            "stream-already-selected": "Additional stream has been already selected"
        });
});