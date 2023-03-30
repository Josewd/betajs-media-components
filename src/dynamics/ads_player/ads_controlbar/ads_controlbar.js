Scoped.define("module:Ads.Dynamics.Controlbar", [
    "dynamics:Dynamic",
    "browser:Dom",
    "base:Maths",
    "base:TimeFormat",
    "module:Assets"
], function(Dynamic, Dom, Maths, TimeFormat, Assets, scoped) {
    return Dynamic.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<%= template(dirname + '/ads_controlbar.html') %>",

                attrs: {
                    css: "ba-videoplayer",
                    cssplayer: "ba-player",
                    csscommon: "ba-commoncss",
                    showcontrolbar: true,
                    showbanner: false,
                    media: null,
                    playing: false,
                    volume: 1,
                    disablepause: false,
                    title: null,
                    pausedonclick: false,
                    clickthroughurl: null,
                    fullscreened: false,
                    hidebarafter: 5000,
                    // if controlbar is hidden, touch on screen should make it visible,
                    // and not handle click trough action, as user may want to use controlbar options
                    controlbarisvisible: true,
                    skippable: false, // Set when skip not exists in XML file and user set
                    skipoffset: -1
                },

                channels: {
                    "ads:pause": function() {
                        this.set("playing", false);
                    },
                    "ads:start": function() {
                        this.set("playing", true);
                        this.set("currentTime", 0);
                        this.set("remaining", this.get("duration"));
                    },
                    "ads:resume": function() {
                        this.set("playing", true);
                    },
                    "ads:adProgress": function(event) {
                        this.set("currentTime", event.getAdData().currentTime);
                        this.set("remaining", this.get("duration") - event.getAdData().currentTime);
                    }
                },

                create: function() {
                    if (!this.get("remaining") && this.get("duration")) this.set("remaining", this.get("duration"));
                },

                functions: {

                    formatTime: function(time) {
                        return TimeFormat.format(TimeFormat.ELAPSED_MINUTES_SECONDS, Math.round(time) * 1000);
                    },

                    startUpdateVolume: function(args, element) { // TODO this was copied from the video player, should refactor to keep it DRY
                        var event = args[0];
                        var moveEvent = event.type === "mousedown" ? "mousemove" : "touchmove";
                        var stopEvent = event.type === "mousedown" ? "mouseup" : "touchend";
                        var domRect = element.getBoundingClientRect();
                        event.preventDefault();

                        var updateVolume = function(event) {
                            event.preventDefault();
                            if (domRect.width > domRect.height) {
                                // Horizontal slider
                                var x = event.clientX;
                                if (!x && Array.isArray(event.touches)) x = event.touches[0].clientX;
                                this.set("volume", Maths.clamp((x - domRect.x) / domRect.width, 0, 1));
                            } else {
                                // Vertical slider
                                var y = event.clientY;
                                if (!y && Array.isArray(event.touches)) y = event.touches[0].clientY;
                                this.set("volume", Maths.clamp((domRect.bottom - y) / domRect.height, 0, 1));
                            }
                            this.trigger("volume", this.get("volume"));
                        }.bind(this);

                        updateVolume(event);

                        document.addEventListener(moveEvent, updateVolume);
                        document.addEventListener(stopEvent, function() {
                            document.removeEventListener(moveEvent, updateVolume);
                        }, {
                            once: true
                        });
                    },

                    resume: function() {
                        this.trigger("resume");
                    },

                    toggle_player: function() {
                        if (this.get("playing")) {
                            this.trigger("pause");
                        } else {
                            this.trigger("play");
                        }
                    },

                    pause: function() {
                        this.trigger("pause");
                    },

                    set_volume: function(value) {
                        this.trigger("volume", value);
                    },

                    toggle_volume: function() {
                        var volume = this.get("volume");
                        if (volume > 0) this.__lastVolume = volume;
                        volume = volume > 0 ? 0 : (this.__lastVolume || 1);
                        this.trigger("volume", volume);
                    },

                    skip_linear_ad: function() {
                        this.trigger("stop");
                    },

                    toggle_fullscreen: function() {
                        var fullscreenElement = this._element;
                        if (this.get("fullscreened")) {
                            Dom.documentExitFullscreen(fullscreenElement);
                        } else {
                            Dom.elementEnterFullscreen(fullscreenElement);
                        }
                    }
                }
            };
        }).register("ba-ads-controlbar")
        .registerFunctions({
            /*<%= template_function_cache(dirname + '/ads_controlbar.html') %>*/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "elapsed-time": "Elapsed time",
            "volume-button": "Set volume",
            "volume-mute": "Mute sound",
            "volume-unmute": "Unmute sound",
            "ad-will-end-after": "Ad will end after %s",
            "can-skip-after": "Skip after %d",
            "skip-ad": "Skip ad"
        });
});