/*!
betajs-media-components - v0.0.397 - 2023-08-28
Copyright (c) Ziggeo,Oliver Friedmann,Rashad Aliyev
Apache-2.0 Software License.
*/

(function () {
var Scoped = this.subScope();
Scoped.binding('module', 'global:BetaJS.MediaComponents');
Scoped.binding('base', 'global:BetaJS');
Scoped.binding('browser', 'global:BetaJS.Browser');
Scoped.binding('media', 'global:BetaJS.Media');
Scoped.binding('dynamics', 'global:BetaJS.Dynamics');
Scoped.define("module:", function () {
	return {
    "guid": "7a20804e-be62-4982-91c6-98eb096d2e70",
    "version": "0.0.397",
    "datetime": 1693237475934
};
});
Scoped.assumeVersion('base:version', '~1.0.96');
Scoped.assumeVersion('browser:version', '~1.0.65');
Scoped.assumeVersion('dynamics:version', '~0.0.83');
Scoped.assumeVersion('media:version', '~0.0.191');
Scoped.define("module:Ads.IMALoader", [
    "base:Promise",
    "browser:Loader"
], function(Promise, Loader) {
    return {

        /**
         * contentComplete(); destroy(); getVersion() - string;
         * getSettings() non-null ImaSdkSettings;
         * requestAds(adsRequest, userRequestContext);
         * @param options
         * @returns {*}
         */
        loadSDK: function(options) {
            var promise = Promise.create();
            // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/architecture
            try {
                if (typeof google === "undefined") {
                    Loader.loadScript('https://imasdk.googleapis.com/js/sdkloader/ima3.js', function() {
                        promise.asyncSuccess(options && this.adsLoader(options));
                    }, this);
                } else {
                    // Just in case, check if Google is relating IMA SDK, not another Google service
                    if (typeof google.ima === "undefined") {
                        Loader.loadScript('https://imasdk.googleapis.com/js/sdkloader/ima3.js', function() {
                            promise.asyncSuccess(options && this.adsLoader(options));
                        }, this);
                    } else promise.asyncSuccess(options && this.adsLoader(options));
                }
            } catch (e) {
                promise.asyncError(e);
            }

            return promise;
        },

        /**
         *
         * @param options
         * @returns {google.ima.AdDisplayContainer}
         */
        adContainer: function(options) {
            var adDisplayContainer = new google.ima.AdDisplayContainer(
                options.adContainer, options.videoElement
            );

            // Must be done as the result of a user action on mobile
            adDisplayContainer.initialize();
            return adDisplayContainer;
        },

        /**
         * Will return adsLoader, after we have to setup lister and destroy per each adsRequest
         * @param options
         */
        adsLoader: function(options) {
            // Re-use this AdsLoader instance for the entire lifecycle of your page.
            return new google.ima.AdsLoader(this.adContainer(options));
        }
    };
});
Scoped.define("module:Ads.IMA.AdsManager", [
    "base:Class",
    "base:Objs",
    "base:Types",
    "base:Events.EventsMixin"
], function(Class, Objs, Types, EventsMixin, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (!options.adContainer) throw Error("Missing adContainer");
                // IMA SDK: This is an optional parameter but can't be null
                if (options.videoElement === null) throw Error("Missing videoElement");
                this._options = options;

                if (google && google.ima && options.IMASettings)
                    this._setIMASettings(options.IMASettings);
                this._adDisplayContainer = new google.ima.AdDisplayContainer(options.adContainer, options.videoElement);
                this._adsLoader = new google.ima.AdsLoader(this._adDisplayContainer);
                this._adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, this.onAdError.bind(this), false);
                this._adsLoader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, this.onAdsManagerLoaded.bind(this), false);
            },

            _setIMASettings: function(settings) {
                // google.ima.ImaSdkSettings.VpaidMode.DISABLED
                // DISABLED == 0 - VPAID ads will not play, and an error will be returned.
                // ENABLED == 1 - VPAID ads are enabled using a cross-domain iframe
                // INSECURE == 2 - This allows the ad access to the site via JavaScript.
                if (google && google.ima && typeof settings.vpaidMode === "number" && [
                        google.ima.ImaSdkSettings.VpaidMode.DISABLED,
                        google.ima.ImaSdkSettings.VpaidMode.ENABLED,
                        google.ima.ImaSdkSettings.VpaidMode.INSECURE
                    ].includes(settings.vpaidMode))
                    google.ima.settings.setVpaidMode(settings.vpaidMode);
                else
                    google.ima.settings.setVpaidMode(google.ima.ImaSdkSettings.VpaidMode.INSECURE);

                // boolean: Sets whether VMAP and ad rules ad breaks are automatically played
                if (settings.autoPlayAdBreaks) {
                    google.ima.settings.setAutoPlayAdBreaks(autoPlayAdBreaks);
                }

                // boolean
                if (settings.cookiesEnabled) {
                    google.ima.settings.setCookiesEnabled(settings.cookiesEnabled);
                }

                // boolean: Sets whether to disable custom playback on iOS 10+ browsers. If true, ads will play inline if the content video is inline.
                if (settings.disableCustomPlaybackForIOS10Plus) {
                    google.ima.settings.setDisableCustomPlaybackForIOS10Plus(settings.disableCustomPlaybackForIOS10Plus);
                }

                // string: Sets the publisher provided locale. Must be called before creating AdsLoader or AdDisplayContainer.
                if (settings.locale) {
                    google.ima.settings.setLocale(settings.locale);
                }

                // number: Specifies the maximum number of redirects before the subsequent redirects will be denied, and the ad load aborted.
                if (settings.numRedirects) {
                    google.ima.settings.setNumRedirects(settings.numRedirects);
                }

                // Sets the companion backfill mode. See the various modes available in ImaSdkSettings.CompanionBackfillMode.
                // The default mode is ImaSdkSettings.CompanionBackfillMode.ALWAYS.
                if (settings.companionBackfillMode) {
                    google.ima.settings.setCompanionBackfill(companionBackfillMode);
                }

                if (settings.uiElements) {
                    // ['adAttribution', 'countdown']
                    var allowedUIElements = [
                        google.ima.UiElements.AD_ATTRIBUTION, google.ima.UiElements.COUNTDOWN
                    ];
                    if (Types.is_array(settings.uiElements)) {
                        var uiElements = settings.uiElements.filter(function(element) {
                            return allowedUIElements.includes(element);
                        });
                        if (uiElements.length >= 0) {
                            this.__UIElementSettings = uiElements;
                        } else {
                            if (settings.uiElements.length > 0) {
                                console.log("Only the following UI elements as an array of values are allowed: ", allowedUIElements.join(", "));
                            }
                        }
                    } else {
                        console.log("IMA: uiElements must be an array of allowed UI elements. See https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/reference/js/google.ima#.UiElements for more information.");
                    }
                }
            },

            destroy: function() {
                if (this._adsManager) {
                    this._adsManager.destroy();
                    this._adsManager = null;
                }
                inherited.destroy.call(this);
            },

            requestAds: function(options) {
                this._adsRequest = new google.ima.AdsRequest();
                if (options.adTagUrl) this._adsRequest.adTagUrl = options.adTagUrl;
                else if (options.inlinevastxml) this._adsRequest.adsResponse = options.inlinevastxml;
                this._adsRequest.linearAdSlotWidth = options.linearAdSlotWidth;
                this._adsRequest.linearAdSlotHeight = options.linearAdSlotHeight;
                this._adsRequest.nonLinearAdSlotWidth = options.nonLinearAdSlotWidth;
                this._adsRequest.nonLinearAdSlotHeight = options.nonLinearAdSlotHeight;
                this._adsRequest.setAdWillAutoPlay(options.adWillAutoPlay);
                this._adsRequest.setAdWillPlayMuted(options.adWillPlayMuted);
                this._adsRequest.setContinuousPlayback(options.continuousPlayback);
                this._adsLoader.getSettings().setAutoPlayAdBreaks(options.autoPlayAdBreaks);
                this._adsLoader.requestAds(this._adsRequest);
                // this.once("adsManagerLoaded", function() {
                //     this._adsManager.init(options.width, options.height, google.ima.ViewMode.NORMAL);
                //     this._adsManager.setVolume(options.volume);
                //     this._adsManager.start();
                // }.bind(this));
            },

            onAdsManagerLoaded: function(adsManagerLoadedEvent) {
                var adsRenderingSettings = new google.ima.AdsRenderingSettings();
                if (this._options && this._options.adsRenderingSettings) {
                    for (var setting in this._options.adsRenderingSettings) {
                        adsRenderingSettings[setting] = this._options.adsRenderingSettings[setting];
                    }
                }
                if (this.__UIElementSettings) {
                    var uiRenderingSettings = this.__UIElementSettings;
                    if (this._options.adsRenderingSettings.uiElements) {
                        uiRenderingSettings = Objs.tree_merge(
                            this._options.adsRenderingSettings.uiElements,
                            uiRenderingSettings
                        );
                    }
                    adsRenderingSettings.uiElements = uiRenderingSettings;
                }
                this._adsManager = adsManagerLoadedEvent.getAdsManager(
                    this._options.videoElement, adsRenderingSettings
                );
                this.addEventListeners();
                this.__methods().forEach(function(method) {
                    this[method] = this._adsManager[method].bind(this._adsManager);
                }.bind(this));
                this.trigger(adsManagerLoadedEvent.type, adsManagerLoadedEvent);
            },

            onAdEvent: function(event) {
                this.trigger(event.type, event);
            },

            onAdError: function(event) {
                var message = event.message || event.errorMessage || event;
                if (event.getError) {
                    var error = event.getError();
                    if (error) {
                        message = error.getMessage() + ' Code: ' + error.getErrorCode();
                    }
                }
                this.trigger('ad-error', message);
            },

            addEventListeners: function() {
                Objs.iter(this.__events(), function(eventType) {
                    this._adsManager.addEventListener(eventType, function(event) {
                        if (event.type === google.ima.AdErrorEvent.Type.AD_ERROR) return this.onAdError(event);
                        return this.onAdEvent(event);
                    }, false, this);
                }, this);
            },

            contentComplete: function() {
                // This will allow the SDK to play post-roll ads, if any are loaded through ad rules.
                if (this._adsLoader) this._adsLoader.contentComplete();
            },

            reset: function() {
                if (this._adsManager) this._adsManager.destroy();
            },

            start: function(options) {
                if (!this._adsManager) {
                    return this.once("adsManagerLoaded", function() {
                        this.start(options);
                    }, this);
                }
                try {
                    this._adDisplayContainer.initialize();
                    this._adsManager.init(options.width, options.height, google.ima.ViewMode.NORMAL);
                    this._adsManager.setVolume(options.volume);
                    this._adsManager.start();
                } catch (e) {
                    this.onAdError(e);
                    throw e;
                }
            },

            adDisplayContainerInitialized: function() {
                return !!this.__adDisplayContainerInitialized;
            },

            initializeAdDisplayContainer: function() {
                if (this.__adDisplayContainerInitialized) return;
                this._adDisplayContainer.initialize();
                this.__adDisplayContainerInitialized = true;
            },

            __methods: function() {
                return [
                    "collapse",
                    "discardAdBreak",
                    "focus",
                    "getAdSkippableState",
                    "getCuePoints",
                    "getCurrentAd",
                    "getRemainingTime",
                    "getVolume",
                    "isCustomClickTrackingUsed",
                    "isCustomPlaybackUsed",
                    "pause",
                    "resize",
                    "resume",
                    "setVolume",
                    "skip",
                    "stop",
                    "updateAdsRenderingSettings"
                ];
            },

            __events: function() {
                return [
                    google.ima.AdErrorEvent.Type.AD_ERROR,
                    google.ima.AdEvent.Type.AD_CAN_PLAY,
                    google.ima.AdEvent.Type.IMPRESSION,
                    google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, // contentPauseRequested
                    google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, // contentResumeRequested
                    google.ima.AdEvent.Type.LOADED, // loaded
                    google.ima.AdEvent.Type.STARTED, // start
                    google.ima.AdEvent.Type.FIRST_QUARTILE, // firstQuartile
                    google.ima.AdEvent.Type.MIDPOINT, // midpoint
                    google.ima.AdEvent.Type.THIRD_QUARTILE, // thirdQuartile
                    google.ima.AdEvent.Type.COMPLETE, // complete
                    google.ima.AdEvent.Type.ALL_ADS_COMPLETED, // allAdsCompleted
                    google.ima.AdEvent.Type.PAUSED, // pause
                    google.ima.AdEvent.Type.RESUMED,
                    google.ima.AdEvent.Type.CLICK,
                    google.ima.AdEvent.Type.VIDEO_CLICKED,
                    google.ima.AdEvent.Type.AD_PROGRESS,
                    google.ima.AdEvent.Type.DURATION_CHANGE,
                    google.ima.AdEvent.Type.SKIPPED,
                    google.ima.AdEvent.Type.LINEAR_CHANGED,
                    google.ima.AdEvent.Type.VOLUME_CHANGED, // volumeChange
                    google.ima.AdEvent.Type.VOLUME_MUTED,
                    google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED,
                    google.ima.AdEvent.Type.INTERACTION,
                    google.ima.AdEvent.Type.USER_CLOSE,
                    google.ima.AdEvent.Type.VIDEO_ICON_CLICKED,
                    google.ima.AdEvent.Type.AD_BUFFERING,
                    google.ima.AdEvent.Type.AD_METADATA,
                    google.ima.AdEvent.Type.AD_BREAK_READY,
                    google.ima.AdEvent.Type.LOG
                ];
            }
        };
    }]);
});
Scoped.define("module:Ads.AbstractVideoAdProvider", [
    "base:Class"
], function(Class, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this);
                this._options = options;
            },

            options: function() {
                return this._options;
            },

            _newPrerollAd: function(options) {},
            _initAdsLoader: function(options) {},
            _newAdsRequester: function(dyn, position, autostart) {},

            newPrerollAd: function(options) {
                return this._newPrerollAd(options);
            },

            /**
             * Implementing adsense loader initialization
             * @param options
             * @returns {Promise}
             */
            initAdsLoader: function(options) {
                return this._initAdsLoader(options);
            },

            /**
             * Will request and listen via ad loader
             * @param dyn
             * @param {string} position
             * @param {boolean} autostart
             * @returns {*}
             */
            newAdsRequester: function(dyn, position, autostart) {
                return this._newAdsRequester(dyn, position, autostart);
            },

            register: function(name) {
                this.cls.registry[name] = this;
            }

        };
    }, {

        registry: {}

    });
});
Scoped.define("module:Assets", [
    "base:Classes.LocaleTable",
    "browser:Info"
], function(LocaleTable, Info) {

    var strings = new LocaleTable();
    strings.setWeakLocale(Info.language());

    return {

        strings: strings,

        playerthemes: {},

        recorderthemes: {},

        imageviewerthemes: {},

        imagecapturethemes: {},

        audioplayerthemes: {},

        audiorecorderthemes: {}

    };
});
Scoped.define("module:AudioVisualization", [
    "base:Class",
    "base:Maths",
    "browser:Dom",
    "browser:Info"
], function(Class, Maths, Dom, Info, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {
            /**
             * @param stream  // Audio stream
             * @param {object} options // additional options like height and active element
             */
            constructor: function(stream, options) {
                inherited.constructor.call(this);
                this.stream = stream;
                this.recorder = null;
                this.theme = options.theme;
                if (options.recorder) {
                    this.recorder = options.recorder;
                } else {
                    // JSLint not allow for shortcuts new(window.AudioContext || window.webkitAudioContext)
                    var AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.audioContext = new AudioContext();
                }
                this.createVisualizationCanvas(options.height, options.element);
                this.frameID = null;
            },

            createVisualizationCanvas: function(height, element) {
                var _height, _containerElement;
                _height = height || 120;
                _containerElement = (element.firstElementChild || element.firstChild);
                _containerElement.style.minHeight = _height + 'px';
                this.canvas = _containerElement.querySelector('canvas');
                this.canvas.style.display = 'block';
                this.canvas.width = parseFloat(window.getComputedStyle(_containerElement).width);
                this.canvas.height = _height;
                this.canvasContext = this.canvas.getContext("2d");
            },

            _clearCanvas: function() {
                this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
            },

            initializeVisualEffect: function() {
                try {
                    var _source;
                    if (this.recorder) {
                        this._analyser = this.recorder._analyser;
                        this.analyser = this._analyser._analyserNode;
                        this.audioContext = this._analyser._audioContext;
                        this.analyser.fftSize = 256;
                        //_source = this.audioContext.createMediaStreamSource(this.stream)
                    }

                    if (this.audioContext || this.stream) {
                        if (this.audioContext.state === 'suspended') {
                            Dom.userInteraction(function() {
                                this.audioContext.resume();
                            }, this);
                        }

                        if (this.stream instanceof HTMLElement) {
                            _source = this.audioContext.createMediaElementSource(this.stream);
                            this.analyser = this.audioContext.createAnalyser();
                            _source.connect(this.analyser);
                            this.analyser.fftSize = 256;
                            this.analyser.connect(this.audioContext.destination);
                        }

                        this.bufferLength = this.analyser.frequencyBinCount;
                        // this.dataArray = new Uint8Array(this.analyser.fftSize);
                        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                        // this.dataArray = new Float32Array(this.analyser.fftSize);
                        this.canvasWidth = this.canvas.width;
                        this.canvasHeight = this.canvas.height;
                        this.barWidth = (this.canvasWidth / this.bufferLength) * 2.5;
                        this.barHeight = 0;
                        this.x = 0;
                        //this.renderFrame = this._renderFrame;
                        // If requestAnimationFrame is missing
                        if (!window.requestAnimationFrame) {
                            window.requestAnimationFrame = (function() {
                                return window.webkitRequestAnimationFrame ||
                                    window.mozRequestAnimationFrame ||
                                    window.oRequestAnimationFrame ||
                                    window.msRequestAnimationFrame ||
                                    function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
                                        window.setTimeout(callback, 1000 / 60);
                                    };
                            })();
                            window.cancelAnimationFrame = window.cancelAnimationFrame ||
                                window.mozCancelAnimationFrame ||
                                function(requestID) {
                                    clearTimeout(requestID);
                                }; //fall back
                        }
                    } else {
                        console.warn('Seems there is limitation by browser to create AudioContext instance');
                    }
                } catch (e) {
                    //this.set('visualeffectsupported', false);
                    console.warn('Web Audio API not supported', e);
                }
            },

            start: function() {
                this._renderFrame();
            },

            pause: function() {
                this._cancelFrame();
            },

            stop: function() {
                this._cancelFrame();
                this._clearCanvas();
            },

            destroy: function() {
                if (this.canvas) this.canvas.remove();
                inherited.destroy.call(this);
            },

            _renderFrame: function() {
                this.frameID = requestAnimationFrame(function() {
                    this._renderFrame();
                }.bind(this));
                this.analyser.getByteFrequencyData(this.dataArray);
                // this.dataArray = new Float32Array( this.analyser.fftSize);
                // this.analyser.getFloatTimeDomainData(this.dataArray);
                // this._drawRedBars();
                switch (this.theme) {
                    case "red-bars":
                        this._drawRedBars();
                        break;
                    default:
                        this._drawBigBalloon();
                        break;
                }
            },

            _cancelFrame: function() {
                cancelAnimationFrame(this.frameID);
            },

            updateSourceStream: function() {
                this._cancelFrame();
                this.initializeVisualEffect();
                // this._analyser = new AudioAnalyser(this._recorder.stream());
                // this._analyser.destroy();
            },

            _drawRedBars: function() {
                this.x = 0;
                this.canvasContext.fillStyle = "#000";
                this.canvasContext.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
                for (var i = 0; i < this.bufferLength; i++) {
                    this.barHeight = this.dataArray[i] / 2;
                    var r = this.barHeight + (25 * (i / this.bufferLength));
                    var g = 250 * (i / this.bufferLength);
                    var b = 50;
                    this.canvasContext.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
                    this.canvasContext.fillRect(this.x, this.canvasHeight - this.barHeight, this.barWidth, this.barHeight);
                    this.x += this.barWidth + 1;
                }
            },

            _drawBigBalloon: function() {
                this.__canvasBackground(235);
                this.canvasContext.fillStyle = "#000";
                var s = this.__getRMS();
                this.canvasContext.fillStyle = this.__rgb(s * 2);
                this.__HfillEllipse(this.canvasWidth / 2, this.canvasHeight / 2, s * 5, s * 5);
            },

            __getRMS: function() {
                var rms = 0;
                for (var i = 0; i < this.bufferLength; i++) {
                    rms += this.dataArray[i] * this.dataArray[i];
                }
                rms /= this.dataArray.length;
                rms = Math.sqrt(rms);
                return rms;
            },

            __canvasBackground: function(r, g, b, a) {
                if (typeof g === 'undefined') {
                    this.canvasContext.fillStyle = this.__rgb(r, r, r);
                } else if (typeof b === 'undefined' && typeof a === 'undefined') {
                    this.canvasContext.fillStyle = rgba(r, r, r, g);
                } else if (typeof a === 'undefined') {
                    this.canvasContext.fillStyle = this.__rgb(r, g, b);
                } else {
                    this.canvasContext.fillStyle = this.__rgba(r, g, b, a);
                }
                this.canvasContext.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            },

            __HfillEllipse: function(x, y, width, height) {
                if (typeof height === 'undefined') height = width;
                this.__Hellipse(x, y, width, height);
                this.canvasContext.fill();
                this.canvasContext.beginPath();
            },

            __Hellipse: function(x, y, width, height) {
                'use strict';
                if (typeof height === 'undefined') height = width;
                this.canvasContext.beginPath();
                for (var i = 0; i < Math.PI * 2; i += Math.PI / 64) {
                    this.canvasContext.lineTo(x + (Math.cos(i) * width / 2), y + (Math.sin(i) * height / 2));
                }
                this.canvasContext.closePath();
            },

            __rgb: function(r, g, b) {

                if (typeof g === 'undefined') g = r;
                if (typeof b === 'undefined') b = r;
                return 'rgb(' + Maths.clamp(Math.round(r), 0, 255) + ', ' + Maths.clamp(Math.round(g), 0, 255) + ', ' + Maths.clamp(Math.round(b), 0, 255) + ')';

            },

            __rgba: function(r, g, b, a) {
                if (typeof g === 'undefined') {
                    return 'rgb(' + Maths.clamp(Math.round(r), 0, 255) + ', ' + Maths.clamp(Math.round(r), 0, 255) + ', ' + Maths.clamp(Math.round(r), 0, 255) + ')';
                } else if (typeof b === 'undefined') {
                    return 'rgba(' + Maths.clamp(Math.round(r), 0, 255) + ', ' + Maths.clamp(Math.round(r), 0, 255) + ', ' + Maths.clamp(Math.round(r), 0, 255) + ', ' + Maths.clamp(g, 0, 1) + ')';
                } else if (typeof a === 'undefined') {
                    return 'rgba(' + Maths.clamp(Math.round(r), 0, 255) + ', ' + Maths.clamp(Math.round(g), 0, 255) + ', ' + Maths.clamp(Math.round(b), 0, 255) + ', 1)';
                } else {
                    return 'rgba(' + Maths.clamp(Math.round(r), 0, 255) + ', ' + Maths.clamp(Math.round(g), 0, 255) + ', ' + Maths.clamp(Math.round(b), 0, 255) + ', ' + Maths.clamp(a, 0, 1) + ')';
                }
            }
        };
    }, {
        supported: function() {
            return !!(window.AudioContext || window.webkitAudioContext);
        }
    });
});
Scoped.define("module:DatasetProperties", [
    "base:Properties.Properties"
], function(Properties, scoped) {
    return Properties.extend({
        scoped: scoped
    }, function(inherited) {
        return {
            constructor: function(element, obj, materializes) {
                this.element = element;
                inherited.constructor.call(this, obj, materializes);
            },
            _afterSet: function(key, value) {
                this.element.dataset[key] = value;
            }
        };
    });
});
Scoped.define("module:Common.Dynamics.Helperframe", [
    "dynamics:Dynamic",
    "base:Async",
    "base:Timers.Timer",
    "base:Objs",
    "browser:Events",
    "browser:Geometry",
    "browser:Info"
], function(Class, Async, Timer, Objs, DomEvents, Geometry, Info, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            attrs: {
                "css": "ba-videorecorder",
                "framereversable": true,
                "framedragable": true,
                "frameresizeable": false,
                "framepositionx": 5,
                "framepositiony": 5,
                "frameminwidth": 120,
                "frameminheight": 95,
                "initialpositionx": null,
                "initialpositiony": null,
                "initialwidth": null,
                "initialheight": null,
                "flipframe": false,
                "frameproportional": true,
                "framemainstyle": {
                    opacity: 0.5,
                    position: 'absolute',
                    cursor: 'pointer',
                    zIndex: 100
                }
            },

            types: {
                "framereversable": "boolean",
                "framedragable": "boolean",
                "frameresizeable": "boolean",
                "frameproportional": "boolean",
                "framepositionx": "int",
                "framepositiony": "int",
                "frameminwidth": "int",
                "frameminheight": "int"
            },

            computed: {},

            events: {
                "change:framepositionx change:framepositiony change:framewidth change:frameheight": function(value) {
                    if (typeof this.recorder !== 'undefined') {
                        if (typeof this.recorder._recorder === 'object' && this.__visibleDimensions.accessible) {
                            this.recorder._recorder.updateMultiStreamPosition(
                                this.get("framepositionx"),
                                this.get("framepositiony"),
                                this.get("framewidth"),
                                this.get("frameheight")
                            );
                        } else {
                            // If previous recorder instance will be destroyed (like after rerecord)
                            this.recorder = this.__parent.recorder;
                        }
                    }
                }
            },

            create: function() {
                var _interactionEvent;
                var _frameClicksCount = 0;
                this.__parent = this.parent();
                this.__initialSettings = {
                    reversable: this.get("framereversable"),
                    dragable: this.get("framedragable"),
                    resizeable: this.get("frameresizeable")
                };

                Objs.iter(this.get("framemainstyle"), function(value, index) {
                    this.activeElement().style[index] = value;
                }, this);

                if (!this.get("initialpositionx") || !this.get("initialpositiony")) {
                    this.set("initialpositionx", this.get("framepositionx"));
                    this.set("initialpositiony", this.get("framepositiony"));
                }

                // Create additional related elements after reverse element created
                _interactionEvent = (Info.isTouchable() && !Info.isDesktop()) ? 'touch' : 'click';

                this._frameInteractionEventHandler = this.auto_destroy(new DomEvents());

                this.recorder = this.__parent.recorder;
                this.player = this.__parent.player;
                this.__visibleDimensions = {};
                this.__setHelperFrameDimensions();

                // fit frame dimensions based on source resolution
                // Only after we have _recorder informer
                if (!this.__visibleDimensions.accessible) {
                    var timer = new Timer({
                        context: this,
                        fire: function() {
                            if (this.recorder._recorder._videoTrackSettings && typeof this.recorder._recorder._videoTrackSettings.videoElement === 'object' && timer) {
                                this.set("framewidth", this.__parent.get("addstreampositionwidth"));
                                this.set("frameheight", this.__parent.get("addstreampositionheight"));
                                if (!this.get("initialwidth") || !this.get("initialheight")) {
                                    this.set("initialwidth", this.get("framewidth"));
                                    this.set("initialheight", this.get("frameheight"));
                                }
                                this.fitFrameViewOnScreenVideo();
                                timer.stop();
                            }
                        },
                        delay: 10,
                        destroy_on_stop: true,
                        immediate: true
                    });
                }

                if (this.recorder) {
                    // DO RECORDER STUFF
                    this.recorder._recorder.on("multistream-camera-switched", function(dimensions, isReversed) {
                        if (this.__initialSettings.resizeable && this.__resizerElement) {
                            this.set("frameresizeable", isReversed);
                            this.__resizerElement.style.display = isReversed ? 'none' : 'block';
                        }
                        this.set("framewidth", dimensions.width);
                        this.set("frameheight", dimensions.height);
                    }, this);

                    // If Reverse Cameras Settings is true
                    if (this.get("framereversable")) {
                        this._frameInteractionEventHandler.on(this.activeElement(), _interactionEvent, function(ev) {
                            _frameClicksCount++;
                            // because not enough info regarding supported versions also not be able to support mobile, avoided to use dblclick event
                            if (_frameClicksCount === 1)
                                Async.eventually(function() {
                                    _frameClicksCount = 0;
                                }, this, 400);

                            if (_frameClicksCount >= 2) {
                                this.recorder.reverseCameraScreens();
                            }
                        }, this);
                    }

                    // If Drag Settings is true
                    if (this.get("framedragable"))
                        this.addDragOption(this.__parent.activeElement());

                    if (this.get("frameresizeable")) {
                        this.addResize((Info.isTouchable() && !Info.isDesktop()), null, {
                            width: '7px',
                            height: '7px',
                            borderRight: '1px solid white',
                            borderBottom: '1px solid white',
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            cursor: 'nwse-resize',
                            zIndex: 200
                        });
                    }
                } else if (this.player) {
                    // DO PLAYER STUFF
                }
            },

            functions: {},

            /**
             * Will calculate real
             * @private
             */
            fitFrameViewOnScreenVideo: function() {

                // It will be accessible when at least one of the
                // EventListeners will be fired
                var vts = this.recorder._recorder._videoTrackSettings;
                if (!vts)
                    return;
                var _height = this.__parent.get('height') ? vts.videoElement.height : vts.videoInnerFrame.height;

                if (!this.__vts) this.__vts = vts;

                this.__translate = Geometry.padFitBoxInBox(vts.width, vts.height, vts.videoElement.width, _height);

                if (!this.__resizing) {
                    this.__visibleDimensions.x = this.__translate.offsetX + this.get("framepositionx") * this.__translate.scale;
                    this.__visibleDimensions.y = this.__translate.offsetY + this.get("framepositiony") * this.__translate.scale;
                }

                this.__visibleDimensions.width = this.get("framewidth") * this.__translate.scale;
                this.__visibleDimensions.height = this.get("frameheight") * this.__translate.scale;

                this.__visibleDimensions.accessible = true;

                if (!this.__dragging && !this.__resizing) {
                    this.__positions = {
                        initialX: this.__visibleDimensions.x,
                        initialY: this.__visibleDimensions.y,
                        currentX: this.__visibleDimensions.x,
                        currentY: this.__visibleDimensions.y,
                        bottomX: this.__visibleDimensions.x + this.__visibleDimensions.width,
                        bottomY: this.__visibleDimensions.y + this.__visibleDimensions.height,
                        xOffset: 0,
                        yOffset: 0
                    };
                }

                this.__setHelperFrameDimensions();
            },

            /**
             * Will add Drag
             *
             * @param {HTMLElement} container
             * @private
             */
            addDragOption: function(container) {
                this._draggingEvent = this.auto_destroy(new DomEvents());

                var isTouchable = Info.isTouchable() && !Info.isDesktop();
                // switch to touch events if using a touch screen
                var _endEvent = isTouchable ? 'touchend' : 'mouseup';
                var _moveEvent = isTouchable ? 'touchmove' : 'mousemove';
                var _startEvent = isTouchable ? 'touchstart' : 'mousedown';

                this._draggingEvent.on(container, _endEvent, this.__handleMouseEndEvent, this);
                this._draggingEvent.on(container, _moveEvent, this.__handleMouseMoveEvent, this);
                this._draggingEvent.on(container, _startEvent, this.__handleMouseStartEvent, this);
            },

            /**
             * @param {Boolean} isTouchDevice
             * @param {HTMLElement} container
             * @param {Object} options
             * @private
             */
            addResize: function(isTouchDevice, container, options) {
                container = container || this.activeElement();

                this.__resizerElement = document.createElement('div');

                Objs.iter(options, function(value, index) {
                    this.__resizerElement.style[index] = value;
                }, this);

                container.append(this.__resizerElement);
                this.__resizeEvent = this.auto_destroy(new DomEvents());
            },

            /**
             * Handle Draggable Element Mouse Event
             *
             * @param {MouseEvent|TouchEvent} ev
             * @private
             */
            __handleMouseStartEvent: function(ev) {
                ev.preventDefault();
                if (typeof this.__visibleDimensions.accessible === 'undefined') {
                    this.fitFrameViewOnScreenVideo();
                    return;
                }
                this.__dragging = ev.target === this.activeElement();
                this.__resizing = ev.target === this.__resizerElement;

                if (typeof this.__positions === 'object') {
                    if (ev.type === "touchstart") {
                        this.__positions.initialX = ev.touches[0].clientX - this.__positions.xOffset;
                        this.__positions.initialY = ev.touches[0].clientY - this.__positions.yOffset;
                    } else {
                        if (this.__dragging) {
                            this.__positions.initialX = ev.clientX - this.__positions.xOffset;
                            this.__positions.initialY = ev.clientY - this.__positions.yOffset;
                        }
                        this.__positions.bottomX = this.__positions.initialX + this.__visibleDimensions.width;
                        this.__positions.bottomY = this.__positions.initialY + this.__visibleDimensions.height;
                    }
                }
            },


            /**
             * Listener of mouse movement
             *
             * @param {MouseEvent|TouchEvent} ev
             * @private
             */
            __handleMouseMoveEvent: function(ev) {
                var setTranslate = function(el, posX, posY) {
                    el.style.transform = "translate3d(" + posX + "px, " + posY + "px, 0)";
                };

                var setDimension = function(el, width, height) {
                    el.style.width = width;
                    el.style.height = height;
                };

                ev.preventDefault();
                if (!this.__dragging && !this.__resizing) return;
                this.activeElement().style.cursor = 'move';
                this.activeElement().style.opacity = '0';

                var _diffX, _diffY;

                if (ev.type === "touchmove") {
                    this.__positions.currentX = ev.touches[0].clientX - this.__positions.initialX;
                    this.__positions.currentY = ev.touches[0].clientY - this.__positions.initialY;
                } else {
                    if (this.__dragging) {
                        this.__positions.currentX = ev.clientX - this.__positions.initialX;
                        this.__positions.currentY = ev.clientY - this.__positions.initialY;
                    }

                    if (this.__resizing) {
                        // var _d = this.activeElement().getBoundingClientRect();
                        // this.__visibleDimensions.width = this.get("framewidth") * this.__translate.scale;
                        // this.__visibleDimensions.height = this.get("frameheight") * this.__translate.scale;
                        _diffX = ev.clientX - this.__positions.bottomX; //(this.__positions.currentX + this.__visibleDimensions.width);
                        _diffY = ev.clientY - this.__positions.bottomY; //(this.__positions.currentY + this.__visibleDimensions.height);
                    }
                }


                if (this.__dragging) {
                    this.__positions.xOffset = this.__positions.currentX;
                    this.__positions.yOffset = this.__positions.currentY;

                    setTranslate(this.activeElement(), this.__positions.currentX, this.__positions.currentY);
                    this.set("framepositionx", this.__positions.currentX / this.__translate.scale + this.get("initialpositionx"));
                    this.set("framepositiony", this.__positions.currentY / this.__translate.scale + this.get("initialpositiony"));
                }

                if (this.__resizing) {
                    var _height;
                    var _width = this.__visibleDimensions.width + _diffX;
                    if (this.get("frameproportional"))
                        _height = _width / this.__vts.aspectRatio;
                    else
                        _height = this.__visibleDimensions.height + _diffY;

                    this.__positions.bottomX = this.__positions.currentX + _width;
                    this.__positions.bottomY = this.__positions.currentY + _height;

                    this.set("framewidth", _width / this.__translate.scale);
                    this.set("frameheight", _height / this.__translate.scale);

                    this.fitFrameViewOnScreenVideo();
                    setDimension(this.activeElement(), _width, _height);
                }

            },

            /**
             * Listener of movement end
             *
             * @param {MouseEvent|TouchEvent} ev
             * @private
             */
            __handleMouseEndEvent: function(ev) {
                ev.preventDefault();
                if (!this.__dragging && !this.__resizing) return;

                if (!this.__resizing) {
                    this.__positions.initialX = this.__positions.currentX;
                    this.__positions.initialY = this.__positions.currentY;
                } else {
                    this.__positions.bottomX = this.__positions.currentX + this.__visibleDimensions.width;
                    this.__positions.bottomY = this.__positions.currentY + this.__visibleDimensions.height;
                }

                this.activeElement().style.cursor = 'pointer';
                this.activeElement().style.opacity = this.get("framemainstyle").opacity;

                this.__dragging = false;
                this.__resizing = false;
            },

            /**
             * Helper method will set dimensions for multi-screen recorder related elements
             *
             * @param {HTMLElement=} element - HTML element or Null to set dimentions and position
             * @private
             */
            __setHelperFrameDimensions: function(element) {
                element = element || this.activeElement();
                if (element) {
                    element.style.top = this.__visibleDimensions.y + 'px';
                    element.style.left = this.__visibleDimensions.x + 'px';
                    element.style.width = this.__visibleDimensions.width + 'px';
                    element.style.height = this.__visibleDimensions.height + 'px';
                }
            }
        };
    }).register("ba-helperframe");
});
Scoped.define("module:StickyHandler", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Maths",
    "browser:Events"
], function(Class, EventsMixin, Maths, DomEvents, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {
            /**
             * @param {HTMLElement} element
             * @param {HTMLElement} container
             * @param {Object} [options]
             * @param {boolean} [options.paused] - used to temporarily stop element from sticking to view
             */
            constructor: function(element, container, options) {
                inherited.constructor.call(this);
                this.element = element;
                this.container = container;
                this.paused = options.paused || false;
                this.threshold = options.threshold;
                if (!options["static"]) this.events = this.auto_destroy(new DomEvents());
                this.floating = false;
            },

            destroy: function() {
                if (this._elementObserver) this._elementObserver.disconnect();
                if (this._containerObserver) this._containerObserver.disconnect();
                inherited.destroy.call(this);
            },

            init: function() {
                this._initIntersectionObservers();
            },

            pause: function() {
                if (this.floating) this.removeStickyStyles();
                this.paused = true;
            },

            start: function() {
                if (!this.elementIsVisible && !this.floating) this.transitionToFloat();
                this.paused = false;
            },

            isDragging: function() {
                return !!this.dragging;
            },

            stopDragging: function() {
                this.dragging = false;
            },

            transitionToFloat: function() {
                this.floating = true;
                this.trigger("transitionToFloat");
                this.addStickyStyles();
                if (this.events) this._initEventListeners();
            },

            elementWasDragged: function() {
                return !!this.__elementWasDragged;
            },

            addStickyStyles: function() {
                if (this._top) this.element.style.top = this._top;
                if (this._left) this.element.style.left = this._left;
            },

            removeStickyStyles: function() {
                this.element.style.removeProperty("top");
                this.element.style.removeProperty("left");
            },

            _initIntersectionObservers: function() {
                var elementFirstObservation = true;
                var containerFirstObservation = true;
                this._elementObserver = new IntersectionObserver(elementCallback.bind(this), {
                    threshold: this.threshold
                });
                this._containerObserver = new IntersectionObserver(containerCallback.bind(this), {
                    threshold: this.threshold
                });

                function elementCallback(entries, observer) {
                    entries.forEach(function(entry) {
                        this.elementIsVisible = entry.isIntersecting;
                        if (elementFirstObservation) {
                            elementFirstObservation = false;
                            return;
                        }
                        if (entry.isIntersecting) return;
                        if (this.paused) {
                            this.trigger("transitionOutOfView");
                            return;
                        }
                        this.transitionToFloat();
                    }.bind(this));
                }

                function containerCallback(entries, observer) {
                    entries.forEach(function(entry) {
                        if (containerFirstObservation) {
                            containerFirstObservation = false;
                            return;
                        }
                        if (!entry.isIntersecting) return;
                        this.floating = false;
                        this.trigger("transitionToView");
                        this.removeStickyStyles();
                        if (this.events) this.events.off(this.element, "mousedown touchstart");
                        this.dragging = false;
                    }.bind(this));
                }

                this._elementObserver.observe(this.element);
                this._containerObserver.observe(this.container);
            },

            _initEventListeners: function() {
                var lastX, lastY, diffX, diffY;
                this.events.on(this.element, "mousedown", mouseDownHandler, this);
                this.events.on(this.element, "touchstart", touchStartHandler, this);

                function mouseDownHandler(e) {
                    e = e || window.event;
                    e.preventDefault();
                    if (e.button !== 0) return;
                    lastX = e.clientX;
                    lastY = e.clientY;
                    this.events.on(document, "mousemove", mouseMoveHandler, this);
                    this.events.on(document, "mouseup", mouseUpHandler, this);
                }

                function touchStartHandler(e) {
                    e = e || window.event;
                    e.preventDefault();
                    lastX = e.touches[0].clientX;
                    lastY = e.touches[0].clientY;
                    this.events.on(document, "touchmove", touchMoveHandler, this);
                    this.events.on(document, "touchend", touchEndHandler, this);
                }

                function mouseMoveHandler(e) {
                    e = e || window.event;
                    e.preventDefault();
                    diffX = lastX - e.clientX;
                    diffY = lastY - e.clientY;
                    lastX = e.clientX;
                    lastY = e.clientY;
                    this.__elementWasDragged = true;
                    this.dragging = true;
                    this.element.style.top = Maths.clamp(this.element.offsetTop - diffY, 0, window.innerHeight - this.element.offsetHeight) + "px";
                    this.element.style.left = Maths.clamp(this.element.offsetLeft - diffX, 0, window.innerWidth - this.element.offsetWidth) + "px";
                    this._top = this.element.style.getPropertyValue("top");
                    this._left = this.element.style.getPropertyValue("left");
                }

                function touchMoveHandler(e) {
                    e = e || window.event;
                    e.preventDefault();
                    diffX = lastX - e.touches[0].clientX;
                    diffY = lastY - e.touches[0].clientY;
                    lastX = e.touches[0].clientX;
                    lastY = e.touches[0].clientY;
                    this.__elementWasDragged = true;
                    this.dragging = true;
                    this.element.style.top = Maths.clamp(this.element.offsetTop - diffY, 0, window.innerHeight - this.element.offsetHeight) + "px";
                    this.element.style.left = Maths.clamp(this.element.offsetLeft - diffX, 0, window.innerWidth - this.element.offsetWidth) + "px";
                    this._top = this.element.style.getPropertyValue("top");
                    this._left = this.element.style.getPropertyValue("left");
                }

                function mouseUpHandler() {
                    this.events.off(document, "mousemove mouseup");
                }

                function touchEndHandler() {
                    this.events.off(document, "touchmove touchend");
                }
            }
        };
    }]);
});
Scoped.define("module:TrackTags", [
    "base:Class",
    "base:Objs",
    "base:Events.EventsMixin",
    "base:Async",
    "base:TimeFormat",
    "browser:Dom",
    "browser:Info",
    "browser:Events"
], function(Class, Objs, EventsMixin, Async, TimeFormat, Dom, Info, DomEvents, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            /**
             * @param {Object} options
             * @param {Object} dynamics
             */
            constructor: function(options, dynamics) {
                this._dyn = dynamics;
                this._trackTags = dynamics.get("tracktags");
                this._video = dynamics.__video;
                this._chapters = [];
                this._chapterLoadedTriggered = false;
                this.hasThumbs = false;
                dynamics.set("tracktagssupport", this._trackTags && this._trackTags.length > 0 &&
                    ('track' in document.createElement('track')));
                if (!this._video || !this._trackTags || this._trackTags.length === 0)
                    return;
                this._loadTrackTags();
                // To be able play default subtitle in with custom style
                if (dynamics.get("tracktagsstyled")) this._setDefaultTrackOnPlay();

                // Will trigger meta tag on-load event
                Async.eventually(function() {
                    this._loadMetaTrackTags();
                }, this);
            },

            /**
             * Will show thumb on duration
             * @param {int} index
             * @param {int} fromLeft
             * @param {int} currentDuration
             */
            showDurationThumb: function(index, fromLeft, currentDuration) {
                if (this._dyn.get("thumbcuelist")[index]) {
                    var _cue = this._dyn.get("thumbcuelist")[index];
                    var _time = currentDuration || (_cue.startTime + Math.round((_cue.startTime - _cue.endTime) / 2));
                    var _thumbContainer = this.thumbContainer;
                    var _thumbImage = _thumbContainer.querySelector('div');
                    var _timeContainer = _thumbContainer.querySelector('span');
                    var _left = fromLeft - Math.round(_cue.thumbWidth / 1.5) <= 0 ? 5 : fromLeft - Math.round(_cue.thumbWidth / 1.5);
                    _thumbContainer.style.opacity = '0.85';
                    _thumbContainer.style.left = _left + "px";
                    _thumbImage.style.backgroundPositionX = "-" + _cue.positionX + "px";
                    _thumbImage.style.backgroundPositionY = "-" + _cue.positionY + "px";
                    _timeContainer.innerText = _time > 0 ? TimeFormat.format(TimeFormat.ELAPSED_MINUTES_SECONDS, _time * 1000) : '0:00';
                }
            },

            /**
             * Will hide thumbnail container
             */
            hideDurationThumb: function() {
                this.thumbContainer.style.opacity = '0.00';
            },

            /**
             * Appear track elements inside video element
             * @private
             */
            _loadTrackTags: function() {
                if (!this._dyn.get("tracktagssupport")) return;
                var _flag = true;
                Objs.iter(this._trackTags, function(subtitle, index) {
                    var _trackTag = document.createElement("track");
                    var _domEvent = this.auto_destroy(new DomEvents());

                    /** kind could be on of the: subtitles, captions, descriptions, chapters, metadata */
                    try {
                        if (subtitle.content && !subtitle.src)
                            _trackTag.src = URL.createObjectURL(new Blob([subtitle.content], {
                                type: 'text/plain'
                            }));
                    } catch (e) {}
                    switch (subtitle.kind) {
                        case 'thumbnails':
                            _trackTag.id = this._dyn.get("css") + '-track-thumbnails';
                            _trackTag.kind = 'metadata';
                            if (!_trackTag.src) _trackTag.src = subtitle.src || null;
                            _trackTag.mode = 'hidden';
                            this.__appendThumbnailTrackTags(subtitle, index, _trackTag, _domEvent);
                            break;
                        case 'chapters':
                            _trackTag.id = this._dyn.get("css") + '-track-chapters';
                            _trackTag.kind = 'chapters';
                            _trackTag.src = subtitle.src;
                            _trackTag.mode = 'hidden';
                            this.__appendChaptersTrackTags(subtitle, index, _trackTag, _domEvent);
                            break;
                        default: // Will be subtitles, as mostly it's using for this purpose
                            _trackTag.id = this._dyn.get("css") + '-tack-' + index;
                            _trackTag.kind = subtitle.kind || 'subtitles';
                            _trackTag.label = subtitle.label || 'English';
                            _trackTag.srclang = subtitle.lang || 'en';
                            if (!_trackTag.src) _trackTag.src = subtitle.src || null;
                            this._dyn.set("hassubtitles", true);
                            this.__appendTextTrackTags(subtitle, index, _trackTag, _flag, _domEvent);
                            if (this._trackTags.length > 1) {
                                this._dyn.on("switch-track", function(selectedTrack) {
                                    this._dyn.set("tracktextvisible", true);
                                    this._dyn.set("trackcuetext", null);
                                    this._setSelectedTag(selectedTrack);
                                }, this);
                            }
                            break;
                    }
                    this._video.appendChild(_trackTag);
                }, this);
            },

            /**
             *
             * @param {Object} subtitle
             * @param {Integer} index
             * @param {HTMLElement} trackTag
             * @param {Boolean} flag
             * @param {EventListenerOrEventListenerObject} domEvent
             * @private
             */
            __appendTextTrackTags: function(subtitle, index, trackTag, flag, domEvent) {
                if (subtitle.enabled && flag) {
                    trackTag.setAttribute('default', '');
                    this._dyn.set("tracktaglang", subtitle.lang);
                    this._dyn.set("tracktextvisible", true);
                }
                trackTag.setAttribute('data-selector', 'track-tag');
                domEvent.on(trackTag, "load", function() {
                    if (subtitle.enabled && flag) {
                        this.mode = "showing";
                        if (this._video) this._video.textTracks[index].mode = "showing"; // Firefox
                        flag = false;
                    } else {
                        this.mode = "hidden";
                        if (this._video) this._video.textTracks[index].mode = "hidden"; // Firefox
                    }
                }, this);
            },

            /**
             *
             * @param {Object} subtitle
             * @param {Integer} index
             * @param {HTMLElement} trackTag
             * @param {EventListenerOrEventListenerObject} domEvent
             * @private
             */
            __appendChaptersTrackTags: function(subtitle, index, trackTag, domEvent) {
                var _self = this,
                    _track, _cues;
                trackTag.setAttribute('data-selector', 'chapters-track-tag');
                domEvent.on(trackTag, "load", function(ev) {
                    this.hasChapters = true;
                    _track = this.track;
                    _cues = _track.cues;
                    if (!_cues)
                        console.warn('Provided source for the chapters is not correct');
                    else
                        _self.__generateChapters(_cues);
                });
            },

            /**
             *
             * @param {Object} subtitle
             * @param {Integer} index
             * @param {HTMLElement} trackTag
             * @param {EventListenerOrEventListenerObject} domEvent
             * @private
             */
            __appendThumbnailTrackTags: function(subtitle, index, trackTag, domEvent) {
                var _self = this,
                    _track, _image, _splitText, _dimensions, thumbLink;
                trackTag.setAttribute('data-selector', 'thumb-track-tag');
                domEvent.on(trackTag, "load", function(ev) {
                    _track = this.track;
                    if (_track.cues[0].text) {
                        _splitText = _track.cues[0].text.split('#xywh=');
                        thumbLink = _splitText[0];
                        _dimensions = _track.cues[0].text.split('#xywh=')[1].split(',');

                        _image = new Image();
                        _image.src = thumbLink;

                        domEvent.on(_image, "load", function() {
                            this.hasThumbs = true;

                            var _thumbContainer = document.createElement('div');
                            var _thumbImageContainer = document.createElement('div');
                            var _timeContainer = document.createElement('span');

                            Dom.elementAddClass(_thumbContainer, this._dyn.get('css') + '-seeking-thumb-container');

                            _thumbContainer.style.opacity = '0.00';
                            _thumbImageContainer.style.height = +(_dimensions[3]) + 'px';
                            _thumbImageContainer.style.width = +(_dimensions[2]) + 'px';
                            _thumbImageContainer.style.backgroundImage = "url('" + thumbLink + "')";
                            _thumbImageContainer.style.backgroundRepeat = 'no-repeat';
                            _thumbImageContainer.style.backgroundAttachment = 'background-attachment';

                            _thumbContainer.appendChild(_thumbImageContainer);
                            _thumbContainer.appendChild(_timeContainer);

                            this._dyn.set("thumbimage", {
                                image: _image,
                                url: _image.src,
                                height: _image.naturalHeight || _image.height,
                                width: _image.naturalWidth || _image.width,
                                thumbWidth: Number(_dimensions[2]),
                                thumbHeight: Number(_dimensions[3])
                            });
                            this.thumbContainer = _thumbContainer;
                            this.__generateThumbnails(_track);
                        }, _self);
                    }
                });
            },

            /**
             * Generate
             * @param {Object} track
             * @private
             */
            __generateThumbnails: function(track) {
                Objs.iter(track.cues, function(cue, index) {
                    if (typeof cue === 'object') {
                        var _lineSplit = cue.text.trim().split('#xywh=')[1];
                        var _coordinates = _lineSplit.split(',');
                        // this here is main DYN instance
                        this.get("thumbcuelist").push({
                            startTime: cue.startTime,
                            endTime: cue.endTime,
                            positionX: _coordinates[0],
                            positionY: _coordinates[1],
                            thumbWidth: _coordinates[2],
                            thumbHeight: _coordinates[3]
                        });
                    }
                }, this._dyn);
            },

            /**
             * Generate
             * @param {Object} cues
             * @private
             */
            __generateChapters: function(cues) {
                Objs.iter(cues, function(cue, index) {
                    if (typeof cue === 'object') {
                        // this here is main Player Dynamics instance
                        this._chapters.push({
                            index: index,
                            startTime: cue.startTime,
                            endTime: cue.endTime,
                            title: cue.text
                        });
                    }
                    if (cues.length === this._chapters.length && !this._chapterLoadedTriggered) {
                        this._dyn.trigger("chaptercuesloaded", this._chapters, cues.length);
                        this._chapterLoadedTriggered = true;
                    }
                }, this);
            },

            /**
             * If custom styled text track selected
             * @param {Object} track
             * @param {String} lang
             * @private
             */
            _showTracksInCustomElement: function(track, lang) {
                var _lang = lang || this._dyn.get("tracktaglang");
                var _dyn = this._dyn;
                var _currentTime = _dyn.__video.currentTime;
                if (track.language === _lang) {
                    var _cues = track.cues;
                    Objs.iter(_cues, function(cue, index) {
                        if (typeof _cues[index] === 'object' && _cues[index]) {
                            if (cue.startTime < _currentTime && cue.endTime > _currentTime) {
                                _dyn.set("trackcuetext", cue.text);
                            }
                            cue.onenter = function(ev) {
                                track.mode = 'hidden';
                                if (_dyn.get("tracktextvisible"))
                                    _dyn.set("trackcuetext", this.text);
                            };
                            cue.onexit = function(ev) {
                                _dyn.set("trackcuetext", null);
                            };
                        }
                    }, this);
                }
            },

            /**
             * Load meta data kind Track Elements
             * @private
             */
            _loadMetaTrackTags: function() {
                if (this._video)
                    Objs.iter(this._video.textTracks, function(track, index) {
                        if (typeof this._video.textTracks[index] === 'object' && this._video.textTracks[index]) {
                            var _track = this._video.textTracks[index];
                            // If set custom style to true show cue text in our element
                            if (_track.kind === 'metadata') _track.mode = 'hidden';
                            if (_track.kind === 'chapters') _track.mode = 'showing';
                        }
                    }, this);
            },

            /**
             * Will set default language text track
             * @private
             */
            _setDefaultTrackOnPlay: function() {
                this._dyn.player.once("playing", function() {
                    Objs.iter(this._trackTags, function(track, index) {
                        var _track = this._video.textTracks[index];
                        if (typeof _track === 'object' && _track) {
                            if (_track.mode === 'showing')
                                this._showTracksInCustomElement(_track, _track.language);
                        }
                    }, this);
                }, this);
            },

            /**
             * When user select other language or different text track
             * @param {Object} selectedTrack
             * @private
             */
            _setSelectedTag: function(selectedTrack) {
                var _status = null;
                var _track = null;
                Objs.iter(this._video.textTracks, function(track, index) {
                    _track = this._video.textTracks[index];
                    if (typeof _track === 'object' && _track) {
                        _status = _track.language === selectedTrack.lang ? (this._dyn.get("tracktagsstyled") ? 'hidden' : 'showing') : 'disabled';
                        if (!this._dyn.get("tracktextvisible")) _status = 'disabled';
                        _track.mode = _status;
                        if (_track.language === selectedTrack.lang)
                            this._triggerTrackChange(this._video, _track, _status, selectedTrack.lang);
                    }
                }, this);
            },

            // Fixed issue when unable switch directly to showing from disabled
            _triggerTrackChange: function(video, track, status, lang) {
                var _trackElement = video.querySelector("#" + track.id);
                var _flag = true;
                var onTrackEvent = this.auto_destroy(new DomEvents());
                if (track.oncuechange !== undefined && !((Info.isInternetExplorer() || Info.isEdge()) && this._dyn.get("tracktagsstyled"))) {
                    onTrackEvent.on(track, "cuechange", function() {
                        if (_flag) {
                            if (status.length) track.mode = status;
                            if (this._dyn.get("tracktagsstyled"))
                                this._showTracksInCustomElement(track, lang);
                            else if (_trackElement) {
                                _trackElement.mode = status;
                                // _trackElement.setAttribute('default', '');
                            }
                            _flag = false;
                        }
                    }, this);
                } else {
                    onTrackEvent(video, "timeupdate", function() {
                        if (status.length) track.mode = status;
                        if (this._dyn.get("tracktagsstyled"))
                            this._showTracksInCustomElement(track, lang);
                    }, this);
                }
            }
        };
    }]);
});
Scoped.define("module:StylesMixin", [
    "base:Objs"
], function(Objs) {
    return {
        _applyStyles: function(element, styles, oldStyles) {
            Objs.iter(oldStyles, function(v, k) {
                if (!(k in styles)) element.style.removeProperty(k);
            });
            Objs.extend(element.style, styles);
        }
    };
});
Scoped.define("module:Common.Dynamics.Settingsmenu", [
    "dynamics:Dynamic",
    "base:Objs",
    "base:Async",
    "base:Timers.Timer",
    "browser:Dom",
    "browser:Events",
    "module:Assets"
], [
    "dynamics:Partials.ClickPartial",
    "dynamics:Partials.RepeatElementPartial"
], function(Class, Objs, Async, Timer, Dom, DomEvents, Assets, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {

            return {

                template: "<div if=\"{{visiblesettings.length > 0}}\" class=\"{{csscommon}}-settings-menu {{csstheme}}-settings-menu\" role=\"settingsblock\">\n    <div class=\"{{csscommon}}-settings-menu-overlay\">\n        <div ba-if=\"{{root}}\"\n             class=\"{{csscommon}}-settings-menu-item\"\n             ba-repeat-element=\"{{setting :: visiblesettings}}\"\n             title=\"{{string(setting.label)}}\"\n             ba-click=\"{{select_setting(setting.id)}}\"\n        >\n            <div class=\"{{csscommon}}-settings-menu-label\" role=\"settingslabel\">\n                {{string(setting.label) || setting.label}}\n            </div>\n\n            <div ba-if=\"{{setting.options}}\" class=\"{{csscommon}}-settings-menu-value {{csscommon}}-setting-option-value\"\n                 role=\"settingsvalue\"\n            >\n                {{setting.value}}\n            </div>\n\n            <div ba-if=\"{{!setting.options}}\" class=\"{{csscommon}}-settings-menu-value \"\n                 role=\"settingicon\"\n            >\n                <div ba-if=\"{{setting.showicon}}\"\n                     style=\"{{setting.value ? setting.icontruestyle : setting.iconfalsestyle}}\"\n                     class=\"{{csscommon}}-setting-menu-icon {{csscommon + (setting.value ? '-setting-on' : '-setting-off')}}\">\n                    {{setting.value ? setting.trueicon : setting.falseicon}}\n                </div>\n            </div>\n\n        </div>\n\n        <div ba-if=\"{{!root}}\">\n            <div class=\"{{csscommon}}-setting-menu-options-title {{csscommon}}-settings-menu-options-item\"\n                 ba-click=\"{{show_root()}}\"\n            > <div>{{ string(selected.label) || string('setting-menu')}}</div></div>\n            <div\n                class=\"{{csscommon}}-settings-menu-options-item\"\n                ba-repeat-element=\"{{option :: visiblesettings}}\"\n                title=\"{{string(selected.label) || string('')}}\"\n                ba-click=\"{{select_value(option)}}\"\n            >\n                <div>\n                    <i ba-if=\"{{option === selected.value}}\" class=\"{{csscommon}}-icon-check\"></i>\n                    {{option.label || option}}\n                </div>\n            </div>\n        </div>\n    </div>\n</div>\n",


                attrs: {
                    "css": "ba-common",
                    "csscommon": "ba-commoncss",
                    "cssplayer": "ba-player",
                    "settings": [],
                    "visiblesettings": [],
                    "selected": null,
                    "root": true,

                    "default": {
                        value: false,
                        label: 'setting-item',
                        visible: true, // small < 320 , medium < 400, normal >= 401, false
                        mobileSupport: true,
                        showicon: true,
                        // https://www.htmlsymbols.xyz/unicode
                        trueicon: '&#x2713;',
                        falseicon: '&#x2573;',
                        icontruestyle: 'color: #5dbb96;',
                        iconfalsestyle: 'color: #dd4b39'
                    },

                    "predefined": {
                        player: [{
                            id: 'playerspeeds',
                            label: 'player-speed',
                            value: 1.0,
                            options: [0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00],
                            func: function(setting, value) {
                                /** @var Dynamic this */
                                if (typeof this.functions.set_speed === 'function' && value > 0) {
                                    this.functions.set_speed.call(this, value, true);
                                    return true;
                                } else {
                                    console.error('Wrong argument or function provided');
                                    return false;
                                }
                            }
                        }],
                        recorder: [{}]
                    }
                },

                computed: {
                    "settings": function() {
                        var predefined = typeof this.__parent.recorder !== 'object' ? this.get("predefined").player : this.get("predefined").recorder;
                        Objs.iter(predefined, function(setting, index) {
                            if (setting.visible || typeof setting.visible === 'undefined')
                                this.addSetting(setting);
                        }, this);
                        return this.get("settings");
                    }
                },

                events: {
                    "change:visiblesettings": function(newValue) {
                        var probe = Objs.peek(newValue);
                        if (typeof probe === 'object' && probe) {

                            // Reset selected setting
                            this.set("selected", null);

                            // If object has ID key, then it's menu item
                            if (probe.hasOwnProperty('id'))
                                this.set("root", true);

                        } else {
                            this.set("root", false);

                            this._animateFade(false, this.activeElement());
                        }
                    }
                },

                functions: {
                    show_root: function() {
                        this.switchToRoot();
                    },

                    /**
                     * @param {String} settingId
                     */
                    select_setting: function(settingId) {
                        Objs.iter(this.get("settings"), function(setting, i) {
                            if (setting.id === settingId)
                                this.build_setting(setting, settingId);
                        }, this);
                    },

                    /**
                     * Call function of the setting
                     * @param value
                     */
                    select_value: function(value) {
                        this._setSettingWithMethod(value);
                    },

                    add_new_settings_item: function(settingObject) {
                        if (settingObject.visible || typeof settingObject.visible === 'undefined')
                            this.addSetting(settingObject);
                    },

                    update_new_settings_item: function(id, updatedSetting) {
                        this.updateSetting(id, updatedSetting);
                    },

                    remove_settings_item: function(id) {
                        this.removeSetting(id);
                    }
                },

                /**
                 * Initial Function After Render
                 */
                create: function() {
                    this.domEvents = this.auto_destroy(new DomEvents());

                    // If mouse clicked outside of the element
                    this.domEvents.on(document, "click touchstart", function(event) {
                        var isClickInside = this.activeElement().contains(event.target);
                        if (!isClickInside && this.activeElement()) {
                            this.parent().set("settingsmenu_active", false);
                        }
                    }, this);
                },

                /**
                 * @param {object =} settingMenu
                 * @param {string =} settingId
                 */
                build_setting: function(settingMenu, settingId) {
                    if (!settingMenu || !settingId) {
                        console.warn('At least on of the arguments are required');
                        return;
                    }

                    if (Objs.count(settingMenu.options) > 1) {
                        this.set("selected", settingMenu);
                        this._buildChildMenu(settingMenu);
                    } else {
                        Objs.iter(this.get("settings"), function(setting, i) {
                            if (setting.id === settingId) {
                                setting.value = !setting.value;
                                this.set("selected", setting);
                                this._setSettingWithMethod(false, i);
                            }
                        }, this);
                    }
                },

                switchToRoot: function() {
                    this.set("visiblesettings", this.get("settings"));
                },

                /*
                 * @param {Object} setting
                 * @private
                 */
                _buildChildMenu: function(setting) {
                    this.set("selected", setting);
                    this.set("visiblesettings", setting.options);
                },

                /**
                 *
                 * @param {string | boolean =} value
                 * @param {int =} index
                 * @private
                 */
                _setSettingWithMethod: function(value, index) {
                    if (typeof this.get("selected").func === 'function') {
                        if (typeof this.get("selected").func.call(this.__parent, this, value, index) === 'boolean') {
                            if (value)
                                this.get("selected").value = value;
                            else
                                this.get("selected").value = !this.get("selected").value;
                            Objs.iter(this.get("settings"), function(setting, index) {
                                if (this.get("selected") && setting)
                                    if (this.get("selected").id === setting.id) {
                                        if (!value) {
                                            this.get("settings")[index].value = !this.get("settings")[index].value;
                                        }
                                        this.get("settings")[index] = this.get("selected");
                                        this.set("visiblesettings", []);
                                        this.set("visiblesettings", this.get("settings"));
                                        // In case if want do not leave child menu can comment above and uncomment below
                                        // this.set("visiblesettings", value ? this.get("selected").options : this.get("settings"));
                                    }
                            }, this);
                        }
                    }

                },

                /**
                 * @param {Object} newMenuItem
                 */
                addSetting: function(newMenuItem) {
                    if (typeof newMenuItem !== 'object') {
                        console.warn('Sorry you should add new option as an Object');
                        return;
                    }

                    Objs.iter(this.get("settings"), function(setting) {
                        // if already exists remove old one
                        if (setting.id === newMenuItem.id)
                            this.removeSetting(setting.id);
                    }, this);

                    if (!newMenuItem.func || !newMenuItem.id) {
                        console.warn('Your added new setting missing mandatory `id`, `func` or `label` keys, please add them');
                        return;
                    } else {
                        if (typeof newMenuItem.func !== 'function') {
                            console.warn('Sorry func key has to be function type');
                            return;
                        }
                    }

                    this.mergeAndRebuildSettings(this.get("default"), newMenuItem);
                },

                /**
                 * @param {string} settingId
                 * @param {object} newOptions
                 */
                updateSetting: function(settingId, newOptions) {
                    if (typeof newOptions !== 'object') {
                        console.warn('Sorry you should provide any new option as an Object');
                        return;
                    }

                    Objs.iter(this.get("settings"), function(setting, index) {
                        if (setting.id === settingId) {
                            this.get("settings")[index] = Objs.tree_merge(this.get("settings")[index], newOptions);
                            this.set("visiblesettings", []);
                            this.set("visiblesettings", this.get("settings"));
                        }
                    }, this);
                },

                /**
                 * @param {String} settingId
                 */
                removeSetting: function(settingId) {
                    if (typeof settingId !== 'string') {
                        console.warn('Sorry you should provide setting ID');
                        return;
                    }

                    Objs.iter(this.get("settings"), function(setting, index) {
                        if (setting.id === settingId) {
                            this.get("settings").splice(index);
                            this.set("visiblesettings", []);
                            this.set("visiblesettings", this.get("settings"));
                        }
                    }, this);
                },

                /**
                 *
                 * @param result
                 * @param initial
                 * @private
                 */
                mergeAndRebuildSettings: function(result, initial) {
                    var _setting = Objs.tree_merge(result, initial);
                    var _currentSettings = this.get("settings");
                    _currentSettings.push(_setting);
                    this.set("visiblesettings", []);
                    this.set("visiblesettings", _currentSettings);
                    this.set("settings", _currentSettings);
                },

                /**
                 * Animate fade in or out
                 *
                 * @param {boolean} hide
                 * @param {HTMLElement} container
                 * @param {boolean =} immedately
                 * @private
                 */
                _animateFade: function(hide, container, immedately) {
                    if (immedately) {
                        container.style.opacity = hide ? "0" : "1";
                    } else {
                        var _opacity, _step, _target, _timer;
                        _opacity = hide ? 1.00 : 0.00;
                        _step = hide ? -0.1 : 0.1;
                        _target = hide ? 0.00 : 1.00;
                        container.style.opacity = _opacity;
                        _timer = this.auto_destroy(new Timer({
                            context: this,
                            fire: function() {
                                container.style.opacity = _opacity;
                                _opacity = _opacity + (_step * 1.0);
                                if ((hide && _opacity < _target) || (!hide && _opacity > _target)) {
                                    this.__animationInProcess = false;
                                    _timer.destroy();
                                }
                            },
                            delay: 30,
                            immediate: true
                        }));
                    }
                }
            };
        })
        .register("ba-common-settingsmenu")
        .registerFunctions({
            /**/"visiblesettings.length > 0": function (obj) { return obj.visiblesettings.length > 0; }, "csscommon": function (obj) { return obj.csscommon; }, "csstheme": function (obj) { return obj.csstheme; }, "root": function (obj) { return obj.root; }, "visiblesettings": function (obj) { return obj.visiblesettings; }, "string(setting.label)": function (obj) { return obj.string(obj.setting.label); }, "select_setting(setting.id)": function (obj) { return obj.select_setting(obj.setting.id); }, "string(setting.label) || setting.label": function (obj) { return obj.string(obj.setting.label) || obj.setting.label; }, "setting.options": function (obj) { return obj.setting.options; }, "setting.value": function (obj) { return obj.setting.value; }, "!setting.options": function (obj) { return !obj.setting.options; }, "setting.showicon": function (obj) { return obj.setting.showicon; }, "setting.value ? setting.icontruestyle : setting.iconfalsestyle": function (obj) { return obj.setting.value ? obj.setting.icontruestyle : obj.setting.iconfalsestyle; }, "csscommon + (setting.value ? '-setting-on' : '-setting-off')": function (obj) { return obj.csscommon + (obj.setting.value ? '-setting-on' : '-setting-off'); }, "setting.value ? setting.trueicon : setting.falseicon": function (obj) { return obj.setting.value ? obj.setting.trueicon : obj.setting.falseicon; }, "!root": function (obj) { return !obj.root; }, "show_root()": function (obj) { return obj.show_root(); }, "string(selected.label) || string('setting-menu')": function (obj) { return obj.string(obj.selected.label) || obj.string('setting-menu'); }, "string(selected.label) || string('')": function (obj) { return obj.string(obj.selected.label) || obj.string(''); }, "select_value(option)": function (obj) { return obj.select_value(obj.option); }, "option === selected.value": function (obj) { return obj.option === obj.selected.value; }, "option.label || option": function (obj) { return obj.option.label || obj.option; }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "tooltip": "Click to play.",
            "setting-menu": "All settings",
            "source-quality": "Source quality",
            "player-speed": "Player speed",
            "set-menu-option": "Set option",
            "submit-video": "Confirm video",
            "picture-in-picture": "Picture in picture",
            "exit-fullscreen-video": "Exit fullscreen",
            "fullscreen-video": "Enter fullscreen"
        });
});
Scoped.define("module:PopupHelper", [
    "base:Class",
    "base:Events.EventsMixin",
    "browser:Dom",
    "browser:Events"
], function(Class, EventsMixin, Dom, DomEvents, scoped) {

    var PopupHelper = Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this);

                this.popupContainer = document.createElement("div");
                this.backgroundContainer = document.createElement("div");
                this.backgroundContainer.className = "ba-popup-helper-overlay-background";
                this.popupContainer.appendChild(this.backgroundContainer);
                this.overlayContainer = document.createElement("div");
                this.overlayContainer.className = "ba-popup-helper-overlay";
                this.popupContainer.appendChild(this.overlayContainer);
                this.containerInner = document.createElement("div");
                this.containerInner.className = "ba-popup-helper-overlay-inner";
                this.overlayContainer.appendChild(this.containerInner);

                this.domEvents = this.auto_destroy(new DomEvents());
                this.domEvents.on(this.backgroundContainer, "click touchstart", function() {
                    this.hide();
                }, this);
                this.domEvents.on(this.containerInner, "click touchstart", function(event) {
                    event.stopPropagation();
                });
            },

            show: function() {
                return this.recursionProtection("show", function() {
                    Dom.elementAddClass(document.body, "ba-popup-helper-overlay-body");
                    document.body.appendChild(this.popupContainer);
                    this.trigger("show");
                });
            },

            hide: function() {
                return this.recursionProtection("hide", function() {
                    var popupContainer = this.popupContainer;
                    this.trigger("hide");
                    document.body.removeChild(popupContainer);
                    Dom.elementRemoveClass(document.body, "ba-popup-helper-overlay-body");
                });
            }

        };
    }], {

        mixin: function(inherited) {
            return {

                constructor: function(options) {
                    options = options || {};
                    this.__popup = new PopupHelper(options.popup);
                    this.__popup.on("hide", this.destroy, this);
                    options.element = this.__popup.containerInner;
                    inherited.constructor.call(this, options);
                },

                activate: function() {
                    this.__popup.show();
                    inherited.activate.call(this);
                },

                destroy: function() {
                    this.__popup.hide();
                    this.__popup.destroy();
                    inherited.destroy.call(this);
                }

            };
        }

    });

    return PopupHelper;
});
Scoped.define("module:IframeHelper", [
    "dynamics:Dynamic",
    "base:Objs",
    "base:Types",
    "base:Net.Uri"
], function(Dynamic, Objs, Types, Uri, scoped) {
    return Dynamic.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            template: "<iframe src=\"{{computeSrc()}}\" style=\"width:100%;height:100%\" allow=\"{{computeAllow()}}\" scrolling=\"no\" frameborder=\"0\"></iframe>",

            getAllowModifiers: function() {
                return [];
            },

            getSrc: function() {
                return "";
            },

            filteredAttrs: function() {
                return Objs.filter(this.properties().getAll(), function(value, key) {
                    return !Types.is_object(value) && !Types.is_array(value);
                }, this);
            },

            functions: {
                computeSrc: function() {
                    return Uri.appendUriParams(this.getSrc(), this.filteredAttrs());
                },

                computeAllow: function() {
                    return this.getAllowModifiers().map(function(modifier) {
                        return modifier + " *";
                    }).join("; ");
                }
            },

            iframe: function() {
                return this.activeElement().querySelector("iframe");
            },

            _afterActivate: function() {
                inherited._afterActivate.apply(this, arguments);
                var iframe = this.iframe();
                this.getAllowModifiers().forEach(function(modifier) {
                    iframe["allow" + modifier] = "allow" + modifier;
                });
            }

        };
    }).registerFunctions({
        /**/"computeSrc()": function (obj) { return obj.computeSrc(); }, "computeAllow()": function (obj) { return obj.computeAllow(); }/**/
    });
});
Scoped.define("module:Ads.Dynamics.Player", [
    "base:Objs",
    "base:Async",
    "browser:Info",
    "base:Maths",
    "base:Types",
    "base:Timers",
    "browser:Dom",
    "module:Assets",
    "dynamics:Dynamic",
    "module:Ads.IMALoader",
    "module:Ads.IMA.AdsManager"
], [
    "module:Ads.Dynamics.Controlbar"
], function(Objs, Async, Info, Maths, Types, Timers, Dom, Assets, Class, IMALoader, AdsManager, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {
                template: "<div\n    class=\"ba-ad-container {{linear ? (css + '-overlay') : ''}}\n    {{cssadsplayer + (linear ? '-linear-ad-container' : '-non-linear-ad-container')}}\n    {{hideoninactivity ? (cssplayer + '-controlbar-hidden') : ''}}\"\n    ba-styles=\"{{floating ? {} : parentcontainersizingstyles}}\"\n    data-video=\"ima-ad-container\"\n>\n    <div ba-if=\"{{adchoiceslink && adsplaying && !floating}}\"\n         class=\"{{cssadsplayer}}-ad-choices-container\"\n    >\n        <a href=\"{{adchoiceslink}}\" title=\"{{string('ad-choices')}}\" target=\"_blank\" ba-if=\"{{adchoicesontop}}\">\n            <svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                <rect width=\"16\" height=\"16\" transform=\"matrix(1 0 0 -1 0 16)\" fill=\"url(#ba-ad-choice-pattern)\"/>\n                <defs>\n                    <pattern id=\"ba-ad-choice-pattern\" patternContentUnits=\"objectBoundingBox\" width=\"1\" height=\"1\">\n                        <use xlink:href=\"#ba-ad-choices-image\" transform=\"scale(0.00208333)\"/>\n                    </pattern>\n                    <image id=\"ba-ad-choices-image\" width=\"480\" height=\"480\" xlink:href=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAALxUExURQAAAP////n+//L8//r///f9//r+//v///j+//f+//n///f///z///z+//3///L+//n9//j9//r9//j///v+//T8/8v0//j8//7///T7/+v8//f7//P+//39//v4//n8/8jh//b7//f8//X///38/+36//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n///n+//n+//n+//n+//n+//n+//n+//n+//n+//f///n+//n+//n+//n+//n+//n+//n+//n+//n+//r+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//z///n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//r///n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//v///r+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//j+//n+//n+//n+//n+//n+//n+//n+//n+//r+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n///n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+/////yUvWvEAAAD5dFJOUwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGy0cBgdu1uvarGIfY/j92IQoFczefBlD9clLAW3uA4nyV5nADQGgGqEINHeIaC4Dnr5wmsfbuTIUh+jnMdUhAQ8MBZbjeJPi/sJVCo0r6fewBHIk5O+c3OUidhZ5wfZbeiNS+rRGFxBf/PGfARhpzeYlb9F13R3TE9D7xWUma15dv/nhbKlYYQuznfNRq7K4T+w4AQQJfQEqWUVAj1ytSagnkQI+9KRWzhIp8AfEo0FEZ7bIWjBzgowRN067TIqmjteXAzoCm0jqxpjSe4Uz7UKiHgIKuAYAAAABYktHRAH/Ai3eAAAAB3RJTUUH5wQaECAXB8CStAAABJdJREFUWMPNl3lcFFUcwPf9WmbGbd0W14ruGwHlXpLLSAXUNZIARSBBk9gthaIgUfLMLERUPFBTC0NJ7AAji0IrjG47LCuzsuywy+5z/uu92Z15Mzs7O7v7j/3+e/N5v++83/F+v98zGP4fgkCQM4woZP2wyBFR0QAMhIRgIGbkqNi4+ITEMHyOEBAsl5TMY7GnXD0aYAgTvAWpabxH0jMygz8EgjHX8JJkXTs2WAKCcbxMxo/MBlNQACPkyAF87oQgAcyZExUAfpIDEDIPtZwVoCUw+TolIC4PRDEHAuAmX68ExE+Bsfk3FBQWTQ0sIgw7zaNZPG56SWnZjTOgvGImXs4quckK4fr5Pczm8cHsSoCbqyKd4LrFQ7x1TjkAN1wHwYTPdW8vOZs9hyGWV1aL1tTcdnst/sD6D6P1DvfuDI/BcGcddUj9XWPm6biC5Tx50CAC5i+Q+7Tx7hkWv/fUzBV4AaIWKsOyqGIxwLkmpAdYIgLy4ngvSZm+FNvB6ACWKQGx9yynBHvpvU6MiPALWKEEzL7v/uImikhe2ezy7U0twKhV0LK6dA1FrG3NXwcmNUITsB7/MHXDxhqKaMvZZAXkjdACpGQCcx5A5uYtMkTcA7hknc+gQABbtwEuNjg1Ixu2U0RNWsKDABb5KbQA1YvBQOqVCSCq4SG7hGjf8fBSxU3XArR1gLBEnA0gb2dWu4RYk7UL35Ch2oDIMjmAIPApUjsfoYjdrXk0omqAO5W7KkE6JTJGALTsmUW9+WgVgCZgfQpZbimnAIwwWQEeW0vNeFzKbDXgiUnCP+bJAUILje6mR+ixaZ6AgZ3Y2r1PwgXegOxeCigAP4Dawqf2JbiU7WE4Dt3Tz0j6dX1woRaAjAvPPqe4OIjFy/4kWmjs+w9IV1PtA7jo+RdedMhKIcth+wd6kyX9poNOyQIVAMHFL3XVLB9MFLdEkL+//EojtX/B5n5ZbVADXk0ny9deB9GgqW8MvknVcw/lXyKvLWrAW0Liv/0OBiDmUoB351Ln8Yd7m99TFhY1oLmeLN93gGB85px0qt545IMY70ahBjhb8RHqNwjt1bE6TVbWuj90qfuMGgAtH+3r3kX+5Go+upuWgo+POX21KVUYzXjXFDz0wWWf9ByWFaNPV+FvRoNBF4A9R/IGEj+TdaiZxzcBXO6zVasBBqL/eeF2qr730BfrNDukz1SOOVFMC3rTl18Rh1gMvoUN/9q9bz+HBHUGDvR9I0ucjQlVfqcdo/Wke2MF2WTEe+cfl/X3rctw9eIYP/3daPUMGD2IseDEqU36lqrXHcTTL+t/UrLavnNvLm3Bf//+h14a+dwjfT/qD1pgOyXe0REdJ6bF0rw7+lN0IHMac8UpUeXnNnrl7b8cc/hOHG8ZZvuVV8tve1LJgKavTvx+UqW+8PdtOO+YwGZdM2R4qXfldFh9DQIagqDTLlev/mM0CkKdAP78i6qPn1g0JMjHF4LalaJ6ffyA3ljpQzj4e5Gg3r5jQn9gkfMOw5UD/5TFlg12lpM7F8K7D6tl/1tEXp5hob08DSZOKKBXhfr2PZ3yH3LVRJc70d2PAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIzLTA0LTI2VDE2OjMyOjA3KzAwOjAwPnuJagAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMy0wNC0yNlQxNjozMjowNyswMDowME8mMdYAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjMtMDQtMjZUMTY6MzI6MjMrMDA6MDCuWTNnAAAAAElFTkSuQmCC\"/>\n                </defs>\n            </svg>\n        </a>\n    </div>\n\n    <div ba-if=\"{{showactionbuttons && isoutstream}}\"\n        class=\"{{cssadsplayer}}-actions-button-container {{csscommon}}-center-all\"\n    >\n        <div ba-if=\"{{moredetailslink}}\">\n            <a\n                href=\"{{ moredetailslink }}\" target=\"_blank\"\n                class=\"{{cssadsplayer}}-action-button\"\n                title=\"{{moredetailstext ? moredetailstext : string('learn-more')}}\"\n            >\n                <i class=\"{{csscommon}}-icon-share\"></i>\n                {{moredetailstext ? moredetailstext : string('learn-more')}}\n            </a>\n        </div>\n        <div ba-if=\"{{showrepeatbutton}}\">\n            <div class=\"{{cssadsplayer}}-action-button\" ba-click=\"{{replay()}}\"\n                title=\"{{repeatbuttontext ? repeatbuttontext : string('replay-ad')}}\"\n            >\n                <i class=\"{{csscommon}}-icon-cw\"></i>\n                {{repeatbuttontext ? repeatbuttontext : string('replay-ad')}}\n            </div>\n        </div>\n        <div>\n            <div class=\"{{cssadsplayer}}-action-button {{cssadsplayer}}-reversed-color\"\n                 title=\"{{string('close-ad')}}\" ba-click=\"{{close()}}\"\n            >\n                <i class=\"{{csscommon}}-icon-cancel\"></i>\n                {{string('close-ad')}}\n            </div>\n        </div>\n    </div>\n</div>\n<ba-{{dyncontrolbar}}\n    ba-if=\"{{!hidecontrolbar && linear && !showactionbuttons}}\"\n    ba-css=\"{{css}}\"\n    ba-csscommon=\"{{csscommon}}\"\n    ba-cssadsplayer=\"{{cssadsplayer}}\"\n    ba-template=\"{{tmplcontrolbar}}\"\n    ba-linear={{linear}}\n    ba-duration=\"{{duration}}\"\n    ba-volume=\"{{volume}}\"\n    ba-muted=\"{{muted}}\"\n    ba-unmuteonclick=\"{{unmuteonclick}}\"\n    ba-playing={{playing}}\n    ba-currenttime={{=currenttime}}\n    ba-hideoninactivity={{hideoninactivity}}\n    ba-event:resume=\"resume\"\n    ba-event:fullscreen=\"{{trigger('fullscreen')}}\"\n    ba-fullscreened=\"{{fullscreened}}\"\n    ba-event:pause=\"pause\"\n    ba-event:volume=\"setVolume\"\n    ba-event:stop=\"stop\"\n    ba-view_type=\"{{view_type}}\"\n    ba-floating=\"{{floating}}\"\n    ba-adchoicesontop=\"{{adchoicesontop}}\"\n    ba-adchoiceslink=\"{{adchoiceslink}}\"\n    ba-adchoicesstring=\"{{string('ad-choices')}}\"\n></ba-{{dyncontrolbar}}>\n",

                attrs: {
                    dyncontrolbar: "ads-controlbar",
                    tmplcontrolbar: "",
                    cssadsplayer: "ba-adsplayer",
                    commoncss: "",
                    linear: true, // should be true to cover all the player container
                    playing: false,
                    currenttime: 0,
                    volume: 1,
                    isoutstream: false,
                    hidecontrolbar: false,
                    showactionbuttons: false,
                    showrepeatbutton: true,
                    adscompleted: false,
                    moredetailslink: null,
                    moredetailstext: null,
                    repeatbuttontext: null,
                    adsplaying: false,
                    companionads: [],
                    companionadcontent: null
                },

                events: {
                    "change:volume": function(volume) {
                        this.call("setVolume", this.get("muted") ? 0 : volume);
                    },
                    "change:muted": function(muted) {
                        this.call("setVolume", muted ? 0 : this.get("volume"));
                    }
                },

                _deferActivate: function() {
                    if (this._loadedSDK) return false;
                    IMALoader.loadSDK().success(function() {
                        this._loadedSDK = true;
                        this.activate();
                    }, this);
                    return true;
                },

                _baseRequestAdsOptions: function() {
                    return {
                        adTagUrl: this.get("adtagurl"),
                        IMASettings: this.get("imasettings"),
                        inlinevastxml: this.get("inlinevastxml"),
                        continuousPlayback: true,
                        linearAdSlotWidth: this.getAdWidth(),
                        linearAdSlotHeight: this.getAdHeight(),
                        nonLinearAdSlotWidth: this.getAdWidth(),
                        nonLinearAdSlotHeight: this.getAdHeight() / 3,
                        adWillAutoplay: this.getAdWillAutoplay(),
                        adWillPlayMuted: this.getAdWillPlayMuted(),
                        autoPlayAdBreaks: true,
                        width: this.getAdWidth(),
                        height: this.getAdHeight(),
                        volume: this.get("repeatedplayer") ? 1 : (this.getAdWillPlayMuted() ? 0 : this.get("volume"))
                    };
                },

                channels: {
                    "ads:ad-error": function() {
                        this.set("adsplaying", false);
                        if (this.parent().get("outstream")) this.parent().destroy();
                    },
                    "ads:load": function() {
                        this.call("load");
                        this.set("quartile", "first");
                    },
                    "ads:firstQuartile": function() {
                        this.set("quartile", "second");
                    },
                    "ads:midpoint": function() {
                        this.set("quartile", "third");
                    },
                    "ads:thirdQuartile": function() {
                        this.set("quartile", "fourth");
                    },
                    "ads:start": function(ev) {
                        this._onStart(ev);
                    },
                    "ads:complete": function(ev) {
                        this._onAdComplete(ev);
                    },
                    "ads:allAdsCompleted": function() {
                        this.call("reset");
                    },
                    "ads:discardAdBreak": function() {
                        this.call("discardAdBreak");
                    },
                    "ads:contentComplete": function() {
                        this.call("contentComplete");
                    },
                    "ads:loaded": function(event) {
                        this.set("ad", event.getAd());
                        this.set("addata", event.getAdData());
                        this.set("volume", this.adsManager.getVolume());
                        this.set("duration", event.getAdData().duration);
                        this.set("moredetailslink", event.getAdData().clickThroughUrl);
                    },
                    "ads:volumeChange": function() {
                        this.set("volume", this.adsManager.getVolume());
                    },
                    "ads:outstreamCompleted": function(dyn) {
                        this._outstreamCompleted(dyn);
                    },
                    "ads:outstreamStarted": function(dyn) {
                        this._outstreamStarted(dyn);
                    },
                    "ads:pause": function() {
                        this.set("playing", false);
                        if (this.get("adsplaying")) {
                            this.call("pause");
                        }
                    },
                    "ads:resume": function() {
                        this.set("playing", true);
                        if (!this.get("adsplaying")) {
                            this.call("resume");
                        }
                    },
                    "ads:contentResumeRequested": function() {
                        this.set("adsplaying", false);
                    },
                    "ads:contentPauseRequested": function() {
                        this.set("adsplaying", true);
                    }
                },

                create: function() {
                    var dynamics = this.parent();
                    var adContainer = this.getAdContainer();
                    var adManagerOptions = {
                        adContainer: adContainer,
                        adsRenderingSettings: {
                            enablePreloading: true,
                            useStyledNonLinearAds: true,
                            restoreCustomPlaybackStateOnAdBreakComplete: true
                        },
                        IMASettings: this.get("imasettings")
                    };
                    if (!Info.isMobile() && this.getVideoElement()) {
                        // It's optionalParameter
                        adManagerOptions.videoElement = this.getVideoElement();
                    }
                    this.adsManager = this.auto_destroy(new AdsManager(adManagerOptions, dynamics));
                    this.adsManager.requestAds(this._baseRequestAdsOptions());
                    this.adsManager.on("all", function(event, data) {
                        if (event === "adsManagerLoaded") this.set("adsmanagerloaded", true);
                        this.channel("ads").trigger(event, data);
                    }, this);
                    if (dynamics) {
                        dynamics.on("resize", function(dimensions) {
                            // This part will listen to the resize even after adsManger will be destroyed
                            if (this.adsManager && typeof this.adsManager.resize === "function") {
                                this.adsManager.resize(
                                    this.getAdWidth(),
                                    this.getAdHeight(),
                                    google.ima.ViewMode.NORMAL
                                );
                            }
                        }, this);
                        dynamics.on("unmute-ads", function(volume) {
                            Async.eventually(function() {
                                // ads:volumeChange not trigger initially, only after change volume
                                this.set("volume", volume);
                            }, this, 300);
                        }, this);
                    }
                },

                functions: {
                    load: function() {
                        if (!this.adsManager) return this.once("dynamic-activated", function() {
                            this.call("load");
                        }, this);
                        this.adsManager.start({
                            width: this.getAdWidth(),
                            height: this.getAdHeight(),
                            volume: this.get("repeatedplayer") ? 1 : (this.getAdWillPlayMuted() ? 0 : this.get("volume"))
                        });
                        // if (!this.adsManager.adDisplayContainerInitialized) this.adsManager.initializeAdDisplayContainer();
                        // this.call("requestAds");
                    },
                    reset: function() {
                        this.set("linear", true);
                        this.set("adscompleted", true);
                        this.set("adsplaying", false);
                        this.adsManager.reset();
                        // this.adsManager.contentComplete();
                        this.adsManager.requestAds(this._baseRequestAdsOptions());
                    },
                    reload: function() {
                        // this.adsManager.reset();
                        // this.adsManager.contentComplete();
                        this.call("requestAds");
                    },
                    discardAdBreak: function() {
                        this.adsManager.discardAdBreak();
                    },
                    requestAds: function(options) {
                        this.adsManager.requestAds(Objs.extend(this._baseRequestAdsOptions(), options));
                    },
                    contentComplete: function() {
                        this.adsManager.contentComplete();
                    },
                    pause: function() {
                        return this.adsManager.pause();
                    },
                    resume: function() {
                        return this.adsManager.resume();
                    },
                    setVolume: function(volume) {
                        if (!this.adsManager || !this.adsManager.setVolume) return;
                        if (volume > 0 && this.parent() && this.parent().get("unmuteonclick")) return setTimeout(function() {
                            this.adsManager.setVolume(Maths.clamp(volume, 0, 1));
                        }.bind(this));
                        return this.adsManager.setVolume(Maths.clamp(volume, 0, 1));
                    },
                    stop: function() {
                        return this.adsManager.stop();
                    },
                    replay: function() {
                        this._replay();
                    },
                    close: function() {
                        return this._hideContentPlayer();
                    }
                },

                getAdWidth: function() {
                    if (!this.activeElement()) return null;
                    if (this.get("floating") && this.parent()) {
                        return Dom.elementDimensions(this.parent().__playerContainer).width;
                    }
                    return this.activeElement().firstChild ? this.activeElement().firstChild.clientWidth : this.activeElement().clientWidth;
                },

                getAdHeight: function() {
                    if (!this.activeElement()) return null;
                    if (this.get("floating") && this.parent()) {
                        return +parseFloat(this.get("containerstyle").height).toFixed() || Dom.elementDimensions(this.parent().activeElement().firstChild).height;
                    }
                    return this.activeElement().firstChild ? this.activeElement().firstChild.clientHeight : this.activeElement().clientHeight;
                },

                getAdContainer: function() {
                    if (!this._adContainer) this._adContainer = this.activeElement().querySelector(".ba-ad-container");
                    return this._adContainer;
                },

                getVideoElement: function() {
                    if (!this._videoElement)
                        this._videoElement = this.parent() && this.parent().activeElement().querySelector("[data-video='video']"); // TODO video element for outstream
                    return this._videoElement;
                },

                getAdWillAutoplay: function() {
                    return this.parent() && this.parent().get("autoplay-allowed");
                },

                getAdWillPlayMuted: function() {
                    return this.get("muted") || this.get("volume") === 0;
                },

                _onStart: function(ev) {
                    this.set("playing", true);
                    this.set("currenttime", 0);
                    this.set("remaining", this.get("duration"));
                    this.set("showactionbuttons", false);
                    this.set("adscompleted", false);

                    if (ev && Types.is_function(ev.getAd)) {
                        var ad = ev.getAd();
                        var isLinear = ad.isLinear();
                        this.set("linear", isLinear);
                        this.set("hidecontrolbar", !isLinear);
                        if (!isLinear) {
                            this.set("non-linear-min-suggestion", ad.getMinSuggestedDuration());
                            // decrease a non-linear suggestion period, be able to show midroll
                            this._minSuggestionCalcualationTimer = this.auto_destroy(new Timers.Timer({ // This is being fired right before toggle_player
                                delay: 1000,
                                fire: function() {
                                    if (this.get("non-linear-min-suggestion") < 0) {
                                        this._minSuggestionCalcualationTimer.destroy();
                                    } else {
                                        this.set("non-linear-min-suggestion", this.get("non-linear-min-suggestion") - 1);
                                    }
                                }.bind(this)
                            }));
                        }

                        // this.set("minSuggestedDuration", ev);
                        // if ad is outstream and
                        if (!isLinear && this.get("isoutstream")) {
                            this.adsManager.reset();
                        }

                        // Set companion ads array and render for normal content player viewport
                        if (ad) {
                            this._getCompanionAds(ad);
                            if (this.get("companionad")) this._renderCompanionAd(ad);
                        }
                    }
                },

                _onAdComplete: function(ev) {
                    if (this.get("companionads").length > 0) this.set("companionads", []);
                    if (this.__companionAdElement) {
                        this.__companionAdElement.innerHTML = "";
                    }
                },

                _outstreamCompleted: function(dyn) {
                    dyn = dyn || this.parent();
                    if (Types.is_undefined(dyn.activeElement))
                        throw Error("Wrong dynamics instance was provided to _outstreamCompleted");
                    // this._hideContentPlayer(dyn);
                    // TODO: add option for selection
                    if (dyn.get("outstreamoptions")) {
                        if (dyn.get("outstreamoptions").hideOnCompletion) {
                            this._hideContentPlayer(dyn);
                            return;
                        }
                        if (dyn.get("outstreamoptions").moreURL) {
                            this.set("moredetailslink", dyn.get("outstreamoptions").moreURL);
                        }
                        if (dyn.get("outstreamoptions").moreText) {
                            this.set("moredetailstext", dyn.get("outstreamoptions").moreText);
                        }
                        if (dyn.get("outstreamoptions").allowRepeat) {
                            this.set("showrepeatbutton", !!dyn.get("outstreamoptions").allowRepeat);
                        }
                        if (dyn.get("outstreamoptions").repeatText) {
                            this.set("repeatbuttontext", dyn.get("outstreamoptions").repeatText);
                        }
                    }
                    this.set("showactionbuttons", true);
                },

                /**
                 * @param ad
                 * @private
                 */
                _getCompanionAds: function(ad) {
                    ad = ad || this.get("ad");
                    var companionAds = [];
                    if (google && google.ima && ad && Types.is_function(ad.getCompanionAds)) {
                        // if options is not boolean, then we have provided more options, like size and selector
                        var selectionCriteria = new google.ima.CompanionAdSelectionSettings();
                        // HTML,IFRAME,STATIC,ALL
                        selectionCriteria.resourceType = google.ima.CompanionAdSelectionSettings.ResourceType.ALL;
                        // CreativeType:IMAGE, FLASH, ALL
                        selectionCriteria.creativeType = google.ima.CompanionAdSelectionSettings.CreativeType.ALL;
                        // get all companionads
                        selectionCriteria.sizeCriteria = google.ima.CompanionAdSelectionSettings.SizeCriteria.IGNORE;
                        // get all available companion ads
                        companionAds = ad.getCompanionAds(0, 0, selectionCriteria);
                        if (companionAds && companionAds.length > 0) {
                            this.set("companionads", companionAds);
                        }
                        return companionAds;
                    } else {
                        return [];
                    }
                },

                /**
                 * @param ad
                 * @param options
                 * @return void
                 */
                _renderCompanionAd: function(ad, options) {
                    // Do not render anything if options is boolean and false
                    if (Types.is_boolean(options) && !Boolean(options)) return;

                    var playerElement, position, selector, height, width, companionAdDimensions,
                        isFluid, containerDimensions, selectionCriteria, expectedAR,
                        companionAd, closestIndex, closestAr, parentStyles, companionAdContainerStyles, excludeStyles;
                    var companionAds = [];
                    options = options || this.get("companionad");
                    if (Types.is_string(options)) {
                        if (options.split('|').length > 0) {
                            position = options.split('|')[1] || 'bottom';
                        }
                        options = options.replace(/\].*/g, "$'").split('[');
                        selector = options[0];
                    } else {
                        // if it's floating and floatingoptions.device.companionad is set to boolean true,
                        // then it will be handled by floating_sidebar.js
                        position = this.get("floating") && this.get("withsidebar") ? null : 'bottom';
                    }
                    if (selector) {
                        this.__companionAdElement = document.getElementById(selector);
                    } else {
                        this.__companionAdElement = this.__companionAdElement || document.createElement('div');
                    }
                    if (!this.__companionAdElement) return;
                    // reset companion ad container
                    this.__companionAdElement.innerHTML = "";
                    // playerElement = this.get("floating") ? this.parent().activeElement().firstChild : this.parent().activeElement();
                    playerElement = this.parent().activeElement();
                    containerDimensions = Dom.elementDimensions(playerElement.firstChild);
                    if (this.get("companionads").length <= 0) {
                        companionAdDimensions = options[1] ? options[1].split(',') : [0, 0];
                        isFluid = companionAdDimensions[0] === 'fluid';
                        // companionAdDimensions = companionAdDimensions.split(',');
                        if (!isFluid) {
                            width = Number((companionAdDimensions && companionAdDimensions[0] && companionAdDimensions[0] > 0) ?
                                companionAdDimensions[0] : containerDimensions.width);
                            height = Number((companionAdDimensions && companionAdDimensions[1] && companionAdDimensions[1] > 0) ?
                                companionAdDimensions[1] : containerDimensions.height);
                        }

                        selectionCriteria = new google.ima.CompanionAdSelectionSettings();
                        // HTML,IFRAME,STATIC,ALL
                        selectionCriteria.resourceType = google.ima.CompanionAdSelectionSettings.ResourceType.ALL;
                        // CreativeType:IMAGE, FLASH, ALL
                        selectionCriteria.creativeType = google.ima.CompanionAdSelectionSettings.CreativeType.ALL;
                        // SizeCriteria: IGNORE, SELECT_EXACT_MATCH, SELECT_NEAR_MATCH, SELECT_FLUID
                        if (!isFluid) {
                            // nearMatchPercent
                            selectionCriteria.sizeCriteria = google.ima.CompanionAdSelectionSettings.SizeCriteria.IGNORE;
                            if (width && height) {
                                // Get a list of companion ads for an ad slot size and CompanionAdSelectionSettings
                                companionAds = ad.getCompanionAds(width, height, selectionCriteria);
                            }
                        } else {
                            selectionCriteria.sizeCriteria = google.ima.CompanionAdSelectionSettings.SizeCriteria.SELECT_FLUID;
                            companionAds = ad.getCompanionAds(0, 0, selectionCriteria);
                        }

                        if (typeof companionAds[0] === "undefined") return;
                    } else {
                        companionAds = this.get("companionads");
                    }
                    expectedAR = containerDimensions.width / containerDimensions.height;
                    Objs.iter(companionAds, function(companion, index) {
                        var _data = companion.data;
                        var _ar = _data.width / _data.height;
                        var _currentDiff = Math.abs(_ar - expectedAR);
                        if (index === 0 || closestAr > _currentDiff) {
                            closestAr = _currentDiff;
                            closestIndex = index;
                        }
                        if (companionAds.length === index + 1) {
                            companionAd = companionAds[closestIndex];
                        }
                    }, this);

                    // Get HTML content from the companion ad.
                    // Write the content to the companion ad slot.
                    this.__companionAdElement.innerHTML = companionAd.getContent();
                    Dom.elementAddClass(this.__companionAdElement, this.get("cssplayer") + "-companion-ad-container" + (this.get("mobileviewport") ? '-mobile' : '-desktop'));
                    var applyFloatingStyles = this.get("floating") && !this.get("withsidebar");
                    if (applyFloatingStyles) {
                        // Mobile has to show in the sidebar
                        position = this.get("mobileviewport") ? null : 'top';
                        parentStyles = this.parent().get("containerSizingStyles");
                        // var floatingoptions = this.get("mobileviewport") ? this.get("floatingoptions.mobile") : this.get("floatingoptions.desktop");
                        companionAdContainerStyles = {
                            position: 'relative'
                        };
                        var image = this.__companionAdElement.querySelector('img');
                        if (image && containerDimensions && companionAd.data) {
                            var _ar = companionAd.data.width / companionAd.data.height;
                            var _h = containerDimensions.width * (_ar <= 1 ? _ar : companionAd.data.height / companionAd.data.width);
                            image.width = containerDimensions.width;
                            image.height = _h;
                            companionAdContainerStyles.bottom = (_h + 20) + 'px';
                        }
                    } else {
                        this.__companionAdElement.removeAttribute('style');
                    }
                    if (this.get("floating") && !this.get("mobileviewport") && applyFloatingStyles) {
                        // On floating desktop attach to the player element
                        var _pl = this.parent().activeElement().querySelector('.ba-player-content');
                        if (_pl) playerElement = _pl;
                    }
                    if (position) {
                        switch (position) {
                            case 'left':
                                // Prevent on click though taking all the width of the div element
                                this.__companionAdElement.style.display = 'inline-block';
                                this.__companionAdElement.style['float'] = 'left';
                                playerElement.insertAdjacentElement("beforebegin", this.__companionAdElement);
                                break;
                            case 'top':
                                if (applyFloatingStyles && parentStyles) {
                                    this.parent()._applyStyles(this.__companionAdElement, companionAdContainerStyles);
                                }
                                playerElement.insertAdjacentElement("beforebegin", this.__companionAdElement);
                                break;
                            case 'right':
                                // Prevent on click though taking all the width of the div element
                                this.__companionAdElement.style.display = 'inline-block';
                                playerElement.style['float'] = 'left';
                                playerElement.insertAdjacentElement("afterend", this.__companionAdElement);
                                break;
                            default:
                                playerElement.insertAdjacentElement("afterend", this.__companionAdElement);
                        }
                    }
                },

                _outstreamStarted: function(dyn, options) {
                    this.set("isoutstream", true);
                },

                _replay: function(dyn) {
                    dyn = dyn || this.parent();
                    if (Types.is_undefined(dyn.activeElement))
                        throw Error("Wrong dynamics instance was provided to _reply");
                    dyn.set("adsplayer_active", false); // Be able to reattach ads_player
                    this.set("repeat", true);
                    dyn.create(true);
                },

                _hideContentPlayer: function(dyn) {
                    dyn = dyn || this.parent();
                    if (Types.is_undefined(dyn.activeElement))
                        throw Error("Wrong dynamics instance was provided to _hideContentPlayer");
                    dyn.activeElement().style.setProperty("display", "none");
                    dyn.weakDestroy(); // << Create will not work as expected
                }
            };
        }).register("ba-adsplayer")
        .registerFunctions({
            /**/"linear ? (css + '-overlay') : ''": function (obj) { return obj.linear ? (obj.css + '-overlay') : ''; }, "cssadsplayer + (linear ? '-linear-ad-container' : '-non-linear-ad-container')": function (obj) { return obj.cssadsplayer + (obj.linear ? '-linear-ad-container' : '-non-linear-ad-container'); }, "hideoninactivity ? (cssplayer + '-controlbar-hidden') : ''": function (obj) { return obj.hideoninactivity ? (obj.cssplayer + '-controlbar-hidden') : ''; }, "floating ? {} : parentcontainersizingstyles": function (obj) { return obj.floating ? {} : obj.parentcontainersizingstyles; }, "adchoiceslink && adsplaying && !floating": function (obj) { return obj.adchoiceslink && obj.adsplaying && !obj.floating; }, "cssadsplayer": function (obj) { return obj.cssadsplayer; }, "adchoiceslink": function (obj) { return obj.adchoiceslink; }, "string('ad-choices')": function (obj) { return obj.string('ad-choices'); }, "adchoicesontop": function (obj) { return obj.adchoicesontop; }, "showactionbuttons && isoutstream": function (obj) { return obj.showactionbuttons && obj.isoutstream; }, "csscommon": function (obj) { return obj.csscommon; }, "moredetailslink": function (obj) { return obj.moredetailslink; }, "moredetailstext ? moredetailstext : string('learn-more')": function (obj) { return obj.moredetailstext ? obj.moredetailstext : obj.string('learn-more'); }, "showrepeatbutton": function (obj) { return obj.showrepeatbutton; }, "replay()": function (obj) { return obj.replay(); }, "repeatbuttontext ? repeatbuttontext : string('replay-ad')": function (obj) { return obj.repeatbuttontext ? obj.repeatbuttontext : obj.string('replay-ad'); }, "string('close-ad')": function (obj) { return obj.string('close-ad'); }, "close()": function (obj) { return obj.close(); }, "dyncontrolbar": function (obj) { return obj.dyncontrolbar; }, "!hidecontrolbar && linear && !showactionbuttons": function (obj) { return !obj.hidecontrolbar && obj.linear && !obj.showactionbuttons; }, "css": function (obj) { return obj.css; }, "tmplcontrolbar": function (obj) { return obj.tmplcontrolbar; }, "linear": function (obj) { return obj.linear; }, "duration": function (obj) { return obj.duration; }, "volume": function (obj) { return obj.volume; }, "muted": function (obj) { return obj.muted; }, "unmuteonclick": function (obj) { return obj.unmuteonclick; }, "playing": function (obj) { return obj.playing; }, "currenttime": function (obj) { return obj.currenttime; }, "hideoninactivity": function (obj) { return obj.hideoninactivity; }, "trigger('fullscreen')": function (obj) { return obj.trigger('fullscreen'); }, "fullscreened": function (obj) { return obj.fullscreened; }, "view_type": function (obj) { return obj.view_type; }, "floating": function (obj) { return obj.floating; }/**/
        }).attachStringTable(Assets.strings)
        .addStrings({
            "replay-ad": "Replay Video",
            "close-ad": "Close",
            "ad-choices": "Ad Choices",
            "learn-more": "Learn More"
        });
});
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

                template: "<div class=\"{{!linear ? (cssadsplayer + '-non-linear-controlbar') : ''}}\"\n     xmlns:ba-hotkey=\"http://www.w3.org/1999/xhtml\">\n    <div ba-show=\"{{skippable}}\" class=\"{{cssadsplayer}}-skipbutton-container\"\n         ba-click=\"{{skip_linear_ad()}}\"\n    >\n        <p class=\"{{cssadsplayer}}-skipbutton\">\n            {{lefttillskip > 0 ? string('can-skip-after').replace('%d', lefttillskip) : string('skip-ad') }}\n        </p>\n    </div>\n\n    <div ba-if=\"{{showbanner && media}}\" class=\"{{cssadsplayer}}-media-container\"\n         data-ads=\"banner-container\"\n    >\n        \n        \n        <span class=\"{{cssadsplayer}}-banner-close-button\"\n              ba-click=\"{{skip_non_linear_ad()}}\"\n        >\n            <i class=\"{{csscommon}}-icon-cancel\"></i>\n        </span>\n    </div>\n\n    <div ba-if=\"{{customcontroller && !media}}\" class=\"{{css}}-overlay {{cssadsplayer}}-ad-click-tracker\n        {{clickthroughurl && controlbarisvisible ? csscommon + '-clickable' : ''}}\"\n         ba-click=\"{{ad_clicked()}}\"\n    ></div>\n\n    <div ba-if=\"{{!hideoninactivity && linear}}\"\n         class=\"{{cssadsplayer}}-controlbar{{passactivitydelta && linear ? '-hidden' : ''}} {{controlbarisvisible ? '' : (cssplayer + '-dashboard-hidden')}}\">\n        <div class=\"{{cssadsplayer}}-progressbar-inside-controller\">\n            <div class=\"{{cssadsplayer}}-progressbar-played\" ba-styles=\"{{{width: Math.round(duration ? currenttime / duration * 100 : 0) + '%'}}}\"></div>\n        </div>\n        <div tabindex=\"1\" ba-hotkey:space^enter=\"{{toggle_player()}}\"\n             onmouseout=\"this.blur()\" class=\"{{css}}-leftbutton-container\"\n             autofocus\n        >\n            <div ba-if=\"{{!playing}}\" class=\"{{css}}-button-inner\"\n                 ba-on:touchend=\"{{resume()}}\"\n                 ba-click=\"{{resume()}}\" title=\"{{string('play-ad')}}\"\n            >\n                <i class=\"{{csscommon}}-icon-play\"></i>\n            </div>\n            <div ba-if=\"{{playing}}\" class=\"{{css}}-button-inner\" ba-click=\"{{pause()}}\"\n                 ba-on:touchend=\"{{pause()}}\"\n                 title=\"{{disablepause ? string('pause-video-disabled') : string('pause-video')}}\"\n            >\n                <i class=\"{{csscommon}}-icon-pause\"></i>\n            </div>\n        </div>\n\n        <div class=\"{{cssadsplayer}}-time-container\">\n            <div class=\"{{cssadsplayer}}-time-value\"\n                 title=\"{{string('elapsed-time')}}\"\n            >\n                {{formatTime(remaining)}} / {{formatTime(duration)}}\n            </div>\n        </div>\n\n        <div tabindex=\"4\" ba-if=\"{{supportsfullscreen}}\"\n             title=\"{{ fullscreened ? string('exit-fullscreen-video') : string('fullscreen-video') }}\"\n             ba-hotkey:space^enter=\"{{toggle_fullscreen()}}\" onmouseout=\"this.blur()\"\n             ba-on:touchend=\"{{toggle_fullscreen()}}\"\n             class=\"{{css}}-rightbutton-container\" ba-click=\"{{toggle_fullscreen()}}\"\n        >\n            <div class=\"{{css}}-button-inner\">\n                <i class=\"{{csscommon}}-icon-resize-{{fullscreened ? 'small' : 'full'}}\"></i>\n            </div>\n        </div>\n\n        <div tabindex=\"3\" class=\"{{cssadsplayer}}-volumebar\"\n             ba-hotkey:right=\"{{set_volume(volume + 0.1)}}\" ba-hotkey:left=\"{{set_volume(volume - 0.1)}}\"\n             ba-hotkey:up=\"{{set_volume(1)}}\" ba-hotkey:down=\"{{set_volume(0)}}\"\n        >\n            <div data-selector=\"button-volume-bar\" class=\"{{cssadsplayer}}-volumebar-inner\" onmousedown=\"{{startUpdateVolume(domEvent, currElement)}}\" ontouchstart=\"{{startUpdateVolume(domEvent, currElement)}}\">\n                <div class=\"{{cssadsplayer}}-volumebar-position\"\n                     ba-styles=\"{{{width: Math.min(100, Math.round(volume * 100)) + '%'}}}\"\n                >\n                    <div class=\"{{cssadsplayer}}-volumebar-button\"\n                         title=\"{{string('volume-button')}}\"\n                    ></div>\n                </div>\n            </div>\n        </div>\n\n        <div tabindex=\"2\" class=\"{{cssadsplayer}}-rightbutton-container\"\n             ba-click=\"{{toggle_volume()}}\"\n             ba-hotkey:space^enter=\"{{toggle_volume()}}\"\n             ba-on:touchend=\"{{toggle_volume()}}\"\n             title=\"{{string(!muted && volume > 0 ? 'volume-mute' : 'volume-unmute')}}\"\n        >\n            <div class=\"{{cssadsplayer}}-button-inner\">\n                <i class=\"{{csscommon + '-icon-volume-' + (volume >= 0.5 ? 'up' : (volume > 0 ? 'down' : 'off')) }}\"></i>\n            </div>\n        </div>\n    </div>\n    <div ba-if=\"{{hideoninactivity && linear}}\" class=\"{{cssadsplayer}}-progressbar-container\">\n        <div class=\"{{cssadsplayer}}-progressbar\">\n            <div class=\"{{cssadsplayer}}-progressbar-played\" ba-styles=\"{{{width: Math.round(duration ? currenttime / duration * 100 : 0) + '%'}}}\"></div>\n        </div>\n    </div>\n</div>\n",

                attrs: {
                    css: "ba-videoplayer",
                    showcontrolbar: true,
                    showbanner: false,
                    media: null,
                    playing: false,
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
                    "ads:adProgress": function(event) {
                        this.set("currenttime", event.getAdData().currentTime);
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
                        if (this.get("unmuteonclick")) return;
                        var volume = this.get("volume");
                        if (volume > 0) this.__lastVolume = volume;
                        volume = volume > 0 ? 0 : (this.__lastVolume || 1);
                        this.trigger("volume", volume);
                    },

                    skip_linear_ad: function() {
                        this.trigger("stop");
                    },

                    toggle_fullscreen: function() {
                        this.trigger("fullscreen");
                    }
                }
            };
        }).register("ba-ads-controlbar")
        .registerFunctions({
            /**/"!linear ? (cssadsplayer + '-non-linear-controlbar') : ''": function (obj) { return !obj.linear ? (obj.cssadsplayer + '-non-linear-controlbar') : ''; }, "skippable": function (obj) { return obj.skippable; }, "cssadsplayer": function (obj) { return obj.cssadsplayer; }, "skip_linear_ad()": function (obj) { return obj.skip_linear_ad(); }, "lefttillskip > 0 ? string('can-skip-after').replace('%d', lefttillskip) : string('skip-ad')": function (obj) { return obj.lefttillskip > 0 ? obj.string('can-skip-after').replace('%d', obj.lefttillskip) : obj.string('skip-ad'); }, "showbanner && media": function (obj) { return obj.showbanner && obj.media; }, "skip_non_linear_ad()": function (obj) { return obj.skip_non_linear_ad(); }, "csscommon": function (obj) { return obj.csscommon; }, "customcontroller && !media": function (obj) { return obj.customcontroller && !obj.media; }, "css": function (obj) { return obj.css; }, "clickthroughurl && controlbarisvisible ? csscommon + '-clickable' : ''": function (obj) { return obj.clickthroughurl && obj.controlbarisvisible ? obj.csscommon + '-clickable' : ''; }, "ad_clicked()": function (obj) { return obj.ad_clicked(); }, "!hideoninactivity && linear": function (obj) { return !obj.hideoninactivity && obj.linear; }, "passactivitydelta && linear ? '-hidden' : ''": function (obj) { return obj.passactivitydelta && obj.linear ? '-hidden' : ''; }, "controlbarisvisible ? '' : (cssplayer + '-dashboard-hidden')": function (obj) { return obj.controlbarisvisible ? '' : (obj.cssplayer + '-dashboard-hidden'); }, "{width: Math.round(duration ? currenttime / duration * 100 : 0) + '%'}": function (obj) { return {width: Math.round(obj.duration ? obj.currenttime / obj.duration * 100 : 0) + '%'}; }, "toggle_player()": function (obj) { return obj.toggle_player(); }, "!playing": function (obj) { return !obj.playing; }, "resume()": function (obj) { return obj.resume(); }, "string('play-ad')": function (obj) { return obj.string('play-ad'); }, "playing": function (obj) { return obj.playing; }, "pause()": function (obj) { return obj.pause(); }, "disablepause ? string('pause-video-disabled') : string('pause-video')": function (obj) { return obj.disablepause ? obj.string('pause-video-disabled') : obj.string('pause-video'); }, "string('elapsed-time')": function (obj) { return obj.string('elapsed-time'); }, "formatTime(remaining)": function (obj) { return obj.formatTime(obj.remaining); }, "formatTime(duration)": function (obj) { return obj.formatTime(obj.duration); }, "supportsfullscreen": function (obj) { return obj.supportsfullscreen; }, "fullscreened ? string('exit-fullscreen-video') : string('fullscreen-video')": function (obj) { return obj.fullscreened ? obj.string('exit-fullscreen-video') : obj.string('fullscreen-video'); }, "toggle_fullscreen()": function (obj) { return obj.toggle_fullscreen(); }, "fullscreened ? 'small' : 'full'": function (obj) { return obj.fullscreened ? 'small' : 'full'; }, "set_volume(volume + 0.1)": function (obj) { return obj.set_volume(obj.volume + 0.1); }, "set_volume(volume - 0.1)": function (obj) { return obj.set_volume(obj.volume - 0.1); }, "set_volume(1)": function (obj) { return obj.set_volume(1); }, "set_volume(0)": function (obj) { return obj.set_volume(0); }, "startUpdateVolume(domEvent, currElement)": function (obj) { return obj.startUpdateVolume(obj.domEvent, obj.currElement); }, "{width: Math.min(100, Math.round(volume * 100)) + '%'}": function (obj) { return {width: Math.min(100, Math.round(obj.volume * 100)) + '%'}; }, "string('volume-button')": function (obj) { return obj.string('volume-button'); }, "toggle_volume()": function (obj) { return obj.toggle_volume(); }, "string(!muted && volume > 0 ? 'volume-mute' : 'volume-unmute')": function (obj) { return obj.string(!obj.muted && obj.volume > 0 ? 'volume-mute' : 'volume-unmute'); }, "csscommon + '-icon-volume-' + (volume >= 0.5 ? 'up' : (volume > 0 ? 'down' : 'off'))": function (obj) { return obj.csscommon + '-icon-volume-' + (obj.volume >= 0.5 ? 'up' : (obj.volume > 0 ? 'down' : 'off')); }, "hideoninactivity && linear": function (obj) { return obj.hideoninactivity && obj.linear; }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "skip-ad": "Skip ad",
            "play-ad": "Play",
            "pause-video": "Pause",
            "volume-mute": "Mute sound",
            "volume-button": "Set volume",
            "elapsed-time": "Elapsed time",
            "volume-unmute": "Unmute sound",
            "can-skip-after": "Skip after %d",
            "fullscreen-video": "Enter fullscreen",
            "exit-fullscreen-video": "Exit fullscreen",
            "ad-will-end-after": "Ad will end after %s",
            "pause-video-disabled": "Pause not supported"
        });
});
Scoped.define("module:VideoPlayer.Dynamics.Controlbar", [
    "dynamics:Dynamic",
    "base:TimeFormat",
    "base:Comparators",
    "base:Maths",
    "base:Objs",
    "browser:Dom",
    "module:Assets",
    "browser:Info",
    "media:Player.Support",
    "base:Async",
    "base:Timers.Timer",
    "browser:Events"
], [
    "dynamics:Partials.StylesPartial",
    "dynamics:Partials.ShowPartial",
    "dynamics:Partials.IfPartial",
    "dynamics:Partials.ClickPartial",
    "dynamics:Partials.RepeatElementPartial"
], function(Class, TimeFormat, Comparators, Maths, Objs, Dom, Assets, Info, PlayerSupport, Async, Timer, DomEvents, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{cssplayer}}-dashboard {{((prominent_title_closed || title_hide_class) && controlbar_hide_class) ? cssplayer + '-dashboard-hidden' : ''}}\">\n    <div tabindex=\"{{skipinitial ? 2 : 1}}\" data-selector=\"progress-bar-inner\" class=\"{{css}}-progressbar {{controlbar_hide_class}} {{activitydelta < 2500 || ismobile ? '' : (css + '-progressbar-small')}} {{disableseeking ? cssplayer + '-disabled' : ''}}\"\n         ba-hotkey:right=\"{{seek(position + skipseconds)}}\"\n         ba-hotkey:left=\"{{seek(position - skipseconds)}}\"\n         ba-hotkey:alt+right=\"{{seek(position + skipseconds * 3)}}\"\n         ba-hotkey:alt+left=\"{{seek(position - skipseconds * 3)}}\"\n         onmouseout=\"this.blur()\"\n         ontouchstart=\"{{startUpdatePosition(domEvent)}}\"\n         onmousedown=\"{{startUpdatePosition(domEvent)}}\"\n    >\n        <div class=\"{{css}}-progressbar-chapters\" ba-show=\"{{true}}\">\n            <div class=\"{{css}}-chapters-list-container\"\n                ba-repeat=\"{{chapter :: chapterslist}}\"\n            >\n                <div\n                    class=\"{{css}}-chapters-list-item\"\n                    data-selector=\"chapter-index-{{chapter.index}}\"\n                    ba-styles=\"{{{left: Math.round(duration ? chapter.startTime / duration * 100 : 0) + '%'}}}\"\n                    onmouseenter=\"{{showChapterText(chapter)}}\"\n                    onmouseleave=\"{{hideChapterText()}}\"\n                >\n                    <div class=\"{{css}}-chapters-item-text\" ba-show=\"{{visibleindex === chapter.index && showchaptertext}}\">\n                        {{chapter.title}}\n                    </div>\n                </div>\n            </div>\n        </div>\n        <div class=\"{{css}}-progressbar-cache\" ba-styles=\"{{{width: Math.round(duration ? cached / duration * 100 : 0) + '%'}}}\"></div>\n        <div class=\"{{css}}-progressbar-position\" ba-styles=\"{{{width: Math.round(duration ? position / duration * 100 : 0) + '%'}}}\" title=\"{{string('video-progress')}}\">\n            <div class=\"{{css}}-progressbar-button\"></div>\n        </div>\n        <div class=\"{{css}}-progressbar-marker\"\n             data-selector=\"trim-start-marker\"\n             ba-if=\"{{trimmingmode}}\"\n             ba-styles=\"{{{left: Math.round(duration && trimstart ? trimstart / duration * 100 : 0) + '%'}}}\"\n        ></div>\n        <div class=\"{{css}}-progressbar-marker\"\n             data-selector=\"trim-end-marker\"\n             ba-if=\"{{trimmingmode}}\"\n             ba-styles=\"{{{left: 'auto', right: 100 - Math.round(duration && trimend ? trimend / duration * 100 : 100) + '%'}}}\"\n        ></div>\n    </div>\n\n    <div class=\"{{css}}-backbar\"></div>\n\n    <div class=\"{{css}}-controlbar\">\n\n        <div tabindex=\"0\" data-selector=\"submit-video-button\"\n             ba-hotkey:space^enter=\"{{submit()}}\" onmouseout=\"this.blur()\"\n             class=\"{{css}}-leftbutton-container {{controlbar_hide_class}}\"\n             ba-if=\"{{submittable}}\" ba-click=\"{{submit()}}\">\n            <div class=\"{{css}}-button-inner\">\n                {{string('submit-video')}}\n            </div>\n        </div>\n\n        <div tabindex=\"0\" data-selector=\"button-icon-ccw\"\n             ba-hotkey:space^enter=\"{{rerecord()}}\" onmouseout=\"this.blur()\"\n             class=\"{{css}}-leftbutton-container {{controlbar_hide_class}}\" ba-if=\"{{rerecordable}}\"\n             ba-click=\"{{rerecord()}}\" title=\"{{string('rerecord-video')}}\"\n        >\n            <div class=\"{{css}}-button-inner {{controlbar_hide_class}}\">\n                <i class=\"{{csscommon}}-icon-ccw\"></i>\n            </div>\n        </div>\n\n        <div tabindex=\"{{skipinitial ? 0 : 2}}\" data-selector=\"button-icon-play\"\n             ba-hotkey:space^enter=\"{{toggle_player()}}\" onmouseout=\"this.blur()\"\n             class=\"{{css}}-leftbutton-container {{controlbar_hide_class}}\" title=\"{{string('play-video')}}\"\n             onkeydown=\"{{tab_index_move(domEvent, null, 'button-icon-pause')}}\" ba-if=\"{{!playing}}\"\n             ba-click=\"{{play()}}\" ba-on:touchend=\"{{play()}}\"\n        >\n            <div class=\"{{css}}-button-inner\">\n                <i class=\"{{csscommon}}-icon-play\"></i>\n            </div>\n        </div>\n\n        <div tabindex=\"{{skipinitial ? 0 : 2}}\" data-selector=\"button-icon-pause\"\n             ba-hotkey:space^enter=\"{{toggle_player()}}\" onmouseout=\"this.blur()\"\n             class=\"{{css}}-leftbutton-container {{disablepause ? cssplayer + '-disabled' : ''}} {{controlbar_hide_class}}\"\n             onkeydown=\"{{tab_index_move(domEvent, null, 'button-icon-play')}}\" ba-if=\"{{playing}}\"\n             ba-click=\"{{pause()}}\" ba-on:touchend=\"{{pause()}}\"\n             title=\"{{disablepause ? string('pause-video-disabled') : string('pause-video')}}\"\n        >\n            <div class=\"{{css}}-button-inner\">\n                <i class=\"{{csscommon}}-icon-pause\"></i>\n            </div>\n        </div>\n\n        <div class=\"{{css}}-time-container {{csscommon}}-clickable {{controlbar_hide_class}}\" ba-click=\"{{toggle_position_info()}}\">\n            <div class=\"{{css}}-time-value\"\n                 title=\"{{revertposition ? string('remaining-time') : string('elapsed-time')}}\"\n            >\n                {{(revertposition && duration > 0) ? \"-\" : \"\"}}\n                {{(revertposition && duration > 0) ? (formatTime(duration - position)) : formatTime(position)}}\n            </div>\n            <div class=\"{{css}}-time-sep\">/</div>\n            <div class=\"{{css}}-time-value {{css}}-time-total-duration\" title=\"{{string('total-time')}}\">{{formatTime(duration || position)}}</div>\n        </div>\n\n        <div data-selector=\"video-title-block\" class=\"{{css}}-title-container {{title_hide_class}}\" ba-if=\"{{title && !prominent_title_closed}}\">\n            <p class=\"{{css}}-title\"><span ba-if=\"{{closeable_title}}\" ba-click=\"{{prominent_title_closed=true}}\">&#10006;</span>\n                {{title}}\n            </p>\n        </div>\n\n        <div tabindex=\"12\" class=\"{{css}}-rightbutton-container {{controlbar_hide_class}}\" ba-if=\"{{frameselectionmode}}\">\n            <div data-selector=\"select-frame-button\"\n                 onmouseout=\"this.blur()\"\n                 ba-click=\"{{select_frame()}}\"\n                 class=\"{{css}}-primary-button\">\n                 {{string('select-frame')}}\n            </div>\n        </div>\n\n        <div tabindex=\"12\" class=\"{{css}}-rightbutton-container {{controlbar_hide_class}}\" ba-if=\"{{trimmingmode}}\">\n            <div data-selector=\"trim-video-button\"\n                 onmouseout=\"this.blur()\"\n                 ba-click=\"{{trim()}}\"\n                 class=\"{{css}}-primary-button\">\n                 {{string('trim-video')}}\n            </div>\n        </div>\n\n        <div tabindex=\"11\" data-selector=\"button-icon-settings\"\n             ba-hotkey:space^enter=\"{{toggle_settings_menu()}}\" onmouseout=\"this.blur()\"\n             class=\"{{css}}-rightbutton-container {{cssplayer}}-button-{{settingsmenuactive ? 'active' : 'inactive'}} {{controlbar_hide_class}}\"\n             onkeydown=\"{{tab_index_move(domEvent)}}\"\n             ba-on:touchend=\"{{toggle_settings_menu()}}\"\n             ba-if=\"{{settingsmenubutton}}\" ba-click=\"{{toggle_settings_menu()}}\"\n             title=\"{{string('settings')}}\"\n        >\n            <div class=\"{{css}}-button-inner {{css}}-settings-button\">\n                <i class=\"{{csscommon}}-icon-cog\"></i>\n            </div>\n        </div>\n\n        <div tabindex=\"10\" data-selector=\"cc-button-container\"\n             ba-hotkey:space^enter=\"{{toggle_tracks()}}\" onmouseout=\"this.blur()\"\n             ba-if=\"{{(tracktags.length > 0 && showsubtitlebutton) || allowtexttrackupload}}\"\n             class=\"{{css}}-rightbutton-container {{cssplayer}}-button-{{tracktextvisible ? 'active' : 'inactive'}} {{controlbar_hide_class}}\"\n             title=\"{{ tracktextvisible ? string('close-tracks') : string('show-tracks')}}\"\n             ba-click=\"{{toggle_tracks()}}\"\n             onmouseover=\"{{hover_cc(true)}}\"\n             onmouseleave=\"{{hover_cc(false)}}\"\n        >\n            <div class=\"{{css}}-button-inner {{controlbar_hide_class}}\">\n                <i class=\"{{csscommon}}-icon-subtitle\"></i>\n            </div>\n        </div>\n\n        <div tabindex=9 data-selector=\"button-icon-resize-full\" ba-if=\"{{fullscreen}}\"\n             ba-hotkey:space^enter=\"{{toggle_fullscreen()}}\" onmouseout=\"this.blur()\"\n             class=\"{{css}}-rightbutton-container {{controlbar_hide_class}}\"\n             onkeydown=\"{{tab_index_move(domEvent)}}\"\n             ba-click=\"{{toggle_fullscreen()}}\" ba-on:touchend=\"{{toggle_fullscreen()}}\"\n             title=\"{{ fullscreened ? string('exit-fullscreen-video') : string('fullscreen-video') }}\">\n            <div class=\"{{css}}-button-inner\">\n                <i class=\"{{csscommon}}-icon-resize-{{fullscreened ? 'small' : 'full'}}\"></i>\n            </div>\n        </div>\n\n        <div tabindex=\"7\" data-selector=\"button-airplay\"\n             ba-hotkey:space^enter=\"{{show_airplay_devices()}}\" onmouseout=\"this.blur()\"\n             class=\"{{css}}-rightbutton-container {{controlbar_hide_class}}\"\n             ba-show=\"{{airplaybuttonvisible}}\" ba-click=\"{{show_airplay_devices()}}\">\n            <div class=\"{{css}}-airplay-container\">\n                <svg width=\"16px\" height=\"11px\" viewBox=\"0 0 16 11\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                    \n                    <title>{{string('airplay')}}</title>\n                    <desc>{{string('airplay-icon')}}</desc>\n                    <defs></defs>\n                    <g stroke=\"none\" stroke-width=\"1\" fill-rule=\"evenodd\" sketch:type=\"MSPage\">\n                        <path d=\"M4,11 L12,11 L8,7 L4,11 Z M14.5454545,0 L1.45454545,0 C0.654545455,0 0,0.5625 0,1.25 L0,8.75 C0,9.4375 0.654545455,10 1.45454545,10 L4.36363636,10 L4.36363636,8.75 L1.45454545,8.75 L1.45454545,1.25 L14.5454545,1.25 L14.5454545,8.75 L11.6363636,8.75 L11.6363636,10 L14.5454545,10 C15.3454545,10 16,9.4375 16,8.75 L16,1.25 C16,0.5625 15.3454545,0 14.5454545,0 L14.5454545,0 Z\" sketch:type=\"MSShapeGroup\"></path>\n                    </g>\n                </svg>\n            </div>\n        </div>\n\n        <div data-selector=\"button-chromecast\" class=\"{{css}}-rightbutton-container {{css}}-cast-button-container {{controlbar_hide_class}}\" ba-show=\"{{castbuttonvisble}}\">\n            <button tabindex=\"0\" class=\"{{css}}-gcast-button\" is=\"google-cast-button\"></button>\n        </div>\n\n        <div tabindex=\"6\" data-selector=\"button-stream-label\"\n             ba-hotkey:space^enter=\"{{toggle_stream()}}\" onmouseout=\"this.blur()\"\n             class=\"{{css}}-rightbutton-container {{controlbar_hide_class}}\"\n             ba-if=\"{{streams.length > 1 && currentstream}}\" ba-click=\"{{toggle_stream()}}\"\n             title=\"{{string('change-resolution')}}\"\n        >\n            <div class=\"{{css}}-button-inner {{controlbar_hide_class}}\">\n                <span class=\"{{css}}-button-text\">{{currentstream_label}}</span>\n            </div>\n        </div>\n\n        <div class=\"{{css}}-volumebar {{controlbar_hide_class}}\" ba-show=\"{{!hidevolumebar}}\">\n            <div tabindex=\"5\" data-selector=\"button-volume-bar\"\n                 ba-hotkey:right=\"{{set_volume(volume + 0.1)}}\" ba-hotkey:left=\"{{set_volume(volume - 0.1)}}\"\n                 ba-hotkey:up=\"{{set_volume(1)}}\" ba-hotkey:down=\"{{set_volume(0)}}\"\n                 onmouseout=\"this.blur()\"\n                 class=\"{{css}}-volumebar-inner\"\n                 ontouchstart=\"{{startUpdateVolume(domEvent, currElement)}}\"\n                 onmousedown=\"{{startUpdateVolume(domEvent, currElement)}}\"\n            >\n                <div class=\"{{css}}-volumebar-position\" ba-styles=\"{{{width: Math.min(100, Math.round(volume * 100)) + '%'}}}\">\n                    <div class=\"{{css}}-volumebar-button\" title=\"{{string('volume-button')}}\"></div>\n                </div>\n            </div>\n        </div>\n\n        <div tabindex=\"4\" data-selector=\"button-icon-volume\"\n             ba-hotkey:space^enter=\"{{toggle_volume()}}\" onmouseout=\"this.blur()\"\n             class=\"{{css}}-rightbutton-container {{controlbar_hide_class}}\"\n             ba-on:touchend=\"{{toggle_volume()}}\"\n             ba-click=\"{{toggle_volume()}}\" title=\"{{string(volume > 0 ? 'volume-mute' : 'volume-unmute')}}\"\n        >\n            <div class=\"{{css}}-button-inner\">\n                <i class=\"{{csscommon + '-icon-volume-' + (volume >= 0.5 ? 'up' : (volume > 0 ? 'down' : 'off')) }}\"></i>\n            </div>\n        </div>\n\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-videoplayer",
                    "csscommon": "ba-commoncss",
                    "cssplayer": "ba-player",
                    "duration": 0,
                    "position": 0,
                    "cached": 0,
                    "volume": 1.0,
                    "expandedprogress": true,
                    "playing": false,
                    "rerecordable": false,
                    "submittable": false,
                    "manuallypaused": false,
                    "streams": [],
                    "currentstream": null,
                    "fullscreen": true,
                    "fullscreened": false,
                    "activitydelta": 0,
                    "hidebarafter": 5000,
                    "preventinteraction": false,
                    "revertposition": false,
                    "title": "",
                    "settingsmenubutton": false,
                    "hoveredblock": false, // Set true when mouse hovered
                    "allowtexttrackupload": false,
                    "thumbisvisible": false,
                    "chapterslist": [],
                    "showchaptertext": true,
                    "visibleindex": -1,
                    "title_hide_class": "",
                    "controlbar_hide_class": ""
                },

                computed: {
                    "currentstream_label:currentstream": function() {
                        var cs = this.get("currentstream");
                        return cs ? (cs.label ? cs.label : PlayerSupport.resolutionToLabel(cs.width, cs.height)) : "";
                    }
                },

                events: {
                    "change:activitydelta": function(value) {
                        if (this.get("prominent_title")) {
                            this.set("title_hide_class", "");
                        } else {
                            if (value > this.get("hidebarafter") && this.get("hideoninactivity")) {
                                this.set("title_hide_class", this.get("cssplayer") + "-dashboard-hidden");
                            } else {
                                this.set("title_hide_class", "");
                            }
                        }
                        if (value > this.get("hidebarafter") && this.get("hideoninactivity")) {
                            this.set("controlbar_hide_class", this.get("cssplayer") + "-dashboard-hidden");
                        } else {
                            this.set("controlbar_hide_class", "");
                        }
                    }
                },

                functions: {

                    formatTime: function(time) {
                        time = Math.max(time || 0, 0.1);
                        return TimeFormat.format(TimeFormat.ELAPSED_MINUTES_SECONDS, time * 1000);
                    },

                    startUpdatePosition: function(event) {
                        if (this.get("disableseeking")) return;
                        // https://chromestatus.com/feature/5093566007214080
                        // touchstart and touchmove listeners added to the document will default to passive:true
                        if (event[0] && event[0].type.indexOf("touch") === -1)
                            event[0].preventDefault();

                        if (!this.__parent.get("playing") && this.__parent.player && !this.get("manuallypaused"))
                            this.__parent.player.play();

                        var target = event[0].currentTarget;
                        this.set("dimensions", target.getBoundingClientRect());

                        this.set("_updatePosition", true);
                        this.call("progressUpdatePosition", event[0]);

                        var events = this.get("events");
                        events.on(document, "mousemove touchmove", function(e) {
                            if (e.type.indexOf("touch") === -1)
                                e.preventDefault();
                            this.call("progressUpdatePosition", e);
                        }, this);
                        events.on(document, "mouseup touchend", function(e) {
                            if (e.type.indexOf("touch") === -1)
                                e.preventDefault();
                            this.call("stopUpdatePosition");
                            events.off(document, "mouseup touchend mousemove touchmove");
                        }, this);
                    },

                    progressUpdatePosition: function(event) {
                        var _dyn = this.__parent;

                        // Mouse or Touch Event
                        var clientX = event.clientX === 0 ? 0 : event.clientX || event.targetTouches[0].clientX;
                        var dimensions = this.get("dimensions");
                        var percentageFromStart = -1;
                        if (clientX < dimensions.left) percentageFromStart = 0;
                        else if (clientX > (dimensions.left + dimensions.width)) percentageFromStart = 1;
                        else {
                            percentageFromStart = (clientX - dimensions.left) / (dimensions.width || 1);
                        }
                        var onDuration = this.get("duration") * percentageFromStart;

                        if (!this.get("_updatePosition") && typeof _dyn.__trackTags === 'undefined')
                            return;

                        var player = _dyn.player;

                        if (typeof _dyn.__trackTags !== 'undefined') {
                            if (this.__parent.__trackTags.hasThumbs) {
                                if (this.get("visibleindex") > -1 && this.get("showchaptertext"))
                                    return;
                                var _index;
                                var _trackTags = _dyn.__trackTags;
                                var _cuesCount = _dyn.get("thumbcuelist").length;
                                if (onDuration > 0) {
                                    _index = Math.floor(_cuesCount * percentageFromStart);
                                    for (var i = _index - 2; i < _cuesCount; i++) {
                                        if (_dyn.get("thumbcuelist")[i]) {
                                            var _cue = _dyn.get("thumbcuelist")[i];
                                            if (_cue.startTime < onDuration && _cue.endTime > onDuration) {
                                                _trackTags.showDurationThumb(i, clientX, onDuration);
                                                break;
                                            }
                                        }
                                    }
                                } else {
                                    _index = Math.floor(_cuesCount * percentageFromStart);
                                    _trackTags.showDurationThumb(_index, clientX);
                                }

                                this.set("thumbisvisible", true);
                                this.activeElement().appendChild(_trackTags.thumbContainer);
                            }
                        }

                        if (this.get("_updatePosition")) {
                            this.set("position", onDuration);

                            if (typeof player._broadcastingState !== 'undefined') {
                                if (player._broadcastingState.googleCastConnected) {
                                    player.trigger('google-cast-seeking', this.get("position"));
                                    return;
                                }
                            }
                            this.trigger("position", this.get("position"));
                        }
                    },

                    stopUpdatePosition: function() {
                        this.set("_updatePosition", false);
                        this._hideThumb();
                    },

                    startUpdateVolume: function(args, element) {
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

                    showChapterText: function(chapter) {
                        this.set("visibleindex", chapter.index);
                        this._hideThumb();
                    },

                    hideChapterText: function() {
                        this.set("visibleindex", -1);
                    },

                    stopVerticallyUpdateVolume: function(event) {
                        event[0].preventDefault();
                        this.set("_updateVolume", false);
                    },

                    play: function() {
                        this.trigger("play");
                    },

                    pause: function() {
                        this.trigger("pause");
                    },

                    toggle_player: function() {
                        this.trigger("toggle_player");
                    },

                    toggle_volume: function() {
                        if (this.get("unmuteonclick")) return;
                        if (this.get("volume") > 0) {
                            this.__oldVolume = this.get("volume");
                            this.set("volume", 0);
                        } else {
                            this.set("volume", this.__oldVolume || 1);
                        }
                        this.trigger("volume", this.get("volume"));
                    },

                    toggle_position_info: function() {
                        this.set("revertposition", !this.get("revertposition"));
                    },

                    toggle_fullscreen: function() {
                        this.trigger("fullscreen");
                    },

                    toggle_settings_menu: function() {
                        this.trigger("settings_menu");
                    },

                    rerecord: function() {
                        this.trigger("rerecord");
                    },

                    seek: function(position) {
                        this.trigger("seek", position);
                    },

                    set_volume: function(volume) {
                        this.trigger("set_volume", volume);
                    },

                    submit: function() {
                        this.set("submittable", false);
                        this.set("rerecordable", false);
                        this.trigger("submit");
                    },

                    select_frame: function() {
                        var player = this.parent().player;
                        var position = player.position();
                        var imageSelected = false;

                        player.pause();

                        var timer = new Timer({
                            context: this,
                            start: false,
                            fire: function() {
                                player.setPosition(position);
                                player.play();
                                player.pause();
                                if (player.loaded()) {
                                    player.createSnapshotPromise().success(function(blob) {
                                        timer.stop();
                                        if (!imageSelected) {
                                            imageSelected = true;
                                            this.parent().trigger("image-selected", blob);
                                        }
                                    }, this);
                                }
                            },
                            delay: 300,
                            fire_max: 5,
                            destroy_on_stop: true
                        });

                        if (player.loaded()) {
                            player.createSnapshotPromise().success(function(blob) {
                                this.parent().trigger("image-selected", blob);
                            }, this).error(function() {
                                timer.start();
                            }, this);
                        } else {
                            timer.start();
                        }

                    },

                    toggle_stream: function() {
                        var streams = this.get("streams");
                        var current = streams.length - 1;
                        streams.forEach(function(stream, i) {
                            if (Comparators.deepEqual(stream, this.get("currentstream")))
                                current = i;
                        }, this);
                        this.set("currentstream", streams[(current + 1) % streams.length]);
                    },

                    show_airplay_devices: function() {
                        var dynamic = this.__parent;
                        if (dynamic.player._broadcastingState.airplayConnected) {
                            dynamic._broadcasting.lookForAirplayDevices(dynamic.player._element);
                        }
                    },

                    // Start ro stop showing CC content
                    toggle_tracks: function() {
                        return this.parent().toggleTrackTags();
                    },

                    // Hover on CC button in controller
                    hover_cc: function(hover) {
                        // Not show CC on hover during settings block is open
                        // Reason why use parent not local settingsmenu_active,
                        // is that settings model also has to be aware it's state. So we need as a global variable
                        if (this.parent().get("settingsmenu_active")) return;
                        Async.eventually(function() {
                            this.parent().set("tracksshowselection", hover);
                        }, this, 300);
                    },

                    // Move between elements which has tabIndex attribute
                    tab_index_move: function(ev, nextSelector, focusingSelector) {
                        this.trigger("tab_index_move", ev[0], nextSelector, focusingSelector);
                    },

                    // Hover on block
                    hover_block: function(hover) {
                        Async.eventually(function() {
                            this.parent().set("hoveredblock", hover);
                        }, this, 300);
                    },

                    toggle_settings: function() {
                        this.trigger("toggle_settings");
                    },

                    trim: function() {
                        this.parent().trigger("video-trimmed", this.get("trimstart") || 0, this.get("trimend") || this.get("duration"));
                    },

                    addTrimmingEventListeners: function() {
                        var events = this.get("events");
                        var trimStartMarker = this.activeElement().querySelector('[data-selector="trim-start-marker"]');
                        var trimEndMarker = this.activeElement().querySelector('[data-selector="trim-end-marker"]');

                        events.on(trimStartMarker, "mousedown touchstart", function(e) {
                            e.preventDefault();
                            e.stopPropagation();

                            var boundingRect = this.get("progressbarElement").getBoundingClientRect();
                            this.call("updateTrimStart", e, boundingRect);

                            events.on(document, "mousemove touchmove", function(e) {
                                e.preventDefault();
                                this.call("updateTrimStart", e, boundingRect);
                            }, this);

                            events.on(document, "mouseup touchend", function(e) {
                                e.preventDefault();
                                events.off(document, "mouseup touchend mousemove touchmove");
                            }, this);
                        }, this);

                        events.on(trimEndMarker, "mousedown touchstart", function(e) {
                            e.preventDefault();
                            e.stopPropagation();

                            var boundingRect = this.get("progressbarElement").getBoundingClientRect();
                            this.call("updateTrimEnd", e, boundingRect);

                            events.on(document, "mousemove touchmove", function(e) {
                                e.preventDefault();
                                this.call("updateTrimEnd", e, boundingRect);
                            }, this);

                            events.on(document, "mouseup touchend", function(e) {
                                e.preventDefault();
                                events.off(document, "mouseup touchend mousemove touchmove");
                            }, this);
                        }, this);
                    },

                    updateTrimStart: function(event, boundingRect) {
                        var position = this.call("calculatePosition", event, boundingRect);
                        var trimEnd = this.get("trimend") || this.get("duration");
                        var timeMinLimit = this.get("timeminlimit") || 1;
                        if (position > trimEnd - timeMinLimit) {
                            this.set("trimstart", trimEnd - timeMinLimit);
                        } else {
                            this.set("trimstart", position);
                        }
                    },

                    updateTrimEnd: function(event, boundingRect) {
                        var position = this.call("calculatePosition", event, boundingRect);
                        var trimStart = this.get("trimstart") || 0;
                        var timeMinLimit = this.get("timeminlimit") || 1;
                        if (position < trimStart + timeMinLimit) {
                            this.set("trimend", trimStart + timeMinLimit);
                        } else {
                            this.set("trimend", position);
                        }
                    },

                    getClientX: function(event) {
                        return event.clientX === 0 ? 0 : event.clientX || event.targetTouches[0].clientX;
                    },

                    calculatePosition: function(event, dimensions) {
                        var clientX = this.call("getClientX", event);
                        var percentageFromStart = -1;
                        if (clientX < dimensions.left) percentageFromStart = 0;
                        else if (clientX > (dimensions.left + dimensions.width)) percentageFromStart = 1;
                        else {
                            percentageFromStart = (clientX - dimensions.left) / (dimensions.width || 1);
                        }
                        return this.get("duration") * percentageFromStart;
                    }
                },

                _hideThumb: function() {
                    if (typeof this.__parent.__trackTags !== "undefined") {
                        if (this.__parent.__trackTags.hasThumbs && this.get("thumbisvisible")) {
                            this.set("thumbisvisible", false);
                            this.__parent.__trackTags.hideDurationThumb();
                        }
                    }
                },

                create: function() {
                    this.set("ismobile", Info.isMobile());
                    this.set("events", new DomEvents());
                    this.set("progressbarElement", this.activeElement().querySelector('[data-selector="progress-bar-inner"]'));
                    if (this.get("trimmingmode"))
                        this.call("addTrimmingEventListeners");
                }
            };
        })
        .register("ba-videoplayer-controlbar")
        .registerFunctions({
            /**/"cssplayer": function (obj) { return obj.cssplayer; }, "((prominent_title_closed || title_hide_class) && controlbar_hide_class) ? cssplayer + '-dashboard-hidden' : ''": function (obj) { return ((obj.prominent_title_closed || obj.title_hide_class) && obj.controlbar_hide_class) ? obj.cssplayer + '-dashboard-hidden' : ''; }, "skipinitial ? 2 : 1": function (obj) { return obj.skipinitial ? 2 : 1; }, "css": function (obj) { return obj.css; }, "controlbar_hide_class": function (obj) { return obj.controlbar_hide_class; }, "activitydelta < 2500 || ismobile ? '' : (css + '-progressbar-small')": function (obj) { return obj.activitydelta < 2500 || obj.ismobile ? '' : (obj.css + '-progressbar-small'); }, "disableseeking ? cssplayer + '-disabled' : ''": function (obj) { return obj.disableseeking ? obj.cssplayer + '-disabled' : ''; }, "seek(position + skipseconds)": function (obj) { return obj.seek(obj.position + obj.skipseconds); }, "seek(position - skipseconds)": function (obj) { return obj.seek(obj.position - obj.skipseconds); }, "seek(position + skipseconds * 3)": function (obj) { return obj.seek(obj.position + obj.skipseconds * 3); }, "seek(position - skipseconds * 3)": function (obj) { return obj.seek(obj.position - obj.skipseconds * 3); }, "startUpdatePosition(domEvent)": function (obj) { return obj.startUpdatePosition(obj.domEvent); }, "true": function (obj) { return true; }, "chapterslist": function (obj) { return obj.chapterslist; }, "chapter.index": function (obj) { return obj.chapter.index; }, "{left: Math.round(duration ? chapter.startTime / duration * 100 : 0) + '%'}": function (obj) { return {left: Math.round(obj.duration ? obj.chapter.startTime / obj.duration * 100 : 0) + '%'}; }, "showChapterText(chapter)": function (obj) { return obj.showChapterText(obj.chapter); }, "hideChapterText()": function (obj) { return obj.hideChapterText(); }, "visibleindex === chapter.index && showchaptertext": function (obj) { return obj.visibleindex === obj.chapter.index && obj.showchaptertext; }, "chapter.title": function (obj) { return obj.chapter.title; }, "{width: Math.round(duration ? cached / duration * 100 : 0) + '%'}": function (obj) { return {width: Math.round(obj.duration ? obj.cached / obj.duration * 100 : 0) + '%'}; }, "{width: Math.round(duration ? position / duration * 100 : 0) + '%'}": function (obj) { return {width: Math.round(obj.duration ? obj.position / obj.duration * 100 : 0) + '%'}; }, "string('video-progress')": function (obj) { return obj.string('video-progress'); }, "trimmingmode": function (obj) { return obj.trimmingmode; }, "{left: Math.round(duration && trimstart ? trimstart / duration * 100 : 0) + '%'}": function (obj) { return {left: Math.round(obj.duration && obj.trimstart ? obj.trimstart / obj.duration * 100 : 0) + '%'}; }, "{left: 'auto', right: 100 - Math.round(duration && trimend ? trimend / duration * 100 : 100) + '%'}": function (obj) { return {left: 'auto', right: 100 - Math.round(obj.duration && obj.trimend ? obj.trimend / obj.duration * 100 : 100) + '%'}; }, "submit()": function (obj) { return obj.submit(); }, "submittable": function (obj) { return obj.submittable; }, "string('submit-video')": function (obj) { return obj.string('submit-video'); }, "rerecord()": function (obj) { return obj.rerecord(); }, "rerecordable": function (obj) { return obj.rerecordable; }, "string('rerecord-video')": function (obj) { return obj.string('rerecord-video'); }, "csscommon": function (obj) { return obj.csscommon; }, "skipinitial ? 0 : 2": function (obj) { return obj.skipinitial ? 0 : 2; }, "toggle_player()": function (obj) { return obj.toggle_player(); }, "string('play-video')": function (obj) { return obj.string('play-video'); }, "tab_index_move(domEvent, null, 'button-icon-pause')": function (obj) { return obj.tab_index_move(obj.domEvent, null, 'button-icon-pause'); }, "!playing": function (obj) { return !obj.playing; }, "play()": function (obj) { return obj.play(); }, "disablepause ? cssplayer + '-disabled' : ''": function (obj) { return obj.disablepause ? obj.cssplayer + '-disabled' : ''; }, "tab_index_move(domEvent, null, 'button-icon-play')": function (obj) { return obj.tab_index_move(obj.domEvent, null, 'button-icon-play'); }, "playing": function (obj) { return obj.playing; }, "pause()": function (obj) { return obj.pause(); }, "disablepause ? string('pause-video-disabled') : string('pause-video')": function (obj) { return obj.disablepause ? obj.string('pause-video-disabled') : obj.string('pause-video'); }, "toggle_position_info()": function (obj) { return obj.toggle_position_info(); }, "revertposition ? string('remaining-time') : string('elapsed-time')": function (obj) { return obj.revertposition ? obj.string('remaining-time') : obj.string('elapsed-time'); }, "(revertposition && duration > 0) ? \"-\" : \"\"": function (obj) { return (obj.revertposition && obj.duration > 0) ? "-" : ""; }, "(revertposition && duration > 0) ? (formatTime(duration - position)) : formatTime(position)": function (obj) { return (obj.revertposition && obj.duration > 0) ? (obj.formatTime(obj.duration - obj.position)) : obj.formatTime(obj.position); }, "string('total-time')": function (obj) { return obj.string('total-time'); }, "formatTime(duration || position)": function (obj) { return obj.formatTime(obj.duration || obj.position); }, "title_hide_class": function (obj) { return obj.title_hide_class; }, "title && !prominent_title_closed": function (obj) { return obj.title && !obj.prominent_title_closed; }, "closeable_title": function (obj) { return obj.closeable_title; }, "prominent_title_closed=true": function (obj) { return obj.prominent_title_closed=true; }, "title": function (obj) { return obj.title; }, "frameselectionmode": function (obj) { return obj.frameselectionmode; }, "select_frame()": function (obj) { return obj.select_frame(); }, "string('select-frame')": function (obj) { return obj.string('select-frame'); }, "trim()": function (obj) { return obj.trim(); }, "string('trim-video')": function (obj) { return obj.string('trim-video'); }, "toggle_settings_menu()": function (obj) { return obj.toggle_settings_menu(); }, "settingsmenuactive ? 'active' : 'inactive'": function (obj) { return obj.settingsmenuactive ? 'active' : 'inactive'; }, "tab_index_move(domEvent)": function (obj) { return obj.tab_index_move(obj.domEvent); }, "settingsmenubutton": function (obj) { return obj.settingsmenubutton; }, "string('settings')": function (obj) { return obj.string('settings'); }, "toggle_tracks()": function (obj) { return obj.toggle_tracks(); }, "(tracktags.length > 0 && showsubtitlebutton) || allowtexttrackupload": function (obj) { return (obj.tracktags.length > 0 && obj.showsubtitlebutton) || obj.allowtexttrackupload; }, "tracktextvisible ? 'active' : 'inactive'": function (obj) { return obj.tracktextvisible ? 'active' : 'inactive'; }, "tracktextvisible ? string('close-tracks') : string('show-tracks')": function (obj) { return obj.tracktextvisible ? obj.string('close-tracks') : obj.string('show-tracks'); }, "hover_cc(true)": function (obj) { return obj.hover_cc(true); }, "hover_cc(false)": function (obj) { return obj.hover_cc(false); }, "fullscreen": function (obj) { return obj.fullscreen; }, "toggle_fullscreen()": function (obj) { return obj.toggle_fullscreen(); }, "fullscreened ? string('exit-fullscreen-video') : string('fullscreen-video')": function (obj) { return obj.fullscreened ? obj.string('exit-fullscreen-video') : obj.string('fullscreen-video'); }, "fullscreened ? 'small' : 'full'": function (obj) { return obj.fullscreened ? 'small' : 'full'; }, "show_airplay_devices()": function (obj) { return obj.show_airplay_devices(); }, "airplaybuttonvisible": function (obj) { return obj.airplaybuttonvisible; }, "string('airplay')": function (obj) { return obj.string('airplay'); }, "string('airplay-icon')": function (obj) { return obj.string('airplay-icon'); }, "castbuttonvisble": function (obj) { return obj.castbuttonvisble; }, "toggle_stream()": function (obj) { return obj.toggle_stream(); }, "streams.length > 1 && currentstream": function (obj) { return obj.streams.length > 1 && obj.currentstream; }, "string('change-resolution')": function (obj) { return obj.string('change-resolution'); }, "currentstream_label": function (obj) { return obj.currentstream_label; }, "!hidevolumebar": function (obj) { return !obj.hidevolumebar; }, "set_volume(volume + 0.1)": function (obj) { return obj.set_volume(obj.volume + 0.1); }, "set_volume(volume - 0.1)": function (obj) { return obj.set_volume(obj.volume - 0.1); }, "set_volume(1)": function (obj) { return obj.set_volume(1); }, "set_volume(0)": function (obj) { return obj.set_volume(0); }, "startUpdateVolume(domEvent, currElement)": function (obj) { return obj.startUpdateVolume(obj.domEvent, obj.currElement); }, "{width: Math.min(100, Math.round(volume * 100)) + '%'}": function (obj) { return {width: Math.min(100, Math.round(obj.volume * 100)) + '%'}; }, "string('volume-button')": function (obj) { return obj.string('volume-button'); }, "toggle_volume()": function (obj) { return obj.toggle_volume(); }, "string(volume > 0 ? 'volume-mute' : 'volume-unmute')": function (obj) { return obj.string(obj.volume > 0 ? 'volume-mute' : 'volume-unmute'); }, "csscommon + '-icon-volume-' + (volume >= 0.5 ? 'up' : (volume > 0 ? 'down' : 'off'))": function (obj) { return obj.csscommon + '-icon-volume-' + (obj.volume >= 0.5 ? 'up' : (obj.volume > 0 ? 'down' : 'off')); }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "video-progress": "Progress",
            "rerecord-video": "Redo?",
            "submit-video": "Confirm",
            "play-video": "Play",
            "pause-video": "Pause",
            "pause-video-disabled": "Pause not supported",
            "elapsed-time": "Elapsed time",
            "total-time": "Total length of",
            "fullscreen-video": "Enter fullscreen",
            "volume-button": "Set volume",
            "volume-mute": "Mute sound",
            "volume-unmute": "Unmute sound",
            "change-resolution": "Change resolution",
            "exit-fullscreen-video": "Exit fullscreen",
            "close-tracks": "Close CC",
            "show-tracks": "Show CC",
            "player-speed": "Player speed",
            "settings": "Settings",
            "airplay": "Airplay",
            "airplay-icon": "Airplay icon.",
            "remaining-time": "Remaining time",
            "select-frame": "Select",
            "trim-video": "Trim"
        });
});
Scoped.define("module:VideoPlayer.Dynamics.FloatingSidebar", [
    "dynamics:Dynamic",
    "base:Objs",
    "browser:Dom",
    "module:Assets",
    "module:StylesMixin"
], function(Class, Objs, DOM, Assets, StylesMixin, scoped) {
    return Class.extend({
            scoped: scoped
        }, [StylesMixin, function(inherited) {
            return {

                template: "<div class=\"{{cssfloatingsidebar}}-container\" ba-styles=\"{{containerstyle}}\">\n    <div ba-if=\"{{adsplaying}}\" class=\"{{cssfloatingsidebar}}-ad-playing-container\">\n        <div ba-if=\"{{adchoiceslink}}\" class=\"{{cssadsplayer}}-ad-choices-container\">\n            <a href=\"{{ adchoiceslink }}\" title=\"{{string('ad-choices')}}\"\n               ba-on:touchend=\"{{redirect(adchoiceslink)}}\"\n               target=\"_blank\"\n            >\n                <svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                    <rect width=\"16\" height=\"16\" transform=\"matrix(1 0 0 -1 0 16)\" fill=\"url(#ba-ad-choice-pattern-sidebar)\"/>\n                    <defs>\n                        <pattern id=\"ba-ad-choice-pattern-sidebar\" patternContentUnits=\"objectBoundingBox\" width=\"1\" height=\"1\">\n                            <use xlink:href=\"#ba-ad-choices-image\" transform=\"scale(0.00208333)\"/>\n                        </pattern>\n                        <image id=\"ba-ad-choices-image\" width=\"480\" height=\"480\" xlink:href=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAALxUExURQAAAP////n+//L8//r///f9//r+//v///j+//f+//n///f///z///z+//3///L+//n9//j9//r9//j///v+//T8/8v0//j8//7///T7/+v8//f7//P+//39//v4//n8/8jh//b7//f8//X///38/+36//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n///n+//n+//n+//n+//n+//n+//n+//n+//n+//f///n+//n+//n+//n+//n+//n+//n+//n+//n+//r+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//z///n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//r///n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//v///r+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//j+//n+//n+//n+//n+//n+//n+//n+//n+//r+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n///n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+//n+/////yUvWvEAAAD5dFJOUwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGy0cBgdu1uvarGIfY/j92IQoFczefBlD9clLAW3uA4nyV5nADQGgGqEINHeIaC4Dnr5wmsfbuTIUh+jnMdUhAQ8MBZbjeJPi/sJVCo0r6fewBHIk5O+c3OUidhZ5wfZbeiNS+rRGFxBf/PGfARhpzeYlb9F13R3TE9D7xWUma15dv/nhbKlYYQuznfNRq7K4T+w4AQQJfQEqWUVAj1ytSagnkQI+9KRWzhIp8AfEo0FEZ7bIWjBzgowRN067TIqmjteXAzoCm0jqxpjSe4Uz7UKiHgIKuAYAAAABYktHRAH/Ai3eAAAAB3RJTUUH5wQaECAXB8CStAAABJdJREFUWMPNl3lcFFUcwPf9WmbGbd0W14ruGwHlXpLLSAXUNZIARSBBk9gthaIgUfLMLERUPFBTC0NJ7AAji0IrjG47LCuzsuywy+5z/uu92Z15Mzs7O7v7j/3+e/N5v++83/F+v98zGP4fgkCQM4woZP2wyBFR0QAMhIRgIGbkqNi4+ITEMHyOEBAsl5TMY7GnXD0aYAgTvAWpabxH0jMygz8EgjHX8JJkXTs2WAKCcbxMxo/MBlNQACPkyAF87oQgAcyZExUAfpIDEDIPtZwVoCUw+TolIC4PRDEHAuAmX68ExE+Bsfk3FBQWTQ0sIgw7zaNZPG56SWnZjTOgvGImXs4quckK4fr5Pczm8cHsSoCbqyKd4LrFQ7x1TjkAN1wHwYTPdW8vOZs9hyGWV1aL1tTcdnst/sD6D6P1DvfuDI/BcGcddUj9XWPm6biC5Tx50CAC5i+Q+7Tx7hkWv/fUzBV4AaIWKsOyqGIxwLkmpAdYIgLy4ngvSZm+FNvB6ACWKQGx9yynBHvpvU6MiPALWKEEzL7v/uImikhe2ezy7U0twKhV0LK6dA1FrG3NXwcmNUITsB7/MHXDxhqKaMvZZAXkjdACpGQCcx5A5uYtMkTcA7hknc+gQABbtwEuNjg1Ixu2U0RNWsKDABb5KbQA1YvBQOqVCSCq4SG7hGjf8fBSxU3XArR1gLBEnA0gb2dWu4RYk7UL35Ch2oDIMjmAIPApUjsfoYjdrXk0omqAO5W7KkE6JTJGALTsmUW9+WgVgCZgfQpZbimnAIwwWQEeW0vNeFzKbDXgiUnCP+bJAUILje6mR+ixaZ6AgZ3Y2r1PwgXegOxeCigAP4Dawqf2JbiU7WE4Dt3Tz0j6dX1woRaAjAvPPqe4OIjFy/4kWmjs+w9IV1PtA7jo+RdedMhKIcth+wd6kyX9poNOyQIVAMHFL3XVLB9MFLdEkL+//EojtX/B5n5ZbVADXk0ny9deB9GgqW8MvknVcw/lXyKvLWrAW0Liv/0OBiDmUoB351Ln8Yd7m99TFhY1oLmeLN93gGB85px0qt545IMY70ahBjhb8RHqNwjt1bE6TVbWuj90qfuMGgAtH+3r3kX+5Go+upuWgo+POX21KVUYzXjXFDz0wWWf9ByWFaNPV+FvRoNBF4A9R/IGEj+TdaiZxzcBXO6zVasBBqL/eeF2qr730BfrNDukz1SOOVFMC3rTl18Rh1gMvoUN/9q9bz+HBHUGDvR9I0ucjQlVfqcdo/Wke2MF2WTEe+cfl/X3rctw9eIYP/3daPUMGD2IseDEqU36lqrXHcTTL+t/UrLavnNvLm3Bf//+h14a+dwjfT/qD1pgOyXe0REdJ6bF0rw7+lN0IHMac8UpUeXnNnrl7b8cc/hOHG8ZZvuVV8tve1LJgKavTvx+UqW+8PdtOO+YwGZdM2R4qXfldFh9DQIagqDTLlev/mM0CkKdAP78i6qPn1g0JMjHF4LalaJ6ffyA3ljpQzj4e5Gg3r5jQn9gkfMOw5UD/5TFlg12lpM7F8K7D6tl/1tEXp5hob08DSZOKKBXhfr2PZ3yH3LVRJc70d2PAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIzLTA0LTI2VDE2OjMyOjA3KzAwOjAwPnuJagAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMy0wNC0yNlQxNjozMjowNyswMDowME8mMdYAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjMtMDQtMjZUMTY6MzI6MjMrMDA6MDCuWTNnAAAAAElFTkSuQmCC\"/>\n                    </defs>\n                </svg>\n            </a>\n        </div>\n        \n        <div ba-if=\"{{companionadcontent}}\"\n             class=\"{{cssfloatingsidebar}}-companion-container\"\n             ba-styles=\"{{{height: containerstyle.height}}}\"\n        ></div>\n        <div ba-if=\"{{moredetailslink && !companionadcontent}}\"\n             class=\"{{cssfloatingsidebar}}-content-container\"\n             ba-styles=\"{{{height: containerstyle.height}}}\"\n        >\n            <div ba-if=\"{{moredetailslink}}\">\n                <a\n                    href=\"{{ moredetailslink }}\" target=\"_blank\"\n                    class=\"{{cssfloatingsidebar}}-action-button\"\n                    title=\"{{moredetailstext ? moredetailstext : string('learn-more')}}\"\n                    ba-on:mouseup=\"{{pause_ads()}}\"\n                    ba-on:touchend=\"{{pause_ads(moredetailslink)}}\"\n                >\n                    {{string('learn-more')}}\n                </a>\n            </div>\n        </div>\n    </div>\n    <div ba-if=\"{{!adsplaying}}\" class=\"{{cssfloatingsidebar}}-content-container\">\n        <div class=\"{{cssfloatingsidebar}}-title\">\n            {{title}}\n        </div>\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-videoplayer",
                    "csscommon": "ba-commoncss",
                    "cssplayer": "ba-player",
                    "cssadsplayer": "ba-adsplayer",
                    "cssfloatingsidebar": "ba-floating-sidebar",
                    "containerstyle": null,
                    "sidebartitle": null,
                    "bodyelementtouched": false,
                    "bodyelementpadding": 114,
                    "companionadcontent": null,
                    "companionads": []
                },

                _afterActivate: function() {
                    if (this.get("floatingoptions.showcompanionad")) {
                        if (this.get("companionads") && this.get("companionads").length > 0) {
                            this.__generateCompanionAdContent();
                        } else {
                            this.auto_destroy(this.on("change:companionads", function(companionads) {
                                this.__generateCompanionAdContent(companionads);
                            }, this), this);
                        }
                    }
                },

                functions: {
                    pause_ads: function(url) {
                        if (this.get("adsplaying")) {
                            this.trigger("pause_ads");
                        }
                        if (url) this.__redirect(url);
                    },
                    redirect: function(url) {
                        this.__redirect(url);
                    }
                },

                /**
                 * @param companionads
                 * @private
                 */
                __generateCompanionAdContent: function(companionads) {
                    companionads = companionads || this.get("companionads");
                    if (companionads && companionads.length > 0) {
                        var isMobile = this.get("mobileviewport");
                        if (
                            (this.get("floatingoptions.desktop.companionad") && !isMobile) ||
                            (this.get("floatingoptions.mobile.companionad") && isMobile)
                        ) {
                            var dimensions = DOM.elementDimensions(this.activeElement());
                            var ar, closestIndex, closestAr;
                            ar = dimensions.width / dimensions.height;
                            Objs.iter(companionads, function(companion, index) {
                                var _data = companion.data;
                                var _ar = _data.width / _data.height;
                                var _currentDiff = Math.abs(_ar - ar);
                                if (index === 0 || closestAr > _currentDiff) {
                                    closestAr = _currentDiff;
                                    closestIndex = index;
                                }
                                if (companionads.length === index + 1) {
                                    var companionAd = companionads[closestIndex];
                                    this.set("companionadcontent", companionAd.getContent());
                                    var container = this.activeElement().querySelector("." + this.get("cssfloatingsidebar") + '-companion-container');
                                    if (container) this.__drawCompanionAdToContainer(container, companionAd, dimensions, ar, _ar);
                                }
                            }, this);
                        }
                    }
                },

                __drawCompanionAdToContainer: function(container, companionAd, dimensions, ar, _ar) {
                    container.innerHTML = this.get("companionadcontent");
                    var image = container.querySelector('img');
                    if (image && _ar && dimensions) {
                        _ar = companionAd.data.width / companionAd.data.height;
                        if (_ar < ar) {
                            image.height = dimensions.height;
                            image.width = dimensions.height * (_ar <= 1 ? _ar : companionAd.data.width / companionAd.data.height);
                        } else {
                            image.width = dimensions.width;
                            image.height = dimensions.width * (companionAd.data.height / companionAd.data.width);
                        }
                    }

                },

                // in mobileview click not redirect to url, so making it manually
                __redirect: function(url) {
                    if (url && url.length > 0 && /^(http|https):\/\//i.test(url) && window) {
                        window.open(url, "_blank");
                    }
                }
            };
        }])
        .register("ba-videoplayer-floating-sidebar")
        .registerFunctions({
            /**/"cssfloatingsidebar": function (obj) { return obj.cssfloatingsidebar; }, "containerstyle": function (obj) { return obj.containerstyle; }, "adsplaying": function (obj) { return obj.adsplaying; }, "adchoiceslink": function (obj) { return obj.adchoiceslink; }, "cssadsplayer": function (obj) { return obj.cssadsplayer; }, "string('ad-choices')": function (obj) { return obj.string('ad-choices'); }, "redirect(adchoiceslink)": function (obj) { return obj.redirect(obj.adchoiceslink); }, "companionadcontent": function (obj) { return obj.companionadcontent; }, "{height: containerstyle.height}": function (obj) { return {height: obj.containerstyle.height}; }, "moredetailslink && !companionadcontent": function (obj) { return obj.moredetailslink && !obj.companionadcontent; }, "moredetailslink": function (obj) { return obj.moredetailslink; }, "moredetailstext ? moredetailstext : string('learn-more')": function (obj) { return obj.moredetailstext ? obj.moredetailstext : obj.string('learn-more'); }, "pause_ads()": function (obj) { return obj.pause_ads(); }, "pause_ads(moredetailslink)": function (obj) { return obj.pause_ads(obj.moredetailslink); }, "string('learn-more')": function (obj) { return obj.string('learn-more'); }, "!adsplaying": function (obj) { return !obj.adsplaying; }, "title": function (obj) { return obj.title; }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "ad-choices": "Ad Choices",
            "learn-more": "Learn More"
        });
});
Scoped.define("module:VideoPlayer.Dynamics.Loader", [
    "dynamics:Dynamic",
    "module:Assets"
], function(Class, Assets, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<div class=\"{{cssplayer}}-loader-container\">\n    <div data-selector=\"loader-block\" class=\"{{cssplayer}}-loader-loader\" title=\"{{string('tooltip')}}\">\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-videoplayer",
                    "csscommon": "ba-commoncss",
                    "cssplayer": "ba-player"
                }

            };
        })
        .register("ba-videoplayer-loader")
        .registerFunctions({
            /**/"cssplayer": function (obj) { return obj.cssplayer; }, "string('tooltip')": function (obj) { return obj.string('tooltip'); }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "tooltip": "Loading..."
        });
});
Scoped.define("module:VideoPlayer.Dynamics.Message", [
    "dynamics:Dynamic"
], [
    "dynamics:Partials.ClickPartial"
], function(Class, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{css}}-message-container\" ba-click=\"{{click()}}\">\n    <div data-selector=\"message-block\" class='{{css}}-message-message'>\n        <p> {{message}} </p>\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-videoplayer",
                    "csscommon": "ba-commoncss",
                    "cssplayer": "ba-player",
                    "message": ''
                },

                functions: {

                    click: function() {
                        this.trigger("click");
                    }

                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "click()": function (obj) { return obj.click(); }, "message": function (obj) { return obj.message; }/**/
        })
        .register("ba-videoplayer-message");
});
Scoped.define("module:VideoPlayer.Dynamics.Next", [
    "dynamics:Dynamic",
    "browser:Canvas",
    "browser:Info",
    "module:Assets"
], function(Class, Canvas, Info, Assets, scoped) {

    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<div class=\"{{cssplayer}}-toggle-next-container {{cssplayer}}-next-style-{{style}} {{(is_floating && with_sidebar) ? cssplayer + '-next-with-sidebar' : ''}}\">\n    <div class=\"{{cssplayer}}-next-button-container\">\n        <a class=\"{{cssplayer}}-next-button-stay\" ba-click=\"{{stay()}}\">{{staytext}}</a>\n        <hr ba-if=\"{{style === 'desktop'}}\">\n        <a class=\"{{cssplayer}}-next-button-next\" ba-click=\"{{next()}}\">\n            <span class=\"{{cssplayer}}-next-progress\"ba-styles=\"{{{width: ((position - shownext) / noengagenext * 100) + '%'}}}\"></span>\n            <span>{{nexttext}}</span>\n        </a>\n        <img ba-prop:src=\"{{nextvideoposter}}\" ba-show=\"{{style === 'desktop' && nextvideoposter && !hidenextvideoposter}}\" />\n    </div>\n</div>\n",

                attrs: {
                    css: "ba-videoplayer",
                    csscommon: "ba-commoncss",
                    cssplayer: "ba-player",
                    style: "mobile"
                },

                computed: {
                    "staytext:style": function(style) {
                        return style === "desktop" ? "Stay & Watch" : "Stay";
                    },
                    "nexttext:style": function(style) {
                        return style === "desktop" ? "Next Video" : "Next";
                    },
                    "nextvideoposter:playlist,current_video_from_playlist": function(playlist, currIndex) {
                        if (!playlist || !playlist[currIndex + 1]) return;
                        return playlist[currIndex + 1].poster;
                    }
                },

                create: function() {
                    if (!Info.isMobile()) {
                        if (!this.get("is_floating")) this.set("style", "desktop");
                        this.on("change:is_floating", function(isFloating) {
                            this.set("style", isFloating ? "mobile" : "desktop");
                        }, this);
                    }
                },

                events: {
                    "change:nextvideoposter": function(nextvideoposter) {
                        if (!nextvideoposter) return;
                        var img = new Image();
                        img.crossOrigin = "anonymous";
                        img.onload = function() {
                            this.set("hidenextvideoposter", Canvas.isImageBlack(img));
                        }.bind(this);
                        img.src = nextvideoposter;
                    }
                },

                functions: {
                    stay: function() {
                        this.channel("next").trigger("setStay");
                    },
                    next: function() {
                        this.channel("next").trigger("playNext");
                    }
                }
            };
        }).register("ba-videoplayer-next")
        .registerFunctions({
            /**/"cssplayer": function (obj) { return obj.cssplayer; }, "style": function (obj) { return obj.style; }, "(is_floating && with_sidebar) ? cssplayer + '-next-with-sidebar' : ''": function (obj) { return (obj.is_floating && obj.with_sidebar) ? obj.cssplayer + '-next-with-sidebar' : ''; }, "stay()": function (obj) { return obj.stay(); }, "staytext": function (obj) { return obj.staytext; }, "style === 'desktop'": function (obj) { return obj.style === 'desktop'; }, "next()": function (obj) { return obj.next(); }, "{width: ((position - shownext) / noengagenext * 100) + '%'}": function (obj) { return {width: ((obj.position - obj.shownext) / obj.noengagenext * 100) + '%'}; }, "nexttext": function (obj) { return obj.nexttext; }, "nextvideoposter": function (obj) { return obj.nextvideoposter; }, "style === 'desktop' && nextvideoposter && !hidenextvideoposter": function (obj) { return obj.style === 'desktop' && obj.nextvideoposter && !obj.hidenextvideoposter; }/**/
        })
        .attachStringTable(Assets.strings);
});
Scoped.define("module:VideoPlayer.Dynamics.Playbutton", [
    "dynamics:Dynamic",
    "base:TimeFormat",
    "module:Assets"
], [
    "dynamics:Partials.ClickPartial"
], function(Class, TimeFormat, Assets, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div tabindex=\"0\" data-selector=\"play-button\"\n     ba-hotkey:space^enter=\"{{play()}}\" onmouseout=\"this.blur()\"\n     onkeydown=\"{{tab_index_move(domEvent, null, 'player-toggle-overlay')}}\"\n     class=\"{{css}}-playbutton-container\" ba-click=\"{{play()}}\" title=\"{{string('tooltip')}}\"\n>\n\t<div class=\"{{css}}-playbutton-button\"></div>\n</div>\n<div ba-show=\"{{showduration && (duration != 0 && duration != undefined)}}\" class=\"{{css}}-playbutton-duration\">\n\t{{formatTime(duration)}}\n</div>\n<div class=\"{{css}}-rerecord-bar\" ba-if=\"{{rerecordable || submittable}}\">\n\t<div class=\"{{css}}-rerecord-backbar\"></div>\n\t<div class=\"{{css}}-rerecord-frontbar\">\n        <div class=\"{{css}}-rerecord-button-container\" ba-if=\"{{submittable && !trimmingmode}}\">\n            <div tabindex=\"0\" data-selector=\"player-submit-button\"\n                 ba-hotkey:space^enter=\"{{submit()}}\" onmouseout=\"this.blur()\"\n                 class=\"{{css}}-rerecord-button\" onclick=\"{{submit()}}\">\n                {{string('submit-video')}}\n            </div>\n        </div>\n        <div class=\"{{css}}-rerecord-button-container\" ba-if=\"{{rerecordable && !trimmingmode}}\">\n        \t<div tabindex=\"0\" data-selector=\"player-rerecord-button\"\n                 ba-hotkey:space^enter=\"{{rerecord()}}\" onmouseout=\"this.blur()\"\n                 class=\"{{css}}-rerecord-button\" onclick=\"{{rerecord()}}\">\n        \t\t{{string('rerecord')}}\n        \t</div>\n        </div>\n        <div class=\"{{css}}-rerecord-button-container\" ba-if=\"{{trimmingmode}}\">\n        \t<div tabindex=\"0\" data-selector=\"player-trim-button\"\n                 ba-hotkey:space^enter=\"{{play()}}\" onmouseout=\"this.blur()\"\n                 class=\"{{css}}-rerecord-button\" onclick=\"{{play()}}\">\n        \t\t{{string('trim')}}\n        \t</div>\n        </div>\n        <div class=\"{{css}}-rerecord-button-container\" ba-if=\"{{trimmingmode}}\">\n        \t<div tabindex=\"0\" data-selector=\"player-skip-button\"\n                 ba-hotkey:space^enter=\"{{skip()}}\" onmouseout=\"this.blur()\"\n                 class=\"{{css}}-rerecord-button\" onclick=\"{{skip()}}\">\n        \t\t{{string('skip')}}\n        \t</div>\n        </div>\n\t</div>\n</div>\n",

                attrs: {
                    "css": "ba-videoplayer",
                    "csstheme": "ba-videoplayer",
                    "csscommon": "ba-commoncss",
                    "cssplayer": "ba-player",
                    "rerecordable": false,
                    "submittable": false,
                    "showduration": false
                },

                functions: {

                    play: function() {
                        this.trigger("play");
                    },

                    skip: function() {
                        this.parent().trigger("skip");
                    },

                    submit: function() {
                        this.set("submittable", false);
                        this.set("rerecordable", false);
                        this.trigger("submit");
                    },

                    rerecord: function() {
                        this.trigger("rerecord");
                    },

                    tab_index_move: function(ev, nextSelector, focusingSelector) {
                        this.trigger("tab_index_move", ev[0], nextSelector, focusingSelector);
                    },

                    formatTime: function(time) {
                        time = Math.max(time || 0, 1);
                        if (time > 3600) {
                            return TimeFormat.format(TimeFormat.ELAPSED_HOURS_MINUTES_SECONDS, time * 1000);
                        } else {
                            return TimeFormat.format(TimeFormat.ELAPSED_MINUTES_SECONDS, time * 1000);
                        }
                    }
                }
            };
        })
        .register("ba-videoplayer-playbutton")
        .registerFunctions({
            /**/"play()": function (obj) { return obj.play(); }, "tab_index_move(domEvent, null, 'player-toggle-overlay')": function (obj) { return obj.tab_index_move(obj.domEvent, null, 'player-toggle-overlay'); }, "css": function (obj) { return obj.css; }, "string('tooltip')": function (obj) { return obj.string('tooltip'); }, "showduration && (duration != 0 && duration != undefined)": function (obj) { return obj.showduration && (obj.duration != 0 && obj.duration != undefined); }, "formatTime(duration)": function (obj) { return obj.formatTime(obj.duration); }, "rerecordable || submittable": function (obj) { return obj.rerecordable || obj.submittable; }, "submittable && !trimmingmode": function (obj) { return obj.submittable && !obj.trimmingmode; }, "submit()": function (obj) { return obj.submit(); }, "string('submit-video')": function (obj) { return obj.string('submit-video'); }, "rerecordable && !trimmingmode": function (obj) { return obj.rerecordable && !obj.trimmingmode; }, "rerecord()": function (obj) { return obj.rerecord(); }, "string('rerecord')": function (obj) { return obj.string('rerecord'); }, "trimmingmode": function (obj) { return obj.trimmingmode; }, "string('trim')": function (obj) { return obj.string('trim'); }, "skip()": function (obj) { return obj.skip(); }, "string('skip')": function (obj) { return obj.string('skip'); }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "tooltip": "Click to play.",
            "rerecord": "Redo",
            "submit-video": "Confirm video",
            "trim": "Trim",
            "skip": "Skip"
        });
});
Scoped.define("module:VideoPlayer.Dynamics.Player", [
    "dynamics:Dynamic",
    "module:Assets",
    "module:DatasetProperties",
    "module:StickyHandler",
    "module:StylesMixin",
    "module:TrackTags",
    "browser:Info",
    "browser:Dom",
    "media:Player.VideoPlayerWrapper",
    "media:Player.Broadcasting",
    "media:Player.Support",
    "base:Types",
    "base:Objs",
    "base:Strings",
    "base:Collections.Collection",
    "base:Time",
    "base:Timers",
    "base:TimeFormat",
    "base:States.Host",
    "base:Classes.ClassRegistry",
    "base:Async",
    "module:VideoPlayer.Dynamics.PlayerStates.Initial",
    "module:VideoPlayer.Dynamics.PlayerStates",
    "module:Ads.AbstractVideoAdProvider",
    "browser:Events"
], [
    "module:Ads.Dynamics.Player",
    "module:Common.Dynamics.Settingsmenu",
    "module:VideoPlayer.Dynamics.Playbutton",
    "module:VideoPlayer.Dynamics.Message",
    "module:VideoPlayer.Dynamics.Loader",
    "module:VideoPlayer.Dynamics.Share",
    "module:VideoPlayer.Dynamics.Next",
    "module:VideoPlayer.Dynamics.Controlbar",
    "module:VideoPlayer.Dynamics.Topmessage",
    "module:VideoPlayer.Dynamics.Tracks",
    "module:VideoPlayer.Dynamics.FloatingSidebar",
    "dynamics:Partials.EventPartial",
    "dynamics:Partials.OnPartial",
    "dynamics:Partials.TogglePartial",
    "dynamics:Partials.StylesPartial",
    "dynamics:Partials.TemplatePartial",
    "dynamics:Partials.HotkeyPartial",
    "module:VideoPlayer.Dynamics.PlayerStates.TextTrackUploading",
    "module:VideoPlayer.Dynamics.PlayerStates.FatalError",
    "module:VideoPlayer.Dynamics.PlayerStates.Initial",
    "module:VideoPlayer.Dynamics.PlayerStates.LoadPlayer",
    "module:VideoPlayer.Dynamics.PlayerStates.LoadPlayerDirectly",
    "module:VideoPlayer.Dynamics.PlayerStates.LoadError",
    "module:VideoPlayer.Dynamics.PlayerStates.PosterReady",
    "module:VideoPlayer.Dynamics.PlayerStates.Outstream",
    "module:VideoPlayer.Dynamics.PlayerStates.LoadAds",
    "module:VideoPlayer.Dynamics.PlayerStates.PlayOutstream",
    "module:VideoPlayer.Dynamics.PlayerStates.ReloadAds",
    "module:VideoPlayer.Dynamics.PlayerStates.PlayAd",
    "module:VideoPlayer.Dynamics.PlayerStates.PrerollAd",
    "module:VideoPlayer.Dynamics.PlayerStates.MidrollAd",
    "module:VideoPlayer.Dynamics.PlayerStates.PostrollAd",
    "module:VideoPlayer.Dynamics.PlayerStates.PosterError",
    "module:VideoPlayer.Dynamics.PlayerStates.LoadVideo",
    "module:VideoPlayer.Dynamics.PlayerStates.ErrorVideo",
    "module:VideoPlayer.Dynamics.PlayerStates.PlayVideo",
    "module:VideoPlayer.Dynamics.PlayerStates.NextVideo"
], function(Class, Assets, DatasetProperties, StickyHandler, StylesMixin, TrackTags, Info, Dom, VideoPlayerWrapper, Broadcasting, PlayerSupport, Types, Objs, Strings, Collection, Time, Timers, TimeFormat, Host, ClassRegistry, Async, InitialState, PlayerStates, AdProvider, DomEvents, scoped) {
    return Class.extend({
            scoped: scoped
        }, [StylesMixin, function(inherited) {
            return {

                template: "<div itemscope itemtype=\"http://schema.org/VideoObject\"\n     class=\"{{css}}-container {{cssplayer}}-size-{{csssize}} {{iecss}}-{{ie8 ? 'ie8' : 'noie8'}} {{csstheme}}\n     {{cssplayer}}-{{fullscreened ? 'fullscreen' : 'normal'}}-view {{cssplayer}}-{{firefox ? 'firefox' : 'common'}}-browser\n     {{cssplayer}}-{{themecolor}}-color {{cssplayer}}-device-type-{{mobileview ? 'mobile' : 'desktop'}}\n     {{cssplayer}}-viewport-{{mobileviewport ? 'mobile' : 'desktop'}}\n     {{is_floating ? cssfloatingclasses : ''}}\n     {{(with_sidebar && is_floating && !fullscreened) ? cssplayer + '-with-sidebar' : csscommon + '-full-width'}}\n     {{cssplayer + (((activity_delta > hidebarafter) && hideoninactivity) ? '-controlbar-hidden' : '-controlbar-visible')}}\"\n     ba-on:mousemove=\"{{user_activity()}}\"\n     ba-on:mousedown=\"{{user_activity(true)}}\"\n     ba-on:touchstart=\"{{user_activity(true)}}\"\n     ba-styles=\"{{containerSizingStyles}}\"\n>\n    <meta itemprop=\"name\" content=\"{{title || 'Video Player'}}\" />\n    <meta itemprop=\"description\" content=\"{{description || 'Video Player'}}\" />\n    <meta itemprop=\"uploadDate\" content=\"{{uploaddate}}\" />\n    <meta itemprop=\"caption\" content=\"{{title}}\" />\n    <meta itemprop=\"thumbnailUrl\" content=\"{{thumbnailurl}}\" />\n    <meta itemprop=\"contentUrl\" content=\"{{contenturl}}\" />\n    <ba-{{dynnext}}\n        ba-if=\"{{next_active}}\"\n        ba-is_floating=\"{{is_floating}}\"\n        ba-with_sidebar=\"{{with_sidebar}}\"\n        ba-playlist=\"{{playlist}}\"\n        ba-current_video_from_playlist=\"{{current_video_from_playlist}}\"\n        ba-position=\"{{position}}\"\n        ba-shownext=\"{{shownext}}\"\n        ba-noengagenext=\"{{noengagenext}}\"\n    ></ba-{{dynnext}}>\n    <div class=\"{{cssplayer}}-content\" data-selector=\"ba-player-container\">\n        <div ba-show=\"{{(videoelement_active || !imageelement_active) && !silent_attach}}\" class=\"{{css}}-video-container\">\n            <video tabindex=\"-1\" class=\"{{css}}-video {{csscommon}}-{{videofitstrategy}}-fit\" data-video=\"video\"\n                   preload=\"{{preload ? 'auto' : 'metadata'}}\"\n                   ba-toggle:playsinline=\"{{!playfullscreenonmobile}}\"\n            ></video>\n        </div>\n        <div ba-show=\"{{(imageelement_active && !videoelement_active) || silent_attach}}\" class=\"{{css}}-poster-container\">\n            <img tabindex=\"-1\" data-image=\"image\" alt=\"{{posteralt}}\" class=\"{{csscommon}}-{{posterfitstrategy}}-fit\"/>\n        </div>\n        <ba-{{dynadsplayer}}\n            ba-if=\"{{adsplayer_active}}\"\n            ba-ad=\"{{=ad}}\"\n            ba-addata=\"{{=addata}}\"\n            ba-adsmanagerloaded=\"{{=adsmanagerloaded}}\"\n            ba-css=\"{{css}}\"\n            ba-cssplayer=\"{{cssplayer}}\"\n            ba-csscommon=\"{{csscommon}}\"\n            ba-duration=\"{{=adduration}}\"\n            ba-volume=\"{{=volume}}\"\n            ba-muted=\"{{muted}}\"\n            ba-containerstyle=\"{{containerSizingStyles}}\"\n            ba-unmuteonclick=\"{{unmuteonclick}}\"\n            ba-adtagurl=\"{{adtagurl}}\"\n            ba-adchoiceslink=\"{{adchoiceslink}}\"\n            ba-repeatedplayer=\"{{repeatedplayer}}\"\n            ba-inlinevastxml=\"{{inlinevastxml}}\"\n            ba-outstreamoptions=\"{{outstreamoptions}}\"\n            ba-quartile=\"{{=adsquartile}}\"\n            ba-imasettings=\"{{imasettings}}\"\n            ba-event:fullscreen=\"toggle_fullscreen\"\n            ba-fullscreened=\"{{fullscreened}}\"\n            ba-hidecontrolbar=\"{{!adscontrolbar_active}}\"\n            ba-tmplcontrolbar=\"{{tmpladscontrolbar}}\"\n            ba-dyncontrolbar=\"{{dynadscontrolbar}}\"\n            ba-companionad=\"{{companionad}}\"\n            ba-companionads=\"{{=companionads}}\"\n            ba-hideoninactivity=\"{{(activity_delta > hidebarafter) && hideoninactivity}}\"\n            ba-view_type=\"{{view_type}}\"\n            ba-adsplaying=\"{{=adsplaying}}\"\n            ba-moredetailslink=\"{{=moredetailslink}}\"\n            ba-moredetailstext=\"{{=moredetailstext}}\"\n            ba-mobileview=\"{{mobileview}}\"\n            ba-floating=\"{{is_floating}}\"\n            ba-withsidebar=\"{{with_sidebar}}\"\n            ba-floatingoptions=\"{{floatingoptions}}\"\n            ba-mobileviewport=\"{{mobileviewport}}\"\n            ba-adchoicesontop=\"{{adchoicesontop}}\"\n        ></ba-{{dynadsplayer}}>\n        <div class=\"{{css}}-overlay {{hasplaceholderstyle ? (css + '-overlay-with-placeholder') : ''}}\"\n             ba-show=\"{{!showbuiltincontroller && !outstream && !adsplaying}}\" style=\"{{placeholderstyle}}\"\n        >\n            <div tabindex=\"-1\" class=\"{{css}}-player-toggle-overlay\" data-selector=\"player-toggle-overlay\"\n                 ba-hotkey:right=\"{{seek(position + skipseconds)}}\" ba-hotkey:left=\"{{seek(position - skipseconds)}}\"\n                 ba-hotkey:alt+right=\"{{seek(position + skipseconds * 3)}}\" ba-hotkey:alt+left=\"{{seek(position - skipseconds * 3)}}\"\n                 ba-hotkey:up=\"{{set_volume(volume + 0.1)}}\" ba-hotkey:down=\"{{set_volume(volume - 0.1)}}\"\n                 ba-hotkey:space^enter=\"{{toggle_player()}}\"\n                 ba-on:mouseup=\"{{toggle_player()}}\"\n                 ba-on:touchend=\"{{toggle_player()}}\"\n            ></div>\n            <ba-{{dyntrimmer}}\n                ba-if=\"{{trimmingmode && videoelement_active}}\"\n                ba-playing=\"{{playing}}\"\n                ba-startposition=\"{{=starttime}}\"\n                ba-position=\"{{position}}\"\n                ba-endposition=\"{{=endtime}}\"\n                ba-minduration=\"{{timeminlimit}}\"\n                ba-duration=\"{{duration}}\"\n                ba-source=\"{{source}}\"\n                ba-event:play=\"play\"\n                ba-event:pause=\"pause\"\n                ba-event:seek=\"seek\"\n            ></ba-{{dyntrimmer}}>\n            <ba-{{dyncontrolbar}}\n                ba-css=\"{{csscontrolbar || css}}\"\n                ba-cssplayer=\"{{cssplayer || css}}\"\n                ba-csstheme=\"{{csstheme || css}}\"\n                ba-logo=\"{{controlbar_logo}}\"\n                ba-themecolor=\"{{themecolor}}\"\n                ba-template=\"{{tmplcontrolbar}}\"\n                ba-show=\"{{controlbar_active && !hidecontrolbar}}\"\n                ba-playing=\"{{playing}}\"\n                ba-playwhenvisible=\"{{playwhenvisible}}\"\n                ba-playerspeeds=\"{{playerspeeds}}\"\n                ba-playercurrentspeed=\"{{playercurrentspeed}}\"\n                ba-playlist=\"{{playlist}}\"\n                ba-airplay=\"{{airplay}}\"\n                ba-airplaybuttonvisible=\"{{airplaybuttonvisible}}\"\n                ba-chromecast=\"{{chromecast}}\"\n                ba-castbuttonvisble=\"{{castbuttonvisble}}\"\n                ba-event:rerecord=\"rerecord\"\n                ba-event:submit=\"submit\"\n                ba-event:play=\"play\"\n                ba-event:pause=\"pause\"\n                ba-event:position=\"seek\"\n                ba-event:volume=\"set_volume\"\n                ba-event:set_speed=\"set_speed\"\n                ba-event:settings_menu=\"toggle_settings_menu\"\n                ba-event:fullscreen=\"toggle_fullscreen\"\n                ba-event:toggle_player=\"toggle_player\"\n                ba-event:tab_index_move=\"tab_index_move\"\n                ba-event:seek=\"seek\"\n                ba-event:set_volume=\"set_volume\"\n                ba-event:toggle_tracks=\"toggle_tracks\"\n                ba-tabindex=\"{{tabindex}}\"\n                ba-showchaptertext=\"{{showchaptertext}}\"\n                ba-chapterslist=\"{{chapterslist}}\"\n                ba-tracktextvisible=\"{{tracktextvisible}}\"\n                ba-tracktags=\"{{tracktags}}\"\n                ba-showsubtitlebutton=\"{{hassubtitles && tracktagssupport}}\"\n                ba-allowtexttrackupload=\"{{allowtexttrackupload}}\"\n                ba-tracksshowselection=\"{{tracksshowselection}}\"\n                ba-volume=\"{{volume}}\"\n                ba-muted=\"{{muted}}\"\n                ba-unmuteonclick=\"{{unmuteonclick}}\"\n                ba-duration=\"{{duration}}\"\n                ba-cached=\"{{buffered}}\"\n                ba-title=\"{{title}}\"\n                ba-prominent_title=\"{{prominent_title}}\"\n                ba-closeable_title=\"{{closeable_title}}\"\n                ba-position=\"{{position}}\"\n                ba-activitydelta=\"{{activity_delta}}\"\n                ba-hasnext=\"{{hasnext}}\"\n                ba-hideoninactivity=\"{{hideoninactivity}}\"\n                ba-hidebarafter=\"{{hidebarafter}}\"\n                ba-rerecordable=\"{{rerecordable}}\"\n                ba-submittable=\"{{submittable}}\"\n                ba-frameselectionmode=\"{{frameselectionmode}}\"\n                ba-timeminlimit=\"{{timeminlimit}}\"\n                ba-streams=\"{{streams}}\"\n                ba-currentstream=\"{{=currentstream}}\"\n                ba-fullscreen=\"{{fullscreensupport && !nofullscreen}}\"\n                ba-fullscreened=\"{{fullscreened}}\"\n                ba-source=\"{{source}}\"\n                ba-disablepause=\"{{disablepause}}\"\n                ba-disableseeking=\"{{disableseeking}}\"\n                ba-skipseconds=\"{{skipseconds}}\"\n                ba-skipinitial=\"{{skipinitial}}\"\n                ba-settingsmenubutton=\"{{showsettingsmenu}}\"\n                ba-settingsmenuactive=\"{{settingsmenu_active}}\"\n                ba-hidevolumebar=\"{{hidevolumebar}}\"\n                ba-manuallypaused=\"{{manuallypaused}}\"\n                ba-view_type=\"{{view_type}}\"\n                ba-is_floating=\"{{is_floating}}\"\n                ba-with_sidebar=\"{{with_sidebar}}\"\n            ></ba-{{dyncontrolbar}}>\n\n            <ba-{{dyntracks}}\n                ba-css=\"{{csstracks || css}}\"\n                ba-csstheme=\"{{csstheme || css}}\"\n                ba-cssplayer=\"{{cssplayer || css}}\"\n                ba-show=\"{{tracktagssupport || allowtexttrackupload}}\"\n                ba-tracksshowselection=\"{{tracksshowselection}}\"\n                ba-trackselectorhovered=\"{{trackselectorhovered}}\"\n                ba-tracktags=\"{{tracktags}}\"\n                ba-hidebarafter=\"{{hidebarafter}}\"\n                ba-tracktagsstyled=\"{{tracktagsstyled}}\"\n                ba-trackcuetext=\"{{trackcuetext}}\"\n                ba-allowtexttrackupload=\"{{allowtexttrackupload}}\"\n                ba-uploadtexttracksvisible=\"{{uploadtexttracksvisible}}\"\n                ba-acceptedtracktexts=\"{{acceptedtracktexts}}\"\n                ba-uploadlocales=\"{{uploadlocales}}\"\n                ba-activitydelta=\"{{activity_delta}}\"\n                ba-hideoninactivity=\"{{hideoninactivity}}\"\n                ba-event:selected_label_value=\"selected_label_value\"\n                ba-event:upload-text-tracks=\"upload_text_tracks\"\n                ba-event:move_to_option=\"move_to_option\"\n            ></ba-{{dyntracks}}>\n\n            <ba-{{dynsettingsmenu}}\n                ba-css=\"{{css}}\"\n                ba-csstheme=\"{{csstheme || css}}\"\n                ba-show=\"{{settingsmenu_active}}\"\n                ba-template=\"{{tmplsettingsmenu}}\"\n                ba-toggle_settings_menu=\"{{toggle_settings_menu}}\"\n                ba-toggle_share=\"{{toggle_share}}\"\n            ></ba-{{dynsettingsmenu}}>\n\n            <ba-{{dynplaybutton}}\n                ba-css=\"{{cssplaybutton || css}}\"\n                ba-csstheme=\"{{csstheme || css}}\"\n                ba-cssplayer=\"{{cssplayer || css}}\"\n                ba-theme-color=\"{{themecolor}}\"\n                ba-template=\"{{tmplplaybutton}}\"\n                ba-show=\"{{playbutton_active}}\"\n                ba-rerecordable=\"{{rerecordable}}\"\n                ba-submittable=\"{{submittable}}\"\n                ba-trimmingmode=\"{{trimmingmode}}\"\n                ba-showduration=\"{{showduration}}\"\n                ba-duration=\"{{duration}}\"\n                ba-event:play=\"playbutton_click\"\n                ba-event:rerecord=\"rerecord\"\n                ba-event:submit=\"submit\"\n                ba-event:tab_index_move=\"tab_index_move\"\n            ></ba-{{dynplaybutton}}>\n\n            <ba-{{dynloader}}\n                ba-css=\"{{cssloader || css}}\"\n                ba-csstheme=\"{{csstheme || css}}\"\n                ba-cssplayer=\"{{cssplayer || css}}\"\n                ba-theme-color=\"{{themecolor}}\"\n                ba-template=\"{{tmplloader}}\"\n                ba-playwhenvisible=\"{{playwhenvisible}}\"\n                ba-show=\"{{loader_active}}\"\n            ></ba-{{dynloader}}>\n\n            <ba-{{dynshare}}\n                ba-css=\"{{cssshare || css}}\"\n                ba-csstheme=\"{{csstheme || css}}\"\n                ba-cssplayer=\"{{cssplayer || css}}\"\n                ba-theme-color=\"{{themecolor}}\"\n                ba-template=\"{{tmplshare}}\"\n                ba-show=\"{{sharevideourl && sharevideo.length > 0 && share_active}}\"\n                ba-visible=\"{{=share_active}}\"\n                ba-url=\"{{sharevideourl}}\"\n                ba-shares=\"{{sharevideo}}\"\n            ></ba-{{dynshare}}>\n\n            <ba-{{dynmessage}}\n                ba-css=\"{{cssmessage || css}}\"\n                ba-csstheme=\"{{csstheme || css}}\"\n                ba-cssplayer=\"{{cssplayer || css}}\"\n                ba-theme-color=\"{{themecolor}}\"\n                ba-template=\"{{tmplmessage}}\"\n                ba-show=\"{{message_active}}\"\n                ba-message=\"{{message}}\"\n                ba-event:click=\"message_click\"\n            ></ba-{{dynmessage}}>\n\n            <ba-{{dyntopmessage}}\n                ba-css=\"{{csstopmessage || css}}\"\n                ba-csstheme=\"{{csstheme || css}}\"\n                ba-cssplayer=\"{{cssplayer || css}}\"\n                ba-theme-color=\"{{themecolor}}\"\n                ba-template=\"{{tmpltopmessage}}\"\n                ba-show=\"{{topmessage}}\"\n                ba-topmessage=\"{{topmessage}}\"\n            ></ba-{{dyntopmessage}}>\n        </div>\n        <div ba-show=\"{{useAspectRatioFallback}}\" ba-styles=\"{{aspectRatioFallback}}\"></div>\n    </div>\n    <div\n        ba-if=\"{{with_sidebar && !fullscreened}}\"\n        class=\"{{cssplayer}}-sidebar\"\n        ba-styles={{{flexGrow:1}}}\n    >\n        <ba-{{dynfloatingsidebar}}\n            ba-if=\"{{with_sidebar && !fullscreened}}\"\n            ba-css=\"{{css}}\"\n            ba-cssplayer=\"{{cssplayer}}\"\n            ba-csscommon=\"{{csscommon}}\"\n            ba-csstheme=\"{{csstheme || css}}\"\n            ba-ad=\"{{ad}}\"\n            ba-title=\"{{next_active ? '' : title || 'Video Player'}}\"\n            ba-addata=\"{{addata}}\"\n            ba-companionads=\"{{companionads}}\"\n            ba-floatingoptions=\"{{floatingoptions}}\"\n            ba-adchoiceslink=\"{{adchoiceslink}}\"\n            ba-moredetailslink=\"{{moredetailslink}}\"\n            ba-moredetailstext=\"{{moredetailstext}}\"\n            ba-containerstyle=\"{{sidebarSizingStyles}}\"\n            ba-adsplaying=\"{{adsplaying}}\"\n            ba-mobileviewport=\"{{mobileviewport}}\"\n            ba-event:pause_ads=\"pause_ads\"\n        ></ba-{{dynfloatingsidebar}}>\n    </div>\n    <div ba-if=\"{{is_floating && floatingoptions.closeable}}\"\n         class=\"{{cssplayer}}-close-container\"\n         ba-click=\"close_floating()\"\n         ba-on:touchend=\"{{close_floating()}}\"\n    >\n        <svg viewBox=\"0 0 32 32\" xml:space=\"preserve\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path\n                d=\"m17.459 16.014 8.239-8.194a.992.992 0 0 0 0-1.414 1.016 1.016 0 0 0-1.428 0l-8.232 8.187L7.73 6.284a1.009 1.009 0 0 0-1.428 0 1.015 1.015 0 0 0 0 1.432l8.302 8.303-8.332 8.286a.994.994 0 0 0 0 1.414 1.016 1.016 0 0 0 1.428 0l8.325-8.279 8.275 8.276a1.009 1.009 0 0 0 1.428 0 1.015 1.015 0 0 0 0-1.432l-8.269-8.27z\"\n                class=\"{{cssplayer}}-close-svg-button\"\n            ></path>\n        </svg>\n    </div>\n</div>\n",

                attrs: function() {
                    return {
                        /* CSS */
                        brightness: 0,
                        current_video_from_playlist: 0,
                        next_video_from_playlist: 0,
                        sample_brightness: false,
                        sample_brightness_rate: 10, // times per second
                        sample_brightness_sample_size: 250,
                        "css": "ba-videoplayer",
                        "csscommon": "ba-commoncss",
                        "cssplayer": "ba-player",
                        "iecss": "ba-videoplayer",
                        "cssplaybutton": "",
                        "cssloader": "",
                        "cssmessage": "",
                        "csstopmessage": "",
                        "csscontrolbar": "",
                        "csstracks": "",
                        "width": "",
                        "height": "",
                        "popup-width": "",
                        "popup-height": "",
                        "aspectratio": null,
                        "fallback-width": 480,
                        "fallback-height": 270,
                        "floating-fallback-mobile-height": 75,
                        "floating-fallback-desktop-height": 240,
                        /* Themes */
                        "theme": "",
                        "csstheme": "",
                        "themecolor": "",
                        /* Dynamics */
                        "dynadscontrolbar": "ads-controlbar",
                        "dynadsplayer": "adsplayer",
                        "dynplaybutton": "videoplayer-playbutton",
                        "dynloader": "videoplayer-loader",
                        "dynmessage": "videoplayer-message",
                        "dyntopmessage": "videoplayer-topmessage",
                        "dyncontrolbar": "videoplayer-controlbar",
                        "dynshare": "videoplayer-share",
                        "dyntracks": "videoplayer-tracks",
                        "dynfloatingsidebar": "videoplayer-floating-sidebar",
                        "dynsettingsmenu": "common-settingsmenu",
                        "dyntrimmer": "videorecorder-trimmer",
                        "dynnext": "videoplayer-next",

                        /* Templates */
                        "tmpladcontrolbar": "",
                        "tmplplaybutton": "",
                        "tmplloader": "",
                        "tmplmessage": "",
                        "tmplshare": "",
                        "tmpltopmessage": "",
                        "tmplcontrolbar": "",
                        "tmpltracks": "",
                        "tmplsettingsmenu": "",

                        /* Attributes */
                        "poster": "",
                        "source": "",
                        "sources": [],
                        "sourcefilter": {},
                        "state": "",
                        "streams": [],
                        "currentstream": null,
                        "hasnext": false,
                        "playlist": null,
                        "volume": 1.0,
                        "title": "",
                        "description": "",
                        "uploaddate": "",
                        "contenturl": "",
                        "thumbnailurl": "",
                        "initialseek": null,
                        "sharevideo": [],
                        "sharevideourl": "",
                        "share_active": true,
                        "visibilityfraction": 0.8,
                        /* Configuration */
                        "reloadonplay": false,
                        "playonclick": true,
                        "pauseonclick": true,
                        "unmuteonclick": false,
                        "muted": false,
                        "nextwidget": false,
                        "shownext": 3,
                        "noengagenext": 5,
                        "stayengaged": false,
                        "next_active": false,

                        /* Ads */
                        "adprovider": null,
                        "preroll": false,
                        "outstream": false,
                        "outstreamoptions": {}, // can be false, string (example: '10px', '10') or numeric
                        "imasettings": {},
                        "adtagurl": null,
                        "adchoiceslink": null,
                        "adtagurlfallbacks": null,
                        "inlinevastxml": null,
                        "hidebeforeadstarts": true, // Will help hide player poster before ads start
                        "showplayercontentafter": null, // we can set any microseconds to show player content in any case if ads not initialized
                        "adsposition": null,
                        "vmapads": false, // VMAP ads will set pre, mid, post positions inside XML file
                        "non-linear": null,
                        "companionad": null, // if just set to true, it will set companionads attribute for further use cases and will not render companion ad
                        "companionads": [],
                        "linearadplayer": true,
                        "customnonlinear": false, // Currently, not fully supported
                        "minadintervals": 5,
                        "non-linear-min-duration": 10,
                        "midrollads": [],
                        "adchoicesontop": true,

                        /* Options */
                        "allowpip": true, // Picture-In-Picture Mode
                        "rerecordable": false,
                        "submittable": false,
                        "autoplay": false,
                        "autoplaywhenvisible": false,
                        continuousplayback: true,
                        "preload": false,
                        "loop": false,
                        "loopall": false,
                        "popup": false,
                        "nofullscreen": false,
                        "fullscreenmandatory": false,
                        "playfullscreenonmobile": false,
                        "fitonwidth": false,
                        "fitonheight": false,
                        "hideoninactivity": true,
                        "hidebarafter": 5000,
                        "preventinteraction": false,
                        "skipinitial": false,
                        "topmessage": "",
                        "totalduration": null,
                        "playwhenvisible": false,
                        "disablepause": false,
                        "disableseeking": false,
                        "tracktextvisible": false,
                        "airplay": false,
                        "chromecast": false,
                        "broadcasting": false,
                        "chromecastreceiverappid": null, // Could be published custom App ID https://cast.google.com/publish/#/overview
                        "skipseconds": 5,
                        "sticky": false,
                        "sticky-starts-paused": true,
                        "sticky-position": undefined,
                        "sticky-threshold": undefined,
                        // sticky options
                        "floatingoptions": {
                            "sidebar": true, // show sidebar
                            "floatingonly": false, // hide and show on video player based on view port
                            "closeable": true, // show close button
                            "hideplayeronclose": false, // hide player container in the content if floating player was closed
                            "showcompanionad": false, // if set to true, companion ad will be shown on sidebar if it's exitst
                            // "fluidsidebar": true, // TODO: not works for now, if false, 50% width will be applied on sidebar
                            "desktop": {
                                "position": "bottom-right", // position of floating video player for desktop
                                "height": 190,
                                "bottom": 30,
                                "sidebar": false,
                                "companionad": false
                            },
                            "mobile": {
                                "position": "top", // positions of floating video player for mobile
                                "height": 75,
                                "sidebar": true,
                                "companionad": true
                            }
                        },
                        "tracktags": [],
                        "tracktagsstyled": true,
                        "tracktaglang": 'en',
                        "tracksshowselection": false,
                        "showchaptertext": true,
                        "thumbimage": {},
                        "thumbcuelist": [],
                        "showduration": false,
                        "showsettings": true,
                        "showsettingsmenu": true, // As a property show/hide from users
                        "posteralt": "",
                        "hidevolumebar": false,
                        "hidecontrolbar": false,
                        "allowtexttrackupload": false,
                        "useAspectRatioFallback": (Info.isSafari() && Info.safariVersion() < 15) || Info.isInternetExplorer(),
                        "uploadtexttracksvisible": false,
                        "acceptedtracktexts": null,
                        "uploadlocales": [{
                            lang: 'en',
                            label: 'English'
                        }],
                        "ttuploadervisible": false,
                        "videofitstrategy": "pad",
                        "posterfitstrategy": "crop",
                        "slim": false,

                        /* States (helper variables which are controlled by application itself not set by user) */
                        "adsplaying": false,
                        "adshassource": false,
                        "showbuiltincontroller": false,
                        "airplaybuttonvisible": false,
                        "castbuttonvisble": false,
                        "fullscreened": false,
                        "initialoptions": {
                            "hideoninactivity": null,
                            "volumelevel": null,
                            "autoplay": null,
                            "outstreamoptions": {
                                corner: true,
                                hideOnCompletion: true
                            }
                        },
                        "silent_attach": false,
                        "inpipmode": false,
                        "lastplaylistitem": false,
                        "manuallypaused": false,
                        "playedonce": false,
                        "preventinteractionstatus": false, // need to prevent `Unexpected token: punc (()` Uglification issue
                        "ready": true,
                        "tracktagssupport": false,
                        "playbackcount": 0,
                        "playbackended": 0,
                        "currentchapterindex": 0,
                        "chapterslist": [],
                        "userengagedwithplayer": false,
                        "userhadplayerinteraction": false,
                        // If settings are open and visible
                        "states": {
                            "poster_error": {
                                "ignore": false,
                                "click_play": true
                            },
                            "dimensions": {
                                "width": null,
                                "height": null
                            }
                        },
                        "placeholderstyle": "",
                        "hasplaceholderstyle": false,
                        "playerorientation": undefined,
                        // Reference to Chrome renewed policy, we have to setup mute for auto-playing players.
                        // If we do it forcibly, then we will set as true
                        "forciblymuted": false,
                        "autoplay-allowed": false,
                        "autoplay-requires-muted": true,
                        "autoplay-requires-playsinline": null,
                        // When volume was unmuted, by the user himself, not automatically
                        "volumeafterinteraction": false,
                        "prominent-title": false,
                        "closeable-title": false
                    };
                },

                types: {
                    "allowpip": "boolean",
                    "hasnext": "boolean",
                    "hidecontrolbar": "boolean",
                    "muted": "boolean",
                    "nextwidget": "boolean",
                    "shownext": "float",
                    "state": "string",
                    "noengagenext": "float",
                    "stayengaged": "boolean",
                    "next_active": "boolean",
                    "unmuteonclick": "boolean",
                    "rerecordable": "boolean",
                    "loop": "boolean",
                    "loopall": "boolean",
                    "autoplay": "boolean",
                    "autoplaywhenvisible": "boolean",
                    continuousplayback: "boolean",
                    "preload": "boolean",
                    "ready": "boolean",
                    "nofullscreen": "boolean",
                    "fullscreenmandatory": "boolean",
                    "preroll": "boolean",
                    "hideoninactivity": "boolean",
                    "hidebarafter": "integer",
                    "preventinteraction": "boolean",
                    "skipinitial": "boolean",
                    "volume": "float",
                    "popup": "boolean",
                    "popup-width": "int",
                    "popup-height": "int",
                    "aspectratio": "float",
                    "fallback-width": "int",
                    "fallback-height": "int",
                    "initialseek": "float",
                    "fullscreened": "boolean",
                    "sharevideo": "array",
                    "sharevideourl": "string",
                    "playfullscreenonmobile": "boolean",
                    "themecolor": "string",
                    "totalduration": "float",
                    "playwhenvisible": "boolean",
                    "playedonce": "boolean",
                    "manuallypaused": "boolean",
                    "disablepause": "boolean",
                    "disableseeking": "boolean",
                    "playonclick": "boolean",
                    "pauseonclick": "boolean",
                    "airplay": "boolean",
                    "airplaybuttonvisible": "boolean",
                    "chromecast": "boolean",
                    "chromecastreceiverappid": "string",
                    "skipseconds": "integer",
                    "sticky": "boolean",
                    "sticky-starts-paused": "boolean",
                    "streams": "jsonarray",
                    "sources": "jsonarray",
                    "tracktags": "jsonarray",
                    "tracktagsstyled": "boolean",
                    "allowtexttrackupload": "boolean",
                    "uploadtexttracksvisible": "boolean",
                    "acceptedtracktexts": "string",
                    "uploadlocales": "array",
                    "playerspeeds": "array",
                    "playercurrentspeed": "float",
                    "showsettings": "boolean",
                    "showsettingsmenu": "boolean",
                    "showduration": "boolean",
                    "visibilityfraction": "float",
                    "showchaptertext": "boolean",
                    "title": "string",
                    "description": "string",
                    "uploaddate": "string",
                    "contenturl": "string",
                    "thumbnailurl": "string",
                    "videofitstrategy": "string",
                    "posterfitstrategy": "string",
                    "adtagurl": "string",
                    "adchoiceslink": "string",
                    "adtagurlfallbacks": "array",
                    "inlinevastxml": "string",
                    "imasettings": "jsonarray",
                    "adsposition": "string",
                    "non-linear": "string",
                    "adchoicesontop": "boolean",
                    "minadintervals": "int",
                    "non-linear-min-duration": "int",
                    "companionad": "string",
                    "slim": "boolean",
                    "prominent-title": "boolean",
                    "closeable-title": "boolean",
                    "sticky-threshold": "float",
                    "floatingoptions": "jsonarray"
                },

                __INTERACTION_EVENTS: ["click", "mousedown", "touchstart", "keydown", "keypress"],

                extendables: ["states"],

                registerchannels: ["ads", "next"],

                scopes: {
                    adsplayer: ">[tagname='ba-adsplayer']",
                    settingsmenu: ">[tagname='ba-common-settingsmenu']",
                    floatingsidebar: ">[tagname='ba-videoplayer-floating-sidebar']"
                },

                events: {
                    "change:uploaddate": function(value) {
                        if (typeof value === "number")
                            this.set("uploaddate", TimeFormat.format("yyyy-mm-dd", value * 1000));
                    },
                    "change:starttime": function(startTime) {
                        if (startTime > this.getCurrentPosition()) {
                            this.player.setPosition(startTime);
                        }
                    },
                    "change:endtime": function(endTime) {
                        if (!endTime || endTime === this.get("duration")) {
                            if (this.get("_timeUpdateEventHandler")) {
                                this.get("_timeUpdateEventHandler").clear();
                            }
                        } else {
                            if (endTime < this.getCurrentPosition()) {
                                this.player.setPosition(endTime);
                            }
                            if (!this.get("_timeUpdateEventHandler")) {
                                this.set("_timeUpdateEventHandler", this.auto_destroy(new DomEvents()));
                            }
                            if (!this.get("_timeUpdateEventHandler").__callbacks.timeupdate) {
                                this.get("_timeUpdateEventHandler").on(this.player._element, "timeupdate", function() {
                                    var position = this.getCurrentPosition();
                                    if (position >= this.get("endtime")) {
                                        this.player.trigger("ended");
                                        if (!this.get("loop")) {
                                            this.player.pause();
                                        }
                                    }
                                }, this);
                            }
                        }
                    },
                    "change:placeholderstyle": function(value) {
                        this.set("hasplaceholderstyle", value.length > 10);
                    },
                    "change:position": function(position) {
                        if (!this.get("nextwidget") || this.get("stayengaged") || this.get("adsplaying"))
                            return;
                        if (Array.isArray(this.get("playlist")) && this.get("playlist").length > 0) {
                            if (position > this.get("shownext") && this.get("shownext") > 0 && !this.get("next_active")) {
                                this.set("next_active", true);
                            }
                            if (position > this.get("shownext") + this.get("noengagenext") && this.get("shownext") + this.get("noengagenext") > 0) {
                                this.channel("next").trigger("playNext");
                            }
                        }
                    },
                    "change:mobileviewport": function(viewport) {
                        if (this.get("is_floating")) {
                            var calculated = this.__calculateFloatingDimensions();
                            if (this.get("floating_height") !== calculated.floating_height)
                                this.set("floating_height", calculated.floating_height);
                        }
                    },
                    "change:fullscreened": function(isFullscreen) {
                        if (isFullscreen && this.get("view_type") === "float") {
                            this.set("view_type", "default");
                        }
                    }
                },
                channels: {
                    "next:setStay": function() {
                        this.set("stayengaged", true);
                        this.set("next_active", false);
                        this.__setPlayerEngagement();
                    },
                    "next:playNext": function() {
                        this.trigger("play_next");
                        this.set("next_active", false);
                        this.__setPlayerEngagement();
                    },
                    "next:resetNextWidget": function() {
                        this.set("stayengaged", false);
                        this.set("next_active", false);
                    }
                },

                computed: {
                    "aspectRatioFallback:aspectratio,fallback-width,fallback-height": function(aspectRatio, fallbackWidth, fallbackHeight) {
                        return {
                            paddingTop: 100 / (aspectRatio || (fallbackWidth / fallbackHeight)) + "%"
                        };
                    },
                    "aspect_ratio:aspectratio,fallback-width,fallback-height": function(aspectRatio, fallbackWidth, fallbackHeight) {
                        return aspectRatio || fallbackWidth + "/" + fallbackHeight;
                    },
                    "adsinitialized:playing,adtagurl,inlinevastxml": function(playing, adsTagURL, inlineVastXML) {
                        if (this.get("adsinitialized")) {
                            if (this.__adInitilizeChecker) this.__adInitilizeChecker.clear();
                            return true;
                        }
                        if (playing) {
                            if (this.__adInitilizeChecker) this.__adInitilizeChecker.clear();
                            return true;
                        }
                        if (!!adsTagURL || !!inlineVastXML && !this.get("adshassource")) {
                            this.set("adshassource", true);
                            // On error, we're set initialized to true to prevent further attempts
                            // in case if ads will not trigger any event, we're setting initialized to true after defined seconds and wil show player content
                            if (!this.__adInitilizeChecker && this.get("showplayercontentafter")) {
                                this.__adInitilizeChecker = Async.eventually(function() {
                                    if (!this.get("adsinitialized")) this.set("adsinitialized", true);
                                }, this, this.get("showplayercontentafter"));
                            }
                            this.once("ad:adCanPlay", function() {
                                if (this.__adInitilizeChecker) this.__adInitilizeChecker.clear();
                                this.set("adsinitialized", true);
                            });
                            this.once("ad:ad-error", function() {
                                if (this.__adInitilizeChecker) this.__adInitilizeChecker.clear();
                                this.set("adsinitialized", true);
                            }, this);
                        } else {
                            return false;
                        }
                    },
                    "containerSizingStyles:aspect_ratio,height,width,floating_height,floating_width,floating_top,floating_right,floating_bottom,floating_left,is_floating,adsinitialized": function(aspectRatio, height, width, floatingHeight, floatingWidth, floatingTop, floatingRight, floatingBottom, floatingLeft, isFloating, adsInitialized) {
                        var containerStyles, styles, calculated;
                        styles = {
                            aspectRatio: aspectRatio
                        };
                        if (isFloating && !this.get("fullscreened")) {
                            calculated = this.__calculateFloatingDimensions();

                            styles.position = "fixed";
                            styles.display = this.get("with_sidebar") ? 'flex' : 'block';

                            floatingTop = floatingTop || calculated.floating_top;
                            floatingBottom = floatingBottom || calculated.floating_bottom;
                            floatingRight = floatingRight || calculated.floating_right;
                            floatingLeft = floatingLeft || calculated.floating_left;

                            if (floatingTop !== undefined) styles.top = parseFloat(floatingTop).toFixed() + 'px';
                            if (floatingRight !== undefined) styles.right = parseFloat(floatingRight).toFixed() + 'px';
                            if (floatingBottom !== undefined) styles.bottom = parseFloat(floatingBottom).toFixed() + 'px';
                            if (floatingLeft !== undefined) styles.left = parseFloat(floatingLeft).toFixed() + 'px';

                            floatingWidth = calculated.floating_width || floatingWidth;
                            floatingHeight = calculated.floating_height || floatingHeight;

                            if (floatingWidth) width = floatingWidth;
                            if (floatingHeight) height = floatingHeight;

                            // if element is not floating no need below code
                            if (this.get("with_sidebar") && this.get("sidebarSizingStyles.width")) {
                                width += Number(parseFloat(this.get("sidebarSizingStyles.width")).toFixed(2));
                            }
                        }

                        if (height) styles.height = typeof height === "string" && (height[height.length - 1] === "%" || height === 'auto') ? height : parseFloat(height).toFixed(2) + "px";
                        if (width) styles.width = typeof width === "string" && (width[width.length - 1] === "%" || width === 'auto') ? width : parseFloat(width).toFixed(2) + "px";


                        // If we have an ads and before content we will not show the player poster with loader at all
                        if ((this.get("adshassource") && !adsInitialized) && this.get("hidebeforeadstarts") && (this.get("autoplay") || this.get("outstream"))) {
                            styles.height = '1px';
                            styles.opacity = 0;
                        }

                        containerStyles = styles;
                        if (this.activeElement()) {
                            // if element is sticky no need, to apply styles which are position with fixed
                            if (this.get("sticky")) {
                                containerStyles.display = (this.get("with_sidebar") && isFloating) ? 'flex' : 'block';
                                delete containerStyles.position;
                            }
                            if (!isFloating) {
                                this._applyStyles(this.activeElement(), containerStyles || styles, !isFloating ? this.__lastContainerSizingStyles : null);
                                this.__lastContainerSizingStyles = containerStyles || styles;
                            }

                            if ((this.get("adshassource") && adsInitialized) && this.__lastContainerSizingStyles && (this.__lastContainerSizingStyles.opacity === 0 || this.__lastContainerSizingStyles.display === 'none')) {
                                this.__lastContainerSizingStyles.opacity = null;
                                this.__lastContainerSizingStyles.display = (containerStyles || styles).display;
                                this._applyStyles(this.activeElement(), containerStyles || styles, this.__lastContainerSizingStyles);
                            }

                            if (containerStyles.width && (containerStyles.width).toString().includes("%") && (styles.width).toString().includes("%")) {
                                // If container width is in percentage, then we need to set the width of the player to auto
                                // in other case width will be applied twice
                                styles.width = "100%";
                            }
                        }
                        return styles;
                    },
                    "cssfloatingclasses:is_floating": function() {
                        return [
                            this.get("cssplayer") + "-floating",
                            this.get("csscommon") + "-sticky",
                            this.get("csscommon") + "-sticky-" + this.get("sticky-position") || this.get("floatingoptions.desktop.position") || "bottom-right",
                            this.StickyHandler && this.StickyHandler.elementWasDragged() ? "ba-commoncss-fade-up" : ""
                        ].join(" ");
                    },
                    "sidebarSizingStyles:floating_height": function(floatingHeight) {
                        return {
                            height: parseFloat(floatingHeight).toFixed() + 'px'
                        };
                    },
                    "buffering:buffered,position,last_position_change_delta,playing": function(buffered, position, ld, playing) {
                        if (playing) this.__playedStats(position, this.get("duration"));
                        return this.get("playing") && this.get("buffered") < this.get("position") && this.get("last_position_change_delta") > 1000;
                    },
                    "is_floating:view_type": function(view_type) {
                        return view_type === "float" || ((view_type !== undefined && !this.get("fullscreened")) && this.get("floatingoptions.floatingonly"));
                    },
                    "layout:mobileview": function(mobileview) {
                        return mobileview ? "mobile" : "desktop";
                    },
                    "placement:outstream": function(outstream) {
                        return outstream ? "outstream" : "instream";
                    },
                    "quartile:passed-quarter,playing": function(passedQuarter, playing) {
                        if (this.get("position") === 0 && !playing) return null;
                        return ["first", "second", "third", "fourth"][passedQuarter];
                    },
                    "orientation:videowidth,videoheight,fallback-width,fallback-height": function(videoWidth, videoHeight, fallbackWidth, fallbackHeight) {
                        var width = videoWidth || fallbackWidth;
                        var height = videoHeight || fallbackHeight;
                        if (width === height) return "square";
                        return width > height ? "landscape" : "portrait";
                    }
                },

                remove_on_destroy: true,

                create: function(repeat) {
                    repeat = repeat || false;
                    this.set("repeatedplayer", repeat);
                    this.__attachPlayerInteractionEvents();
                    this._dataset = this.auto_destroy(new DatasetProperties(this.activeElement()));
                    this._dataset.bind("layout", this.properties());
                    this._dataset.bind("placement", this.properties());
                    this._dataset.bind("quartile", this.properties());
                    this._dataset.bind("adsquartile", this.properties());
                    this._dataset.bind("adsplaying", this.properties());
                    this._dataset.bind("visibility", this.properties(), {
                        secondKey: "view_type"
                    });
                    this._dataset.bind("orientation", this.properties());
                    if (typeof this.get("showsettings") !== "undefined")
                        this.set("showsettingsmenu", this.get("showsettings"));
                    this.delegateEvents(null, this.channel("ads"), "ad");
                    this.set("prominent_title", this.get("prominent-title"));
                    this.set("closeable_title", this.get("closeable-title"));
                    // NOTE: below condition has to be before ads initialization
                    if (this.get("autoplaywhenvisible")) this.set("autoplay", true);
                    this.set("floatingoptions", Objs.tree_merge(
                        this.attrs().floatingoptions,
                        this.get("floatingoptions")
                    ));
                    this._observer = new ResizeObserver(function(entries) {
                        for (var i = 0; i < entries.length; i++) {
                            this.trigger("resize", {
                                width: entries[i].contentRect.width,
                                height: entries[i].contentRect.height
                            });
                        }
                    }.bind(this));
                    this.initAdSources();
                    this._observer.observe(this.activeElement().firstChild);
                    this._validateParameters();
                    // Will set volume initial state
                    this.set("initialoptions", Objs.tree_merge(this.get("initialoptions"), {
                        volumelevel: this.get("volume"),
                        autoplay: this.get("autoplay")
                    }));
                    if (this.get("sample_brightness")) {
                        this.__brightnessSampler = this.auto_destroy(new Timers.Timer({
                            delay: 1000 / (this.get("sample_brightness_rate") || 10),
                            fire: function() {
                                if (!this.player) return;
                                var lightLevel = this.player.lightLevel(this.get("sample_brightness_sample_size"), this.get("sample_brightness_sample_areas"));
                                if (Array.isArray(lightLevel)) lightLevel = lightLevel.map(function(level) {
                                    return level * 100 / 255;
                                });
                                else lightLevel = lightLevel * 100 / 255;
                                this.set("brightness", lightLevel);
                            }.bind(this),
                            start: false
                        }));
                    }
                    if (this.get("fullscreenmandatory")) {
                        if (!(document.fullscreenEnabled || document.mozFullscreenEnabled ||
                                document.webkitFullscreenEnabled || document.msFullscreenEnabled)) {
                            this.set("skipinitial", true);
                            this.set("showbuiltincontroller", true);
                        }
                    }
                    if (this.get("autoplay") || this.get("playwhenvisible")) {
                        // check in which option player allow autoplay
                        this.__testAutoplayOptions();
                        // Safari is behaving differently on the Desktop and Mobile
                        // preload in desktop allow autoplay. In mobile, it's preventing autoplay
                        if (Info.isSafari()) this.set("preload", !Info.isMobile());
                        // In Safari Desktop can cause trouble on preload, if the user will
                    }

                    if (this.get("theme")) this.set("theme", this.get("theme").toLowerCase());
                    if (this.get("theme") in Assets.playerthemes) {
                        Objs.iter(Assets.playerthemes[this.get("theme")], function(value, key) {
                            if (!this.isArgumentAttr(key))
                                this.set(key, value);
                        }, this);
                    }

                    if (!this.get("themecolor"))
                        this.set("themecolor", "default");

                    if (this.get("playlist") && this.get("playlist").length > 0) {
                        var pl0 = (this.get("playlist"))[0];
                        if (pl0 && Types.is_object(pl0)) {
                            this.set("poster", pl0.poster);
                            this.set("source", pl0.source);
                            this.set("sources", pl0.sources);
                        }
                    }
                    if (this.get("streams") && !this.get("currentstream"))
                        this.set("currentstream", (this.get("streams"))[0]);

                    // Set `hideoninactivity` initial options for further help actions
                    if (this.get("preventinteraction") && !this.get("hideoninactivity")) {
                        this.set("hideoninactivity", true);
                        this.set("initialoptions", Objs.tree_merge(this.get("initialoptions"), {
                            hideoninactivity: true
                        }));
                    } else {
                        // Set initial options for further help actions
                        this.set("initialoptions", Objs.tree_merge(this.get("initialoptions"), {
                            hideoninactivity: this.get("hideoninactivity")
                        }));
                    }

                    this.set("ie8", Info.isInternetExplorer() && Info.internetExplorerVersion() < 9);
                    this.set("firefox", Info.isFirefox());
                    this.set("mobileview", Info.isMobile());
                    // mobileviewport different from mobileview, as mobileview will get player itself mobileview, mobileviewport from screen size
                    var clientWidth = window.innerWidth || document.documentElement.clientWidth ||
                        document.body.clientWidth;
                    this.set("mobileviewport", this.isMobile() || clientWidth <= 560);
                    this.set("hasnext", this.get("loop") || this.get("loopall") || this.get("playlist") && this.get("playlist").length > 1);
                    // For Apple, it's very important that their users always remain in control of the volume of the sounds their devices emit
                    this.set("hidevolumebar", (Info.isMobile() && Info.isiOS()));
                    this.set("duration", this.get("totalduration") || 0.0);
                    this.set("position", 0.0);
                    this.set("buffered", 0.0);
                    this.set("passed-quarter", 0);
                    this.set("played-seconds", 0);
                    this.set("last-played-position", 0);
                    this.set("player-started", false);
                    this.set("last-seen-position", this.get("volume") > 0.2 ? 1 : 0);
                    this.set("message", "");
                    this.set("fullscreensupport", false);
                    this.set("csssize", "normal");

                    // this.set("loader_active", false);
                    // this.set("playbutton_active", false);
                    // this.set("controlbar_active", false);
                    // this.set("message_active", false);
                    // this.set("settingsmenu_active", false);

                    this.set("last_activity", Time.now());
                    this.set("activity_delta", 0);
                    this.set("passed_after_play", 0);

                    this.set("playing", false);

                    this.__attachRequested = false;
                    this.__activated = false;
                    this.__error = null;

                    if (document.onkeydown)
                        this.activeElement().onkeydown = this._keyDownActivity.bind(this, this.activeElement());

                    this.on("change:tracktags", function() {
                        if (typeof this.__video !== 'undefined')
                            this.__trackTags = new TrackTags({}, this);
                    }, this);

                    this.host = this.auto_destroy(new Host({
                        stateRegistry: new ClassRegistry(this.cls.playerStates())
                    }));
                    this.host.dynamic = this;
                    this.set("state", this._initialState.classname ? this._initialState.classname.split(".").slice(-1)[0] : this._initialState);
                    this.host.on("next", function(state) {
                        this.set("state", state);
                    }, this);
                    this.host.initialize(this._initialState);

                    this.__adsControlPosition = 0;
                    this._timer = this.auto_destroy(new Timers.Timer({
                        context: this,
                        fire: this._timerFire,
                        delay: 100,
                        start: true
                    }));

                    this.activeElement().style.setProperty("display", "inline-block");

                    // to detect only video playing container dimensions, when there also sidebar exists
                    this.__playerContainer = this.activeElement().querySelector("[data-selector='ba-player-container']");

                    // Floating and Sticky
                    this.set("floating_height", this.get("mobileview") ? this.get("floatingoptions.mobile.height") : this.get("floatingoptions.desktop.height"));

                    if (!this.get("sticky") && this.get("floatingoptions.floatingonly")) {
                        // Will ignore sticky way and float every
                        this.set("view_type", "float");
                        this.activeElement().firstChild.style.setProperty("display", "flex");
                    } else if (this.get("sticky")) {
                        // If sticky is enabled, disable only floating
                        this.set("floatingoptions.floatingonly", false);
                        var stickyOptions = {
                            threshold: this.get("sticky-threshold"),
                            paused: this.get("sticky-starts-paused"),
                            "static": this.get("floatingoptions.static")
                        };
                        this.stickyHandler = this.auto_destroy(new StickyHandler(
                            this.activeElement().firstChild,
                            this.activeElement(),
                            stickyOptions
                        ));
                        this.stickyHandler.on("transitionToFloat", function() {
                            this.set("view_type", "float");
                        }, this);
                        this.stickyHandler.on("transitionToView", function() {
                            this.set("view_type", "default");
                        }, this);
                        this.stickyHandler.on("transitionOutOfView", function() {
                            this.set("view_type", "out_of_view");
                        }, this);
                        this.delegateEvents(null, this.stickyHandler);
                        this.stickyHandler.init();
                    }

                    if (!this.get("floatingoptions.floatingonly") && !this.get("sticky"))
                        this._applyStyles(this.activeElement(), this.get("containerSizingStyles"));
                },

                initMidRollAds: function() {
                    var schedules;
                    // Split all via comma exclude inside brackets
                    schedules = Objs.map(this.get("adsposition").split(/(?![^)(]*\([^)(]*?\)\)),(?![^\[]*\])/), function(item) {
                        return item.trim();
                    }, this);

                    if (schedules.length > 0) {
                        this.set("midrollads", []);
                        this.__adMinIntervals = this.get("minadintervals");
                        this.__adsControlPosition = 0;
                        // This will be called in the next video cases
                        if (schedules.length > 0) {
                            Objs.iter(schedules, function(schedule, index) {
                                schedule = schedule.toLowerCase();
                                // if user set schedule with time settings
                                if (/^mid\[[\d\s]+(,[\d\s]+|[\d\s]+\%|\%|[\d\s]+\*|\*)*\]*$/i.test(schedule)) {
                                    var _s = schedule.replace('mid[', '').replace(']', '');
                                    Objs.map(_s.split(','), function(item) {
                                        item = item.trim();
                                        if (/^[\d\s]+\*$/.test(item)) {
                                            item = +item.replace("\*", '');
                                            this.on("change:duration", function(duration) {
                                                if (duration > 0) {
                                                    var step = Math.floor(duration / item);
                                                    if (duration > item) {
                                                        for (var i = 1; i <= step; i++) {
                                                            this.get("midrollads").push({
                                                                position: i * item
                                                            });
                                                        }
                                                    }
                                                }
                                            }, this);
                                        } else {
                                            if (/^[\d\s]+\%$/.test(item)) {
                                                item = parseInt(item.replace('%', '').trim(), 10);
                                                if (item < 100 && item > 0) {
                                                    this.get("midrollads").push({
                                                        position: parseFloat((item / 100).toFixed(2))
                                                    });
                                                }
                                            } else {
                                                // the user also set 0 to 1 value, as percentage, more 1 means seconds
                                                this.get("midrollads").push({
                                                    position: parseFloat(item)
                                                });
                                            }
                                        }
                                    }, this);
                                } else {
                                    if (/^mid\[.*?\]$/.test(schedule))
                                        console.log('Seems your mid roll settings does not correctly set. It will be played only in the middle of the video.');
                                    if (/^mid$/.test(schedule)) {
                                        this.get("midrollads").push({
                                            position: 0.5
                                        });
                                    }
                                }

                                // After iteration completing. If adsCollections existed should be destroyed
                                if (((index + 1) === schedules.length) && !!this._adsRollPositionsCollection) {
                                    this._adsRollPositionsCollection.destroy();
                                    this._adsRollPositionsCollection = null;
                                }
                            }, this);
                        }
                    }
                },

                getMediaType: function() {
                    return "video";
                },

                _initialState: InitialState,

                state: function() {
                    return this.host.state();
                },

                videoAttached: function() {
                    return !!this.player;
                },

                videoLoaded: function() {
                    return this.videoAttached() && this.player.loaded();
                },

                videoError: function() {
                    return this.__error;
                },

                /**
                 *
                 * @param {object} settingObject
                 */
                addSettingsMenuItem: function(settingObject) {
                    this.__settingsMenu.execute('add_new_settings_item', settingObject);
                },

                /**
                 *
                 * @param {string} id
                 * @param {object} updatedSettingObject
                 */
                updateSettingsMenuItem: function(id, updatedSettingObject) {
                    this.__settingsMenu.execute('update_new_settings_item', id, updatedSettingObject);
                },

                /**
                 *
                 * @param {string} id
                 */
                removeSettingsMenuItem: function(id) {
                    this.__settingsMenu.execute('remove_settings_item', id);
                },

                toggle_pip: function() {
                    if (this.player.isInPIPMode())
                        this.player.exitPIPMode();
                    else
                        this.player.enterPIPMode();
                },

                _error: function(error_type, error_code) {
                    this.__error = {
                        error_type: error_type,
                        error_code: error_code
                    };
                    this.trigger("error:" + error_type, error_code);
                    this.trigger("error", error_type, error_code);
                },

                _clearError: function() {
                    this.__error = null;
                },

                _detachImage: function() {
                    this.set("imageelement_active", false);
                },

                _attachImage: function() {
                    var isLocal = typeof this.get("poster") === 'object';
                    if (!this.get("poster")) {
                        this.trigger("error:poster");
                        return;
                    }
                    var img = this.activeElement().querySelector("[data-image='image']");
                    this._clearError();
                    var self = this;
                    img.onerror = function() {
                        self.trigger("error:poster");
                    };
                    img.onload = function() {
                        self.set("imageelement_active", true);
                        self.trigger("image-attached");
                    };
                    // If a type of source of image is a Blob object, convert it to URL
                    img.src = isLocal ? (window.URL || window.webkitURL).createObjectURL(this.get("poster")) : this.get("poster");
                },

                _detachVideo: function() {
                    this.set("playing", false);
                    if (this.player) this.player.weakDestroy();
                    this.player = null;
                    this.__video = null;
                    this.set("videoelement_active", false);
                },

                _validateParameters: function() {
                    var fitStrategies = ["crop", "pad", "original"];
                    var stickyPositions = ["top-left", "top-right", "bottom-right", "bottom-left"];
                    var mobilePositions = ["top", "bottom"];
                    if (!fitStrategies.includes(this.get("videofitstrategy"))) {
                        console.warn("Invalid value for videofitstrategy: " + this.get("videofitstrategy") + "\nPossible values are: " + fitStrategies.slice(0, -1).join(", ") + " or " + fitStrategies.slice(-1));
                    }
                    if (!fitStrategies.includes(this.get("posterfitstrategy"))) {
                        console.warn("Invalid value for posterfitstrategy: " + this.get("posterfitstrategy") + "\nPossible values are: " + fitStrategies.slice(0, -1).join(", ") + " or " + fitStrategies.slice(-1));
                    }
                    if (this.get("stretch") || this.get("stretchwidth") || this.get("stretchheight")) {
                        console.warn("Stretch parameters were deprecated, your player will stretch to the full container width by default.");
                    }
                    if (this.get("sticky") && !stickyPositions.includes(this.get("sticky-position") || this.get("floatingoptions").desktop.position)) {
                        console.warn("Invalid option for attribute sticky-position: " + this.get("sticky-position"));
                        console.warn("Please choose one of the following values instead:", stickyPositions);
                        this.set("sticky-position", "bottom-right");
                    }
                    if (this.get("sticky") && !(mobilePositions.includes(this.get("floatingoptions").mobile))) {
                        console.warn("Please choose one of the following values instead:", mobilePositions);
                    }

                    var deprecatedCSS = ["minheight", "minwidth", "minheight", "minwidth", {
                        "sticky-position": "floatingoptions.desktop.position"
                    }];
                    deprecatedCSS.forEach(function(parameter) {
                        if (Types.is_string(parameter)) {
                            if (this.get(parameter))
                                console.warn(parameter + " parameter was deprecated, please use CSS instead.");
                        } else {
                            var key = Object.keys(parameter)[0];
                            if (this.get(key)) {
                                console.warn(key + " parameter was deprecated, please use " + parameter[key] + " instead.");
                            }
                        }
                    }.bind(this));
                },

                getCurrentPosition: function() {
                    if (this.videoAttached()) {
                        return this.player._element.currentTime;
                    } else {
                        return NaN;
                    }
                },

                _attachVideo: function(silent) {
                    if (this.videoAttached())
                        return;
                    if (!this.__activated) {
                        this.__attachRequested = true;
                        return;
                    }
                    this.__attachRequested = false;
                    this.set("videoelement_active", true);
                    var video = this.activeElement().querySelector("[data-video='video']");
                    this._clearError();
                    // Just in case, be sure that player's controllers will be hidden
                    video.controls = this.get("showbuiltincontroller");
                    if (!this.get("allowpip"))
                        video.disablePictureInPicture = true;
                    VideoPlayerWrapper.create(Objs.extend(this._getSources(), {
                        element: video,
                        onlyaudio: this.get("onlyaudio"), // Will fix only audio local playback bug
                        preload: !!this.get("preload"),
                        loop: !!this.get("loop") || (this.get("lastplaylistitem") && this.get("loopall")),
                        reloadonplay: this.get('playlist') && this.get("playlist").length > 0 ? true : !!this.get("reloadonplay"),
                        fullscreenedElement: this.activeElement().childNodes[0],
                        loadmetadata: Info.isChrome() && this.get("skipinitial")
                    })).error(function(e) {
                        if (this.destroyed())
                            return;
                        this._error("attach", e);
                    }, this).success(function(instance) {
                        if (this.destroyed())
                            return;
                        this.player = instance;
                        this.delegateEvents(null, this.player, "player");
                        this.__video = video;
                        // On autoplay video, silent attach should be false
                        this.set("silent_attach", (silent && !this.get("autoplay")) || this._prerollAd || false);

                        if (this.get("chromecast")) {
                            if (!this.get("skipinitial")) this.set("skipinitial", true);
                            this._broadcasting = new Broadcasting({
                                player: instance,
                                commonOptions: {
                                    title: this.get("title"),
                                    poster: this.player._element.poster,
                                    currentPosition: this.get("position"),
                                    chromecastReceiverAppId: this.get("chromecastreceiverappid")
                                },
                                castOptions: {
                                    canControlVolume: true,
                                    canPause: !this.get("disablepause"),
                                    canSeek: !this.get("disableseeking"),
                                    displayName: this.get("title"),
                                    //displayStatus: "Please wait connecting",
                                    duration: this.get("duration"),
                                    imageUrl: this.player._element.poster,
                                    isConnected: this.player._broadcastingState.googleCastConnected,
                                    isMuted: false,
                                    isPaused: !this.get("playing")
                                },
                                airplayOptions: {}
                            });
                            if (Info.isChrome() && this.get("chromecast")) {
                                this._broadcasting.attachGoggleCast();
                                this.player.on("cast-state-changed", function(status, states) {
                                    // Other states: CONNECTED, CONNECTING, NOT_CONNECTED
                                    this.set("castbuttonvisble", status !== states.NO_DEVICES_AVAILABLE);
                                    this.set("chromecasting", status === states.CONNECTED);
                                }, this);
                                this.player.on("cast-loaded", function(castRemotePlayer, castRemotePlayerController) {
                                    this.set("broadcasting", true);
                                    // If player already start to play
                                    if (this.get("position") > 0) {
                                        this._broadcasting._seekToGoogleCast(this.get("position"));
                                        this._broadcasting._googleCastRemotePlay();
                                    }

                                    //If local player playing stop it before
                                    if (this.get('playing')) this.pause();

                                    // Initial play button state
                                    this.player.on("cast-paused", function(castPaused) {
                                        this.set("playing", !castPaused);
                                    }, this);
                                }, this);

                                this.player.on("cast-playpause", function(castPaused) {
                                    this.set("playing", !castPaused);
                                }, this);

                                this.player.on("cast-time-changed", function(currentTime, totalMediaDuration) {
                                    if (!Types.is_defined(currentTime) || currentTime === 0)
                                        return;
                                    if (totalMediaDuration) {
                                        this.set("cahched", totalMediaDuration);
                                        this.set("duration", totalMediaDuration || 0.0);
                                    }
                                    this.set("position", currentTime);
                                    this.set("videoelement_active", false);
                                    this.set("imageelement_active", true);
                                }, this);

                                this.player.on("proceed-when-ending-googlecast", function(position, isPaused) {
                                    this.set("broadcasting", false);
                                    this.set("videoelement_active", true);
                                    this.set("imageelement_active", false);
                                    this.player._broadcastingState.googleCastConnected = false;
                                    this.set("playing", false);
                                    this.trigger("seek", position);
                                    this.player.setPosition(position);
                                }, this);
                            }
                            if (Info.isSafari() && Info.safariVersion() >= 9 && window.WebKitPlaybackTargetAvailabilityEvent && this.get("airplay")) {
                                this.set("airplaybuttonvisible", true);
                                this._broadcasting.attachAirplayEvent.call(this, video);
                            }
                        }

                        if (this.get("playwhenvisible")) {
                            this.set("skipinitial", true);
                            this._playWhenVisible(video);
                        }
                        this.player.on("fullscreen-change", function(inFullscreen) {
                            this.set("fullscreened", inFullscreen);
                            if (!inFullscreen && (this.get('hideoninactivity') !== this.get("initialoptions").hideoninactivity)) {
                                this.set("hideoninactivity", this.get("initialoptions").hideoninactivity);
                            }
                        }, this);

                        // All conditions below appear on autoplay only
                        // If the browser not allows unmuted autoplay,
                        // and we have manually forcibly muted player
                        this._checkAutoPlay(this.__video);
                        this.player.on("postererror", function() {
                            this._error("poster");
                        }, this);
                        if (!this.get("playedonce")) {
                            this.player.once("playing", function() {
                                this.set("playedonce", true);
                                this.set("playbackcount", 1);
                            }, this);
                        }
                        this.player.on("playing", function() {
                            if (this.get("sample_brightness")) this.__brightnessSampler.start();
                            if (this.get("sticky") && this.stickyHandler) this.stickyHandler.start();
                            this.set("playing", true);
                            this.trigger("playing");
                        }, this);
                        this.player.on("loaded", function() {
                            this.set("videowidth", this.player.videoWidth());
                            this.set("videoheight", this.player.videoHeight());
                            if (this.get("sample_brightness")) this.__brightnessSampler.fire();
                        }, this);
                        this.player.on("error", function(e) {
                            this._error("video", e);
                        }, this);
                        if (this.player.error())
                            this.player.trigger("error", this.player.error());
                        this.player.on("paused", function() {
                            if (this.get("sample_brightness")) this.__brightnessSampler.stop();
                            this.set("playing", false);
                            this.trigger("paused");
                        }, this);
                        this.player.on("ended", function() {
                            if (this.get("sample_brightness")) this.__brightnessSampler.stop();
                            this.set("playing", false);
                            this.set('playedonce', true);
                            this.set("playbackended", this.get('playbackended') + 1);
                            this.set("settingsmenu_active", false);
                            if (this.get("starttime")) {
                                this.player.setPosition(this.get("starttime") || 0);
                            }
                            this.trigger("ended");
                        }, this);
                        if (this.player._qualityOptions) {
                            this.addSettingsMenuItem({
                                id: "sourcequality",
                                label: "source-quality",
                                showicon: true,
                                visible: true, // TODO add parameter for setting source quality settings visibility
                                value: this.player._currentQuality.label,
                                options: this.player._qualityOptions.map(function(option) {
                                    return option.label;
                                }),
                                func: function(_, label) {
                                    this.player.trigger("setsourcequality", this.player._qualityOptions.find(function(option) {
                                        return option.label === label;
                                    }).id);
                                }
                            });
                            this.player.on("qualityswitched", function(currentQuality) {
                                this.updateSettingsMenuItem("sourcequality", {
                                    value: currentQuality.label
                                });
                            }.bind(this));
                        }
                        this.trigger("attached", instance);
                        this.player.once("loaded", function() {
                            this.channel("next").trigger("resetNextWidget");
                            var volume = Math.min(1.0, this.get("volume"));
                            this.player.setVolume(volume);
                            this.player.setMuted(this.get("muted") || volume <= 0.0);
                            if (!this.__trackTags && this.get("tracktags").length)
                                this.__trackTags = new TrackTags({}, this);
                            if (this.get("totalduration") || this.player.duration() < Infinity)
                                this.set("duration", this.get("totalduration") || this.player.duration());
                            this.set("fullscreensupport", this.player.supportsFullscreen(this.activeElement().childNodes[0]));
                            // As duration is credential, we're waiting to get duration info
                            this.on("chaptercuesloaded", function(chapters, length) {
                                this.set("chapterslist", chapters);
                            }, this);
                            if (this.get("initialseek"))
                                this.player.setPosition(this.get("initialseek"));
                            if (this.get("allowpip")) {
                                this.addSettingsMenuItem({
                                    id: 'pip',
                                    label: 'Picture-in-Picture',
                                    showicon: true,
                                    visible: this.player.supportsPIP(),
                                    func: function(settings) {
                                        this.player.on("pip-mode-change", function(ev, inPIPMode) {
                                            this.set("inpipmode", inPIPMode);
                                            this.updateSettingsMenuItem('pip', {
                                                value: inPIPMode
                                            });
                                        }, this);
                                        return !!this.toggle_pip();
                                    }
                                });
                            }
                        }, this);
                        if (this.player.loaded())
                            this.player.trigger("loaded");
                    }, this);
                },

                _getSources: function() {
                    var filter = this.get("currentstream") ? this.get("currentstream").filter : this.get("sourcefilter");
                    var poster = this.get("poster");
                    var source = this.get("source");
                    var sources = filter ? Objs.filter(this.get("sources"), function(source) {
                        return Objs.subset_of(filter, source);
                    }, this) : this.get("sources");
                    Objs.iter(sources, function(s) {
                        if (s.poster)
                            poster = s.poster;
                    });
                    return {
                        poster: poster,
                        source: source,
                        sources: sources
                    };
                },

                _afterActivate: function(element) {
                    inherited._afterActivate.call(this, element);
                    this.__activated = true;

                    this.__settingsMenu = this.scopes.settingsmenu;
                    if (this.__settingsMenu.get('settings'))
                        this.set("hassettings", true);

                    if (this.__attachRequested)
                        this._attachVideo();

                    this.activeElement().classList.add(this.get("csscommon") + "-full-width");

                    if (this.get("slim") === true) {
                        // We should add the CSS codes, and we are adding it here, to mark the player
                        this.activeElement().classList.add(this.get("csscommon") + "-slim");
                        // Makes player a block, so we can position it in the page more easily
                        this.activeElement().style.setProperty("display", "block");
                    }

                    var img = this.activeElement().querySelector('img[data-image="image"]');
                    var imgEventHandler = this.auto_destroy(new DomEvents());
                    imgEventHandler.on(img, "load", function() {
                        this.set("fallback-width", img.naturalWidth);
                        this.set("fallback-height", img.naturalHeight);
                        imgEventHandler.destroy();
                    }, this);
                },

                _playWhenVisible: function(video) {
                    var _self = this;

                    if (Dom.isElementVisible(video, this.get("visibilityfraction"))) {
                        this.player.play();
                    }

                    this._visiblityScrollEvent = this.auto_destroy(new DomEvents());
                    this._visiblityScrollEvent.on(document, "scroll", function() {
                        if (!_self.get('playedonce') && !_self.get("manuallypaused")) {
                            if (Dom.isElementVisible(video, _self.get("visibilityfraction"))) {
                                _self.player.play();
                            } else if (_self.get("playing")) {
                                _self.player.pause();
                            }
                        } else if (_self.get("playing") && !Dom.isElementVisible(video, _self.get("visibilityfraction"))) {
                            _self.player.pause();
                        }
                    });
                },

                toggleFullscreen: function() {
                    this.call("toggle_fullscreen");
                },

                getPlaybackCount: function() {
                    return this.get("playbackcount");
                },

                /* In the future if require to use promise player, Supports >Chrome50, >FireFox53
                _playWithPromise: function(dyn) {
                    var _player, _promise, _autoplayAllowed;
                    _player = dyn.player;
                    _autoplayAllowed = true;
                    if (_player._element)
                        _promise = _player._element.play();
                    else
                        _player.play();

                    if (_promise !== 'undefined' && !Info.isInternetExplorer()) {
                        _promise["catch"](function(err) {
                            // here can add some interaction like inform user to change settings in chrome://flags disable-gesture-requirement-for-media-playback
                            if (err.name === 'NotAllowedError')
                                _autoplayAllowed = false;
                            // Will try to run play anyway
                            _player.play();
                        });
                        _promise.then(function() {
                            if(_autoplayAllowed) {
                                // Inform user with UI that device is not allowed to play without interaction
                            }
                        });
                    } else if (!dyn.get("playing")) {
                        _player.play();
                    }
                }, */

                reattachVideo: function() {
                    this.set("reloadonplay", true);
                    this._detachVideo();
                    this._attachVideo();
                },

                reattachImage: function() {
                    this._detachImage();
                    this._attachImage();
                },

                /**
                 * Click CC buttons will trigger
                 */
                toggleTrackTags: function() {
                    if (!this.__trackTags) return;
                    this.set("tracktextvisible", !this.get("tracktextvisible"));
                    var status = this.get("tracktextvisible");
                    var _lang = this.get("tracktaglang"),
                        _customStyled = this.get("tracktagsstyled"),
                        _status = status ? 'showing' : 'disabled';
                    _status = (status && _customStyled) ? 'hidden' : _status;
                    if (!status && this.get("tracktagsstyled")) this.set("trackcuetext", null);

                    Objs.iter(this.__video.textTracks, function(track, index) {
                        if (typeof this.__video.textTracks[index] === 'object' && this.__video.textTracks[index]) {
                            var _track = this.__video.textTracks[index];
                            // If set custom style to true show cue text in our element
                            if (_track.kind !== 'metadata') {
                                if (_track.language === _lang) {
                                    _track.mode = _status;
                                    this.set("tracktextvisible", status);
                                    this.__trackTags._triggerTrackChange(this.__video, _track, _status, _lang);
                                }
                            }
                        }
                    }, this);
                },

                _keyDownActivity: function(element, ev) {
                    if (this.get("preventinteractionstatus")) return;
                    var _keyCode = ev.which || ev.keyCode;
                    // Prevent white-space browser center scroll and arrow buttons behaviors
                    if (_keyCode === 32 || _keyCode === 37 || _keyCode === 38 || _keyCode === 39 || _keyCode === 40) ev.preventDefault();

                    if (_keyCode === 32 || _keyCode === 13 || _keyCode === 9) {
                        this._resetActivity();
                        if (this.get("fullscreened") && this.get("hideoninactivity")) this.set("hideoninactivity", false);
                    }

                    if (_keyCode === 9 && ev.shiftKey) {
                        this._resetActivity();
                        this._findNextTabStop(element, ev, function(target, index) {
                            target.focus();
                        }, -1);
                    } else if (_keyCode === 9) {
                        this._resetActivity();
                        this._findNextTabStop(element, ev, function(target, index) {
                            target.focus();
                        });
                    }
                },

                _findNextTabStop: function(parentElement, ev, callback, direction) {
                    var _currentIndex, _direction, _tabIndexes, _tabIndexesArray, _maxIndex, _minIndex, _looked, _tabIndex, _delta, _element, _videoPlayersCount;
                    _maxIndex = _minIndex = 0;
                    _direction = direction || 1;
                    _element = ev.target;
                    _currentIndex = _element.tabIndex;
                    _tabIndexes = parentElement.querySelectorAll('[tabindex]');
                    _tabIndexesArray = Array.prototype.slice.call(_tabIndexes, 0);
                    _tabIndexes = _tabIndexesArray
                        .filter(function(element) {
                            if ((element.clientWidth > 0 || element.clientHeight > 0) && (element.tabIndex !== -1)) {
                                if (_maxIndex <= element.tabIndex) _maxIndex = element.tabIndex;
                                if (_minIndex >= element.tabIndex) _minIndex = element.tabIndex;
                                return true;
                            } else return false;
                        });

                    if ((_direction === 1 && _currentIndex === _maxIndex) || (direction === -1 && _currentIndex === _minIndex) || _maxIndex === 0) {
                        _videoPlayersCount = document.querySelectorAll('ba-videoplayer').length;
                        if (_videoPlayersCount > 1) {
                            if (this.get("playing")) this.player.pause();
                            parentElement.tabIndex = -1;
                            parentElement.blur();
                        }
                        return;
                    }

                    for (var i = 0; i < _tabIndexes.length; i++) {
                        if (!_tabIndexes[i])
                            continue;
                        _tabIndex = _tabIndexes[i].tabIndex;
                        _delta = _tabIndex - _currentIndex;
                        if (_tabIndex < _minIndex || _tabIndex > _maxIndex || Math.sign(_delta) !== _direction)
                            continue;

                        if (!_looked || Math.abs(_delta) < Math.abs(_looked.tabIndex - _currentIndex))
                            _looked = _tabIndexes[i];
                    }

                    if (_looked) {
                        ev.preventDefault();
                        callback(_looked, _looked.tabIndex);
                    }
                },

                // Couldn't use for uglification issue `Unexpected token: punc (()`
                // _preventInteraction() {
                //      if(this.get('preventinteraction') && (this.get('hidebarafter') < (Time.now() - this.get("last_activity"))) && this.get('playing'));
                // },

                _resetActivity: function() {
                    if (!this.get('preventinteractionstatus')) {
                        this.set("last_activity", Time.now());
                    }
                    this.set("activity_delta", 0);
                },

                object_functions: ["play", "rerecord", "pause", "stop", "seek", "set_volume", "set_speed", "toggle_tracks"],

                functions: {

                    user_activity: function(strong) {
                        if (strong && !this.get("volumeafterinteraction")) {
                            if (this.get("muted") && this.get("unmuteonclick")) {
                                this.set("muted", false);
                                this.auto_destroy(new Timers.Timer({ // This is being fired right before toggle_player
                                    delay: 500,
                                    fire: function() {
                                        if (!this.get("muted")) {
                                            // If user not paused video manually, we set user as engaged
                                            if (!this.get("manuallypaused")) this.__setPlayerEngagement();
                                            this.set_volume(this.get("initialoptions").volumelevel);
                                        }
                                        this.set("unmuteonclick", false);
                                    }.bind(this),
                                    once: true
                                }));
                            }
                            // User interacted with player, and set player's volume level/un-mute
                            // So we will play voice as soon as player visible for user
                            if (!this.get("muted") && !this.get("unmuteonclick")) this.set_volume(this.get("initialoptions").volumelevel);
                            this.set("volumeafterinteraction", true);
                            if (this.get("forciblymuted")) this.set("forciblymuted", false);
                        }
                        if (this.get('preventinteractionstatus')) return;
                        this._resetActivity();
                    },

                    message_click: function() {
                        this.trigger("message:click");
                        this.__setPlayerEngagement();
                    },

                    playbutton_click: function() {
                        this.__setPlayerEngagement();
                        this.trigger("playbuttonclick");
                        this.host.state().play();
                    },

                    play: function() {
                        this.__setPlayerEngagement();
                        this.trigger("playrequested");
                        if (this._delegatedPlayer) {
                            this._delegatedPlayer.execute("play");
                            return;
                        }
                        if (this.player && this.get("broadcasting")) {
                            this._broadcasting.player.trigger("play-google-cast");
                            return;
                        }
                        this.host.state().play();
                        this.set("manuallypaused", false);
                    },

                    rerecord: function() {
                        if (this._delegatedPlayer) {
                            this._delegatedPlayer.execute("rerecord");
                            return;
                        }
                        if (!this.get("rerecordable"))
                            return;
                        this.trigger("rerecord");
                    },

                    submit: function() {
                        if (this._delegatedPlayer) {
                            this._delegatedPlayer.execute("submit");
                            return;
                        }
                        if (!this.get("submittable"))
                            return;
                        this.trigger("submit");
                        this.set("submittable", false);
                        this.set("rerecordable", false);
                    },

                    pause: function() {
                        if (this.get("preventinteractionstatus")) return;
                        if (this._delegatedPlayer) {
                            this._delegatedPlayer.execute("pause");
                            return;
                        }

                        if (this.get('disablepause')) return;

                        if (this.get("playing_ad")) this.scopes.adsplayer.execute("pause");

                        if (this.get("playing")) {
                            if (this.player && this.get("broadcasting")) {
                                this._broadcasting.player.trigger("pause-google-cast");
                                return;
                            }
                            this.player.pause();
                        }

                        this.set("manuallypaused", true);
                    },

                    stop: function() {
                        if (this.get("preventinteractionstatus")) return;
                        if (this._delegatedPlayer) {
                            this._delegatedPlayer.execute("stop");
                            return;
                        }
                        if (!this.videoLoaded())
                            return;
                        if (this.get("playing"))
                            this.player.pause();
                        this.player.setPosition(0);
                        this.trigger("stopped");
                    },

                    seek: function(position) {
                        this.__setPlayerEngagement();
                        if (this.get("preventinteractionstatus")) return;
                        if (this._delegatedPlayer) {
                            this._delegatedPlayer.execute("seek", position);
                            return;
                        }
                        if (this.get('disableseeking')) return;
                        if (this.get("nextwidget")) this.channel("next").trigger("setStay");
                        if (this.videoLoaded()) {
                            if (position > this.player.duration())
                                this.player.setPosition(this.player.duration() - this.get("skipseconds"));
                            else if (this.get("starttime") && position < this.get("starttime")) {
                                this.player.setPosition(this.get("starttime"));
                            } else {
                                this.player.setPosition(position);
                                this.trigger("seek", position);
                            }
                        }
                        // In midroll ads we need recheck next ad position
                        if (this._adsRollPositionsCollection) {
                            if (this._adsRollPositionsCollection.count() > 0) {
                                this._adsRollPositionsCollection.iterate(function(curr) {
                                    if (curr.get("position") < position)
                                        this._nextRollPosition = null;
                                }, this);
                            }
                        }
                        this.__playedStats(position, this.get("duration"));
                    },

                    set_speed: function(speed, from_ui) {
                        this.__setPlayerEngagement();
                        if (!this.player) return false;
                        this.player.setSpeed(speed);
                        if (!from_ui) this.updateSettingsMenuItem("playerspeeds", {
                            value: parseFloat(speed.toFixed(2))
                        });
                        return speed;
                    },

                    set_volume: function(volume) {
                        this.__setPlayerEngagement();
                        if (this.get("preventinteractionstatus")) return;
                        if (this._delegatedPlayer) {
                            this._delegatedPlayer.execute("set_volume", volume);
                            return;
                        }
                        volume = Math.min(1.0, volume);

                        if (this.player && this.player._broadcastingState && this.player._broadcastingState.googleCastConnected) {
                            this._broadcasting.player.trigger("change-google-cast-volume", volume);
                        }

                        this.set("volume", volume);
                        if (this.videoLoaded()) {
                            this.player.setVolume(volume);
                            this.player.setMuted(volume <= 0);
                        }
                    },

                    toggle_settings_menu: function() {
                        this.set("settingsmenu_active", !this.get("settingsmenu_active"));
                    },

                    toggle_share: function() {
                        this.set("share_active", !this.get("share_active"));
                    },

                    toggle_fullscreen: function() {
                        this.__setPlayerEngagement();
                        if (this.get("preventinteractionstatus")) return;
                        if (this._delegatedPlayer) {
                            this._delegatedPlayer.execute("toggle_fullscreen");
                            return;
                        }
                        if (this.get("fullscreened")) {
                            Dom.documentExitFullscreen();
                        } else {
                            if (Info.isSafari()) Dom.elementEnterFullscreen(this.activeElement().querySelector("video"));
                            else Dom.elementEnterFullscreen(this.activeElement().childNodes[0]);
                        }
                        this.set("fullscreened", !this.get("fullscreened"));
                    },

                    toggle_player: function() {
                        if (this.get("sticky") && this.stickyHandler && this.stickyHandler.isDragging()) {
                            this.stickyHandler.stopDragging();
                            return;
                        }
                        if (this.get("playing") && this.get("preventinteractionstatus")) return;
                        if (this._delegatedPlayer) {
                            this._delegatedPlayer.execute("toggle_player");
                            return;
                        }
                        if (this.get("unmuteonclick")) {
                            if (this.get("muted")) {
                                if (this.player) this.player.setMuted(false);
                                this.set("muted", false);
                            }
                            this.set("unmuteonclick", false);
                        } else if (this.get("playing") && this.get("pauseonclick")) {
                            this.pause();
                        } else if (!this.get("playing") && this.get("playonclick")) {
                            this.__setPlayerEngagement();
                            this.play();
                        }
                    },

                    tab_index_move: function(ev, nextSelector, focusingSelector) {
                        if (this.get("preventinteractionstatus")) return;
                        var _targetElement, _activeElement, _selector, _keyCode;
                        _keyCode = ev.which || ev.keyCode;
                        _activeElement = this.activeElement();
                        if (_keyCode === 13 || _keyCode === 32) {
                            if (focusingSelector) {
                                _selector = "[data-selector='" + focusingSelector + "']";
                                _targetElement = _activeElement.querySelector(_selector);
                                if (_targetElement)
                                    Async.eventually(function() {
                                        this.trigger("keyboardusecase", _activeElement);
                                        _targetElement.focus({
                                            preventScroll: false
                                        });
                                    }, this, 100);
                            } else {
                                _selector = '[data-video="video"]';
                                _targetElement = _activeElement.querySelector(_selector);
                                Async.eventually(function() {
                                    this.trigger("keyboardusecase", _activeElement);
                                    _targetElement.focus({
                                        preventScroll: true
                                    });
                                }, this, 100);
                            }
                        } else if (_keyCode === 9 && nextSelector) {
                            _selector = "[data-selector='" + nextSelector + "']";
                            _targetElement = _activeElement.querySelector(_selector);
                            if (_targetElement)
                                Async.eventually(function() {
                                    this.trigger("keyboardusecase", _activeElement);
                                    _targetElement.focus({
                                        preventScroll: false
                                    });
                                }, this, 100);
                        }
                    },

                    upload_text_tracks: function(file, locale) {
                        return this.host.state().uploadTextTrack(file, locale);
                    },

                    move_to_option: function(currentElement, nextSelector) {
                        var _classPrefix, _hiddenOptionsSelector, _visibleOptionsSelector, _moveToSelector,
                            _targetElement, _currentElementParent, _topParent;
                        nextSelector = nextSelector || 'initial-options-list'; // If next element is empty return to main options
                        _classPrefix = this.get('csscommon') + "-";
                        _moveToSelector = "." + _classPrefix + nextSelector;
                        _hiddenOptionsSelector = _classPrefix + 'options-list-hidden';
                        _visibleOptionsSelector = _classPrefix + 'options-list-visible';
                        _targetElement = this.activeElement().querySelector(_moveToSelector);
                        _topParent = this.activeElement().querySelector(_classPrefix + 'text-tracks-overlay');

                        // Look if target element is hidden
                        if (Dom.elementHasClass(_targetElement, _hiddenOptionsSelector)) {
                            // Search for visible closest parent element
                            _currentElementParent = Dom.elementFindClosestParent(currentElement, _visibleOptionsSelector, _classPrefix + 'text-tracks-overlay');
                            // We should have parent element with visible class
                            if (Dom.elementHasClass(_currentElementParent, _visibleOptionsSelector)) {
                                Dom.elementReplaceClasses(_targetElement, _hiddenOptionsSelector, _visibleOptionsSelector);
                                Dom.elementReplaceClasses(_currentElementParent, _visibleOptionsSelector, _hiddenOptionsSelector);
                            }
                            if (_topParent)
                                _topParent.focus({
                                    preventScroll: true
                                });
                            else
                                _currentElementParent.focus({
                                    preventScroll: true
                                });
                        }
                    },

                    toggle_interaction_option: function(turn_switch) {
                        if (typeof turn_switch === 'boolean') {
                            this.set("preventinteractionstatus", turn_switch);
                        } else {
                            this.set("preventinteractionstatus", !this.get("preventinteractionstatus"));
                        }
                    },

                    toggle_tracks: function() {
                        this.toggleTrackTags(!this.get('tracktextvisible'));
                    },

                    pause_ads: function() {
                        this.channel("ads").trigger("pause");
                    },

                    resume_ads: function() {
                        this.__setPlayerEngagement();
                        this.channel("ads").trigger("resume");
                    },

                    close_floating: function() {
                        this.trigger("floatingplayerclosed");
                        if (this.get("sticky") || this.get("floatingoptions.floatingonly")) {
                            if (this.get("floatingoptions.hideplayeronclose") || this.get("floatingoptions.floatingonly")) {
                                // Hide container element if player will be destroyed
                                if (this.activeElement()) {
                                    this._applyStyles(this.activeElement(), {
                                        display: "none"
                                    });
                                }
                                this.destroy();
                            } else {
                                this.pause();
                                this.set("sticky", false);
                                this.set("view_type", "default");
                                if (this.stickyHandler) this.stickyHandler.destroy();
                            }
                        } else {
                            this.destroy();
                        }
                    }
                },

                destroy: function() {
                    if (this._observer) this._observer.disconnect();
                    this._detachVideo();
                    inherited.destroy.call(this);
                },

                _timerFire: function() {
                    if (this.destroyed())
                        return;
                    try {
                        var clientWidth = window.innerWidth || document.documentElement.clientWidth ||
                            document.body.clientWidth;
                        this.set("mobileviewport", this.isMobile() || clientWidth <= 560);
                        if (this.videoLoaded()) {
                            var _now = Time.now();
                            this.set("activity_delta", _now - this.get("last_activity"));
                            var new_position = this.player.position();
                            if (new_position !== this.get("position") || this.get("last_position_change"))
                                this.set("last_position_change", _now);
                            // Run each second not to fast
                            if (this.get("position") > 0.0 && this.__previousPostion !== Math.round(this.get("position"))) {
                                this.__previousPostion = Math.round(this.get("position"));
                                if (this.__previousPostion > 0) this.trigger("playing_progress", this.__previousPostion);
                            }
                            // var midPreAdRolls = (this._adsRoll || this._prerollAd);
                            // // Check in the last 3 seconds if nonLinear is showing and disable it
                            // if ((this.get("duration") > 0 && new_position > 10) && (this.get("duration") - new_position) > 3) {
                            //     if (midPreAdRolls && typeof midPreAdRolls.manuallyEndAd === "function" && !midPreAdRolls._isLinear) {
                            //         midPreAdRolls.manuallyEndAd();
                            //     }
                            // }
                            // If play action will not set the silent_attach to false.
                            if (new_position > 0.0 && this.get("silent_attach")) {
                                this.set("silent_attach", false);
                            }
                            // In case if prevent interaction with controller set to true
                            if (this.get('preventinteraction')) {
                                // set timer since player started to play
                                if (this.get("passed_after_play") < 0.001) {
                                    this.set("passed_after_play", _now);
                                } else {
                                    var _passed = _now - this.get("passed_after_play");
                                    if (_passed > _now - 1000) {
                                        this.set("passed_after_play", _passed);
                                    }
                                    if ((this.get('hidebarafter') < _passed) && this.get('playing') && !this.get("preventinteractionstatus")) {
                                        this.set('preventinteractionstatus', true);
                                    }
                                }
                            }
                            if (!this.get("broadcasting")) {
                                this.set("last_position_change_delta", _now - this.get("last_position_change"));
                                this.set("position", new_position);
                                this.set("buffered", this.player.buffered());
                                var pld = this.player.duration();
                                if (0.0 < pld && pld < Infinity)
                                    this.set("duration", this.player.duration());
                                else
                                    this.set("duration", this.get("totalduration") || new_position);
                            }
                            this.set("fullscreened", this.player.isFullscreen(this.activeElement().childNodes[0]));
                            // If setting pop-up is open, hide it together with a control-bar if hideOnInactivity is true
                            if (this.get('hideoninactivity') && (this.get('activity_delta') > this.get('hidebarafter'))) {
                                this.set("settingsmenu_active", false);
                            }
                            // We need this part run each second not too fast, this.__adsControlPosition will control it
                            if (this.__adsControlPosition < this.get("position")) {
                                this.__adsControlPosition = Math.ceil(this.get("position"));
                                this.__controlAdRolls();
                            }
                        }
                    } catch (e) {}
                    try {
                        this._updateCSSSize();
                    } catch (e) {}
                },

                _updateCSSSize: function() {
                    var width;
                    if (this.get("is_floating") && this.get("with_sidebar")) {
                        // with sidebar, we need to get only video player width not whole container
                        width = Dom.elementDimensions(this.__playerContainer || this.activeElement()).width;
                    } else {
                        width = Dom.elementDimensions(this.activeElement()).width;
                    }
                    this.set("csssize", width > 400 ? "normal" : (width > 320 ? "medium" : "small"));
                    this.set("mobileview", width < 560);
                },

                videoHeight: function() {
                    if (this.videoAttached())
                        return this.player.videoHeight();
                    var img = this.activeElement().querySelector("img");
                    // In Safari img && img.height could return 0
                    if (Types.is_defined(img) && img.height) {
                        var clientHeight = (window.innerHeight || document.body.clientHeight);
                        if (img.height > clientHeight)
                            return clientHeight;
                        return img.height;
                    }
                    return NaN;
                },

                videoWidth: function() {
                    if (this.videoAttached())
                        return this.player.videoWidth();
                    var img = this.activeElement().querySelector("img");
                    // In Safari img && img.width could return 0
                    if (Types.is_defined(img) && img.width) {
                        var clientWidth = (window.innerWidth || document.body.clientWidth);
                        if (img.width > clientWidth)
                            return clientWidth;
                        return img.width;
                    }
                    return NaN;
                },

                aspectRatio: function() {
                    // Don't use a shortcut way of getting an aspect ratio, will act as not expected.
                    var height = this.videoHeight();
                    var width = this.videoWidth();

                    return width / height;
                },

                isPortrait: function() {
                    return this.aspectRatio() < 1.00;
                },

                isLandscape: function() {
                    return !this.isPortrait();
                },

                parentWidth: function() {
                    return Dom.elementDimensions(this.activeElement().parentElement).width;
                },

                parentHeight: function() {
                    return Dom.elementDimensions(this.activeElement().parentElement).height;
                },

                parentAspectRatio: function() {
                    return this.parentWidth() / this.parentHeight();
                },

                cloneAttrs: function() {
                    return Objs.map(Types.is_function(this.attrs) ? this.attrs.call(this) : this.attrs, function(value, key) {
                        return this.get(key);
                    }, this);
                },

                isHD: function() {
                    if (this.videoAttached()) {
                        return (this.videoWidth() * this.videoHeight()) >= 1280 * 720;
                    } else {
                        var video_data;
                        if (this.get("stream") == null || this.get("stream") === "") {
                            video_data = this.get("video_data").default_stream;
                        } else {
                            for (var i = 0; i < this.get("video_data").streams.length; i++) {
                                if (this.get("video_data").streams[i].token === this.get("stream")) {
                                    return (this.get("video_data").streams[i].video_width * this.get("video_data").streams[i].video_height) >= 1280 * 720;
                                }
                            }
                        }
                        if (video_data) {
                            return (video_data.video_width * video_data.video_height) >= 1280 * 720;
                        } else {
                            return undefined;
                        }
                    }
                },

                isSD: function() {
                    return !this.isHD();
                },

                isMobile: function() {
                    return Info.isMobile();
                },

                popupAttrs: function() {
                    return {
                        autoplay: true,
                        popup: false,
                        width: this.get("popup-width"),
                        height: this.get("popup-height")
                    };
                },

                initAdSources: function() {
                    this.set("preloadadsmanager", false);
                    this.set("delayadsmanagerload", false);
                    if (
                        Array.isArray(this.get("adtagurlfallbacks")) &&
                        this.get("adtagurlfallbacks").length > 0 &&
                        !this.get("adtagurl") &&
                        !this.get("inlinevastxml")
                    ) this.set("adtagurl", this.get("adtagurlfallbacks").shift());
                    this.set("adshassource", !!this.get("adtagurl") || !!this.get("inlinevastxml"));

                    // The initial mute state will not be changes if outstream is not set
                    if (this.get("outstream")) {
                        this.set("muted", !this.get("repeatedplayer"));
                        this.set("autoplay", true);
                        this.set("skipinitial", false);
                        this.set("unmuteonclick", !this.get("repeatedplayer"));
                        this.set("outstreamoptions", Objs.tree_merge(this.get("initialoptions").outstreamoptions, this.get("outstreamoptions")));
                        if (this.get("repeatedplayer")) {
                            this.set("wait-user-interaction", false);
                            this.set("autoplay-requires-muted", false);
                        }
                        if (Types.is_defined(this.get("outstreamoptions").corner) && this.activeElement()) {
                            var _corner = this.get("outstreamoptions").corner;
                            if (Types.is_boolean(_corner)) {
                                if (_corner) {
                                    this._applyStyles(this.activeElement().firstChild, {
                                        borderRadius: '10px'
                                    });
                                }
                            } else {
                                // it can be string ot numeric
                                this._applyStyles(this.activeElement().firstChild, {
                                    borderRadius: (Types.is_string(_corner) ? parseFloat(_corner.replace(/\D/g, '')).toFixed() : _corner) + 'px'
                                });
                            }
                        }
                    }

                    if (this.get("adshassource")) {
                        if (this.get("adsposition")) {
                            this.set("adsplaypreroll", this.get("adsposition").indexOf("pre") !== -1);
                            this.set("adsplaypostroll", this.get("adsposition").indexOf("post") !== -1);
                            this.initMidRollAds();
                        } else {
                            // if there's no specification, play preroll or VMAP if not set adsposition at all
                            this.set("vmapads", true);
                        }

                        this.set("preloadadsmanager", this.get("adsplaypreroll") || this.get("vmapads") || this.get("outstream"));
                        var skipInitialWithoutAutoplay = this.get("skipinitial") && !this.get("autoplay");
                        this.set("delayadsmanagerload", !this.get("preloadadsmanager") || skipInitialWithoutAutoplay);
                    }
                },

                /**
                 * @private
                 */
                __calculateFloatingDimensions: function() {
                    var height, width, playerWidth, position, viewportOptions, response = {};
                    var aspectRatio = typeof this.get("aspect_ratio") === "string" ? this.get("aspect_ratio").split("/") : 1.77;
                    var isMobile = this.get("mobileviewport") || Info.isMobile();
                    if (Types.is_array(aspectRatio)) {
                        aspectRatio = aspectRatio[0] / aspectRatio[1];
                    }
                    aspectRatio = Number(parseFloat(aspectRatio).toFixed(2));
                    if (isMobile) {
                        response.floating_left = 0;
                        width = '100%'; // Not set via CSS, will break the player
                        viewportOptions = this.get("floatingoptions.mobile");
                        if (viewportOptions) {
                            height = +this.get("floatingoptions.mobile.height");
                            position = this.get("floatingoptions.mobile.position");
                        }
                        if (this.activeElement()) {
                            this.activeElement().classList.add(this.get("csscommon") + "-full-width");
                        }
                        if (typeof this.get("floatingoptions.mobile.sidebar") !== "undefined" && this.get("floatingoptions.sidebar"))
                            this.set("with_sidebar", this.get("floatingoptions.mobile.sidebar"));
                    } else {
                        viewportOptions = this.get("floatingoptions.desktop");
                        if (viewportOptions) {
                            position = viewportOptions.position;
                            height = +viewportOptions.height;
                        }
                        if (this.activeElement()) {
                            this.activeElement().classList.remove(this.get("csscommon") + "-full-width");
                        }
                        if (typeof this.get("floatingoptions.desktop.sidebar") !== "undefined" && this.get("floatingoptions.sidebar"))
                            this.set("with_sidebar", this.get("floatingoptions.desktop.sidebar"));
                    }
                    position = position || this.get("sticky-position");
                    if (position) {
                        Objs.iter(["top", "right", "bottom", "left"], function(val) {
                            if (position.includes(val)) {
                                response['floating_' + val] = viewportOptions[val] ? viewportOptions[val] : 0;
                            }
                        }, this);
                    }
                    if (height)
                        height = +parseFloat(height).toFixed(2);
                    else height = isMobile ?
                        this.get("fallback-floating-mobile-height") :
                        this.get("fallback-floating-desktop-height");
                    // this.set("height", height);
                    playerWidth = Number(parseFloat(
                        aspectRatio > 1 ? (aspectRatio * height) : (height / aspectRatio)
                    ).toFixed(2));
                    if (this.get("with_sidebar") && !isMobile) {
                        width = playerWidth + Number(aspectRatio > 1 ? playerWidth : height);
                    }
                    response.floating_height = height;
                    response.player_width = playerWidth;
                    response.floating_width = width ? width : playerWidth;

                    // this.setAll(response);
                    return response;
                },

                /**
                 * Prepare for postoll and mid-roll ad managers
                 * @private
                 */
                __controlAdRolls: function() {
                    // If we have mid-rolls, then prepare mid-Rolls
                    if (
                        this.get("midrollads").length > 0 && this.get("duration") > 0.0 && !this._adsRollPositionsCollection
                    ) {
                        this._adsRollPositionsCollection = this.auto_destroy(new Collection()); // our adsCollections
                        if (this.get("midrollads").length > 0) {
                            var _current = null;
                            var _nextPositionIndex = null;
                            Objs.iter(this.get("midrollads"), function(roll, index) {
                                if (roll.position && roll.position > this.get("position")) {
                                    // First ad position, if less than 1 it means it's percentage not second
                                    var _position = roll.position < 1 ?
                                        Math.floor(this.get("duration") * roll.position) :
                                        roll.position;
                                    // If the user does not set, and we will not get the same ad position, avoids dublication,
                                    // prevent very close ads and also wrong set position which exceeds the duration
                                    if ((Math.abs(_position - _current) > this.__adMinIntervals) && _position < this.get("duration")) {
                                        _current = _position;
                                        _nextPositionIndex = index;
                                        this._adsRollPositionsCollection.add({
                                            position: _position,
                                            duration: null,
                                            type: 'linear',
                                            isLinear: true,
                                            dimensions: {
                                                width: Dom.elementDimensions(this.activeElement()).width || this.parentWidth(),
                                                height: Dom.elementDimensions(this.activeElement()).height || this.parentHeight()
                                            }
                                        });
                                    }
                                }
                            }, this);
                        }
                    } else {
                        this.__adMinIntervals = this.__adMinIntervals === 0 ?
                            this.get("minadintervals") : (this.__adMinIntervals - 1);
                    }

                    // Set a new position when ad should run
                    if (this._adsRollPositionsCollection && !this._nextRollPosition) {
                        var _counter = this._adsRollPositionsCollection.count();
                        var _removeCurr = null;
                        if (_counter > 0) {
                            var _nextAdPoint = {
                                position: -1,
                                nextPosition: this.get("duration"),
                                nextIsLast: true,
                                type: null
                            };
                            this._adsRollPositionsCollection.iterate(function(curr) {
                                _counter--;
                                if ((_nextAdPoint.position > curr.get("position") && _nextAdPoint.type) || _nextAdPoint.position === -1) {
                                    _removeCurr = curr;
                                    _nextAdPoint = _removeCurr.data();
                                }
                                // We need max close position to play, if user seeked the video
                                if (this.get("position") >= curr.get("position")) {
                                    // Remove all passed positions
                                    this._adsRollPositionsCollection.remove(curr);
                                }
                                if (_nextAdPoint.position && _nextAdPoint.type && _counter === 0 && _removeCurr) {
                                    this._nextRollPosition = _nextAdPoint;
                                    this._adsRollPositionsCollection.remove(_removeCurr);
                                }
                            }, this);
                        } else {
                            this._adsRollPositionsCollection.destroy();
                            this._adsRollPositionsCollection = null;
                        }
                    }

                    if (this._nextRollPosition && this.get("adshassource") && this._nextRollPosition.position < this.get("position")) {
                        if (this.__adMinIntervals > 0) {
                            return;
                        }
                        // If active ads player is existed
                        if (this.get("adsplayer_active") && this.scopes.adsplayer) {
                            this.brakeAdsManually();
                            this.trigger("playnextmidroll");
                        } else {
                            // In case if preroll not exists, so ads_player is not activated
                            this.trigger("playnextmidroll");
                        }
                        this._nextRollPosition = null; // To be able to grab another next position from the Collection
                    }
                },

                /**
                 * Will generate player stats
                 * @param position
                 * @param duration
                 * @private
                 */
                __playedStats: function(position, duration) {
                    var currentPassedQuarter = Math.floor(position / duration / 0.25);
                    if (Math.abs(this.get("last-seen-position") - position) >= 1) {
                        this.set("last-seen-position", position);
                        this.set("played-seconds", this.get("played-seconds") + 1);
                        if (this.get("volume") > 0.2) {
                            this.set("last-played-position", this.get("last-played-position") + 1);
                        }
                    }

                    if (this.get("passed-quarter") !== currentPassedQuarter) {
                        this.set("passed-quarter", currentPassedQuarter);
                        this.trigger("quarter-passed", currentPassedQuarter);
                    }

                    if (!this.get("player-started")) this.set("player-started", true);

                },

                _checkAutoPlay: function(video) {
                    video = video || this.__video;
                    if (!video) return;
                    if (this.get("autoplay-requires-muted") || this.get("autoplay-requires-playsinline") || this.get("wait-user-interaction") || this.get("forciblymuted")) {
                        if (this.get("autoplay-requires-muted") || this.get("forciblymuted")) video.muted = true;
                        if (this.get("autoplay-requires-playsinline"))
                            video.playsinline = true;
                        Dom.userInteraction(function() {
                            var _initialVolume = this.get("initialoptions").volumelevel > 1 ? 1 : this.get("initialoptions").volumelevel;
                            this.set("autoplay", this.get("initialoptions").autoplay);
                            // Sometimes browser detects that unmute happens before the user has interaction, and it pauses ad
                            Async.eventually(function() {
                                if (this.destroyed()) return; // in some cases it can be destroyed before
                                if (!this.get("muted")) this.set_volume(_initialVolume);
                                if (!this.get("muted") && this.get("volume") > 0.00) video.muted = false;
                            }, this, 300);

                            this.set("forciblymuted", false);
                            if (this.get("autoplay-requires-muted") && this.get("adshassource")) {
                                // Sometimes browser detects that unmute happens before the user has interaction, and it pauses ad
                                this.trigger("unmute-ads", Math.min(_initialVolume, 1));
                            }
                            if (this.get("wait-user-interaction") && this.get("autoplay")) {
                                this.__testAutoplayOptions(video);
                                this.trigger("user-has-interaction");
                            }
                        }, this);
                    }

                },

                brakeAdsManually: function(hard) {
                    hard = hard || false;
                    var adsPlayer = this.scopes.adsplayer;

                    // Only if min-suggested seconds of nonLinear ads are shown will show next ads
                    if (adsPlayer.get("non-linear-min-suggestion") >= 0 && !adsPlayer.get("linear") && !hard)
                        return;

                    if (!this.get("adscompleted") && !adsPlayer.get("linear")) {
                        this.channel("ads").trigger("allAdsCompleted");
                        // this.channel("ads").trigger("discardAdBreak"); // nonLinear not run discard
                    }
                    this.set("adsplayer_active", false);
                },

                __testAutoplayOptions: function(video) {
                    var suitableCondition = false;
                    var autoplayPossibleOptions = [{
                            muted: false,
                            playsinline: false
                        },
                        {
                            muted: false,
                            playsinline: true
                        },
                        {
                            muted: true,
                            playsinline: false
                        },
                        {
                            muted: true,
                            playsinline: true
                        }
                    ];
                    Objs.iter(autoplayPossibleOptions, function(opt, index) {
                        PlayerSupport.canAutoplayVideo(opt)
                            .success(function(response, err) {
                                if (suitableCondition) return;
                                // If autoplay is allowed in any way
                                if (!this.get("autoplay-allowed")) {
                                    this.set("autoplay-allowed", !!response.result);
                                }
                                // If condition is true no need for turn off volume
                                if (!opt.muted && !opt.playsinline && response.result) {
                                    this.set("wait-user-interaction", false);
                                    this.set("autoplay-requires-muted", false);
                                    suitableCondition = true;
                                    // if (video) video.muted = opt.muted;
                                    if (video) {
                                        if (opt.playsinline) {
                                            video.setAttribute('playsinline', '');
                                        } else {
                                            video.removeAttribute('playsinline');
                                        }
                                    }
                                    if (!this.get("playing") && this.player) {
                                        this.player.play();
                                    }
                                }
                                if (opt.muted && response.result) {
                                    this.set("forciblymuted", true);
                                    this.set("autoplay-requires-muted", true);
                                    this.set("wait-user-interaction", false);
                                    this.set("volume", 0.0);
                                    this.set("forciblymuted", true);
                                    suitableCondition = true;
                                    if (video) video.muted = opt.muted;
                                    if (video) {
                                        if (opt.playsinline) {
                                            video.setAttribute('playsinline', '');
                                        } else {
                                            video.removeAttribute('playsinline');
                                        }
                                    }
                                    if (!this.get("playing") && this.player) {
                                        this.player.play();
                                    }
                                }
                                if (opt.playsinline && response.result) {
                                    this.set("autoplay-requires-playsinline", true);
                                    this.set("wait-user-interaction", false);
                                    if (video) video.playsinline = true;
                                    if (opt.muted) {
                                        this.set("forciblymuted", true);
                                        this.set("autoplay-requires-muted", true);
                                        if (video) video.muted = true;
                                    }
                                    suitableCondition = true;
                                }
                            }, this)
                            .error(function(err) {
                                console.warn("Error :", err, opt, index);
                            }, this);
                    }, this);
                },

                __attachPlayerInteractionEvents: function() {
                    Objs.iter(this.__INTERACTION_EVENTS, function(eventName) {
                        this.auto_destroy(
                            this.activeElement().addEventListener(
                                eventName, this.__setPlayerHadInteraction.bind(this), {
                                    once: true
                                }
                            ));
                    }, this);
                },

                __removePlayerInteractionEvents: function() {
                    Objs.iter(this.__INTERACTION_EVENTS, function(eventName) {
                        this.activeElement().removeEventListener(
                            eventName, this.__setPlayerHadInteraction
                        );
                    }, this);
                },

                __setPlayerEngagement: function() {
                    if (this.get("userengagedwithplayer")) return;
                    // User will be engaged with player if volume is not 0
                    if (!this.get("muted")) {
                        this.set("userengagedwithplayer", true);
                        this.trigger("playerengaged");
                    }
                },

                __setPlayerHadInteraction: function() {
                    if (this.get("userhadplayerinteraction")) return;
                    this.set("userhadplayerinteraction", true);
                    this.trigger("playerinteracted");
                    this.__removePlayerInteractionEvents();
                }
            };
        }], {

            playerStates: function() {
                return [PlayerStates];
            }

        }).register("ba-videoplayer")
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "cssplayer": function (obj) { return obj.cssplayer; }, "csssize": function (obj) { return obj.csssize; }, "iecss": function (obj) { return obj.iecss; }, "ie8 ? 'ie8' : 'noie8'": function (obj) { return obj.ie8 ? 'ie8' : 'noie8'; }, "csstheme": function (obj) { return obj.csstheme; }, "fullscreened ? 'fullscreen' : 'normal'": function (obj) { return obj.fullscreened ? 'fullscreen' : 'normal'; }, "firefox ? 'firefox' : 'common'": function (obj) { return obj.firefox ? 'firefox' : 'common'; }, "themecolor": function (obj) { return obj.themecolor; }, "mobileview ? 'mobile' : 'desktop'": function (obj) { return obj.mobileview ? 'mobile' : 'desktop'; }, "mobileviewport ? 'mobile' : 'desktop'": function (obj) { return obj.mobileviewport ? 'mobile' : 'desktop'; }, "is_floating ? cssfloatingclasses : ''": function (obj) { return obj.is_floating ? obj.cssfloatingclasses : ''; }, "(with_sidebar && is_floating && !fullscreened) ? cssplayer + '-with-sidebar' : csscommon + '-full-width'": function (obj) { return (obj.with_sidebar && obj.is_floating && !obj.fullscreened) ? obj.cssplayer + '-with-sidebar' : obj.csscommon + '-full-width'; }, "cssplayer + (((activity_delta > hidebarafter) && hideoninactivity) ? '-controlbar-hidden' : '-controlbar-visible')": function (obj) { return obj.cssplayer + (((obj.activity_delta > obj.hidebarafter) && obj.hideoninactivity) ? '-controlbar-hidden' : '-controlbar-visible'); }, "user_activity()": function (obj) { return obj.user_activity(); }, "user_activity(true)": function (obj) { return obj.user_activity(true); }, "containerSizingStyles": function (obj) { return obj.containerSizingStyles; }, "title || 'Video Player'": function (obj) { return obj.title || 'Video Player'; }, "description || 'Video Player'": function (obj) { return obj.description || 'Video Player'; }, "uploaddate": function (obj) { return obj.uploaddate; }, "title": function (obj) { return obj.title; }, "thumbnailurl": function (obj) { return obj.thumbnailurl; }, "contenturl": function (obj) { return obj.contenturl; }, "dynnext": function (obj) { return obj.dynnext; }, "next_active": function (obj) { return obj.next_active; }, "is_floating": function (obj) { return obj.is_floating; }, "with_sidebar": function (obj) { return obj.with_sidebar; }, "playlist": function (obj) { return obj.playlist; }, "current_video_from_playlist": function (obj) { return obj.current_video_from_playlist; }, "position": function (obj) { return obj.position; }, "shownext": function (obj) { return obj.shownext; }, "noengagenext": function (obj) { return obj.noengagenext; }, "(videoelement_active || !imageelement_active) && !silent_attach": function (obj) { return (obj.videoelement_active || !obj.imageelement_active) && !obj.silent_attach; }, "csscommon": function (obj) { return obj.csscommon; }, "videofitstrategy": function (obj) { return obj.videofitstrategy; }, "preload ? 'auto' : 'metadata'": function (obj) { return obj.preload ? 'auto' : 'metadata'; }, "!playfullscreenonmobile": function (obj) { return !obj.playfullscreenonmobile; }, "(imageelement_active && !videoelement_active) || silent_attach": function (obj) { return (obj.imageelement_active && !obj.videoelement_active) || obj.silent_attach; }, "posteralt": function (obj) { return obj.posteralt; }, "posterfitstrategy": function (obj) { return obj.posterfitstrategy; }, "dynadsplayer": function (obj) { return obj.dynadsplayer; }, "adsplayer_active": function (obj) { return obj.adsplayer_active; }, "ad": function (obj) { return obj.ad; }, "addata": function (obj) { return obj.addata; }, "adsmanagerloaded": function (obj) { return obj.adsmanagerloaded; }, "adduration": function (obj) { return obj.adduration; }, "volume": function (obj) { return obj.volume; }, "muted": function (obj) { return obj.muted; }, "unmuteonclick": function (obj) { return obj.unmuteonclick; }, "adtagurl": function (obj) { return obj.adtagurl; }, "adchoiceslink": function (obj) { return obj.adchoiceslink; }, "repeatedplayer": function (obj) { return obj.repeatedplayer; }, "inlinevastxml": function (obj) { return obj.inlinevastxml; }, "outstreamoptions": function (obj) { return obj.outstreamoptions; }, "adsquartile": function (obj) { return obj.adsquartile; }, "imasettings": function (obj) { return obj.imasettings; }, "fullscreened": function (obj) { return obj.fullscreened; }, "!adscontrolbar_active": function (obj) { return !obj.adscontrolbar_active; }, "tmpladscontrolbar": function (obj) { return obj.tmpladscontrolbar; }, "dynadscontrolbar": function (obj) { return obj.dynadscontrolbar; }, "companionad": function (obj) { return obj.companionad; }, "companionads": function (obj) { return obj.companionads; }, "(activity_delta > hidebarafter) && hideoninactivity": function (obj) { return (obj.activity_delta > obj.hidebarafter) && obj.hideoninactivity; }, "view_type": function (obj) { return obj.view_type; }, "adsplaying": function (obj) { return obj.adsplaying; }, "moredetailslink": function (obj) { return obj.moredetailslink; }, "moredetailstext": function (obj) { return obj.moredetailstext; }, "mobileview": function (obj) { return obj.mobileview; }, "floatingoptions": function (obj) { return obj.floatingoptions; }, "mobileviewport": function (obj) { return obj.mobileviewport; }, "adchoicesontop": function (obj) { return obj.adchoicesontop; }, "hasplaceholderstyle ? (css + '-overlay-with-placeholder') : ''": function (obj) { return obj.hasplaceholderstyle ? (obj.css + '-overlay-with-placeholder') : ''; }, "!showbuiltincontroller && !outstream && !adsplaying": function (obj) { return !obj.showbuiltincontroller && !obj.outstream && !obj.adsplaying; }, "placeholderstyle": function (obj) { return obj.placeholderstyle; }, "seek(position + skipseconds)": function (obj) { return obj.seek(obj.position + obj.skipseconds); }, "seek(position - skipseconds)": function (obj) { return obj.seek(obj.position - obj.skipseconds); }, "seek(position + skipseconds * 3)": function (obj) { return obj.seek(obj.position + obj.skipseconds * 3); }, "seek(position - skipseconds * 3)": function (obj) { return obj.seek(obj.position - obj.skipseconds * 3); }, "set_volume(volume + 0.1)": function (obj) { return obj.set_volume(obj.volume + 0.1); }, "set_volume(volume - 0.1)": function (obj) { return obj.set_volume(obj.volume - 0.1); }, "toggle_player()": function (obj) { return obj.toggle_player(); }, "dyntrimmer": function (obj) { return obj.dyntrimmer; }, "trimmingmode && videoelement_active": function (obj) { return obj.trimmingmode && obj.videoelement_active; }, "playing": function (obj) { return obj.playing; }, "starttime": function (obj) { return obj.starttime; }, "endtime": function (obj) { return obj.endtime; }, "timeminlimit": function (obj) { return obj.timeminlimit; }, "duration": function (obj) { return obj.duration; }, "source": function (obj) { return obj.source; }, "dyncontrolbar": function (obj) { return obj.dyncontrolbar; }, "csscontrolbar || css": function (obj) { return obj.csscontrolbar || obj.css; }, "cssplayer || css": function (obj) { return obj.cssplayer || obj.css; }, "csstheme || css": function (obj) { return obj.csstheme || obj.css; }, "controlbar_logo": function (obj) { return obj.controlbar_logo; }, "tmplcontrolbar": function (obj) { return obj.tmplcontrolbar; }, "controlbar_active && !hidecontrolbar": function (obj) { return obj.controlbar_active && !obj.hidecontrolbar; }, "playwhenvisible": function (obj) { return obj.playwhenvisible; }, "playerspeeds": function (obj) { return obj.playerspeeds; }, "playercurrentspeed": function (obj) { return obj.playercurrentspeed; }, "airplay": function (obj) { return obj.airplay; }, "airplaybuttonvisible": function (obj) { return obj.airplaybuttonvisible; }, "chromecast": function (obj) { return obj.chromecast; }, "castbuttonvisble": function (obj) { return obj.castbuttonvisble; }, "tabindex": function (obj) { return obj.tabindex; }, "showchaptertext": function (obj) { return obj.showchaptertext; }, "chapterslist": function (obj) { return obj.chapterslist; }, "tracktextvisible": function (obj) { return obj.tracktextvisible; }, "tracktags": function (obj) { return obj.tracktags; }, "hassubtitles && tracktagssupport": function (obj) { return obj.hassubtitles && obj.tracktagssupport; }, "allowtexttrackupload": function (obj) { return obj.allowtexttrackupload; }, "tracksshowselection": function (obj) { return obj.tracksshowselection; }, "buffered": function (obj) { return obj.buffered; }, "prominent_title": function (obj) { return obj.prominent_title; }, "closeable_title": function (obj) { return obj.closeable_title; }, "activity_delta": function (obj) { return obj.activity_delta; }, "hasnext": function (obj) { return obj.hasnext; }, "hideoninactivity": function (obj) { return obj.hideoninactivity; }, "hidebarafter": function (obj) { return obj.hidebarafter; }, "rerecordable": function (obj) { return obj.rerecordable; }, "submittable": function (obj) { return obj.submittable; }, "frameselectionmode": function (obj) { return obj.frameselectionmode; }, "streams": function (obj) { return obj.streams; }, "currentstream": function (obj) { return obj.currentstream; }, "fullscreensupport && !nofullscreen": function (obj) { return obj.fullscreensupport && !obj.nofullscreen; }, "disablepause": function (obj) { return obj.disablepause; }, "disableseeking": function (obj) { return obj.disableseeking; }, "skipseconds": function (obj) { return obj.skipseconds; }, "skipinitial": function (obj) { return obj.skipinitial; }, "showsettingsmenu": function (obj) { return obj.showsettingsmenu; }, "settingsmenu_active": function (obj) { return obj.settingsmenu_active; }, "hidevolumebar": function (obj) { return obj.hidevolumebar; }, "manuallypaused": function (obj) { return obj.manuallypaused; }, "dyntracks": function (obj) { return obj.dyntracks; }, "csstracks || css": function (obj) { return obj.csstracks || obj.css; }, "tracktagssupport || allowtexttrackupload": function (obj) { return obj.tracktagssupport || obj.allowtexttrackupload; }, "trackselectorhovered": function (obj) { return obj.trackselectorhovered; }, "tracktagsstyled": function (obj) { return obj.tracktagsstyled; }, "trackcuetext": function (obj) { return obj.trackcuetext; }, "uploadtexttracksvisible": function (obj) { return obj.uploadtexttracksvisible; }, "acceptedtracktexts": function (obj) { return obj.acceptedtracktexts; }, "uploadlocales": function (obj) { return obj.uploadlocales; }, "dynsettingsmenu": function (obj) { return obj.dynsettingsmenu; }, "tmplsettingsmenu": function (obj) { return obj.tmplsettingsmenu; }, "toggle_settings_menu": function (obj) { return obj.toggle_settings_menu; }, "toggle_share": function (obj) { return obj.toggle_share; }, "dynplaybutton": function (obj) { return obj.dynplaybutton; }, "cssplaybutton || css": function (obj) { return obj.cssplaybutton || obj.css; }, "tmplplaybutton": function (obj) { return obj.tmplplaybutton; }, "playbutton_active": function (obj) { return obj.playbutton_active; }, "trimmingmode": function (obj) { return obj.trimmingmode; }, "showduration": function (obj) { return obj.showduration; }, "dynloader": function (obj) { return obj.dynloader; }, "cssloader || css": function (obj) { return obj.cssloader || obj.css; }, "tmplloader": function (obj) { return obj.tmplloader; }, "loader_active": function (obj) { return obj.loader_active; }, "dynshare": function (obj) { return obj.dynshare; }, "cssshare || css": function (obj) { return obj.cssshare || obj.css; }, "tmplshare": function (obj) { return obj.tmplshare; }, "sharevideourl && sharevideo.length > 0 && share_active": function (obj) { return obj.sharevideourl && obj.sharevideo.length > 0 && obj.share_active; }, "share_active": function (obj) { return obj.share_active; }, "sharevideourl": function (obj) { return obj.sharevideourl; }, "sharevideo": function (obj) { return obj.sharevideo; }, "dynmessage": function (obj) { return obj.dynmessage; }, "cssmessage || css": function (obj) { return obj.cssmessage || obj.css; }, "tmplmessage": function (obj) { return obj.tmplmessage; }, "message_active": function (obj) { return obj.message_active; }, "message": function (obj) { return obj.message; }, "dyntopmessage": function (obj) { return obj.dyntopmessage; }, "csstopmessage || css": function (obj) { return obj.csstopmessage || obj.css; }, "tmpltopmessage": function (obj) { return obj.tmpltopmessage; }, "topmessage": function (obj) { return obj.topmessage; }, "useAspectRatioFallback": function (obj) { return obj.useAspectRatioFallback; }, "aspectRatioFallback": function (obj) { return obj.aspectRatioFallback; }, "with_sidebar && !fullscreened": function (obj) { return obj.with_sidebar && !obj.fullscreened; }, "{flexGrow:1}": function (obj) { return {flexGrow:1}; }, "dynfloatingsidebar": function (obj) { return obj.dynfloatingsidebar; }, "next_active ? '' : title || 'Video Player'": function (obj) { return obj.next_active ? '' : obj.title || 'Video Player'; }, "sidebarSizingStyles": function (obj) { return obj.sidebarSizingStyles; }, "is_floating && floatingoptions.closeable": function (obj) { return obj.is_floating && obj.floatingoptions.closeable; }, "close_floating()": function (obj) { return obj.close_floating(); }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "video-error": "An error occurred, please try again later. Click to retry.",
            "all-settings": "All settings",
            "player-speed": "Player speed",
            "full-screen": "Full screen"
        });
});
Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.State", [
    "base:States.State",
    "base:Events.ListenMixin",
    "base:Objs"
], function(State, ListenMixin, Objs, scoped) {
    return State.extend({
        scoped: scoped
    }, [ListenMixin, {

        dynamics: ["loader"],

        _start: function() {
            this.dyn = this.host.dynamic;
            Objs.iter(Objs.extend({
                "adscontrolbar": false,
                "loader": false,
                "message": false,
                "playbutton": false,
                "controlbar": false
            }, Objs.objectify(this.dynamics)), function(value, key) {
                this.dyn.set(key + "_active", value);
            }, this);
            if (this.dyn.parent()) {
                if (this.dyn.parent().record !== undefined && this.dyn.parent().host !== undefined) {
                    this.dyn._isRecorder = true;
                    this.dyn._recorderDyn = this.dyn.parent();
                    this.dyn._recorderHost = this.dyn._recorderDyn.host;
                }
            }
            this._started();
        },

        _started: function() {},

        play: function() {
            this.dyn.set("autoplay", true);
        },

        uploadTextTrack: function(file, locale) {
            try {
                this.next('TextTrackUploading', {
                    file: file,
                    locale: locale
                });
            } catch (e) {
                console.warn("Error switch to text track uploading state. Message: ", e);
                this.nextPlayer();
            }
        },

        nextPlayer: function() {
            var _recorder = this.dyn.parent();
            if (typeof _recorder.record === 'function')
                _recorder.host.state().next("Player");
            else
                this.next("LoadPlayer");
        },

        nextToChooser: function(message) {
            var _dyn = this.dyn;

            if (!_dyn._isRecorder)
                return false;

            if (typeof _dyn._recorderHost.next === 'function') {
                _dyn._recorderHost.next("FatalError", {
                    message: message,
                    retry: "Chooser"
                });
                // !Don't uncomment will brock host
                // _dyn._recorderDyn.set("player_active", false);
                return true;
            } else
                return false;
        }

    }]);
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.TextTrackUploading", [
    "module:VideoPlayer.Dynamics.PlayerStates.State",
    "browser:Upload.FileUploader",
    "browser:Upload.MultiUploader",
    "browser:Blobs",
    "base:Async",
    "base:Objs"
], function(State, FileUploader, MultiUploader, Blobs, Async, Objs, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        _locals: ["file", "locale"],
        dynamics: ['text-tracks', 'loading'],

        _started: function() {
            this.uploadTextTrackFile(this._file, this._locale);
        },

        uploadTextTrackFile: function(file, locale) {
            var _dynamics, _uploader, _initialTracks, _counter;
            _dynamics = this.dyn.parent();

            // Check either recorder or player dynamics
            if (typeof _dynamics.record !== 'function') {
                _dynamics = this.dyn;
            }
            _initialTracks = _dynamics.get('tracktags');

            // Get file url
            if (_dynamics.get("uploadoptions")) {
                filename = {
                    url: _dynamics.get("uploadoptions").textTracks
                };
            } else {
                filename = {
                    url: "/text-track/" + file.value.split(/(\\|\/)/g).pop() + "/lang/" + locale.lang + "/label/" + locale.label
                };
            }

            try {
                _uploader = FileUploader.create(Objs.extend({
                    source: file,
                    data: {
                        lang: locale.lang,
                        label: locale.label
                    }
                }, filename));
                _uploader.upload();

                _uploader.on("success", function(response) {
                    _counter = 1;
                    _dynamics.set("tracktags", null);
                    Blobs.loadFileIntoString(file).success(function(content) {
                        response = response.length > 0 ? JSON.parse(response) : {
                            lang: locale.lang,
                            label: locale.label
                        };

                        _initialTracks.push({
                            lang: response.lang,
                            label: response.label,
                            kind: "subtitles",
                            enabled: true,
                            content: content
                        });

                        Objs.iter(_initialTracks, function(value) {
                            if (_counter === _initialTracks.length) {
                                _dynamics.set("tracktags", _initialTracks);
                                this.nextPlayer();
                            }
                            _counter++;
                        }, this);

                    }, this);
                }, this);

                _uploader.on("error", function(e) {
                    var bestError = _dynamics.string("uploading-failed");
                    try {
                        e.forEach(function(ee) {
                            for (var key in ee)
                                if (_dynamics.string("upload-error-" + key))
                                    bestError = this.dyn.string("upload-error-" + key);
                        }, this);
                    } catch (err) {}
                    _dynamics.set("player_active", false);
                    this.next("FatalError", {
                        message: bestError,
                        retry: "Player"
                    });
                }, this);

                _uploader.on("progress", function(uploaded, total) {

                }, this);

            } catch (e) {
                console.warn('Error occurred during uploading text track files. Message: ', e);
            }
        }
    });
});


Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.FatalError", [
    "module:VideoPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],
        _locals: ["message"],

        _started: function() {
            this.dyn.set("message", this._message || this.dyn.string("video-error"));
        }

    });
});


Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.Initial", [
    "module:VideoPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            this.dyn.set("imageelement_active", false);
            this.dyn.set("videoelement_active", false);
            // no need activation for the adsposition: mid and post
            this.dyn.set("adsplayer_active", this.dyn.get("adshassource") && !this.dyn.get("delayadsmanagerload"));
            if (this.dyn.get("ready")) {
                this.next("LoadPlayer");
            } else {
                this.listenOn(this.dyn, "change:ready", function() {
                    this.next("LoadPlayer");
                }, this);
                this.listenOn(this.dyn, "error:initialize", function() {
                    this.next("LoadError");
                }, this);
            }
        }
    });
});


Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.LoadPlayer", [
    "module:VideoPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            if (this.dyn.get("outstream")) {
                this.next("Outstream");
            } else {
                this.listenOn(this.dyn, "error:poster", function() {
                    this.next("LoadPlayerDirectly");
                }, this);
                this.listenOn(this.dyn, "image-attached", function() {
                    this.next("PosterReady");
                }, this);
                this.dyn.reattachImage();
            }
        }
    });
});


Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.LoadPlayerDirectly", [
    "module:VideoPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            this.listenOn(this.dyn, "error:attach", function() {
                this.next("LoadError");
            }, this);
            this.listenOn(this.dyn, "error:poster", function() {
                if (!this.dyn.get("states").poster_error.ignore)
                    this.next("PosterError");
            }, this);
            this.listenOn(this.dyn, "attached", function() {
                this.next("PosterReady");
            }, this);
            this.dyn.reattachVideo();
        }

    });
});


Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.LoadError", [
    "module:VideoPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],

        _started: function() {
            this.dyn.set("message", this.dyn.string("video-error"));
            this.listenOn(this.dyn, "message:click", function() {
                this.dyn.trigger("error:reloadplayer");
                this.next("Initial");
            }, this);

        }

    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.PosterReady", [
    "module:VideoPlayer.Dynamics.PlayerStates.State",
    "module:PopupHelper",
    "base:Objs",
    "base:Types",
    "browser:Dom"
], function(State, PopupHelper, Objs, Types, Dom, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["playbutton"],

        _started: function() {
            this.dyn.set("placeholderstyle", "");
            // Will attach video silently without starting playing the video
            if (!this.dyn.get("skipinitial") && this.dyn.get("preload")) {
                this.dyn._attachVideo(true);
            }
            this.dyn.trigger("ready_to_play");
            this.dyn.trigger("loaded");
            this.listenOn(this.dyn, "error:poster", function() {
                if (!this.dyn.get("states").poster_error.ignore && !this.dyn.get("popup"))
                    this.next("PosterError");
            }, this);
            if (this.dyn && this.dyn.get("skipinitial")) this.play();
            else if (this.dyn && this.dyn.get("autoplay")) {
                if (this.dyn.get("autoplaywhenvisible")) {
                    Dom.onScrollIntoView(this.dyn.activeElement(), this.dyn.get("visibilityfraction"), function() {
                        if (!this.destroyed())
                            this.runAutoplay();
                    }, this);
                } else {
                    this.runAutoplay();
                }
            }
        },

        play: function() {
            if (!this.dyn.get("popup")) {
                this.next("LoadAds");
                return;
            }
            var popup = this.auto_destroy(new PopupHelper());
            var dynamic = this.auto_destroy(new this.dyn.cls({
                element: popup.containerInner,
                attrs: Objs.extend(this.dyn.cloneAttrs(), this.dyn.popupAttrs())
            }));
            this._delegatedPlayer = dynamic;
            this.dyn.delegateEvents(null, dynamic);
            popup.on("hide", function() {
                this._delegatedPlayer = null;
                dynamic.destroy();
                popup.destroy();
            }, this);
            popup.show();
            dynamic.activate();
        },

        runAutoplay: function() {
            // If the ready state launches later
            if (Types.is_defined(this.dyn.get("wait-user-interaction"))) {
                if (this.dyn.get("wait-user-interaction")) {
                    this.dyn.once("user-has-interaction", function() {
                        this.play();
                    }, this);
                } else {
                    this.play();
                }
            } else {
                if (!this.dyn.videoAttached()) this.dyn.reattachVideo();
                this.listenOn(this.dyn, "change:wait-user-interaction", function(wait) {
                    if (wait) {
                        this.dyn.once("user-has-interaction", function() {
                            this.play();
                        }, this);
                    } else {
                        this.play();
                    }
                }, this);
            }
        }
    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.Outstream", [
    "module:VideoPlayer.Dynamics.PlayerStates.State",
    "browser:Dom"
], function(State, Dom, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: [],

        _started: function() {
            if (!this.dyn.get("adshassource")) {
                if (typeof this.dyn.activeElement === "function")
                    this.dyn.activeElement().style.setProperty("display", "none");
                if (this.dyn.get("floatingoptions.floatingonly"))
                    this.dyn.execute("close_floating");
                console.warn("Please provide ad source for the outstream");
            }

            this.listenOn(this.dyn.channel("ads"), "adsManagerLoaded", function() {
                if (this.dyn.get("is_floating")) {
                    if (!this.destroyed())
                        this.next("LoadAds", {
                            position: 'outstream'
                        });
                } else {
                    Dom.onScrollIntoView(this.dyn.activeElement(), this.dyn.get("visibilityfraction"), function() {
                        if (!this.destroyed())
                            this.next("LoadAds", {
                                position: 'outstream'
                            });
                    }, this);
                }
            });
        }
    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.LoadAds", [
    "module:VideoPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],
        _locals: ["position"],

        _started: function() {
            if (this.dyn.get("adshassource")) {
                if (this._triggerLoadAds()) {
                    if (!this.dyn.get("adsplayer_active")) this.dyn.set("adsplayer_active", true);
                    this.dyn.channel("ads").trigger("load");
                    this.listenOn(this.dyn.channel("ads"), "contentResumeRequested", function() {
                        if (this.dyn.get("adtagurlfallbacks") && this.dyn.get("adtagurlfallbacks").length > 0) {
                            this.dyn.set("adtagurl", this.dyn.get("adtagurlfallbacks").shift());
                            this.dyn.scopes.adsplayer.execute("requestAds");
                        }
                        this.next(this._nextState());
                    }, this);
                    this.listenOn(this.dyn.channel("ads"), "loaded", function() {
                        this.next(this._nextState());
                    }, this);
                    this.listenOn(this.dyn.channel("ads"), "log", function(event) {
                        if (!event.getAdData().adError || !this.dyn.get("adtagurlfallbacks") || this.dyn.get("adtagurlfallbacks").length === 0) return;
                        this.dyn.set("adtagurl", this.dyn.get("adtagurlfallbacks").shift());
                        this.dyn.brakeAdsManually();
                        if (!this.dyn.get("adsplayer_active")) this.dyn.set("adsplayer_active", true);
                        this.listenOnce(this.dyn.channel("ads"), "adsManagerLoaded", function() {
                            this.next("LoadAds", {
                                position: this._position
                            });
                        }.bind(this));
                        // this.dyn.scopes.adsplayer.execute("reload");
                    }, this);
                    this.listenOn(this.dyn.channel("ads"), "ad-error", function() {
                        if (this.dyn.get("adtagurlfallbacks") && this.dyn.get("adtagurlfallbacks").length > 0) {
                            this.dyn.set("adtagurl", this.dyn.get("adtagurlfallbacks").shift());
                            this.dyn.scopes.adsplayer.execute("requestAds");
                        } else this.next(this._nextState());
                    }, this);
                } else {
                    this.next("LoadVideo");
                }
            } else this.next(this._nextState());
        },

        _nextState: function() {
            if (this._position && this._position === 'outstream')
                return "PlayOutstream";
            if (this._position && this._position === 'mid')
                return "PlayVideo";
            return "LoadVideo";
        },

        _triggerLoadAds: function() {
            if (
                typeof this._position !== "undefined" && (
                    this._position === 'outstream' || this._position === 'mid' || this._position === 'pre'
                )
            ) {
                return true;
            }

            // if skip initial and no autoplay should load video
            return !this.dyn.get("delayadsmanagerload");
        }
    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.PlayOutstream", [
    "module:VideoPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["adscontrolbar"],

        _started: function() {
            this.dyn._outstreamCompleted = false;
            if (this.dyn.get("sticky") && this.dyn.stickyHandler) this.dyn.stickyHandler.start();

            this.dyn.channel("ads").trigger("outstreamStarted", this.dyn);

            this.listenOn(this.dyn.channel("ads"), "allAdsCompleted", function() {
                this.afterAdCompleted();
            }, this);

            this.listenOn(this.dyn.channel("ads"), "ad-error", function(message) {
                console.log("Error on loading ad. Details: ", message);
            }, this);

            /* if this trigger before allAdsCompleted, setTimeout error shows in console
            // In case, if ad contains nonLinear and requests to resume playing the content
            this.listenOn(this.dyn.channel("ads"), "contentResumeRequested", function() {
                this.afterAdCompleted();
            }, this);*/
        },

        afterAdCompleted: function() {
            if (!this.dyn || this.dyn._outstreamCompleted)
                return;
            this.dyn._outstreamCompleted = true;
            this.dyn.trigger("outstream-completed");
            // Somehow below code is running even this.dyn is undefined and this states checked in the above statement
            if (this.dyn) this.dyn.channel("ads").trigger("outstreamCompleted", this.dyn);
        }
    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.ReloadAds", [
    "module:VideoPlayer.Dynamics.PlayerStates.State",
    "base:Timers.Timer"
], function(State, Timer, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        _started: function() {
            if (this.dyn.get("adshassource") && (this.dyn.get("vmapads") || this.dyn.get("adsplaypostroll"))) {
                // if VAST/VMAP has postroll which was already loaded in advance, so no need for reset
                // In case if we want to launch it manually via settings "adsposition: 'post'" or after re-attach on playlist,
                // then we need reset ads manager and wait for adsManager Loaded
                if (this.dyn.get("adsplaypostroll")) {
                    if (this.dyn.get("adsplayer_active"))
                        this.dyn.set("adsplayer_active", false);
                    this.dyn.set("adsplayer_active", true);
                } else {
                    // if adsManager do not load within 1 second will forward to the NextVideo state
                    this.auto_destroy(new Timer({
                        context: this,
                        fire: function() {
                            if (this.next) this.next("NextVideo");
                        },
                        delay: 1000,
                        immediate: true
                    }));
                }
                if (this.dyn) {
                    this.listenOn(this.dyn.channel("ads"), "adsManagerLoaded", function() {
                        this.next("LoadAds", {
                            position: 'post'
                        });
                    });
                    this.listenOn(this.dyn.channel("ads"), "ad-error", function() {
                        this.next("NextVideo");
                    });
                }
            } else {
                this.next("NextVideo");
            }
        }
    });

});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.PosterError", [
    "module:VideoPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],

        _started: function() {
            this.dyn.set("message", this.dyn.string("video-error"));
            this.listenOn(this.dyn, "message:click", function() {
                this.next(this.dyn.get("states").poster_error.click_play ? "LoadVideo" : "LoadPlayer");
            }, this);
        }

    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.LoadVideo", [
    "module:VideoPlayer.Dynamics.PlayerStates.State",
    "browser:Info",
    "browser:Dom",
    "base:Timers.Timer"
], function(State, Info, Dom, Timer, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            this.listenOn(this.dyn.channel("ads"), "contentPauseRequested", function() {
                this.next("PrerollAd");
            }, this);
            this.dyn.set("hasnext", this.dyn.get("loop") || this.dyn.get("loopall") || this.dyn.get("playlist") && this.dyn.get("current_video_index_from_playlist") !== (this.dyn.get("playlist").length - 1));
            if (!this.dyn.get("videoelement_active")) {
                this.listenOn(this.dyn, "error:attach", function() {
                    this.next("LoadError");
                }, this);
                this.listenOn(this.dyn, "error:poster", function() {
                    if (!this.dyn.get("states").poster_error.ignore)
                        this.next("PosterError");
                }, this);
                this.listenOn(this.dyn, "attached", function() {
                    this.__loadVideo();
                }, this);
                this.dyn.reattachVideo();
            } else
                this.__loadVideo();
        },

        __loadVideo: function() {
            this.listenOn(this.dyn, "error:video", function() {
                this.next("ErrorVideo");
            }, this);
            this.listenOn(this.dyn, "playing", function() {
                if (this.destroyed() || this.dyn.destroyed())
                    return;
                if (this.dyn.get("autoseek"))
                    this.dyn.execute("seek", this.dyn.get("autoseek"));
                this.next("PlayVideo");
            }, this);
            if (this.dyn.get("skipinitial") && !this.dyn.get("autoplay")) {
                this.next("PlayVideo");
            } else {
                var counter = 10;
                this.__started = false;
                this.auto_destroy(new Timer({
                    context: this,
                    fire: function() {
                        if (!this.destroyed() && !this.dyn.destroyed() && this.dyn.player && !this.__started) {
                            this.dyn.player.play();
                            this.__started = true;
                        }
                        counter--;
                        if (counter === 0) this.next("PlayVideo");
                    },
                    delay: 200,
                    immediate: true
                }));
            }
        }
    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.ErrorVideo", [
    "module:VideoPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],

        _started: function() {
            this.dyn.set("message", this.dyn.string("video-error"));
            this.listenOn(this.dyn, "message:click", function() {
                if (!this.nextToChooser(this.dyn.get("message")))
                    this.next("LoadVideo");
            }, this);
        }
    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.PlayVideo", [
    "module:VideoPlayer.Dynamics.PlayerStates.State",
    "base:Objs",
    "base:Timers.Timer"
], function(State, Objs, Timer, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["controlbar"],

        _started: function() {
            this.dyn.set("autoplay", false);
            if (this.dyn.get("adshassource")) {
                // As during a loop, we will play player after ended event fire, need initial cover will be hidden
                this.listenOn(this.dyn.channel("ads"), "contentPauseRequested", function() {
                    this.dyn.pause();
                    var position = this.dyn.getCurrentPosition();
                    if (position === 0) {
                        this.next("PrerollAd");
                    } else {
                        if (Math.abs(this.dyn.getCurrentPosition() - this.dyn.get("duration")) < 0.1) {
                            this.next("PostrollAd");
                        } else this.next("MidrollAd");
                    }
                }, this);

                this.listenOn(this.dyn, "playnextmidroll", function() {
                    if (!this.dyn.get("adsplayer_active")) {
                        this.dyn.set("adsplayer_active", true);
                    }
                    // INFO: could be improved via using reset, but currently it's providing some console errors on reset execution
                    // this.next("ReloadAds", { hard: true });
                    this.listenOnce(this.dyn.channel("ads"), "adsManagerLoaded", function() {
                        this.next("LoadAds", {
                            position: 'mid'
                        });
                    });
                }, this);
            }
            if (this.dyn.get("loop"))
                this.dyn.set("skipinitial", true);
            this.listenOn(this.dyn, "change:currentstream", function() {
                this.dyn.set("autoplay", true);
                this.dyn.set("autoseek", this.dyn.player.position());
                this.dyn.reattachVideo();
                this.next("LoadPlayer");
            }, this);
            this.listenOn(this.dyn, "play_next", function() {
                this.next("NextVideo");
            }, this);
            this.listenOn(this.dyn, "ended", function() {
                if (!this.dyn) return;
                this.dyn.set("autoseek", null);
                this.dyn.channel("ads").trigger("contentComplete");
                // waiting a bit for postroll
                this.auto_destroy(new Timer({
                    once: true,
                    fire: function() {
                        this.next("ReloadAds"); // << if no adshassource, redirect to the NextVideo
                    }.bind(this),
                    delay: 50
                }));
            }, this);
            this.listenOn(this.dyn, "change:buffering", function() {
                this.dyn.set("loader_active", this.dyn.get("buffering"));
            }, this);
            this.listenOn(this.dyn, "error:video", function() {
                this.next("ErrorVideo");
            }, this);
        },

        play: function() {
            if (this.dyn.get("preloadadsmanager") && this.dyn.get("position") === 0) {
                // w/o position === 0 condition player will reload on toggle player
                this.next("LoadAds", {
                    position: 'pre'
                });
            } else {
                this.dyn.player.play();
            }
        }
    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.PlayAd", [
    "module:VideoPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            dynamics: ["adscontrolbar"],

            _started: function() {
                if (this.state_name() === "PlayAd")
                    throw Error("PlayAd should be an abstract state.");
                this.dyn.set("playing_ad", true);
                this.listenOn(this.dyn, "playing", function() {
                    this.dyn.player.pause();
                }, this);
                this.listenOn(this.dyn.channel("ads"), "log", function(event) {
                    if (!event.getAdData().adError || !this.dyn.get("adtagurlfallbacks") || this.dyn.get("adtagurlfallbacks").length === 0) return;
                    this.dyn.set("adtagurl", this.dyn.get("adtagurlfallbacks").shift());
                    this.dyn.brakeAdsManually();
                    if (!this.dyn.get("adsplayer_active")) this.dyn.set("adsplayer_active", true);
                    this.listenOnce(this.dyn.channel("ads"), "adsManagerLoaded", function() {
                        this.next("LoadAds", {
                            position: this._position
                        });
                    }.bind(this));
                    // this.dyn.scopes.adsplayer.execute("reload");
                }, this);
                this.listenOn(this.dyn.channel("ads"), "ad-error", function() {
                    if (!this.dyn.get("adtagurlfallbacks") || this.dyn.get("adtagurlfallbacks").length === 0) return this.resume();
                    this.dyn.set("adtagurl", this.dyn.get("adtagurlfallbacks").shift());
                    if (this.dyn && this.dyn.player) this.dyn.player.play();
                    this.dyn.brakeAdsManually();
                    if (!this.dyn.get("adsplayer_active")) this.dyn.set("adsplayer_active", true);
                    this.listenOnce(this.dyn.channel("ads"), "adsManagerLoaded", function() {
                        this.next("LoadAds", {
                            position: this._position
                        });
                    }.bind(this));
                    // this.dyn.scopes.adsplayer.execute("reload");
                    // this.next("PlayVideo");
                }, this);
                this.listenOn(this.dyn.channel("ads"), "contentResumeRequested", function() {
                    this.resume();
                }, this);
            },

            resume: function() {
                if (this.dyn && this.dyn.player)
                    this.dyn.player.play();
                this.next("PlayVideo");
            },

            next: function(state) {
                this.dyn.set("playing_ad", false);
                inherited.next.call(this, state);
            }
        };
    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.PrerollAd", [
    "module:VideoPlayer.Dynamics.PlayerStates.PlayAd"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, function(inherited) {
        return {
            _started: function() {
                if (this.dyn.get("sticky") && this.dyn.stickyHandler)
                    this.dyn.stickyHandler.start();
                inherited._started.call(this);
            }
        };
    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.MidrollAd", [
    "module:VideoPlayer.Dynamics.PlayerStates.PlayAd"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.PostrollAd", [
    "module:VideoPlayer.Dynamics.PlayerStates.PlayAd"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {
        resume: function() {
            this.next("NextVideo");
        }
    });
});

Scoped.define("module:VideoPlayer.Dynamics.PlayerStates.NextVideo", [
    "module:VideoPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        _started: function() {
            this.dyn.set("autoplay", this.dyn.get("continuousplayback"));
            this.dyn.set("playbackcount", this.dyn.get("playbackcount") + 1);
            if (this.dyn.get("playlist") && this.dyn.get("playlist").length > 0) {
                this.dyn.set("passed-quarter", 0);
                this.dyn.set("played-seconds", 0);
                this.dyn.set("last-played-position", 0);

                var currentIndex = this.dyn.get("current_video_from_playlist");
                var nextIndex = this.dyn.get("next_video_from_playlist");
                if (currentIndex === nextIndex) this.dyn.set("next_video_from_playlist", ++nextIndex);
                nextIndex = nextIndex % this.dyn.get("playlist").length;
                this.dyn.set("next_video_from_playlist", nextIndex);

                this.dyn.set("lastplaylistitem", this.dyn.get("current_video_from_playlist") === (this.dyn.get("playlist").length - 1));
                this.dyn.set("hasnext", this.dyn.get("loop") || this.dyn.get("loopall") || !this.dyn.get("lastplaylistitem"));

                var nextVideo = this.dyn.get("playlist")[nextIndex];
                this.dyn.set("current_video_from_playlist", nextIndex);
                this.dyn.setAll(nextVideo);

                if (this.dyn.get("lastplaylistitem")) {
                    if (this.dyn.get("next_video_from_playlist") === 0) this.dyn.set("autoplay", this.dyn.get("loop"));
                    this.dyn.trigger("last-playlist-item");
                }
                return this._playNext(nextVideo);
            } else {
                // If a user set loopall as true, a single video also be played
                if (this.dyn.get("loopall")) {
                    this.dyn.set("loop", true);
                    this.dyn.set("autoplay", true);
                    this.dyn.reattachVideo();
                }
            }

            if (this.dyn.get("autoplay") && this.dyn.get("adshassource")) {
                return this.__resetAdPlayer();
            }
            this.next("PosterReady");
        },

        /**
         * Will start autoplay the next play list element
         * @param {object} pl
         * @private
         */
        _playNext: function(pl) {
            this.dyn.trigger("playlist-next", pl);
            if (this.dyn.get("adshassource")) {
                this.__resetAdPlayer(true);
            } else {
                this.next("LoadPlayerDirectly");
            }
        },

        __resetAdPlayer: function(reattach) {
            reattach = reattach || false;
            this.dyn.initAdSources();
            this.dyn.brakeAdsManually(true);
            this.dyn.set("adsplayer_active", true);
            if (reattach) {
                this.dyn.reattachVideo();
            }
            // On reply currentTime not reset and cause confusion defining AdsRollPosition
            if (this.dyn.player && this.dyn.player._element)
                this.dyn.player._element.currentTime = 0.00;
            this.next("LoadAds");
        }
    });
});
Scoped.define("module:VideoPlayer.Dynamics.Share", [
    "dynamics:Dynamic",
    "module:Assets"
], function(Class, Assets, scoped) {

    var SHARES = {
        facebook: 'https://facebook.com/sharer/sharer.php?u=',
        gplus: 'https://plus.google.com/share?url=',
        linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=',
        twitter: 'https://twitter.com/intent/tweet?text='
    };

    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<div class=\"{{cssplayer}}-share-action-container\">\n    <div class=\"{{cssplayer}}-toggle-share-container\">\n        <div class=\"{{cssplayer}}-button-inner\" onclick=\"{{toggleShare()}}\">\n            <i class=\"{{csscommon}}-icon-share\"></i>\n        </div>\n    </div>\n    <div class=\"{{cssplayer}}-social-buttons-container\">\n        <ul class=\"{{cssplayer}}-socials-list\" ba-repeat=\"{{share :: shares}}\">\n            <li class=\"{{cssplayer}}-single-social\">\n                <div class=\"{{cssplayer}}-button-inner\">\n                    <i class=\"{{csscommon}}-icon-{{share}}\" onclick=\"{{shareMedia(share)}}\"></i>\n                </div>\n            </li>\n        </ul>\n    </div>\n</div>\n",

                attrs: {
                    css: "ba-videoplayer",
                    csscommon: "ba-commoncss",
                    cssplayer: "ba-player",
                    url: "",
                    shares: []
                },

                functions: {

                    shareMedia: function(share) {
                        window.open(SHARES[share] + this.get("url"), 'pop', 'width=600 height=400');
                    },

                    toggleShare: function() {
                        /*
                        var container = this.activeElement().querySelector().firstElementChild;
                        container.style.right = container.style.right ? "" : "-45px";
                        */
                    }

                }
            };
        }).register("ba-videoplayer-share")
        .registerFunctions({
            /**/"cssplayer": function (obj) { return obj.cssplayer; }, "toggleShare()": function (obj) { return obj.toggleShare(); }, "csscommon": function (obj) { return obj.csscommon; }, "shares": function (obj) { return obj.shares; }, "share": function (obj) { return obj.share; }, "shareMedia(share)": function (obj) { return obj.shareMedia(obj.share); }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "share": "Share media"
        });
});
Scoped.define("module:VideoPlayer.Dynamics.Topmessage", [
    "dynamics:Dynamic"
], function(Class, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{css}}-topmessage-container\">\n    <div class='{{css}}-topmessage-background'>\n    </div>\n    <div data-selector=\"topmessage-message-block\" class='{{css}}-topmessage-message'>\n        {{topmessage}}\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-videoplayer",
                    "csscommon": "ba-commoncss",
                    "cssplayer": "ba-player",
                    "topmessage": ''
                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "topmessage": function (obj) { return obj.topmessage; }/**/
        })
        .register("ba-videoplayer-topmessage");
});
Scoped.define("module:VideoPlayer.Dynamics.Tracks", [
    "dynamics:Dynamic",
    "base:Objs",
    "base:Async",
    "module:Assets"
], [
    "dynamics:Partials.ClickPartial",
    "dynamics:Partials.RepeatElementPartial"
], function(Class, Objs, Async, Assets, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<div data-selector=\"text-tracks-overlay\"\n     class=\"{{cssplayer}}-text-tracks-overlay\n     {{activitydelta > hidebarafter && hideoninactivity ? (cssplayer + '-track-dashboard-hidden') : ''}}\n\">\n\n    <div data-selector=\"cue-content\" ba-show=\"{{tracktagsstyled && trackcuetext}}\" class=\"{{cssplayer}}-cue-content\">\n        {{trackcuetext}}\n    </div>\n    <div class=\"{{csscommon}}-options-popup {{csscommon}}-options-list-{{tracksshowselection || trackselectorhovered ? 'visible' : 'hidden'}}\">\n        <div ba-show=\"{{tracksshowselection || trackselectorhovered}}\" tabindex=\"-1\"\n             onmouseenter=\"{{hover_cc(domEvent, true)}}\" onmouseover=\"{{hover_cc(domEvent, true)}}\" onmouseleave=\"{{hover_cc(domEvent, false)}}\"\n        >\n            <div data-selector=\"tracks-selector-list\"\n                 class=\"{{csscommon}}-initial-options-list {{csscommon}}-tracks-selector-list {{csscommon}}-options-list-visible {{csscommon}}-options-list\"\n                 ba-if=\"{{tracktags}}\"\n            >\n                <div ba-repeat-element=\"{{track :: tracktags}}\"\n                     class=\"{{csscommon}}-tracks-selector {{csscommon}}-options-list-item\"\n                     ba-click=\"{{select_track(track)}}\"\n                     ba-show=\"{{track.label && texttrackslength > 1}}\"\n                >\n                    <div class=\"{{csscommon}}-inner-text\">\n                        {{track.label}}\n                    </div>\n                </div>\n                <div data-selector=\"text-tracks-open-form-button\"\n                     class=\"{{csscommon}}-options-list-item {{csscommon}}-open-next\"\n                     ba-if=\"{{allowtexttrackupload}}\" title=\"{{string('upload-text-tracks')}}\"\n                     onclick=\"{{move_to_option(domEvent, 'text-tracks-uploader-form')}}\"\n                >\n                    <div class=\"{{csscommon}}-inner-text\">{{string('upload-text-tracks')}}</div>\n                    <div class=\"{{csscommon}}-inner-icon\"></div>\n                </div>\n            </div>\n\n            <div data-selector=\"text-tracks-uploader-form\"\n                 class=\"{{csscommon}}-options-list-hidden {{csscommon}}-options-list {{csscommon}}-text-tracks-uploader-form\"\n                 ba-if=\"{{allowtexttrackupload}}\"\n            >\n                <div class=\"{{csscommon}}-full-width {{csscommon}}-options-list-item\">\n                    <div data-selector=\"close-text-tracks-upload-form\"\n                         title=\"{{string('back')}}\"\n                         class=\"{{csscommon}}-open-previous {{csscommon}}-text-left\"\n                         onclick=\"{{move_to_option(domEvent)}}\"\n                    >\n                        <div class=\"{{csscommon}}-inner-icon\"></div>\n                        <div class=\"{{csscommon}}-inner-text\">{{string('back')}}</div>\n                    </div>\n                </div>\n\n                <div class=\"{{csscommon}}-full-width {{csscommon}}-options-list-item\">\n                    <form class=\"{{csscommon}}-form {{csscommon}}-text-tracks-upload-form\">\n                        <div class=\"{{csscommon}}-form-input {{csscommon}}-select-field {{csscommon}}-direction-pointer\">\n                            <select data-selector=\"select-text-tracks-label\" tabindex=\"-1\"\n                                    class=\"{{csscommon}}-form-input {{csscommon}}-text-tracks-label-input\"\n                                    name=\"{{csscommon}}-text-tracks-label-select\"\n                                    onmousedown=\"{{prevent_un_hover(domEvent)}}\"\n                                    onmousemove=\"{{prevent_un_hover(domEvent)}}\"\n                                    onchange=\"{{selected_label_value(domEvent)}}\"\n                            >\n                                <option disabled value selected>\n                                    {{string('select-text-track-language')}}\n                                </option>\n                                <option ba-repeat-element=\"{{locale :: uploadlocales}}\" value=\"{{locale.lang}}\">\n                                    {{locale.label}}\n                                </option>\n                            </select>\n                        </div>\n                        <div class=\"{{csscommon}}-form-input {{csscommon}}-button\" ba-show=\"{{chosenoption}}\">\n                            <input type=\"file\" data-selector=\"select-text-tracks-file\"\n                                   title=\"{{chosenoption ? string('select-text-track-file') : string('info-select-locale-first')}}\"\n                                   onchange=\"{{upload_text_track(domEvent)}}\"\n                                   class=\"{{csscommon}}-text-tracks-file\"\n                                   accept=\"{{acceptedtracktexts}}\"\n                            />\n                            {{chosenoption ? string('select-text-track-file') : string('info-select-locale-first')}}\n                        </div>\n                    </form>\n                </div>\n            </div>\n        </div>\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-videoplayer",
                    "csscommon": "ba-commoncss",
                    "cssplayer": "ba-player",
                    "trackcuetext": null,
                    "acceptedtracktexts": "text/vtt,application/ttml+xml,type/subtype",
                    "trackselectorhovered": false,
                    "texttrackslength": 0,
                    "uploadtexttracksvisible": false,
                    "uploadlocales": [],
                    "chosenoption": null
                },

                create: function() {
                    Objs.iter(this.get("tracktags"), function(subtitle) {
                        if (subtitle.kind === "subtitles") {
                            this.set("texttrackslength", this.get("texttrackslength") + 1);
                        }
                    }, this);
                },

                functions: {
                    select_track: function(track) {
                        this.parent().set("trackselectorhovered", false);
                        this.parent().trigger("switch-track", track);
                    },

                    hover_cc: function(ev, hover) {
                        // Not show CC on hover during settings block is open
                        if (this.parent().get("settingsmenu_active")) return;

                        // Don't lose focus on clicking move between sliders
                        // After if element has an focus not close it till next mouseover/mouseleave
                        if (!hover && ev[0].target === document.activeElement) {
                            Async.eventually(function() {
                                ev[0].target.blur();
                            }, this, 500);
                            return;
                        }

                        // Show or hide overlay element on mouse out
                        return this.parent().set("trackselectorhovered", hover);
                    },

                    prevent_un_hover: function(ev) {
                        ev[0].target.blur();
                        var _parentSelector, _parentElement;
                        _parentSelector = "." + this.parent().get('csscommon') + '-options-popup';
                        _parentElement = document.querySelector(_parentSelector);
                        if (_parentElement)
                            _parentElement.focus();
                        return this.parent().set("trackselectorhovered", true);
                    },

                    selected_label_value: function(select) {
                        var _options, _chosen;
                        _options = select[0].target.options;
                        _chosen = _options[_options.selectedIndex];

                        if (_chosen.value) {
                            this.set("chosenoption", {
                                lang: _chosen.value,
                                label: _chosen.text
                            });
                        } else {
                            this.set("chosenoption", null);
                        }
                    },

                    upload_text_track: function(domEvent) {
                        if (this.get('chosenoption'))
                            this.trigger("upload-text-tracks", domEvent[0].target, this.get('chosenoption'));
                        else {
                            console.warn('can not send empty label');
                        }
                    },

                    move_to_option: function(domEvent, classSelector) {
                        this.trigger("move_to_option", domEvent[0].target, classSelector);
                    }
                }
            };
        })
        .register("ba-videoplayer-tracks")
        .registerFunctions({
            /**/"cssplayer": function (obj) { return obj.cssplayer; }, "activitydelta > hidebarafter && hideoninactivity ? (cssplayer + '-track-dashboard-hidden') : ''": function (obj) { return obj.activitydelta > obj.hidebarafter && obj.hideoninactivity ? (obj.cssplayer + '-track-dashboard-hidden') : ''; }, "tracktagsstyled && trackcuetext": function (obj) { return obj.tracktagsstyled && obj.trackcuetext; }, "trackcuetext": function (obj) { return obj.trackcuetext; }, "csscommon": function (obj) { return obj.csscommon; }, "tracksshowselection || trackselectorhovered ? 'visible' : 'hidden'": function (obj) { return obj.tracksshowselection || obj.trackselectorhovered ? 'visible' : 'hidden'; }, "tracksshowselection || trackselectorhovered": function (obj) { return obj.tracksshowselection || obj.trackselectorhovered; }, "hover_cc(domEvent, true)": function (obj) { return obj.hover_cc(obj.domEvent, true); }, "hover_cc(domEvent, false)": function (obj) { return obj.hover_cc(obj.domEvent, false); }, "tracktags": function (obj) { return obj.tracktags; }, "select_track(track)": function (obj) { return obj.select_track(obj.track); }, "track.label && texttrackslength > 1": function (obj) { return obj.track.label && obj.texttrackslength > 1; }, "track.label": function (obj) { return obj.track.label; }, "allowtexttrackupload": function (obj) { return obj.allowtexttrackupload; }, "string('upload-text-tracks')": function (obj) { return obj.string('upload-text-tracks'); }, "move_to_option(domEvent, 'text-tracks-uploader-form')": function (obj) { return obj.move_to_option(obj.domEvent, 'text-tracks-uploader-form'); }, "string('back')": function (obj) { return obj.string('back'); }, "move_to_option(domEvent)": function (obj) { return obj.move_to_option(obj.domEvent); }, "prevent_un_hover(domEvent)": function (obj) { return obj.prevent_un_hover(obj.domEvent); }, "selected_label_value(domEvent)": function (obj) { return obj.selected_label_value(obj.domEvent); }, "string('select-text-track-language')": function (obj) { return obj.string('select-text-track-language'); }, "uploadlocales": function (obj) { return obj.uploadlocales; }, "locale.lang": function (obj) { return obj.locale.lang; }, "locale.label": function (obj) { return obj.locale.label; }, "chosenoption": function (obj) { return obj.chosenoption; }, "chosenoption ? string('select-text-track-file') : string('info-select-locale-first')": function (obj) { return obj.chosenoption ? obj.string('select-text-track-file') : obj.string('info-select-locale-first'); }, "upload_text_track(domEvent)": function (obj) { return obj.upload_text_track(obj.domEvent); }, "acceptedtracktexts": function (obj) { return obj.acceptedtracktexts; }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "upload-text-tracks": "Upload track text files",
            "select-text-track-language": "Subtitle Language",
            "info-select-locale-first": "First select locale",
            "select-text-track-file": "Click to select file",
            "back": "back"
        });
});
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

                template: "<div class=\"{{css}}-chooser-container\">\n\t<div ba-if=\"{{initialmessages.length > 0}}\" class=\"{{csscommon}}-message-container\">\n\t\t<ul ba-repeat=\"{{initialmessage :: initialmessages}}\">\n\t\t\t<li ba-if=\"{{initialmessage.message}}\"\n\t\t\t\tclass=\"{{csscommon}}-message-text {{csscommon}}-message-{{initialmessage.type ? initialmessage.type : 'default'}}\"\n\t\t\t>\n\t\t\t\t{{ initialmessage.message }}\n\t\t\t\t<span ba-if=\"{{initialmessage.id}}\"\n\t\t\t\t\t  class=\"{{csscommon}}-action-button\"\n\t\t\t\t\t  ba-click=\"close_message(initialmessage.id)\"\n\t\t\t\t>\n\t\t\t\t\t<i class=\"{{csscommon}}-icon-cancel\"></i>\n\t\t\t\t</span>\n\t\t\t</li>\n\t\t</ul>\n\t</div>\n\t<div class=\"{{css}}-chooser-button-container\">\n\t\t<div ba-repeat=\"{{action :: actions}}\">\n\t\t\t<div ba-hotkey:space^enter=\"{{click_action(action)}}\" onmouseout=\"this.blur()\"\n\t\t\t\t tabindex=\"0\" class=\"{{css}}-chooser-button-{{action.index}}\"\n\t\t\t     ba-click=\"{{click_action(action)}}\"\n\t\t\t>\n\t\t\t\t<input ba-if=\"{{action.select && action.capture}}\"\n\t\t\t\t\t   type=\"file\"\n\t\t\t\t\t   class=\"{{css}}-chooser-file\"\n\t\t\t\t\t   onchange=\"{{select_file_action(action, domEvent)}}\"\n\t\t\t\t\t   onclick=\"this.value=''\"\n\t\t\t\t\t   accept=\"{{action.accept}}\"\n\t\t\t\t\t   capture=\"{{action.switchcamera}}\" />\n\t\t\t\t<input ba-if=\"{{action.select && !action.capture}}\"\n\t\t\t\t\t   type=\"file\"\n\t\t\t\t\t   class=\"{{css}}-chooser-file\"\n\t\t\t\t\t   onchange=\"{{select_file_action(action, domEvent)}}\"\n\t\t\t\t\t   accept=\"{{action.accept}}\"\n\t\t\t\t\t   />\n\t\t\t\t<i class=\"{{csscommon}}-icon-{{action.icon}}\"\n\t\t\t\t   ba-if=\"{{action.icon}}\"></i>\n\t\t\t\t<span>\n\t\t\t\t\t{{action.label}}\n\t\t\t\t</span>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n",

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
            /**/"css": function (obj) { return obj.css; }, "initialmessages.length > 0": function (obj) { return obj.initialmessages.length > 0; }, "csscommon": function (obj) { return obj.csscommon; }, "initialmessages": function (obj) { return obj.initialmessages; }, "initialmessage.message": function (obj) { return obj.initialmessage.message; }, "initialmessage.type ? initialmessage.type : 'default'": function (obj) { return obj.initialmessage.type ? obj.initialmessage.type : 'default'; }, "initialmessage.id": function (obj) { return obj.initialmessage.id; }, "actions": function (obj) { return obj.actions; }, "click_action(action)": function (obj) { return obj.click_action(obj.action); }, "action.index": function (obj) { return obj.action.index; }, "action.select && action.capture": function (obj) { return obj.action.select && obj.action.capture; }, "select_file_action(action, domEvent)": function (obj) { return obj.select_file_action(obj.action, obj.domEvent); }, "action.accept": function (obj) { return obj.action.accept; }, "action.switchcamera": function (obj) { return obj.action.switchcamera; }, "action.select && !action.capture": function (obj) { return obj.action.select && !obj.action.capture; }, "action.icon": function (obj) { return obj.action.icon; }, "action.label": function (obj) { return obj.action.label; }/**/
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

                template: "<div class=\"{{css}}-dashboard\">\n\t<div class=\"{{css}}-backbar\"></div>\n\t<div data-selector=\"recorder-settings\" class=\"{{css}}-settings\" ba-show=\"{{settingsvisible && settingsopen}}\">\n\t\t<div class=\"{{css}}-settings-backbar\"></div>\n\t\t<div data-selector=\"settings-list-front\" class=\"{{css}}-settings-front\">\n\t\t\t<ul data-selector=\"add-new-stream\" ba-if=\"{{videoselectnotification}}\">\n\t\t\t\t<li>\n\t\t\t\t\t<div data-selector=\"single-camera-stream\">\n\t\t\t\t\t\t<i class=\"ba-commoncss-icon-plus\"></i> {{string('add-stream')}}\n\t\t\t\t\t</div>\n\t\t\t\t</li>\n\t\t\t\t<li>\n\t\t\t\t\t<div data-selector=\"single-camera-stream\" class=\"{{csscommon}}-text-error\">\n\t\t\t\t\t\t{{videoselectnotification}}\n\t\t\t\t\t</div>\n\t\t\t\t</li>\n\t\t\t</ul>\n\t\t\t<ul data-selector=\"add-new-stream\" ba-show=\"{{showaddstreambutton && firefox && allowscreen}}\">\n                <li>\n                    <div data-selector=\"single-camera-stream\"\n                         class=\"{{css}}-add-stream\"\n                         onclick=\"{{addNewStream()}}\"\n                         onmouseenter=\"{{hover(string('add-stream'))}}\"\n                    >\n                        <i class=\"{{csscommon}}-icon-plus\"></i> {{string('add-stream')}}\n                    </div>\n                </li>\n\t\t\t</ul>\n\n\t\t\t<ul data-selector=\"add-new-stream\" ba-show=\"{{showaddstreambutton && !firefox && !videoselectnotification}}\" ba-repeat=\"{{camera :: cameras}}\">\n\t\t\t\t<li ba-show=\"{{(camera.id !== selectedcamera) || allowscreen}}\">\n\t\t\t\t\t<div data-selector=\"single-camera-stream\"\n\t\t\t\t\t\t class=\"{{css}}-add-stream\"\n\t\t\t\t\t\t onclick=\"{{addNewStream(camera.id)}}\"\n\t\t\t\t\t\t onmouseenter=\"{{hover(string('add-stream'))}}\"\n\t\t\t\t\t>\n\t\t\t\t\t\t<i class=\"{{csscommon}}-icon-plus\"></i> {{camera.label}}\n\t\t\t\t\t</div>\n\t\t\t\t</li>\n\n\t\t\t</ul>\n\t\t\t<hr ba-show=\"{{(showaddstreambutton && !firefox) || (firefox && allowscreen)}}\"/>\n\t\t\t<ul data-selector=\"camera-settings\" ba-repeat=\"{{camera :: cameras}}\" ba-show=\"{{!novideo && !allowscreen && !ismobile}}\">\n\t\t\t\t<li onmouseenter=\"{{hover(string('select-camera'))}}\">\n\t\t\t\t\t<input tabindex=\"0\"\n\t\t\t\t\t\t   ba-hotkey:space^enter=\"{{selectCamera(camera.id)}}\" onmouseout=\"this.blur()\"\n\t\t\t\t\t\t   type='radio' name='camera' value=\"{{selectedcamera == camera.id}}\"\n\t\t\t\t\t\t   onclick=\"{{selectCamera(camera.id)}}\"\n\t\t\t\t\t/>\n\t\t\t\t\t<span></span>\n\t\t\t\t\t<label tabindex=\"0\"\n\t\t\t\t\t\t   ba-hotkey:space^enter=\"{{selectCamera(camera.id)}}\" onmouseout=\"this.blur()\"\n\t\t\t\t\t\t   onclick=\"{{selectCamera(camera.id)}}\"\n\t\t\t\t\t>\n\t\t\t\t\t\t{{camera.label}}\n\t\t\t\t\t</label>\n\t\t\t\t </li>\n\t\t\t</ul>\n\t\t\t<hr ba-show=\"{{(!noaudio && !novideo) || !allowscreen}}\"/>\n\t\t\t<ul data-selector=\"microphone-settings\" ba-repeat=\"{{microphone :: microphones}}\" ba-show=\"{{!noaudio && !allowscreen}}\">\n\t\t\t\t<li tabindex=\"0\"\n\t\t\t\t\tba-hotkey:space^enter=\"{{selectMicrophone(microphone.id)}}\" onmouseout=\"this.blur()\"\n\t\t\t\t\tonmouseenter=\"{{hover(string('select-audio-input'))}}\"\n\t\t\t\t\tonclick=\"{{selectMicrophone(microphone.id)}}\"\n\t\t\t\t>\n\t\t\t\t\t<input type='radio' name='microphone' value=\"{{selectedmicrophone == microphone.id}}\" />\n\t\t\t\t\t<span></span>\n\t\t\t\t\t<label>\n\t\t\t\t\t\t{{microphone.label}}\n\t\t\t\t\t</label>\n\t\t\t\t </li>\n\t\t\t</ul>\n\t\t</div>\n\t</div>\n\t<div data-selector=\"controlbar\" class=\"{{css}}-controlbar\">\n\n\t\t<div class=\"{{css}}-leftbutton-container\" ba-show=\"{{settingsvisible && ismobile}}\">\n\t\t\t<div data-selector=\"face-mode-toggle-icon\" class=\"{{css}}-mobile-camera-switcher {{css}}-button-inner\"\n\t\t\t\t onclick=\"{{toggleFaceMode()}}\"\n\t\t\t\t onmouseenter=\"{{hover(string('switch-camera'))}}\"\n\t\t\t>\n\t\t\t\t<i class=\"{{csscommon}}-icon-arrows-cw\"></i>\n\t\t\t</div>\n\t\t</div>\n\n        <div class=\"{{css}}-leftbutton-container\" ba-show=\"{{settingsvisible}}\">\n            <div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{settingsopen=!settingsopen}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"record-button-icon-cog\" class=\"{{css}}-button-inner {{css}}-button-{{settingsopen ? 'selected' : 'unselected'}}\"\n                 onclick=\"{{settingsopen=!settingsopen}}\"\n                 onmouseenter=\"{{hover(string('settings'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n                <i class=\"{{csscommon}}-icon-cog\"></i>\n            </div>\n        </div>\n\n        <div class=\"{{css}}-lefticon-container\" ba-show=\"{{settingsvisible && !novideo && !allowscreen}}\">\n            <div data-selector=\"record-button-icon-videocam\" class=\"{{csscommon}}-icon-inner\"\n                 onmouseenter=\"{{hover(string(camerahealthy ? 'camerahealthy' : 'cameraunhealthy'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n                <i class=\"{{csscommon}}-icon-videocam {{csscommon}}-icon-state-{{camerahealthy ? 'good' : 'bad' }}\"></i>\n            </div>\n        </div>\n\n        <div class=\"{{css}}-lefticon-container\" ba-show=\"{{settingsvisible && !noaudio && !allowscreen}}\">\n            <div data-selector=\"record-button-icon-mic\" class=\"{{csscommon}}-icon-inner\"\n                 onmouseenter=\"{{hover(string(microphonehealthy ? 'microphonehealthy' : 'microphoneunhealthy'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n                <i class=\"{{csscommon}}-icon-mic {{csscommon}}-icon-state-{{microphonehealthy ? 'good' : 'bad' }}\"></i>\n            </div>\n        </div>\n\n        <div class=\"{{css}}-lefticon-container\" ba-show=\"{{stopvisible && recordingindication}}\">\n            <div data-selector=\"recording-indicator\" class=\"{{css}}-recording-indication\">\n            </div>\n        </div>\n\n        <div class=\"{{css}}-label-container\" ba-show=\"{{controlbarlabel}}\">\n        \t<div data-selector=\"record-label-block\" class=\"{{css}}-label-label\">\n        \t\t{{controlbarlabel}}\n        \t</div>\n        </div>\n\n        <div class=\"{{css}}-rightbutton-container\" ba-show=\"{{recordvisible}}\">\n        \t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{record()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"record-primary-button\" class=\"{{css}}-button-primary\"\n                 onclick=\"{{record()}}\"\n                 onmouseenter=\"{{hover(string('record-tooltip'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n        \t\t{{string('record')}}\n        \t</div>\n        </div>\n\n        <div class=\"{{css}}-rightbutton-container\" ba-if=\"{{uploadcovershotvisible}}\">\n        \t<div data-selector=\"covershot-primary-button\" class=\"{{css}}-button-primary\"\n                 onmouseenter=\"{{hover(string('upload-covershot-tooltip'))}}\"\n                 onmouseleave=\"{{unhover()}}\">\n                 <input type=\"file\"\n\t\t\t\t       class=\"{{css}}-chooser-file\"\n\t\t\t\t       style=\"height:100\"\n\t\t\t\t       onchange=\"{{uploadCovershot(domEvent)}}\"\n\t\t\t\t       accept=\"{{covershot_accept_string}}\"\n\t\t\t\t />\n                 <span>\n        \t\t\t{{string('upload-covershot')}}\n        \t\t</span>\n        \t</div>\n        </div>\n\n        <div class=\"{{css}}-rightbutton-container\" ba-show=\"{{rerecordvisible}}\">\n        \t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{rerecord()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"rerecord-primary-button\" class=\"{{css}}-button-primary\"\n                 onclick=\"{{rerecord()}}\"\n                 onmouseenter=\"{{hover(string('rerecord-tooltip'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n        \t\t{{string('rerecord')}}\n        \t</div>\n        </div>\n\n\t\t<div class=\"{{css}}-rightbutton-container\" ba-show=\"{{cancelvisible}}\">\n\t\t\t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{cancel()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"cancel-primary-button\" class=\"{{css}}-button-primary\"\n\t\t\t\t onclick=\"{{cancel()}}\"\n\t\t\t\t onmouseenter=\"{{hover(string('cancel-tooltip'))}}\"\n\t\t\t\t onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n\t\t\t\t{{string('cancel')}}\n\t\t\t</div>\n\t\t</div>\n\n        <div class=\"{{css}}-rightbutton-container\" ba-show=\"{{stopvisible}}\">\n        \t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{stop()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"stop-primary-button\" class=\"{{css}}-button-primary {{mintimeindicator ? css + '-disabled': ''}}\"\n\t\t\t\t title=\"{{mintimeindicator ? string('stop-available-after').replace('%d', timeminlimit) : string('stop-tooltip')}}\"\n                 onclick=\"{{stop()}}\"\n                 onmouseenter=\"{{hover( mintimeindicator ? string('stop-available-after').replace('%d', timeminlimit) : string('stop-tooltip'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n        \t\t{{string('stop')}}\n        \t</div>\n        </div>\n\n\t\t<div class=\"{{css}}-rightbutton-container\" ba-show=\"{{pausable && !resumevisible && stopvisible}}\">\n\t\t\t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{pause()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"pause-primary-button\" class=\"{{css}}-button-primary\"\n\t\t\t\t title=\"{{string('pause-recorder')}}\"\n\t\t\t\t onclick=\"{{pause()}}\"\n\t\t\t\t onmouseenter=\"{{hover(string('pause-recorder'))}}\"\n\t\t\t\t onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n\t\t\t\t<i class=\"{{csscommon}}-icon-pause\"></i>\n\t\t\t</div>\n\t\t</div>\n\n\t\t<div class=\"{{css}}-rightbutton-container\" ba-show=\"{{pausable && resumevisible}}\">\n\t\t\t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{resume()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"resume-primary-button\" class=\"{{css}}-button-primary\"\n\t\t\t\t title=\"{{string('resume-recorder')}}\"\n\t\t\t\t onclick=\"{{resume()}}\"\n\t\t\t\t onmouseenter=\"{{hover(string('resume-recorder'))}}\"\n\t\t\t\t onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n\t\t\t\t<i class=\"{{csscommon}}-icon-ccw\"></i>\n\t\t\t</div>\n\t\t</div>\n\n        <div class=\"{{css}}-centerbutton-container\" ba-show=\"{{skipvisible}}\">\n        \t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{skip()}}\"  onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"skip-primary-button\" class=\"{{css}}-button-primary\"\n                 onclick=\"{{skip()}}\"\n                 onmouseenter=\"{{hover(string('skip-tooltip'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n        \t\t{{string('skip')}}\n        \t</div>\n        </div>\n\t</div>\n</div>\n",

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
            /**/"css": function (obj) { return obj.css; }, "settingsvisible && settingsopen": function (obj) { return obj.settingsvisible && obj.settingsopen; }, "videoselectnotification": function (obj) { return obj.videoselectnotification; }, "string('add-stream')": function (obj) { return obj.string('add-stream'); }, "csscommon": function (obj) { return obj.csscommon; }, "showaddstreambutton && firefox && allowscreen": function (obj) { return obj.showaddstreambutton && obj.firefox && obj.allowscreen; }, "addNewStream()": function (obj) { return obj.addNewStream(); }, "hover(string('add-stream'))": function (obj) { return obj.hover(obj.string('add-stream')); }, "showaddstreambutton && !firefox && !videoselectnotification": function (obj) { return obj.showaddstreambutton && !obj.firefox && !obj.videoselectnotification; }, "cameras": function (obj) { return obj.cameras; }, "(camera.id !== selectedcamera) || allowscreen": function (obj) { return (obj.camera.id !== obj.selectedcamera) || obj.allowscreen; }, "addNewStream(camera.id)": function (obj) { return obj.addNewStream(obj.camera.id); }, "camera.label": function (obj) { return obj.camera.label; }, "(showaddstreambutton && !firefox) || (firefox && allowscreen)": function (obj) { return (obj.showaddstreambutton && !obj.firefox) || (obj.firefox && obj.allowscreen); }, "!novideo && !allowscreen && !ismobile": function (obj) { return !obj.novideo && !obj.allowscreen && !obj.ismobile; }, "hover(string('select-camera'))": function (obj) { return obj.hover(obj.string('select-camera')); }, "selectCamera(camera.id)": function (obj) { return obj.selectCamera(obj.camera.id); }, "selectedcamera == camera.id": function (obj) { return obj.selectedcamera == obj.camera.id; }, "(!noaudio && !novideo) || !allowscreen": function (obj) { return (!obj.noaudio && !obj.novideo) || !obj.allowscreen; }, "microphones": function (obj) { return obj.microphones; }, "!noaudio && !allowscreen": function (obj) { return !obj.noaudio && !obj.allowscreen; }, "selectMicrophone(microphone.id)": function (obj) { return obj.selectMicrophone(obj.microphone.id); }, "hover(string('select-audio-input'))": function (obj) { return obj.hover(obj.string('select-audio-input')); }, "selectedmicrophone == microphone.id": function (obj) { return obj.selectedmicrophone == obj.microphone.id; }, "microphone.label": function (obj) { return obj.microphone.label; }, "settingsvisible && ismobile": function (obj) { return obj.settingsvisible && obj.ismobile; }, "toggleFaceMode()": function (obj) { return obj.toggleFaceMode(); }, "hover(string('switch-camera'))": function (obj) { return obj.hover(obj.string('switch-camera')); }, "settingsvisible": function (obj) { return obj.settingsvisible; }, "settingsopen=!settingsopen": function (obj) { return obj.settingsopen=!obj.settingsopen; }, "settingsopen ? 'selected' : 'unselected'": function (obj) { return obj.settingsopen ? 'selected' : 'unselected'; }, "hover(string('settings'))": function (obj) { return obj.hover(obj.string('settings')); }, "unhover()": function (obj) { return obj.unhover(); }, "settingsvisible && !novideo && !allowscreen": function (obj) { return obj.settingsvisible && !obj.novideo && !obj.allowscreen; }, "hover(string(camerahealthy ? 'camerahealthy' : 'cameraunhealthy'))": function (obj) { return obj.hover(obj.string(obj.camerahealthy ? 'camerahealthy' : 'cameraunhealthy')); }, "camerahealthy ? 'good' : 'bad'": function (obj) { return obj.camerahealthy ? 'good' : 'bad'; }, "settingsvisible && !noaudio && !allowscreen": function (obj) { return obj.settingsvisible && !obj.noaudio && !obj.allowscreen; }, "hover(string(microphonehealthy ? 'microphonehealthy' : 'microphoneunhealthy'))": function (obj) { return obj.hover(obj.string(obj.microphonehealthy ? 'microphonehealthy' : 'microphoneunhealthy')); }, "microphonehealthy ? 'good' : 'bad'": function (obj) { return obj.microphonehealthy ? 'good' : 'bad'; }, "stopvisible && recordingindication": function (obj) { return obj.stopvisible && obj.recordingindication; }, "controlbarlabel": function (obj) { return obj.controlbarlabel; }, "recordvisible": function (obj) { return obj.recordvisible; }, "record()": function (obj) { return obj.record(); }, "hover(string('record-tooltip'))": function (obj) { return obj.hover(obj.string('record-tooltip')); }, "string('record')": function (obj) { return obj.string('record'); }, "uploadcovershotvisible": function (obj) { return obj.uploadcovershotvisible; }, "hover(string('upload-covershot-tooltip'))": function (obj) { return obj.hover(obj.string('upload-covershot-tooltip')); }, "uploadCovershot(domEvent)": function (obj) { return obj.uploadCovershot(obj.domEvent); }, "covershot_accept_string": function (obj) { return obj.covershot_accept_string; }, "string('upload-covershot')": function (obj) { return obj.string('upload-covershot'); }, "rerecordvisible": function (obj) { return obj.rerecordvisible; }, "rerecord()": function (obj) { return obj.rerecord(); }, "hover(string('rerecord-tooltip'))": function (obj) { return obj.hover(obj.string('rerecord-tooltip')); }, "string('rerecord')": function (obj) { return obj.string('rerecord'); }, "cancelvisible": function (obj) { return obj.cancelvisible; }, "cancel()": function (obj) { return obj.cancel(); }, "hover(string('cancel-tooltip'))": function (obj) { return obj.hover(obj.string('cancel-tooltip')); }, "string('cancel')": function (obj) { return obj.string('cancel'); }, "stopvisible": function (obj) { return obj.stopvisible; }, "stop()": function (obj) { return obj.stop(); }, "mintimeindicator ? css + '-disabled': ''": function (obj) { return obj.mintimeindicator ? obj.css + '-disabled': ''; }, "mintimeindicator ? string('stop-available-after').replace('%d', timeminlimit) : string('stop-tooltip')": function (obj) { return obj.mintimeindicator ? obj.string('stop-available-after').replace('%d', obj.timeminlimit) : obj.string('stop-tooltip'); }, "hover( mintimeindicator ? string('stop-available-after').replace('%d', timeminlimit) : string('stop-tooltip'))": function (obj) { return obj.hover( obj.mintimeindicator ? obj.string('stop-available-after').replace('%d', obj.timeminlimit) : obj.string('stop-tooltip')); }, "string('stop')": function (obj) { return obj.string('stop'); }, "pausable && !resumevisible && stopvisible": function (obj) { return obj.pausable && !obj.resumevisible && obj.stopvisible; }, "pause()": function (obj) { return obj.pause(); }, "string('pause-recorder')": function (obj) { return obj.string('pause-recorder'); }, "hover(string('pause-recorder'))": function (obj) { return obj.hover(obj.string('pause-recorder')); }, "pausable && resumevisible": function (obj) { return obj.pausable && obj.resumevisible; }, "resume()": function (obj) { return obj.resume(); }, "string('resume-recorder')": function (obj) { return obj.string('resume-recorder'); }, "hover(string('resume-recorder'))": function (obj) { return obj.hover(obj.string('resume-recorder')); }, "skipvisible": function (obj) { return obj.skipvisible; }, "skip()": function (obj) { return obj.skip(); }, "hover(string('skip-tooltip'))": function (obj) { return obj.hover(obj.string('skip-tooltip')); }, "string('skip')": function (obj) { return obj.string('skip'); }/**/
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
Scoped.define("module:VideoRecorder.Dynamics.Faceoutline", [
    "dynamics:Dynamic"
], function(Class, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<svg viewBox=\"0 0 301 171\" style=\"width:100%; height:100%; position: absolute; top: 0; left: 0\">\n    <g>\n        <path fill=\"none\" stroke=\"white\" stroke-width=\"2\" stroke-miterlimit=\"10\" stroke-dasharray=\"3.0228,3.0228\" d=\"M198.5,79.831c0,40.542-22.752,78.579-47.5,78.579c-24.749,0-47.5-38.036-47.5-78.579c0-40.543,17.028-68.24,47.5-68.24C185.057,11.591,198.5,39.288,198.5,79.831z\"></path>\n    </g>\n</svg>"

            };
        })
        .registerFunctions({
            /**//**/
        })
        .register("ba-videorecorder-faceoutline");
});
Scoped.define("module:VideoRecorder.Dynamics.Imagegallery", [
    "dynamics:Dynamic",
    "media:Recorder.Support",
    "base:Collections.Collection",
    "base:Properties.Properties",
    "base:Timers.Timer",
    "browser:Dom",
    "browser:Info",
    "module:Assets"
], [
    "dynamics:Partials.StylesPartial"
], function(Class, RecorderSupport, Collection, Properties, Timer, Dom, Info, Assets, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<div ba-if=\"{{showslidercontainer}}\">\n\t<div data-selector=\"slider-left-button\" class=\"{{css}}-imagegallery-leftbutton\">\n\t\t<div tabindex=\"0\" data-selector=\"slider-left-inner-button\"\n\t\t\t ba-hotkey:space^enter^left=\"{{left()}}\" onmouseout=\"this.blur()\"\n\t\t\t class=\"{{css}}-imagegallery-button-inner\" onclick=\"{{left()}}\"\n\t\t>\n\t\t\t<i class=\"{{csscommon}}-icon-left-open\"></i>\n\t\t</div>\n\t</div>\n\n\t<div data-selector=\"images-imagegallery-container\" ba-repeat=\"{{image::images}}\"\n\t\t class=\"{{css}}-imagegallery-container\" data-gallery-container>\n\t\t<div tabindex=\"0\" class=\"{{css}}-imagegallery-image\"\n\t\t\t ba-hotkey:space^enter=\"{{select(image)}}\" onmouseout=\"this.blur()\"\n\t\t\t ba-styles=\"{{{left: image.left + 'px', top: image.top + 'px', width: image.width + 'px', height: image.height + 'px'}}}\"\n\t\t\t onclick=\"{{select(image)}}\"\n\t\t>\n\t\t\t<div class=\"{{css}}-imagegallery-image-compat\" ba-show=\"{{ie10below}}\"></div>\n\t\t</div>\n\t</div>\n\n\t<div data-selector=\"slider-right-button\" class=\"{{css}}-imagegallery-rightbutton\">\n\t\t<div tabindex=\"0\" data-selector=\"slider-right-inner-button\"\n\t\t\t ba-hotkey:space^enter^right=\"{{right()}}\" onmouseout=\"this.blur()\"\n\t\t\t class=\"{{css}}-imagegallery-button-inner\" onclick=\"{{right()}}\"\n\t\t>\n\t\t\t<i class=\"{{csscommon}}-icon-right-open\"></i>\n\t\t</div>\n\t</div>\n</div>\n\n<div ba-if=\"{{!showslidercontainer}}\" class=\"{{css}}-chooser-container\">\n\t<div data-selector=\"covershot-primary-button\" class=\"{{css}}-chooser-button-container\">\n\t\t<div class=\"{{css}}-chooser-button-0\">\n\t\t\t<input type=\"file\"\n\t\t\t\t   tabindex=\"0\"\n\t\t\t\t   class=\"{{css}}-chooser-file\"\n\t\t\t\t   accept=\"{{covershot_accept_string}}\"\n\t\t\t\t   onchange=\"{{uploadCovershot(domEvent)}}\"\n\t\t\t/>\n\t\t\t<i class=\"{{csscommon}}-icon-picture\"></i>\n\t\t\t<span>\n\t\t\t{{string('upload-covershot')}}\n\t\t</span>\n\t\t</div>\n\t</div>\n</div>\n",

                attrs: {
                    "css": "ba-videorecorder",
                    "csscommon": "ba-commoncss",
                    "cssrecorder": "ba-recorder",
                    "imagecount": 3,
                    "imagenativewidth": 0,
                    "imagenativeheight": 0,
                    "containerwidth": 0,
                    "containerheight": 0,
                    "containeroffset": 0,
                    "images": {},
                    "deltafrac": 1 / 8,
                    "showslidercontainer": true,
                    "snapshots": [],
                    "covershot_accept_string": "image/*,image/png,image/jpg,image/jpeg"
                },

                computed: {
                    "showslidercontainer:snapshots": function() {
                        return this.get("snapshots").length > 0;
                    },
                    "imagewidth:imagecount,containerwidth,deltafrac": function() {
                        if (this.get("imagecount") <= 0)
                            return 0.0;
                        return this.get("containerwidth") * (1 - this.get("deltafrac")) / this.get("imagecount");
                    },
                    "imagedelta:imagecount,containerwidth,deltafrac": function() {
                        if (this.get("imagecount") <= 1)
                            return 0.0;
                        return this.get("containerwidth") * (this.get("deltafrac")) / (this.get("imagecount") - 1);
                    },
                    "imageheight:imagewidth,imagenativewidth,imagenativeheight": function() {
                        return this.get("imagenativeheight") * this.get("imagewidth") / this.get("imagenativewidth");
                    }
                },

                create: function() {
                    this.set("ie10below", Info.isInternetExplorer() && Info.internetExplorerVersion() <= 10);
                    var images = this.auto_destroy(new Collection());
                    this.set("images", images);
                    this.snapshotindex = 0;
                    this._updateImageCount();
                    this.on("change:imagecount", this._updateImageCount, this);
                    this.on("change:imagewidth change:imageheight change:imagedelta", this._recomputeImageBoxes, this);
                    this.auto_destroy(new Timer({
                        context: this,
                        delay: 1000,
                        fire: function() {
                            this.updateContainerSize();
                        }
                    }));
                },

                destroy: function() {
                    if (this.get("images").length > 0) {
                        this.get("images").iterate(function(image) {
                            if (image.snapshotDisplay && this.parent().recorder)
                                this.parent().recorder.removeSnapshotDisplay(image.snapshotDisplay);
                        }, this);
                    }
                    inherited.destroy.call(this);
                },

                _updateImageCount: function() {
                    var images = this.get("images");
                    var n = this.get("imagecount");
                    while (images.count() < n) {
                        var image = new Properties({
                            index: images.count()
                        });
                        this._recomputeImageBox(image);
                        images.add(image);
                    }
                    while (images.count() > n)
                        images.remove(images.getByIndex(images.count() - 1));
                },

                _recomputeImageBoxes: function() {
                    this.get("images").iterate(function(image) {
                        this._recomputeImageBox(image);
                    }, this);
                },

                /**
                 * @param {Object} image
                 * @private
                 */
                _recomputeImageBox: function(image) {
                    if (!this.parent().recorder && this.get("snapshots").length < 1)
                        return;
                    // Will fix portrait covershot bug, will not show stretched box
                    var _maxHeight,
                        _reduceWidth = false,
                        _reduceInPercentage = 0.75,
                        _ratio = this.parent().get('videometadata').ratio;

                    if (!_ratio && typeof this.parent().recorder._recorder !== "undefined") {
                        if (typeof this.parent().recorder._recorder._videoTrackSettings !== "undefined") {
                            var _videoSettings = this.parent().recorder._recorder._videoTrackSettings;
                            if (typeof _videoSettings.aspectRatio !== "undefined") {
                                _ratio = _videoSettings.aspectRatio;
                            } else {
                                if (typeof _videoSettings.width !== "undefined" && typeof _videoSettings.height !== "undefined")
                                    _ratio = Math.round(_videoSettings.width / _videoSettings.height * 100) / 100;
                            }
                        }
                    }

                    if (_ratio) {
                        _maxHeight = Math.floor(this.get("imagewidth") / _ratio);
                        if (this.get("containerheight") < _maxHeight && _maxHeight > 0.00) {
                            _reduceWidth = true;
                            _maxHeight = Math.floor(this.get("containerheight") * _reduceInPercentage);
                        }
                    }
                    var i = image.get("index");
                    var ih = _maxHeight || this.get("imageheight");
                    var iw = _reduceWidth ? this.get("imagewidth") * _reduceInPercentage : this.get("imagewidth");
                    var id = this.get("imagedelta");
                    var h = this.get("containerheight");
                    var w = this.get("containerwidth");
                    if (ih > 1.00) {
                        // If images count is 1
                        if (this.get("images").count() === 1) {
                            if (_ratio > 1.00) {
                                iw *= 0.45;
                                ih *= 0.45;
                            } else
                                iw *= 0.45;
                        }
                        if (this.get("images").count() === 2 && _ratio < 1.00)
                            iw *= 0.70;
                        image.set("left", this.get("images").count() === 1 ? 1 + Math.round((w - iw) / 2) : 1 + Math.round(i * (iw + id)));
                        image.set("top", 1 + Math.round((h - ih) / 2));
                        image.set("width", 1 + Math.round(iw));
                        image.set("height", 1 + Math.round(ih));
                        if (image.snapshot && image.snapshotDisplay) {
                            if (this.parent().recorder) {
                                this.parent().recorder.updateSnapshotDisplay(
                                    image.snapshot,
                                    image.snapshotDisplay,
                                    image.get("left") + this.get("containeroffset"),
                                    image.get("top"),
                                    image.get("width"),
                                    image.get("height")
                                );
                            } else {
                                RecorderSupport.updateSnapshotDisplay(
                                    image.snapshot,
                                    image.snapshotDisplay,
                                    image.get("left") + this.get("containeroffset"),
                                    image.get("top"),
                                    image.get("width"),
                                    image.get("height")
                                );
                            }
                        }
                    }
                },

                /**
                 * NOTE: Runs's each second, offset is {top:0 , left is padding from left},
                 * dimension is correctly calculate box
                 */
                updateContainerSize: function() {
                    var container = this.activeElement().querySelector("[data-gallery-container]");
                    var offset = Dom.elementOffset(container);
                    var videoOffset = offset;
                    if (this.parent().recorder) {
                        videoOffset = Dom.elementOffset(this.parent().recorder._element);
                    } else {
                        var _video = this.parent().activeElement().querySelector("video");
                        if (_video)
                            videoOffset = Dom.elementOffset(_video);
                    }
                    var left = offset.left - videoOffset.left;
                    var dimensions = Dom.elementDimensions(container);
                    this.set("containeroffset", left);
                    this.set("containerheight", dimensions.height);
                    this.set("containerwidth", dimensions.width);
                },

                _afterActivate: function(element) {
                    inherited._afterActivate.apply(this, arguments);
                    this.updateContainerSize();
                },

                loadImageSnapshot: function(image, snapshotindex) {
                    if (image.snapshotDisplay) {
                        if (this.parent().recorder)
                            this.parent().recorder.removeSnapshotDisplay(image.snapshotDisplay);
                        else
                            RecorderSupport.removeSnapshotDisplay(image.snapshotDisplay);
                        image.snapshotDisplay = null;
                    }
                    var snapshots = this.get("snapshots");
                    image.snapshot = snapshots[((snapshotindex % snapshots.length) + snapshots.length) % snapshots.length];
                    image.snapshotDisplay = this.parent().recorder ?
                        this.parent().recorder.createSnapshotDisplay(
                            this.activeElement(),
                            image.snapshot,
                            image.get("left") + this.get("containeroffset"),
                            image.get("top"),
                            image.get("width"),
                            image.get("height")
                        ) :
                        RecorderSupport.createSnapshotDisplay(
                            this.activeElement(),
                            image.snapshot,
                            image.get("left") + this.get("containeroffset"),
                            image.get("top"),
                            image.get("width"),
                            image.get("height")
                        );
                },

                loadSnapshots: function() {
                    this.get("images").iterate(function(image) {
                        this.loadImageSnapshot(image, this.snapshotindex + image.get("index"));
                    }, this);
                },

                nextSnapshots: function() {
                    this.snapshotindex += this.get("imagecount");
                    this.loadSnapshots();
                },

                prevSnapshots: function() {
                    this.snapshotindex -= this.get("imagecount");
                    this.loadSnapshots();
                },

                functions: {
                    left: function() {
                        this.prevSnapshots();
                    },
                    right: function() {
                        this.nextSnapshots();
                    },
                    select: function(image) {
                        this.trigger("image-selected", image.snapshot);
                    },
                    uploadCovershot: function(domEvent) {
                        this.trigger("upload-covershot", domEvent[0].target);
                    }
                }

            };
        })
        .registerFunctions({
            /**/"showslidercontainer": function (obj) { return obj.showslidercontainer; }, "css": function (obj) { return obj.css; }, "left()": function (obj) { return obj.left(); }, "csscommon": function (obj) { return obj.csscommon; }, "images": function (obj) { return obj.images; }, "select(image)": function (obj) { return obj.select(obj.image); }, "{left: image.left + 'px', top: image.top + 'px', width: image.width + 'px', height: image.height + 'px'}": function (obj) { return {left: obj.image.left + 'px', top: obj.image.top + 'px', width: obj.image.width + 'px', height: obj.image.height + 'px'}; }, "ie10below": function (obj) { return obj.ie10below; }, "right()": function (obj) { return obj.right(); }, "!showslidercontainer": function (obj) { return !obj.showslidercontainer; }, "covershot_accept_string": function (obj) { return obj.covershot_accept_string; }, "uploadCovershot(domEvent)": function (obj) { return obj.uploadCovershot(obj.domEvent); }, "string('upload-covershot')": function (obj) { return obj.string('upload-covershot'); }/**/
        })
        .register("ba-videorecorder-imagegallery")
        .attachStringTable(Assets.strings)
        .addStrings({
            "upload-covershot": "Upload Cover"
        });
});
Scoped.define("module:VideoRecorder.Dynamics.Loader", [
    "dynamics:Dynamic",
    "module:Assets"
], [
    "dynamics:Partials.ShowPartial"
], function(Class, Assets, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{cssrecorder}}-loader-container\">\n    <div data-selector=\"recorder-loader-block\" class=\"{{cssrecorder}}-loader-loader\" title=\"{{tooltip || ''}}\">\n    </div>\n</div>\n<div data-selector=\"recorder-loader-label-container\" class=\"{{cssrecorder}}-loader-label\" ba-show=\"{{label}}\">\n\t{{label}}\n</div>\n",

                attrs: {
                    "css": "ba-videorecorder",
                    "csscommon": "ba-commoncss",
                    "cssrecorder": "ba-recorder",
                    "tooltip": "",
                    "label": "",
                    "message": "",
                    "hovermessage": ""
                }

            };
        })
        .registerFunctions({
            /**/"cssrecorder": function (obj) { return obj.cssrecorder; }, "tooltip || ''": function (obj) { return obj.tooltip || ''; }, "label": function (obj) { return obj.label; }/**/
        })
        .register("ba-videorecorder-loader")
        .attachStringTable(Assets.strings)
        .addStrings({});
});
Scoped.define("module:VideoRecorder.Dynamics.Message", [
    "dynamics:Dynamic"
], [
    "dynamics:Partials.ClickPartial"
], function(Class, Templates, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div data-selector=\"recorder-message-container\" class=\"{{css}}-message-container\" ba-click=\"{{click()}}\">\n    <div data-selector=\"recorder-message-block\" class='{{css}}-message-message'>\n        <p>\n            {{message || \"\"}}\n        </p>\n        <ul ba-if=\"{{links && links.length > 0}}\" ba-repeat=\"{{link :: links}}\">\n            <li>\n                <a href=\"javascript:;\" ba-click=\"{{linkClick(link)}}\">\n                    {{link.title}}\n                </a>\n            </li>\n        </ul>\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-videorecorder",
                    "csscommon": "ba-commoncss",
                    "cssrecorder": "ba-recorder",
                    "message": '',
                    "links": null
                },

                functions: {

                    click: function() {
                        this.trigger("click");
                    },

                    linkClick: function(link) {
                        this.trigger("link", link);
                    }

                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "click()": function (obj) { return obj.click(); }, "message || \"\"": function (obj) { return obj.message || ""; }, "links && links.length > 0": function (obj) { return obj.links && obj.links.length > 0; }, "links": function (obj) { return obj.links; }, "linkClick(link)": function (obj) { return obj.linkClick(obj.link); }, "link.title": function (obj) { return obj.link.title; }/**/
        })
        .register("ba-videorecorder-message");
});
Scoped.define("module:VideoRecorder.Dynamics.Recorder", [
    "dynamics:Dynamic",
    "module:Assets",
    "module:StylesMixin",
    "browser:Info",
    "browser:Dom",
    "browser:Events",
    "browser:Upload.MultiUploader",
    "browser:Upload.FileUploader",
    "media:Recorder.VideoRecorderWrapper",
    "media:Recorder.Support",
    "media:WebRTC.Support",
    "base:Types",
    "base:Objs",
    "base:Strings",
    "base:Time",
    "base:Timers",
    "base:States.Host",
    "base:Classes.ClassRegistry",
    "base:Collections.Collection",
    "base:Promise",
    "module:VideoRecorder.Dynamics.RecorderStates.Initial",
    "module:VideoRecorder.Dynamics.RecorderStates"
], [
    "module:VideoRecorder.Dynamics.Imagegallery",
    "module:VideoRecorder.Dynamics.Loader",
    "module:VideoRecorder.Dynamics.Controlbar",
    "module:VideoRecorder.Dynamics.Message",
    "module:VideoRecorder.Dynamics.Topmessage",
    "module:VideoRecorder.Dynamics.Chooser",
    "module:VideoRecorder.Dynamics.Faceoutline",
    "module:Common.Dynamics.Helperframe",
    "dynamics:Partials.ShowPartial",
    "dynamics:Partials.IfPartial",
    "dynamics:Partials.EventPartial",
    "dynamics:Partials.OnPartial",
    "dynamics:Partials.DataPartial",
    "dynamics:Partials.AttrsPartial",
    "dynamics:Partials.StylesPartial",
    "dynamics:Partials.TemplatePartial",
    "dynamics:Partials.HotkeyPartial"
], function(Class, Assets, StylesMixin, Info, Dom, DomEvents, MultiUploader, FileUploader, VideoRecorderWrapper, RecorderSupport, WebRTCSupport, Types, Objs, Strings, Time, Timers, Host, ClassRegistry, Collection, Promise, InitialState, RecorderStates, scoped) {
    return Class.extend({
            scoped: scoped
        }, [StylesMixin, function(inherited) {
            return {

                template: "\n<div data-selector=\"video-recorder-container\" ba-show=\"{{!player_active}}\"\n     class=\"{{css}}-container {{csstheme}} {{css}}-size-{{csssize}}\n     {{iecss}}-{{ie8 ? 'ie8' : 'noie8'}} {{css}}-{{ fullscreened ? 'fullscreen' : 'normal' }}-view\n     {{cssrecorder}}-{{ firefox ? 'firefox' : 'common'}}-browser\n     {{cssrecorder}}-{{themecolor}}-color\n\t {{csscommon}}-full-width\"\n\t ba-styles=\"{{containerSizingStyles}}\"\n>\n\n    <video tabindex=\"-1\"\n\t\t   data-selector=\"recorder-status\" class=\"{{css}}-video {{css}}-{{hasrecorder ? 'hasrecorder' : 'norecorder'}}\"\n\t\t   data-video=\"video\" playsinline disablePictureInPicture\n\t></video>\n\t<ba-videorecorder-faceoutline class=\"{{css}}-overlay\" ba-if=\"{{faceoutline && hasrecorder && isrecorderready}}\"></ba-videorecorder-faceoutline>\n    <div data-selector=\"recorder-overlay\" style=\"{{placeholderstyle}}\"\n\t\t class=\"{{cssrecorder}}-overlay {{hasplaceholderstyle ? (css + '-overlay-with-placeholder') : ''}}\"\n\t\t ba-show=\"{{!hideoverlay}}\"\n\t\t data-overlay=\"overlay\"\n\t>\n\t\t<ba-{{dynloader}}\n\t\t\tba-css=\"{{cssloader || css}}\"\n\t\t\tba-cssrecorder=\"{{cssrecorder || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t\tba-template=\"{{tmplloader}}\"\n\t\t\tba-show=\"{{loader_active}}\"\n\t\t\tba-tooltip=\"{{loadertooltip}}\"\n\t\t\tba-hovermessage=\"{{=hovermessage}}\"\n\t\t\tba-label=\"{{loaderlabel}}\"\n\t\t></ba-{{dynloader}}>\n\n\t\t<ba-{{dynmessage}}\n\t\t\tba-css=\"{{cssmessage || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t\tba-cssrecorder=\"{{cssrecorder || css}}\"\n\t\t\tba-template=\"{{tmplmessage}}\"\n\t\t\tba-show=\"{{message_active}}\"\n\t\t\tba-message=\"{{message}}\"\n\t\t\tba-links=\"{{message_links}}\"\n\t\t\tba-event:click=\"message_click\"\n\t\t\tba-event:link=\"message_link_click\"\n\t\t></ba-{{dynmessage}}>\n\n\t\t<ba-{{dyntopmessage}}\n\t\t\tba-css=\"{{csstopmessage || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t\tba-cssrecorder=\"{{cssrecorder || css}}\"\n\t\t\tba-template=\"{{tmpltopmessage}}\"\n\t\t\tba-show=\"{{topmessage_active && (topmessage || hovermessage)}}\"\n\t\t\tba-topmessage=\"{{hovermessage || topmessage}}\"\n\t\t></ba-{{dyntopmessage}}>\n\n\t\t<ba-{{dynchooser}}\n\t\t\tba-if=\"{{chooser_active && !is_initial_state}}\"\n\t\t\tba-onlyaudio=\"{{onlyaudio}}\"\n\t\t\tba-facecamera=\"{{facecamera}}\"\n\t\t\tba-recordviafilecapture=\"{{recordviafilecapture}}\"\n\t\t\tba-css=\"{{csschooser || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t\tba-cssrecorder=\"{{cssrecorder || css}}\"\n\t\t\tba-template=\"{{tmplchooser}}\"\n\t\t\tba-allowscreen=\"{{allowscreen}}\"\n\t\t\tba-allowmultistreams=\"{{allowmultistreams}}\"\n\t\t\tba-parentpopup=\"{{popup}}\"\n\t\t\tba-allowrecord=\"{{allowrecord}}\"\n\t\t\tba-allowupload=\"{{allowupload}}\"\n\t\t\tba-allowcustomupload=\"{{allowcustomupload}}\"\n\t\t\tba-allowedextensions=\"{{allowedextensions}}\"\n\t\t\tba-primaryrecord=\"{{primaryrecord}}\"\n\t\t\tba-initialmessages=\"{{initialmessages}}\"\n\t\t\tba-timelimit=\"{{timelimit}}\"\n\t\t\tba-event:record=\"record_video\"\n\t\t\tba-event:record-screen=\"record_screen\"\n\t\t\tba-event:upload=\"video_file_selected\"\n\t\t></ba-{{dynchooser}}>\n\n\t\t<ba-{{dynimagegallery}}\n\t\t\tba-if=\"{{imagegallery_active}}\"\n\t\t\tba-css=\"{{cssimagegallery || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t\tba-cssrecorder=\"{{cssrecorder || css}}\"\n\t\t\tba-template=\"{{tmplimagegallery}}\"\n\t\t\tba-imagecount=\"{{gallerysnapshots}}\"\n\t\t\tba-snapshots=\"{{=snapshots}}\"\n\t\t\tba-imagenativewidth=\"{{nativeRecordingWidth}}\"\n\t\t\tba-imagenativeheight=\"{{nativeRecordingHeight}}\"\n\t\t\tba-event:image-selected=\"select_image\"\n\t\t\tba-event:upload-covershot=\"upload_covershot\"\n\t\t></ba-{{dynimagegallery}}>\n\n\t\t<ba-{{dyncontrolbar}}\n\t\t\tba-css=\"{{csscontrolbar || css}}\"\n\t\t\tba-cssrecorder=\"{{cssrecorder || css}}\"\n\t\t\tba-csstheme=\"{{csstheme || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t\tba-template=\"{{tmplcontrolbar}}\"\n\t\t\tba-show=\"{{controlbar_active}}\"\n\t\t\tba-cameras=\"{{cameras}}\"\n\t\t\tba-microphones=\"{{microphones}}\"\n\t\t\tba-noaudio=\"{{noaudio}}\"\n\t\t\tba-novideo=\"{{onlyaudio}}\"\n\t\t\tba-allowscreen=\"{{record_media==='screen' || record_media==='multistream'}}\"\n\t\t\tba-selectedcamera=\"{{selectedcamera || 0}}\"\n\t\t\tba-selectedmicrophone=\"{{selectedmicrophone || 0}}\"\n\t\t\tba-addstreamdeviceid=\"{{addstreamdeviceid || null}}\"\n\t\t\tba-showaddstreambutton=\"{{showaddstreambutton}}\"\n\t\t\tba-camerahealthy=\"{{camerahealthy}}\"\n\t\t\tba-microphonehealthy=\"{{microphonehealthy}}\"\n\t\t\tba-hovermessage=\"{{=hovermessage}}\"\n\t\t\tba-settingsvisible=\"{{settingsvisible}}\"\n\t\t\tba-recordvisible=\"{{recordvisible}}\"\n\t\t\tba-cancelvisible=\"{{allowcancel && cancancel}}\"\n\t\t\tba-uploadcovershotvisible=\"{{uploadcovershotvisible}}\"\n\t\t\tba-rerecordvisible=\"{{rerecordvisible}}\"\n\t\t\tba-stopvisible=\"{{stopvisible}}\"\n\t\t\tba-skipvisible=\"{{skipvisible}}\"\n\t\t\tba-controlbarlabel=\"{{controlbarlabel}}\"\n\t\t\tba-mintimeindicator=\"{{mintimeindicator}}\"\n\t\t\tba-timeminlimit=\"{{timeminlimit}}\"\n\t\t\tba-resumevisible=\"{{resumevisible}}\"\n\t\t\tba-pausable=\"{{pausable}}\"\n\t\t\tba-firefox=\"{{firefox}}\"\n\t\t\tba-event:select-camera=\"select_camera\"\n\t\t\tba-event:select-microphone=\"select_microphone\"\n\t\t\tba-event:invoke-record=\"record\"\n\t\t\tba-event:invoke-rerecord=\"rerecord\"\n\t\t\tba-event:invoke-stop=\"stop\"\n\t\t\tba-event:invoke-skip=\"invoke_skip\"\n\t\t\tba-event:invoke-pause=\"pause_recorder\"\n\t\t\tba-event:invoke-resume=\"resume\"\n\t\t\tba-event:invoke-cancel=\"cancel\"\n\t\t\tba-event:upload-covershot=\"upload_covershot\"\n\t\t\tba-event:toggle-face-mode=\"toggle_face_mode\"\n\t\t\tba-event:add-new-stream=\"add_new_stream\"\n\t\t></ba-{{dyncontrolbar}}>\n\n\t\t<ba-{{dynhelperframe}}\n\t\t\tba-if=\"{{helperframe_active || framevisible}}\"\n\t\t\tba-template=\"{{tmphelperframe}}\"\n\t\t\tba-framereversable= \"{{multistreamreversable}}\"\n\t\t\tba-framedragable=\"{{multistreamdraggable}}\"\n\t\t\tba-frameresizeable=\"{{multistreamresizeable}}\"\n\t\t\tba-framepositionx=\"{{addstreampositionx}}\"\n\t\t\tba-framepositiony=\"{{addstreampositiony}}\"\n\t\t\tba-frameproportional=\"{{addstreamproportional}}\"\n\t\t\tba-flipframe=\"{{flip-camera}}\"\n\t\t></ba-{{dynhelperframe}}>\n\t</div>\n</div>\n\n\n<div data-selector=\"recorder-player\" ba-if=\"{{player_active}}\" ba-styles=\"{{containerSizingStyles}}\">\n\t<span ba-show=\"{{ie8}}\">&nbsp;</span>\n\t<ba-{{dynvideoplayer}}\n\t\tba-theme=\"{{theme || 'default'}}\"\n\t\tba-themecolor=\"{{themecolor}}\"\n\t\tba-cssrecorder=\"{{cssrecorder || css}}\"\n\t\tba-source=\"{{localplayback ? playbacksource : ''}}\"\n\t\tba-poster=\"{{localplayback ? playbackposter : ''}}\"\n\t\tba-localplayback=\"{{localplayback}}\"\n\t\tba-hideoninactivity=\"{{false}}\"\n\t\tba-showsettingsmenu=\"{{showplayersettingsmenu}}\"\n\t\tba-onlyaudio=\"{{onlyaudio}}\"\n\t\tba-attrs=\"{{playerattrs}}\"\n\t\tba-data:id=\"player\"\n\t\tba-width=\"100%\"\n\t\tba-height=\"100%\"\n\t\tba-totalduration=\"{{duration}}\"\n\t\tba-rerecordable=\"{{rerecordable && (recordings === null || recordings > 0)}}\"\n\t\tba-submittable=\"{{manualsubmit && verified}}\"\n\t\tba-reloadonplay=\"{{true}}\"\n\t\tba-autoplay=\"{{autoplay}}\"\n\t\tba-nofullscreen=\"{{nofullscreen}}\"\n\t\tba-topmessage=\"{{playertopmessage}}\"\n\t\tba-allowtexttrackupload=\"{{allowtexttrackupload}}\"\n\t\tba-uploadtexttracksvisible=\"{{uploadtexttracksvisible}}\"\n\t\tba-snapshottype=\"{{snapshottype}}\"\n\t\tba-tracktags=\"{{tracktags}}\"\n\t\tba-tracktagsstyled=\"{{tracktagsstyled}}\"\n\t\tba-trackcuetext=\"{{trackcuetext}}\"\n\t\tba-acceptedtracktexts=\"{{acceptedtracktexts}}\"\n\t\tba-sharevideo=\"{{sharevideo}}\"\n\t\tba-videofitstrategy=\"{{videofitstrategy}}\"\n\t\tba-posterfitstrategy=\"{{posterfitstrategy}}\"\n\t\tba-placeholderstyle=\"{{placeholderstyle}}\"\n\t\tba-event:loaded=\"ready_to_play\"\n\t\tba-event:rerecord=\"rerecord\"\n\t\tba-event:playing=\"playing\"\n\t\tba-event:paused=\"paused\"\n\t\tba-event:ended=\"ended\"\n\t\tba-event:submit=\"manual_submit\"\n\t\tba-event:upload-text-tracks=\"upload_text_tracks\"\n\t\tba-tracksshowselection=\"{{tracksshowselection}}\"\n\t\tba-trackselectorhovered=\"{{trackselectorhovered}}\"\n\t\tba-uploadlocales=\"{{uploadlocales}}\"\n\t\tba-frameselectionmode=\"{{frameselectionmode}}\"\n\t\tba-timeminlimit=\"{{timeminlimit}}\"\n\t\tba-event:selected_label_value=\"selected_label_value\"\n\t\tba-event:move_to_option=\"move_to_option\"\n\t>\n\t</ba-{{dynvideoplayer}}>\n</div>\n",

                attrs: {
                    /* CSS */
                    "css": "ba-videorecorder",
                    "csscommon": "ba-commoncss",
                    "cssrecorder": "ba-recorder",
                    "iecss": "ba-videorecorder",
                    "cssimagegallery": "",
                    "cssloader": "",
                    "csscontrolbar": "",
                    "cssmessage": "",
                    "csstopmessage": "",
                    "csschooser": "",
                    "csshelperframe": "",
                    "gallerysnapshots": 3,
                    "popup-width": "",
                    "popup-height": "",

                    /* Themes */
                    "theme": "",
                    "csstheme": "",
                    "themecolor": "",

                    /* Dynamics */
                    "dynimagegallery": "videorecorder-imagegallery",
                    "dynloader": "videorecorder-loader",
                    "dyncontrolbar": "videorecorder-controlbar",
                    "dynmessage": "videorecorder-message",
                    "dyntopmessage": "videorecorder-topmessage",
                    "dynchooser": "videorecorder-chooser",
                    "dynvideoplayer": "videoplayer",
                    "dynhelperframe": "helperframe",

                    /* Templates */
                    "tmplimagegallery": "",
                    "tmplloader": "",
                    "tmplcontrolbar": "",
                    "tmplmessage": "",
                    "tmpltopmessage": "",
                    "tmplchooser": "",
                    "tmplhelperframe": "",

                    /* Attributes */
                    "autorecord": false,
                    "autoplay": false,
                    "allowrecord": true,
                    "allowupload": true,
                    "allowcustomupload": true,
                    "manual-upload": false,
                    "camerafacefront": false,
                    "fittodimensions": false,
                    "resizemode": null, // enum option to scale screen recorder, has 2 options: 'crop-and-scale',  'none'
                    "createthumbnails": false,
                    "primaryrecord": true,
                    "allowscreen": false,
                    "initialmessages": [], // should include object at least with message key, and optional type with enum: "error", "warninig" (default) or "success"
                    "screenrecordmandatory": false,
                    "nofullscreen": false,
                    "recordingwidth": undefined,
                    "recordingheight": undefined,
                    "minuploadingwidth": undefined,
                    "maxuploadingwidth": undefined,
                    "minuploadingheight": undefined,
                    "maxuploadingheight": undefined,
                    "countdown": 3,
                    "snapshotmax": 15,
                    "framerate-warning": null,
                    "framerate": null,
                    "audiobitrate": null,
                    "videobitrate": null,
                    "snapshottype": "jpg",
                    "picksnapshots": true,
                    "playbacksource": "",
                    "screen": {},
                    "playbackposter": "",
                    "recordermode": true,
                    "skipinitial": false,
                    "skipinitialonrerecord": false,
                    "timelimit": null,
                    "timeminlimit": null,
                    "webrtcstreaming": false,
                    "webrtconmobile": false,
                    "webrtcstreamingifnecessary": true,
                    "microphone-volume": 1.0,
                    "flip-camera": false,
                    "flipscreen": false, // Will affect as true, if flip-camera also set as true
                    "early-rerecord": false,
                    "custom-covershots": false,
                    "selectfirstcovershotonskip": false,
                    "picksnapshotmandatory": false,
                    "media-orientation": null, // possible options "landscape", "portrait"
                    "manualsubmit": false,
                    "allowedextensions": null,
                    "filesizelimit": null,
                    "faceoutline": false,
                    "display-timer": true,
                    "pausable": false,
                    "sharevideo": [],
                    "videofitstrategy": "pad",
                    "posterfitstrategy": "crop",
                    "placeholderstyle": "",
                    "hasplaceholderstyle": false,
                    /** outsource-selectors should start with cam-* or/and mic-* will add in the feature other selectors.
                     * If set skipinitial devices info will be accessible w/o pressing record button
                     * all settings should be seperated by ';' and has to be ID selector (only characters: "-", "_", numbers and letters allowed)
                     * OPTIONS:
                     * 'type': Could be manage type of element, by default will be 'select' element
                     * possible types: 'radio', 'select'(default) all should be as a string
                     * 'disabled': Could be set disable by default, and of there're no option more than 1
                     * device selection. Default is true
                     * 'className': will be added as a class attribute to single option and in label for radio
                     * 'showCapabilities' for camera only and if available camera resolutions info provided
                     * by browser. Default is true
                     * examples:
                     * "cam-my-own-id-selector;mic-my-own-id-selector"
                     * "cam-my-own-id-selector[type='select',disabled=false,showCapabilities=true];mic-my-own-id-selector[type='radio',className='class1 class2 etc']"
                     */
                    "outsource-selectors": null,

                    /* Configuration */
                    "simulate": false,
                    "onlyaudio": false,
                    "noaudio": false,
                    "enforce-duration": null,
                    "localplayback": false,
                    "uploadoptions": {},
                    "playerattrs": {},
                    "shortMessage": true,
                    "cpu-friendly": false,

                    /* Options */
                    "rerecordable": true,
                    "allowcancel": false,
                    "recordings": null,
                    "ready": true,
                    "orientation": false,
                    "popup": false,
                    "audio-test-mandatory": false,
                    "snapshotfromuploader": false,
                    "snapshotfrommobilecapture": false,
                    "allowmultistreams": false,
                    "showaddstreambutton": false,
                    "multistreamreversable": true,
                    "multistreamdraggable": true,
                    "multistreamresizeable": false,
                    "addstreamproportional": true,
                    "addstreampositionx": 5,
                    "addstreampositiony": 5,
                    "addstreampositionwidth": 120,
                    "addstreampositionheight": null,
                    "addstreamminwidth": 120,
                    "addstreamminheight": null,
                    "addstreamdeviceid": null,
                    "showsettingsmenu": true, // As a property show/hide settings from users
                    "showplayersettingsmenu": true, // As a property show/hide after recorder player settings from users

                    "allowtexttrackupload": false,
                    "framevisible": false,
                    "uploadlocales": [{
                        lang: 'en',
                        label: 'English'
                    }],
                    "tracktags": [],
                    "outsourceSelectors": [],
                    "hassubtitles": false,
                    "videometadata": {},
                    "optionsinitialstate": {},
                    "playerfallbackwidth": 320,
                    "playerfallbackheight": 240,
                    "pickcovershotframe": false,
                    "allowtrim": false,
                    "trimoverlay": true
                },

                computed: {
                    "nativeRecordingWidth:recordingwidth,record_media": function() {
                        return this.get("recordingwidth") || ((this.get("record_media") !== "screen" && (this.get("record_media") !== "multistream")) ? 640 : (window.innerWidth || document.body.clientWidth));
                    },
                    "nativeRecordingHeight:recordingheight,record_media": function() {
                        return this.get("recordingheight") || ((this.get("record_media") !== "screen" && (this.get("record_media") !== "multistream")) ? 480 : (window.innerHeight || document.body.clientHeight));
                    },
                    "containerSizingStyles:aspectratio,nativeRecordingWidth,nativeRecordingHeight,activated, height, width": function(aspectRatio, fallbackWidth, fallbackHeight, active, height, width) {
                        var result = {
                            aspectRatio: aspectRatio || fallbackWidth + "/" + fallbackHeight
                        };
                        if (height) result.height = typeof height === "string" && height[height.length - 1] === "%" ? height : height + "px";
                        if (width) result.width = typeof width === "string" && width[width.length - 1] === "%" ? width : width + "px";
                        if (active && (Info.isInternetExplorer() || (Info.isSafari() && Info.safariVersion() < 15))) {
                            new ResizeObserver(function(entries) {
                                this.set("height", Math.floor(entries[0].target.offsetWidth / (aspectRatio || (fallbackWidth / fallbackHeight))));
                            }.bind(this)).observe(this.activeElement().parentElement);
                            result.height = Math.floor(this.activeElement().parentElement.offsetWidth / (aspectRatio || (fallbackWidth / fallbackHeight))) + "px";
                        }
                        if (this.activeElement()) this._applyStyles(this.activeElement(), result, this.__lastContainerSizingStyles);
                        this.__lastContainerSizingStyles = result;
                        return result;
                    },
                    "canswitchcamera:recordviafilecapture": function() {
                        return !this.get("recordviafilecapture") && Info.isMobile();
                    }
                },

                scopes: {
                    player: ">[id='player']"
                },

                types: {
                    "allowscreen": "boolean",
                    "rerecordable": "boolean",
                    "ready": "boolean",
                    "fittodimensions": "boolean",
                    "autorecord": "boolean",
                    "autoplay": "boolean",
                    "allowrecord": "boolean",
                    "allowupload": "boolean",
                    "allowcustomupload": "boolean",
                    "primaryrecord": "boolean",
                    "recordermode": "boolean",
                    "nofullscreen": "boolean",
                    "skipinitialonrerecord": "boolean",
                    "picksnapshots": "boolean",
                    "localplayback": "boolean",
                    "camerafacefront": "boolean",
                    "noaudio": "boolean",
                    "skipinitial": "boolean",
                    "popup": "boolean",
                    "popup-width": "int",
                    "popup-height": "int",
                    "enforce-duration": "bool",
                    "webrtcstreaming": "boolean",
                    "themecolor": "string",
                    "webrtconmobile": "boolean",
                    "manual-upload": "boolean",
                    "webrtcstreamingifnecessary": "boolean",
                    "microphone-volume": "float",
                    "audiobitrate": "int",
                    "videobitrate": "int",
                    "minuploadingwidth": "int",
                    "maxuploadingwidth": "int",
                    "minuploadingheight": "int",
                    "maxuploadingheight": "int",
                    "framerate-warning": "int",
                    "snapshotfromuploader": "boolean",
                    "snapshotfrommobilecapture": "boolean",
                    "flip-camera": "boolean",
                    "flipscreen": "boolean",
                    "faceoutline": "boolean",
                    "early-rerecord": "boolean",
                    "custom-covershots": "boolean",
                    "picksnapshotmandatory": "boolean",
                    "selectfirstcovershotonskip": "boolean",
                    "manualsubmit": "boolean",
                    "simulate": "boolean",
                    "allowedextensions": "array",
                    "onlyaudio": "boolean",
                    "cpu-friendly": "boolean",
                    "allowcancel": "boolean",
                    "display-timer": "boolean",
                    "audio-test-mandatory": "boolean",
                    "allowtexttrackupload": "boolean",
                    "uploadlocales": "array",
                    "allowmultistreams": "boolean",
                    "pausable": "boolean",
                    "sharevideo": "array",
                    "multistreamreversable": "boolean",
                    "multistreamdraggable": "boolean",
                    "multistreamresizeable": "boolean",
                    "addstreamproportional": "boolean",
                    "addstreampositionx": "int",
                    "addstreampositiony": "int",
                    "addstreampositionwidth": "int",
                    "addstreampositionheight": "int",
                    "addstreamminwidth": "int",
                    "addstreamminheight": "int",
                    "showsettingsmenu": "boolean",
                    "showplayersettingsmenu": "boolean",
                    "initialmessages": "array",
                    "screenrecordmandatory": "boolean",
                    "media-orientation": "string",
                    "mandatoryresolutions": "array",
                    "pickcovershotframe": "boolean",
                    "allowtrim": "boolean",
                    "trimoverlay": "boolean",
                    "outsourceSelectors": []
                },

                extendables: ["states"],

                remove_on_destroy: true,

                events: {
                    "change:camerahealthy": function(value) {
                        this.trigger("camerahealth", value);
                    },
                    "change:microphonehealthy": function(value) {
                        this.trigger("microphonehealth", value);
                    },
                    "change:webrtconmobile": function() {
                        this.set("recordviafilecapture", Info.isMobile() && (!this.get("webrtconmobile") || !VideoRecorderWrapper.anySupport(this._videoRecorderWrapperOptions())));
                    },
                    "change:recordviafilecapture": function() {
                        if (this.get("recordviafilecapture")) {
                            this.set("skipinitial", false);
                            this.set("skipinitialonrerecord", false);
                            this.set("autorecord", false);
                            this._screenRecorderVerifier(false);
                        }
                    },
                    "change:placeholderstyle": function(value) {
                        this.set("hasplaceholderstyle", value.length > 10);
                    }
                },

                create: function() {
                    this._validateParameters();
                    // Init Audio Context
                    WebRTCSupport.globals();
                    this.set("optionsinitialstate", {
                        autorecord: this.get("autorecord"),
                        skipinitial: this.get("skipinitial")
                    });

                    if (this.get("theme")) this.set("theme", this.get("theme").toLowerCase());
                    if (this.get("theme") in Assets.recorderthemes) {
                        Objs.iter(Assets.recorderthemes[this.get("theme")], function(value, key) {
                            if (!this.isArgumentAttr(key))
                                this.set(key, value);
                        }, this);
                    }
                    if (!this.get("themecolor"))
                        this.set("themecolor", "default");

                    if (this.get("pausable"))
                        this.set("resumevisible", false);

                    this.set("ie8", Info.isInternetExplorer() && Info.internetExplorerVersion() < 9);
                    this.set("hideoverlay", false);
                    this.set("firefox", Info.isFirefox());

                    this.set("canswitchcamera", false);
                    this.set("recordviafilecapture", Info.isMobile() && (!this.get("webrtconmobile") || !VideoRecorderWrapper.anySupport(this._videoRecorderWrapperOptions())));

                    if (this.get("outsource-selectors")) {
                        var selectors = Objs.map(this.get("outsource-selectors").split(/;/), function(item) {
                            var obj = {
                                options: {
                                    type: 'select',
                                    disabled: true,
                                    showCapabilities: true
                                }
                            };
                            var options = '';
                            var splitted = item.split("[");
                            var selector = splitted[0];
                            var camSelectorPatters = /^cam\-[A-Za-z\d\-\_]*/i;
                            var micSelectorPatters = /^mic\-[A-Za-z\d\-\_]*/i;
                            if (camSelectorPatters.test(selector)) {
                                obj.isCamera = true;
                                obj.selector = selector;
                            }
                            if (micSelectorPatters.test(selector)) {
                                obj.isCamera = false;
                                obj.selector = selector;
                            }

                            if (splitted[1]) {
                                options = splitted[1].replace(/\]$/, "")
                                    .replace(/\=/g, ':').replace(/\'/g, '"')
                                    .replace(/(\w+:)|(\w+ :)/g, function(matchedStr) {
                                        return '"' + matchedStr.substring(0, matchedStr.length - 1) + '":';
                                    });
                            }
                            if (options.length > 5) {
                                try {
                                    var parsedOptions = JSON.parse("{" + options + "}");
                                    obj.options = Objs.tree_extend(obj.options, parsedOptions);
                                } catch (e) {
                                    console.warn("Wrong settins for 'outsource-selectors' was provided");
                                }
                            }

                            if (!Types.is_undefined(obj.isCamera)) {
                                return obj;
                            }

                        }, this);
                        this.set("outsourceSelectors", selectors);
                    }

                    if (this.get("recordviafilecapture")) {
                        this.set("skipinitial", false);
                        this.set("skipinitialonrerecord", false);
                        this.set("autorecord", false);
                        this._screenRecorderVerifier(false);
                    }

                    this.__attachRequested = false;
                    this.__activated = false;
                    this._bound = false;
                    this.__recording = false;
                    this.__error = null;

                    this.host = new Host({
                        stateRegistry: new ClassRegistry(this.cls.recorderStates())
                    });
                    this.host.dynamic = this;
                    this.host.initialize(this._initialState);

                    this._timer = new Timers.Timer({
                        context: this,
                        fire: this._timerFire,
                        delay: 250,
                        start: true
                    });

                    this.activeElement().style.setProperty("display", "inline-block");
                    this._applyStyles(this.activeElement(), this.get("containerSizingStyles"));

                    this.__cameraResponsive = true;
                    this.__cameraSignal = true;

                    this._initSettings();

                    if (this.get("onlyaudio")) {
                        this.set("allowupload", false);
                        this.set("orientation", false);
                        // By default custom-covershots is false, if user want poster they can upload it
                        this.set("picksnapshots", this.get("custom-covershots"));
                    }
                    if (!Info.isMobile())
                        this.set("orientation", false);
                    this.set("currentorientation", window.innerHeight > window.innerWidth ? "portrait" : "landscape");
                    this._screenRecorderVerifier();
                },

                getMediaType: function() {
                    return "video";
                },

                getCovershotFile: function() {
                    return this.__lastCovershotUpload;
                },

                getVideoFile: function() {
                    return this._videoFile || (this.recorder && this.recorder.localPlaybackSource()) || null;
                },

                _initialState: InitialState,

                state: function() {
                    return this.host.state();
                },

                recorderAttached: function() {
                    return !!this.recorder;
                },

                videoError: function() {
                    return this.__error;
                },

                _error: function(error_type, error_code) {
                    this.__error = {
                        error_type: error_type,
                        error_code: error_code
                    };
                    this.trigger("error:" + error_type, error_code);
                    this.trigger("error", error_type, error_code);
                },

                _clearError: function() {
                    this.__error = null;
                },

                _detachRecorder: function() {
                    if (this.recorder)
                        this.recorder.weakDestroy();
                    this.recorder = null;
                    this.set("hasrecorder", false);
                    // to prevent autorecord if user not set, but use reset()
                    this.set("autorecord", this.get("optionsinitialstate").autorecord);
                },

                _validateParameters: function() {
                    var fitStrategies = ["crop", "pad", "original"];
                    if (!fitStrategies.includes(this.get("videofitstrategy"))) {
                        console.warn("Invalid value for videofitstrategy: " + this.get("videofitstrategy") + "\nPossible values are: " + fitStrategies.slice(0, -1).join(", ") + " or " + fitStrategies.slice(-1));
                    }
                    if (!fitStrategies.includes(this.get("posterfitstrategy"))) {
                        console.warn("Invalid value for posterfitstrategy: " + this.get("posterfitstrategy") + "\nPossible values are: " + fitStrategies.slice(0, -1).join(", ") + " or " + fitStrategies.slice(-1));
                    }
                    if (this.get("stretch") || this.get("stretchwidth") || this.get("stretchheight")) {
                        console.warn("Stretch parameters were deprecated, your player will stretch to the full container width by default.");
                    }

                    var deprecatedCSS = ["minheight", "minwidth", "minheight", "minwidth"];
                    deprecatedCSS.forEach(function(parameter) {
                        if (this.get(parameter)) console.warn(parameter + " parameter was deprecated, please use CSS instead.");
                    }.bind(this));
                },

                _videoRecorderWrapperOptions: function() {
                    var _screen = null;
                    var _resizeMode = this.get("resizemode");
                    if ((this.get("allowscreen") && this.get("record_media") === "screen") || (this.get("allowmultistreams") && this.get("record_media") === "multistream")) {
                        _screen = this.get("screen");
                        if (!_resizeMode) {
                            _resizeMode = 'none';

                        }
                    }
                    if (!this.get("allowrecord") && (this.get("autorecord") || this.get("skipinitial"))) {
                        if (this.get("allowscreen") || this.get("allowmultistreams")) {
                            this.set("record_media", this.get("allowscreen") ? "screen" : "multistream");
                            _screen = {};
                        }
                    }

                    return {
                        simulate: this.get("simulate"),
                        recordVideo: !this.get("onlyaudio"),
                        screenResizeMode: this.get("screenresizemode"),
                        recordAudio: !this.get("noaudio"),
                        recordingWidth: this.get("nativeRecordingWidth"),
                        recordingHeight: this.get("nativeRecordingHeight"),
                        audioBitrate: typeof this.get("audiobitrate") === "number" ? this.get("audiobitrate") : undefined,
                        videoBitrate: typeof this.get("videobitrate") === "number" ? this.get("videobitrate") : undefined,
                        webrtcStreaming: !!this.get("webrtcstreaming"),
                        webrtcStreamingIfNecessary: !!this.get("webrtcstreamingifnecessary"),
                        // webrtcOnMobile: !!this.get("webrtconmobile"),
                        localPlaybackRequested: this.get("localplayback"),
                        screen: _screen,
                        resizeMode: _resizeMode,
                        framerate: this.get("framerate"),
                        flip: this.get("flip-camera"),
                        flipscreen: this.get("flipscreen"),
                        fittodimensions: this.get("fittodimensions"),
                        cpuFriendly: this.get("cpu-friendly")
                    };
                },

                _attachRecorder: function() {
                    if (this.recorderAttached())
                        return;
                    if (!this.__activated) {
                        this.__attachRequested = true;
                        return;
                    }
                    if (this.get("record_media") === "screen" && typeof navigator.mediaDevices !== 'undefined')
                        if (typeof navigator.mediaDevices.getDisplayMedia === "undefined")
                            this.set("webrtcstreaming", true);
                    this.set("hasrecorder", true);
                    this.__attachRequested = false;
                    var video = this.activeElement().querySelector("[data-video='video']");
                    this._clearError();
                    this.recorder = VideoRecorderWrapper.create(Objs.extend({
                        element: video
                    }, this._videoRecorderWrapperOptions()));
                    if (this.recorder) {
                        this.trigger("attached");
                        this.set("pausable", this.get("pausable") && this.recorder.canPause());
                    } else
                        this._error("attach");
                },

                _softwareDependencies: function() {
                    if (!this.recorderAttached() || !this.recorder)
                        return Promise.error("No recorder attached.");
                    return this.recorder.softwareDependencies();
                },

                _bindMedia: function() {
                    if (this._bound || !this.recorderAttached() || !this.recorder)
                        return;
                    this.recorder.ready.success(function() {
                        if (!this.recorder) return;
                        this.recorder.on("require_display", function() {
                            this.set("hideoverlay", true);
                        }, this);
                        this.recorder.bindMedia().error(function(e) {
                            this.trigger("access_forbidden", e);
                            this.set("hideoverlay", false);
                            this.off("require_display", null, this);
                            this._error("bind", e);
                        }, this).success(function() {
                            if (!this.recorder) return;
                            this.trigger("access_granted");
                            this.recorder.setVolumeGain(this.get("microphone-volume"));
                            this.set("hideoverlay", false);
                            this.off("require_display", null, this);
                            this.recorder.once("mainvideostreamended", function() {
                                this.trigger("mainvideostreamended");
                            }, this);
                            this.recorder.enumerateDevices().success(function(devices) {
                                if (!this.recorder) return;
                                this.recorder.once("currentdevicesdetected", function(currentDevices) {
                                    this.set("selectedcamera", currentDevices.video);
                                    this.set("selectedmicrophone", currentDevices.audio);
                                    if (this.get("outsourceSelectors").length > 0) {
                                        this.setOutsourceSelectors(currentDevices);
                                    }
                                }, this);
                                this.set("cameras", new Collection(Objs.values(devices.video)));
                                this.set("microphones", new Collection(Objs.values(devices.audio)));
                                this.trigger(Types.is_empty(devices.video) ? "no_camera" : "has_camera");
                                this.trigger(Types.is_empty(devices.audio) ? "no_microphone" : "has_microphone");
                                this.set("showaddstreambutton", this._showAddStreamButton());
                            }, this);
                            if (!this.get("noaudio"))
                                this.recorder.testSoundLevel(true);
                            this.set("devicetesting", true);
                            while (this.get("snapshots").length > 0) {
                                var snapshot = this.get("snapshots").unshift();
                                this.recorder.removeSnapshot(snapshot);
                            }
                            this._bound = true;
                            this.trigger("bound");
                        }, this);
                    }, this);
                },

                isWebrtcStreaming: function() {
                    return this.recorder && this.recorder.isWebrtcStreaming();
                },

                _showAddStreamButton: function() {
                    return this.get("allowmultistreams") && (this.get("cameras").count() > 1 || this.get("cameras").count() >= 1 && ((this.get("record_media") !== "screen" || (this.get("record_media") !== "multistream"))));
                },

                _initSettings: function() {
                    // Without below line re-recorder will not launch
                    this.set("snapshots", []);
                    this.thumbnails = [];
                    this.__lastCovershotUpload = undefined;
                    this.__pauseDelta = 0;
                    this.set("starttime", undefined);
                    this.set("endtime", undefined);
                    this.set("duration", 0);
                    this.set("videometadata", {
                        "height": null,
                        "width": null,
                        "ratio": null,
                        "thumbnails": {
                            "mainimage": null,
                            "images": []
                        },
                        "placeholderSnapshot": null
                    });
                },

                _initializeUploader: function() {
                    if (this._videoUploader) this._videoUploader.weakDestroy();
                    if (this._dataUploader) this._dataUploader.weakDestroy();
                    this._dataUploader = new MultiUploader();
                },

                _unbindMedia: function() {
                    if (!this._bound)
                        return;
                    this.recorder.unbindMedia();
                    this._bound = false;
                },

                _uploadCovershot: function(image) {
                    if (this.get("simulate"))
                        return;
                    this.__lastCovershotUpload = image;
                    var uploader = this.recorder ?
                        this.recorder.createSnapshotUploader(image, this.get("snapshottype"), this.get("uploadoptions").image) :
                        RecorderSupport.createSnapshotUploader(image, this.get("snapshottype"), this.get("uploadoptions").image);
                    uploader.upload();
                    this._dataUploader.addUploader(uploader);
                },

                _uploadCovershotFile: function(file) {
                    if (this.get("simulate"))
                        return;
                    this.__lastCovershotUpload = file;
                    var uploader = FileUploader.create(Objs.extend({
                        source: file
                    }, this.get("uploadoptions").image));
                    uploader.upload();
                    this._dataUploader.addUploader(uploader);
                },

                /**
                 * Upload single image Blob file with thumbnails to the server
                 * @param {Blob} file
                 * @private
                 */
                _uploadThumbnails: function(file) {
                    if (this.get("simulate"))
                        return;
                    this.set("videometadata", Objs.tree_merge(this.get("videometadata"), {
                        thumbnails: {
                            mainimage: file
                        }
                    }));
                    var uploader = FileUploader.create(Objs.extend({
                        source: file
                    }, this.get("uploadoptions").thumbnail));
                    uploader.upload();
                    this._dataUploader.addUploader(uploader);
                },

                /**
                 * Upload VTT Blob file to the server with all details about thumbnails
                 * @param {Blob} file
                 * @private
                 */
                _uploadThumbnailTracks: function(file) {
                    if (this.get("simulate"))
                        return;
                    var uploader = FileUploader.create(Objs.extend({
                        source: file
                    }, this.get("uploadoptions").tracks));
                    // Add Thumbnails as Track element to the player
                    if (this.get("uploadoptions").tracks.url) {
                        this.get("tracktags").push({
                            kind: 'thumbnails',
                            src: this.get("uploadoptions").tracks.url
                        });
                    }
                    uploader.upload();
                    this._dataUploader.addUploader(uploader);
                },

                _uploadVideoFile: function(file) {
                    if (this.get("simulate"))
                        return;
                    var uploader = FileUploader.create(Objs.extend({
                        source: file
                    }, this.get("uploadoptions").video));
                    uploader.upload();
                    this._videoUploader = uploader;
                    this._dataUploader.addUploader(uploader);
                },

                _prepareRecording: function() {
                    return Promise.create(true);
                },

                _startRecording: function() {
                    if (this.__recording)
                        return Promise.error(true);
                    if (!this.get("noaudio"))
                        this.recorder.testSoundLevel(false);
                    this.set("devicetesting", false);
                    return this.recorder.startRecord({
                        video: this.get("uploadoptions").video,
                        audio: this.get("uploadoptions").audio,
                        webrtcStreaming: this.get("uploadoptions").webrtcStreaming
                    }).success(function() {
                        this.__recording = true;
                        this.__recording_start_time = Time.now();
                    }, this);
                },

                _stopRecording: function() {
                    if (!this.__recording)
                        return Promise.error(true);
                    return this.recorder.stopRecord({
                        video: this.get("uploadoptions").video,
                        audio: this.get("uploadoptions").audio,
                        webrtcStreaming: this.get("uploadoptions").webrtcStreaming,
                        noUploading: this.get("uploadoptions").noUploading
                    }).success(function(uploader) {
                        this.__recording = false;
                        uploader.upload();
                        this._dataUploader.addUploader(uploader);
                    }, this);
                },

                isRecording: function() {
                    return this.__recording;
                },

                isFormatSupported: function() {
                    return (this.recorder && this.recorder.supportsLocalPlayback()) || this._videoFilePlaybackable;
                },

                _verifyRecording: function() {
                    return Promise.create(true);
                },

                _afterActivate: function(element) {
                    inherited._afterActivate.call(this, element);
                    this.set("activated", true);
                    this.__activated = true;
                    if (this.__attachRequested)
                        this._attachRecorder();
                    this.persistentTrigger("loaded");
                    this.activeElement().classList.add(this.get("csscommon") + "-full-width");
                },

                _showBackgroundSnapshot: function() {
                    if (this.get("onlyaudio"))
                        return;
                    this._hideBackgroundSnapshot();
                    if (this.get("snapshots") && this.get("selectfirstcovershotonskip")) {
                        if (this.get("snapshots")[0])
                            this.__backgroundSnapshot = this.get("snapshots")[0];
                    }
                    if (!this.__backgroundSnapshot && this.recorder) {
                        this.__backgroundSnapshot = this.recorder.createSnapshot(this.get("snapshottype"));
                    }
                    var el = this.activeElement().querySelector("[data-video]");
                    var dimensions = Dom.elementDimensions(el);
                    if (this.__backgroundSnapshot) {
                        var _top, _left, _width, _height, _dimensions;
                        _top = 0;
                        _left = 0;
                        _width = dimensions.width;
                        _height = dimensions.height;
                        if (this.recorder._recorder._videoTrackSettings && typeof this.recorder._recorder._videoTrackSettings.videoInnerFrame !== "undefined") {
                            _dimensions = this.recorder._recorder._videoTrackSettings.videoInnerFrame;
                            _width = _dimensions.width || _width;
                            _height = _dimensions.height || _height;
                            _left = (dimensions.width - _width) / 2;
                            _top = (dimensions.height - _height) / 2;
                        }
                        this.__backgroundSnapshotDisplay = this.recorder.createSnapshotDisplay(el, this.__backgroundSnapshot, _left, _top, _width, _height);
                    }

                },

                _hideBackgroundSnapshot: function() {
                    if (this.get("onlyaudio"))
                        return;
                    if (this.__backgroundSnapshotDisplay)
                        this.recorder.removeSnapshotDisplay(this.__backgroundSnapshotDisplay);
                    delete this.__backgroundSnapshotDisplay;
                    if (this.__backgroundSnapshot)
                        this.recorder.removeSnapshot(this.__backgroundSnapshot);
                    delete this.__backgroundSnapshot;
                },

                _getFirstFrameSnapshot: function() {
                    if (this.__firstFrameSnapshot)
                        return Promise.value(this.__firstFrameSnapshot);

                    if (!(this._videoFile || (this.recorder && this.recorder.localPlaybackSource().src)))
                        return Promise.error("No source to get the snapshot from");

                    var promise = Promise.create();
                    var blob = this._videoFile || this.recorder.localPlaybackSource().src;
                    RecorderSupport.createSnapshotFromSource(URL.createObjectURL(blob), this.get("snapshottype"), 0)
                        .success(function(snapshot) {
                            this.__firstFrameSnapshot = snapshot;
                            promise.asyncSuccess(snapshot);
                            URL.revokeObjectURL(blob);
                        }, this)
                        .error(function(error) {
                            promise.asyncError(error);
                            URL.revokeObjectURL(blob);
                        }, this);

                    return promise;
                },

                toggleFaceOutline: function(new_status) {
                    if (typeof new_status === 'undefined') {
                        this.set("faceoutline", !this.get("faceoutline"));
                    } else {
                        this.set("faceoutline", new_status);
                    }
                },

                isMobile: function() {
                    return Info.isMobile();
                },

                object_functions: [
                    "record", "rerecord", "record_screen", "stop", "play", "pause", "reset", "cancel",
                    "pause_recorder", "resume", "upload_video", "upload_covershot", "select_camera",
                    "select_microphone", "add_new_stream", "trim"
                ],

                functions: {

                    cancel: function() {
                        if (confirm(this.stringUnicode("cancel-confirm")))
                            this.execute("reset");
                    },

                    record: function() {
                        if (this._delegatedRecorder) {
                            this._delegatedRecorder.execute("record");
                            return;
                        }
                        this.host.state().record();
                    },

                    record_video: function() {
                        this.host.state().selectRecord();
                    },

                    record_screen: function(isMultiStream) {
                        if (this._delegatedRecorder) {
                            this._delegatedRecorder.execute("record_screen");
                            return;
                        }
                        this.host.state().selectRecordScreen(isMultiStream);
                    },

                    pause_recorder: function() {
                        if (this._delegatedRecorder) {
                            this._delegatedRecorder.execute("pause_recorder");
                            return;
                        }
                        if (typeof this.recorder !== 'undefined') {
                            this.__paused = true;
                            this.__pauseStart = Time.now();
                            this.__recording = false;
                            this.recorder.pauseRecord();
                            this.recorder._recorder.once("paused", function(ev) {
                                this.set("resumevisible", true);
                            }, this);
                        }
                    },

                    resume: function() {
                        if (this._delegatedRecorder) {
                            this._delegatedRecorder.execute("resume");
                            return;
                        }
                        if (typeof this.recorder !== 'undefined')
                            this._resume();
                    },

                    video_file_selected: function(file) {
                        this.__selected_video_file = file;
                        if (!this.get("manual-upload"))
                            this.execute("upload_video");
                    },

                    upload_video: function(file) {
                        this.host.state().selectUpload(file || this.__selected_video_file);
                    },

                    upload_covershot: function(file) {
                        this.host.state().uploadCovershot(file);
                    },

                    select_camera: function(camera_id) {
                        if (this.recorder) {
                            this.recorder.setCurrentDevices({
                                video: camera_id
                            });
                            this.set("showaddstreambutton", this._showAddStreamButton());
                            this.set("selectedcamera", camera_id);
                        }
                    },

                    select_microphone: function(microphone_id) {
                        if (this.recorder) {
                            this.recorder.setCurrentDevices({
                                audio: microphone_id
                            });
                            this.recorder.testSoundLevel(true);
                            this.set("selectedmicrophone", microphone_id);
                        }
                        this.set("microphonehealthy", false);
                    },

                    toggle_face_mode: function() {
                        if (this.recorder) {
                            this.recorder.setCameraFace(this.get("camerafacefront"));
                            this.set("camerafacefront", !this.get("camerafacefront"));
                        }
                    },

                    add_new_stream: function(deviceId) {
                        this._add_new_stream(deviceId);
                    },

                    invoke_skip: function() {
                        this.trigger("invoke-skip");
                    },

                    select_image: function(image) {
                        this.trigger("select-image", image);
                    },

                    rerecord: function() {
                        if (this._delegatedRecorder) {
                            this._delegatedRecorder.execute("rerecord");
                            return;
                        }
                        if (confirm(this.stringUnicode("rerecord-confirm"))) {
                            this.host.state().rerecord();
                            this._initSettings();
                        }
                    },

                    stop: function() {
                        if (this._delegatedRecorder) {
                            this._delegatedRecorder.execute("stop");
                            return;
                        }

                        // If recorder is paused need resume first,
                        // setting this._recording to true also could be enough
                        if (this.__paused)
                            this._resume();

                        this.host.state().stop();
                    },

                    play: function() {
                        if (this._delegatedRecorder) {
                            this._delegatedRecorder.execute("play");
                            return;
                        }
                        this.host.state().play();
                    },

                    pause: function() {
                        if (this._delegatedRecorder) {
                            this._delegatedRecorder.execute("pause");
                            return;
                        }
                        this.host.state().pause();
                    },

                    message_click: function() {
                        this.trigger("message-click");
                    },

                    message_link_click: function(link) {
                        this.trigger("message-link-click", link);
                    },

                    playing: function() {
                        this.trigger("playing");
                    },

                    paused: function() {
                        this.trigger("paused");
                    },

                    ended: function() {
                        this.trigger("ended");
                    },

                    reset: function() {
                        if (this._delegatedRecorder) {
                            this._delegatedRecorder.execute("reset");
                            return;
                        }
                        this._stopRecording().callback(function() {
                            this._unbindMedia();
                            this._hideBackgroundSnapshot();
                            this._detachRecorder();
                            this._initSettings();
                            this.host.state().next("Initial");
                        }, this);
                    },

                    toggle_facemode: function() {
                        this._toggleFaceMode();
                    },

                    trim: function(start, end) {
                        if (this.host.state().state_name() !== "Trimming") return;
                        this.trigger("manual-trim", start, end);
                    },

                    manual_submit: function() {
                        this.set("rerecordable", false);
                        this.set("manualsubmit", false);
                        this.trigger("manually_submitted");
                    },

                    ready_to_play: function() {
                        this.trigger("ready_to_play");
                    }
                },

                _resume: function() {
                    this.__paused = false;
                    this.__pauseDelta += Time.now() - this.__pauseStart;
                    this.__recording = true;
                    this.recorder.resumeRecord();
                    this.recorder._recorder.once("resumed", function() {
                        this.set("resumevisible", false);
                    }, this);
                },

                destroy: function() {
                    this._timer.destroy();
                    this.host.destroy();
                    this._detachRecorder();
                    inherited.destroy.call(this);
                },

                deltaCoefficient: function() {
                    return this.recorderAttached() ? this.recorder.deltaCoefficient() : null;
                },

                blankLevel: function() {
                    return this.recorderAttached() ? this.recorder.blankLevel() : null;
                },

                lightLevel: function() {
                    return this.recorderAttached() ? this.recorder.lightLevel() : null;
                },

                soundLevel: function() {
                    return this.recorderAttached() ? this.recorder.soundLevel() : null;
                },

                _toggleFaceMode: function() {
                    this.set("camerafacefront", !!this.get("camerafacefront"));
                },

                _timerFire: function() {
                    if (this.destroyed())
                        return;
                    this.set("currentorientation", window.innerHeight > window.innerWidth ? "portrait" : "landscape");
                    try {
                        if (this.recorderAttached() && this.get("devicetesting")) {
                            if (!this.get("onlyaudio")) {
                                var lightLevel = this.lightLevel();
                                this.set("camerahealthy", lightLevel >= 100 && lightLevel <= 200);
                            }
                            if (!this.get("noaudio") && !this.get("microphonehealthy") && this.soundLevel() >= 1.01) {
                                this.set("microphonehealthy", true);
                                this.recorder.testSoundLevel(false);
                            }
                        }
                    } catch (e) {}

                    if (!this.get("onlyaudio") && this.__recording) {
                        if (this.get("picksnapshots")) {
                            if (this.__recording_start_time + 500 < Time.now()) {
                                var p = this.get("snapshots").length < this.get("snapshotmax") ? 0.25 : 0.05;
                                if (Math.random() <= p) {
                                    var snap = this.recorder.createSnapshot(this.get("snapshottype"));
                                    if (snap) {
                                        if (!this.get('videometadata').height && typeof Image !== 'undefined' && this.get("createthumbnails")) {
                                            RecorderSupport.snapshotMetaData(snap).success(function(data) {
                                                var _thumbWidth = data.orientation === 'landscape' ? 80 : 35;
                                                this.set("videometadata", Objs.tree_merge(this.get("videometadata"), data));
                                                this.set("videometadata", Objs.tree_merge(this.get("videometadata"), {
                                                    "thumbnails": {
                                                        width: _thumbWidth,
                                                        height: Math.floor(_thumbWidth / data.width * data.height)
                                                    }
                                                }));
                                            }, this);
                                        }
                                        if (this.get("snapshots").length < this.get("snapshotmax")) {
                                            this.get("snapshots").push(snap);
                                        } else {
                                            var i = Math.floor(Math.random() * this.get("snapshotmax"));
                                            this.recorder.removeSnapshot(this.get("snapshots")[i]);
                                            this.get("snapshots")[i] = snap;
                                        }

                                        if (this.get("createthumbnails")) {
                                            var _currentRecordingSecond = Math.floor((Time.now() - this.__recording_start_time) / 1000);
                                            var _thumbLatestIndex = this.get("videometadata").thumbnails.images.length > 1 ? this.get("videometadata").thumbnails.images.length - 1 : 0;
                                            var _latestThumb = this.get("videometadata").thumbnails.images[_thumbLatestIndex];

                                            // Add thumb each 2 seconds
                                            if (typeof _latestThumb !== 'undefined') {
                                                if (_currentRecordingSecond > _latestThumb.time + 1) {
                                                    this.get("videometadata").thumbnails.images.push({
                                                        time: _currentRecordingSecond,
                                                        snap: snap
                                                    });
                                                }
                                            } else {
                                                this.get("videometadata").thumbnails.images.push({
                                                    time: _currentRecordingSecond,
                                                    snap: snap
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            // took snap only one for background view
                            if (!this.get("videometadata").processingPlaceholder) {
                                this.get("videometadata").processingPlaceholder = this.recorder.createSnapshot(this.get("snapshottype"));
                            }
                        }
                    }

                    try {
                        if (this.recorderAttached() && this._timer.fire_count() % 20 === 0 && this._accessing_camera) {
                            var signal = this.blankLevel() >= 0.01;
                            if (signal !== this.__cameraSignal) {
                                this.__cameraSignal = signal;
                                this.trigger(signal ? "camera_signal" : "camera_nosignal");
                            }
                        }
                        if (this.recorderAttached() && this._timer.fire_count() % 20 === 10 && this._accessing_camera) {
                            var delta = this.recorder.deltaCoefficient();
                            var responsive = delta === null || delta >= 0.5;
                            if (responsive !== this.__cameraResponsive) {
                                this.__cameraResponsive = responsive;
                                this.trigger(responsive ? "camera_responsive" : "camera_unresponsive");
                            }
                        }
                    } catch (e) {}

                    this._updateCSSSize();
                },

                domDimensions: function() {
                    return Dom.elementDimensions(this.activeElement().childNodes[0]);
                },

                _updateCSSSize: function() {
                    var width = this.domDimensions().width;
                    this.set("csssize", width > 400 ? "normal" : (width > 300 ? "medium" : "small"));
                },

                videoHeight: function() {
                    var _clientHeight = (window.innerHeight || document.body.clientHeight);
                    if (!this.recorderAttached())
                        return _clientHeight;
                    else {
                        var _height = this.recorder.cameraHeight();
                        return _height > _clientHeight ? _clientHeight : _height;
                    }
                },

                videoWidth: function() {
                    var _clientWidth = (window.innerWidth || document.body.clientWidth);
                    if (!this.recorderAttached())
                        return _clientWidth;
                    else {
                        var _width = this.recorder.cameraWidth();
                        return _width > _clientWidth ? _clientWidth : _width;
                    }
                },

                aspectRatio: function() {
                    var width = this.videoWidth();
                    var height = this.videoHeight();
                    return width / height;
                },

                isPortrait: function() {
                    if (typeof this.recorder !== "undefined") {
                        if (typeof this.recorder._recorder._videoTrackSettings !== "undefined") {
                            return this.recorder._recorder._videoTrackSettings.aspectRatio < 1.0;
                        }
                    }

                    return this.aspectRatio() < 1.00;
                },

                isLandscape: function() {
                    return !this.isPortrait();
                },

                parentWidth: function() {
                    return this.get("width") || Dom.elementDimensions(this.activeElement()).width;
                },

                parentHeight: function() {
                    return this.get("height") || Dom.elementDimensions(this.activeElement()).height;
                },

                parentAspectRatio: function() {
                    return this.parentWidth() / this.parentHeight();
                },

                averageFrameRate: function() {
                    return this.recorderAttached() ? this.recorder.averageFrameRate() : null;
                },

                cloneAttrs: function() {
                    return Objs.map(this.attrs, function(value, key) {
                        return this.get(key);
                    }, this);
                },

                popupAttrs: function() {
                    return {
                        popup: false,
                        width: this.get("popup-width"),
                        height: this.get("popup-height")
                    };
                },

                imageUploaded: function() {
                    return !!this.__lastCovershotUpload;
                },

                audioUploaded: function() {
                    return this.recorder && this.recorder.localPlaybackSource() && !!this.recorder.localPlaybackSource().audiosrc;
                },

                /**
                 *
                 * @param {boolean =} setFalse
                 * @private
                 */
                _screenRecorderVerifier: function(setFalse) {
                    if (setFalse) {
                        this.set("allowscreen", false);
                        this.set("allowmultistreams", false);
                    }
                    if ((this.get("allowscreen") || this.get("allowmultistreams")) && this.get("screenrecordmandatory") && !Info.isScreenRecorderSupported()) {
                        this.get("initialmessages").push({
                            id: typeof Date.now !== 'undefined' ? +Date.now() : 1498744,
                            message: this.string("screen-recorder-is-not-supported"),
                            type: 'warning'
                        });
                    }
                },

                /**
                 * Will add new stream based on provided ID
                 * @param deviceId
                 */
                _add_new_stream: function(deviceId) {
                    var _selected;
                    var _currentTracks = this.recorder._recorder.stream().getTracks();
                    this.get("cameras").iterate(function(videoDevice) {
                        var _videoDevice = videoDevice.data();
                        deviceId = deviceId || _videoDevice.id; // In case if argument is empty take any video source
                        if (!_selected && deviceId === _videoDevice.id) {
                            this.set("loadlabel", this.string("adding-new-stream"));
                            this.set("loader_active", true);
                            this.recorder.addMultiStream(_videoDevice, {
                                positionX: this.get("addstreampositionx"),
                                positionY: this.get("addstreampositiony"),
                                width: this.get("addstreampositionwidth"),
                                height: this.get("addstreampositionheight")
                            }, _currentTracks).success(function(stream) {
                                _selected = true;
                                this.set("addstreamdeviceid", deviceId);
                                if (!this.get("addstreampositionheight")) {
                                    var _height, _aspectRatio;
                                    _aspectRatio = 1.333;
                                    if (typeof stream.getTracks()[0] !== 'undefined') {
                                        var _settings = stream.getTracks()[0].getSettings();
                                        if (_settings.aspectRatio) {
                                            _aspectRatio = _settings.aspectRatio;
                                        } else if (_settings.height > 0 && _settings.width > 0) {
                                            _aspectRatio = Math.round((_settings.width / _settings.height) * 100) / 100;
                                        }
                                    }

                                    if (_aspectRatio)
                                        _height = this.get("addstreampositionwidth") / _aspectRatio;
                                    else
                                        _height = Math.round(this.get("addstreampositionwidth") / 1.33);

                                    this.set("addstreampositionheight", _height);
                                }
                                this.set("loadlabel", "");
                                this.set("loader_active", false);
                                this.set("showaddstreambutton", false);
                                if (this.get("allowmultistreams") && (this.get("multistreamreversable") || this.get("multistreamdraggable") || this.get("multistreamresizeable"))) {
                                    this.set("helperframe_active", true);
                                    this.set("framevisible", true);
                                }
                            }, this).error(function(message) {
                                console.warn(message);
                                this.set("loadlabel", message);
                                this.set("loader_active", false);
                            }, this);
                        }
                    }, this);
                },

                /**
                 * Will set settings on outsource elements
                 */
                setOutsourceSelectors: function(choosenDevices) {
                    Objs.map(this.get("outsourceSelectors"), function(item) {
                        var options = item.options;
                        var element = document.getElementById(item.selector);
                        if (element) {
                            var isCamera = item.isCamera;
                            var choosenDevice = choosenDevices[isCamera ? 'video' : 'audio'];
                            if ((options.type === "select" && element.tagName !== "SELECT") || (options.type !== "select" && element.tagName === "SELECT")) {
                                var message = "You sould provide correct element selector, option element could be only select element child";
                                var childNode = document.createTextNode(message);
                                if (element.tagName === "SELECT") {
                                    var textNode = childNode;
                                    childNode = document.createElement('option');
                                    childNode.appendChild(textNode);
                                }
                                element.appendChild(childNode);
                                console.warn(message);
                            } else {
                                this.__buildOutsourceElement(element, item.options, isCamera, choosenDevice);
                            }
                        } else {
                            console.warn("There are no element with id: " + item.selector + " to implement 'outsource-selectors'");
                        }
                    }, this);
                },

                /**
                 * Just Helper funtion build outsources elements
                 * @param element
                 * @param options
                 * @param isCamera
                 * @param choosenDevice
                 * @private
                 */
                __buildOutsourceElement: function(element, options, isCamera, choosenDevice) {
                    var self = this;
                    var deviceCollections = isCamera ? this.get("cameras") : this.get("microphones");
                    var listeners = [];
                    var initialSelectorText = '';
                    element.disabled = deviceCollections.count() <= 1 && options.disabled;
                    if (deviceCollections.count() > 0) {
                        // Clear initial select content
                        if (options.type === "select" && element.options) {
                            if (Types.is_defined(element.options[0]))
                                initialSelectorText = element.options[0].innerText;
                            while (element.options.length > 0) {
                                element.remove(0);
                            }
                        }

                        deviceCollections.iterate(function(device) {
                            var _details = '';
                            if (options.showCapabilities && isCamera) {
                                var capabilities = device.get("capabilities");
                                if (capabilities) {
                                    if (typeof capabilities.width !== "undefined" && typeof capabilities.height !== "undefined") {
                                        _details = '(' + capabilities.width.max + 'x' + capabilities.height.max + ')';
                                    }
                                }
                            }

                            var id = device.get("id");
                            var label = device.get("label");

                            if (options.type === "select" && element.tagName === "SELECT") {
                                var option = document.createElement('option');
                                option.value = id;
                                option.innerText = label + _details;
                                option.selected = id === choosenDevice;
                                if (options.className) option.className += options.className;
                                element.appendChild(option);
                            }

                            if (options.type === "radio") {
                                var radioInput = document.createElement('input');
                                var radioInputLabel = document.createElement('label');
                                radioInput.name = self.get("css") + (isCamera ? '-cam' : '-mic') + '-radio-input';
                                radioInput.type = 'radio';
                                if (options.className) {
                                    radioInputLabel.className += options.className;
                                }

                                radioInputLabel.setAttribute('for', this.get("css") + id);
                                radioInput.value = id;
                                radioInput.checked = id === choosenDevice;
                                // radioInputLabel.innerText = label + _details;
                                var radioInputTextNode = document.createTextNode(label + _details);

                                radioInputLabel.appendChild(radioInput);
                                radioInputLabel.appendChild(radioInputTextNode);
                                element.appendChild(radioInputLabel);

                                // Add event listener on change
                                radioInput.addEventListener("change", function(ev) {
                                    var _radio = ev.target;
                                    var value = _radio.value;
                                    if (_radio.checked && value) {
                                        if (isCamera) {
                                            self.select_camera(value);
                                        } else {
                                            self.select_microphone(value);
                                        }
                                    }
                                });
                                listeners.push({
                                    type: "change",
                                    element: radioInput,
                                    container: radioInputLabel
                                });
                            }
                        }, this);

                        // Add event listener on change
                        if (options.type === "select") {
                            listeners.push({
                                type: "change",
                                element: element
                            });
                            element.addEventListener("change", function(ev) {
                                Array.from(ev.target.options).forEach(function(option) {
                                    var value = option.value;
                                    if (option.selected && value) {
                                        if (isCamera) {
                                            self.select_camera(value);
                                        } else {
                                            self.select_microphone(value);
                                        }
                                    }
                                });
                            });
                        }

                        self.on("recording", function() {
                            if (listeners.length > 0) {
                                Objs.map(listeners, function(listener) {
                                    var type = listener.type;
                                    var el = listener.element;
                                    var container = listener.container || el;
                                    removeEventListener(type, el);
                                    if (!Types.is_undefined(container.options)) {
                                        while (container.options.length > 0) {
                                            container.remove(0);
                                        }
                                        var option = document.createElement('option');
                                        var textNode = document.createTextNode(initialSelectorText);
                                        option.appendChild(textNode);
                                        container.appendChild(option);
                                    } else {
                                        container.parentNode.removeChild(container);
                                    }
                                });
                            }
                        });
                    }
                }
            };
        }], {

            recorderStates: function() {
                return [RecorderStates];
            }

        })
        .register("ba-videorecorder")
        .registerFunctions({
            /**/"!player_active": function (obj) { return !obj.player_active; }, "css": function (obj) { return obj.css; }, "csstheme": function (obj) { return obj.csstheme; }, "csssize": function (obj) { return obj.csssize; }, "iecss": function (obj) { return obj.iecss; }, "ie8 ? 'ie8' : 'noie8'": function (obj) { return obj.ie8 ? 'ie8' : 'noie8'; }, "fullscreened ? 'fullscreen' : 'normal'": function (obj) { return obj.fullscreened ? 'fullscreen' : 'normal'; }, "cssrecorder": function (obj) { return obj.cssrecorder; }, "firefox ? 'firefox' : 'common'": function (obj) { return obj.firefox ? 'firefox' : 'common'; }, "themecolor": function (obj) { return obj.themecolor; }, "csscommon": function (obj) { return obj.csscommon; }, "containerSizingStyles": function (obj) { return obj.containerSizingStyles; }, "hasrecorder ? 'hasrecorder' : 'norecorder'": function (obj) { return obj.hasrecorder ? 'hasrecorder' : 'norecorder'; }, "faceoutline && hasrecorder && isrecorderready": function (obj) { return obj.faceoutline && obj.hasrecorder && obj.isrecorderready; }, "placeholderstyle": function (obj) { return obj.placeholderstyle; }, "hasplaceholderstyle ? (css + '-overlay-with-placeholder') : ''": function (obj) { return obj.hasplaceholderstyle ? (obj.css + '-overlay-with-placeholder') : ''; }, "!hideoverlay": function (obj) { return !obj.hideoverlay; }, "dynloader": function (obj) { return obj.dynloader; }, "cssloader || css": function (obj) { return obj.cssloader || obj.css; }, "cssrecorder || css": function (obj) { return obj.cssrecorder || obj.css; }, "tmplloader": function (obj) { return obj.tmplloader; }, "loader_active": function (obj) { return obj.loader_active; }, "loadertooltip": function (obj) { return obj.loadertooltip; }, "hovermessage": function (obj) { return obj.hovermessage; }, "loaderlabel": function (obj) { return obj.loaderlabel; }, "dynmessage": function (obj) { return obj.dynmessage; }, "cssmessage || css": function (obj) { return obj.cssmessage || obj.css; }, "tmplmessage": function (obj) { return obj.tmplmessage; }, "message_active": function (obj) { return obj.message_active; }, "message": function (obj) { return obj.message; }, "message_links": function (obj) { return obj.message_links; }, "dyntopmessage": function (obj) { return obj.dyntopmessage; }, "csstopmessage || css": function (obj) { return obj.csstopmessage || obj.css; }, "tmpltopmessage": function (obj) { return obj.tmpltopmessage; }, "topmessage_active && (topmessage || hovermessage)": function (obj) { return obj.topmessage_active && (obj.topmessage || obj.hovermessage); }, "hovermessage || topmessage": function (obj) { return obj.hovermessage || obj.topmessage; }, "dynchooser": function (obj) { return obj.dynchooser; }, "chooser_active && !is_initial_state": function (obj) { return obj.chooser_active && !obj.is_initial_state; }, "onlyaudio": function (obj) { return obj.onlyaudio; }, "facecamera": function (obj) { return obj.facecamera; }, "recordviafilecapture": function (obj) { return obj.recordviafilecapture; }, "csschooser || css": function (obj) { return obj.csschooser || obj.css; }, "tmplchooser": function (obj) { return obj.tmplchooser; }, "allowscreen": function (obj) { return obj.allowscreen; }, "allowmultistreams": function (obj) { return obj.allowmultistreams; }, "popup": function (obj) { return obj.popup; }, "allowrecord": function (obj) { return obj.allowrecord; }, "allowupload": function (obj) { return obj.allowupload; }, "allowcustomupload": function (obj) { return obj.allowcustomupload; }, "allowedextensions": function (obj) { return obj.allowedextensions; }, "primaryrecord": function (obj) { return obj.primaryrecord; }, "initialmessages": function (obj) { return obj.initialmessages; }, "timelimit": function (obj) { return obj.timelimit; }, "dynimagegallery": function (obj) { return obj.dynimagegallery; }, "imagegallery_active": function (obj) { return obj.imagegallery_active; }, "cssimagegallery || css": function (obj) { return obj.cssimagegallery || obj.css; }, "tmplimagegallery": function (obj) { return obj.tmplimagegallery; }, "gallerysnapshots": function (obj) { return obj.gallerysnapshots; }, "snapshots": function (obj) { return obj.snapshots; }, "nativeRecordingWidth": function (obj) { return obj.nativeRecordingWidth; }, "nativeRecordingHeight": function (obj) { return obj.nativeRecordingHeight; }, "dyncontrolbar": function (obj) { return obj.dyncontrolbar; }, "csscontrolbar || css": function (obj) { return obj.csscontrolbar || obj.css; }, "csstheme || css": function (obj) { return obj.csstheme || obj.css; }, "tmplcontrolbar": function (obj) { return obj.tmplcontrolbar; }, "controlbar_active": function (obj) { return obj.controlbar_active; }, "cameras": function (obj) { return obj.cameras; }, "microphones": function (obj) { return obj.microphones; }, "noaudio": function (obj) { return obj.noaudio; }, "record_media==='screen' || record_media==='multistream'": function (obj) { return obj.record_media==='screen' || obj.record_media==='multistream'; }, "selectedcamera || 0": function (obj) { return obj.selectedcamera || 0; }, "selectedmicrophone || 0": function (obj) { return obj.selectedmicrophone || 0; }, "addstreamdeviceid || null": function (obj) { return obj.addstreamdeviceid || null; }, "showaddstreambutton": function (obj) { return obj.showaddstreambutton; }, "camerahealthy": function (obj) { return obj.camerahealthy; }, "microphonehealthy": function (obj) { return obj.microphonehealthy; }, "settingsvisible": function (obj) { return obj.settingsvisible; }, "recordvisible": function (obj) { return obj.recordvisible; }, "allowcancel && cancancel": function (obj) { return obj.allowcancel && obj.cancancel; }, "uploadcovershotvisible": function (obj) { return obj.uploadcovershotvisible; }, "rerecordvisible": function (obj) { return obj.rerecordvisible; }, "stopvisible": function (obj) { return obj.stopvisible; }, "skipvisible": function (obj) { return obj.skipvisible; }, "controlbarlabel": function (obj) { return obj.controlbarlabel; }, "mintimeindicator": function (obj) { return obj.mintimeindicator; }, "timeminlimit": function (obj) { return obj.timeminlimit; }, "resumevisible": function (obj) { return obj.resumevisible; }, "pausable": function (obj) { return obj.pausable; }, "firefox": function (obj) { return obj.firefox; }, "dynhelperframe": function (obj) { return obj.dynhelperframe; }, "helperframe_active || framevisible": function (obj) { return obj.helperframe_active || obj.framevisible; }, "tmphelperframe": function (obj) { return obj.tmphelperframe; }, "multistreamreversable": function (obj) { return obj.multistreamreversable; }, "multistreamdraggable": function (obj) { return obj.multistreamdraggable; }, "multistreamresizeable": function (obj) { return obj.multistreamresizeable; }, "addstreampositionx": function (obj) { return obj.addstreampositionx; }, "addstreampositiony": function (obj) { return obj.addstreampositiony; }, "addstreamproportional": function (obj) { return obj.addstreamproportional; }, "flip-camera": function (obj) { return obj.flip-obj.camera; }, "player_active": function (obj) { return obj.player_active; }, "ie8": function (obj) { return obj.ie8; }, "dynvideoplayer": function (obj) { return obj.dynvideoplayer; }, "theme || 'default'": function (obj) { return obj.theme || 'default'; }, "localplayback ? playbacksource : ''": function (obj) { return obj.localplayback ? obj.playbacksource : ''; }, "localplayback ? playbackposter : ''": function (obj) { return obj.localplayback ? obj.playbackposter : ''; }, "localplayback": function (obj) { return obj.localplayback; }, "false": function (obj) { return false; }, "showplayersettingsmenu": function (obj) { return obj.showplayersettingsmenu; }, "playerattrs": function (obj) { return obj.playerattrs; }, "duration": function (obj) { return obj.duration; }, "rerecordable && (recordings === null || recordings > 0)": function (obj) { return obj.rerecordable && (obj.recordings === null || obj.recordings > 0); }, "manualsubmit && verified": function (obj) { return obj.manualsubmit && obj.verified; }, "true": function (obj) { return true; }, "autoplay": function (obj) { return obj.autoplay; }, "nofullscreen": function (obj) { return obj.nofullscreen; }, "playertopmessage": function (obj) { return obj.playertopmessage; }, "allowtexttrackupload": function (obj) { return obj.allowtexttrackupload; }, "uploadtexttracksvisible": function (obj) { return obj.uploadtexttracksvisible; }, "snapshottype": function (obj) { return obj.snapshottype; }, "tracktags": function (obj) { return obj.tracktags; }, "tracktagsstyled": function (obj) { return obj.tracktagsstyled; }, "trackcuetext": function (obj) { return obj.trackcuetext; }, "acceptedtracktexts": function (obj) { return obj.acceptedtracktexts; }, "sharevideo": function (obj) { return obj.sharevideo; }, "videofitstrategy": function (obj) { return obj.videofitstrategy; }, "posterfitstrategy": function (obj) { return obj.posterfitstrategy; }, "tracksshowselection": function (obj) { return obj.tracksshowselection; }, "trackselectorhovered": function (obj) { return obj.trackselectorhovered; }, "uploadlocales": function (obj) { return obj.uploadlocales; }, "frameselectionmode": function (obj) { return obj.frameselectionmode; }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "recorder-error": "An error occurred, please try again later. Click to retry.",
            "attach-error": "We could not access the media interface. Depending on the device and browser, you might need to access the page via SSL.",
            "software-required": "Please click below to install / activate the following requirements in order to proceed.",
            "software-waiting": "Waiting for the requirements to be installed / activated. You might need to refresh the page after completion.",
            "access-forbidden": "Access to the media was forbidden. Click to retry.",
            "pick-covershot": "Pick a covershot.",
            "pick-covershot-frame": "Select a frame to use as covershot.",
            "framerate-warning": "The video frame rate is very low. We recommend closing all other programs and browser tabs or to use a faster computer.",
            "uploading": "Uploading",
            "uploading-src-error": "Unable to play back video now, uploading is still in progress",
            "uploading-failed": "Uploading failed - click here to retry.",
            "upload-error-duration": "Length of the uploaded video does not meet the requirements - click here to retry.",
            "resolution-constraint-error": "The file you've selected does not match the required resolution - click here to retry.",
            "verifying": "Verifying",
            "verifying-failed": "Verifying failed - click here to retry.",
            "rerecord-confirm": "Do you really want to redo your video?",
            "cancel-confirm": "Do you really want to cancel your video upload?",
            "video_file_too_large": "Your video file is too large (%s) - click here to try again with a smaller video file.",
            "unsupported_video_type": "Please upload: %s - click here to retry.",
            "orientation-portrait-required": "Please rotate your device to record in portrait mode.",
            "orientation-landscape-required": "Please rotate your device to record in landscape mode.",
            "switch-camera": "Switch camera",
            "prepare-covershot": "Preparing covershots",
            "prepare-thumbnails": "Preparing seeking thumbnails",
            "adding-new-stream": "Adding New Stream",
            "missing-track": "Required audio or video track is missing",
            "device-already-in-use": "At least one of your input devices are already in use",
            "browser-permission-denied": "Permission denied by browser, please grant access and reload page",
            "screen-recorder-is-not-supported": "Screen recorder is not supported on this device",
            "trim-prompt": "Do you want to trim your video?",
            "trim-video": "Move the start and end markers to trim your video",
            "wait-for-trim": "Waiting for trim command...",
            "supported-mode": "Media resolution should be in '%s' mode.",
            "re-choose-action": "Please click to choose another input device or retry action."
        });
});
Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.State", [
    "base:States.State",
    "base:Events.ListenMixin",
    "base:Objs"
], function(State, ListenMixin, Objs, scoped) {
    return State.extend({
        scoped: scoped
    }, [ListenMixin, {

        dynamics: [],

        _start: function() {
            this.dyn = this.host.dynamic;
            Objs.iter(Objs.extend({
                "message": false,
                "chooser": false,
                "topmessage": false,
                "controlbar": false,
                "loader": false,
                "imagegallery": false,
                "helperframe": false
            }, Objs.objectify(this.dynamics)), function(value, key) {
                this.dyn.set(key + "_active", value);
            }, this);
            this.dyn.set("placeholderStyle", "");
            this.dyn.set("playertopmessage", "");
            this.dyn.set("message_links", null);
            this.dyn._accessing_camera = false;
            this._started();
        },

        _started: function() {},

        record: function() {
            this.dyn.set("autorecord", true);
        },

        stop: function() {
            this.dyn.scopes.player.execute('stop');
        },

        play: function() {
            this.dyn.scopes.player.execute('play');
        },

        pause: function() {
            this.dyn.scopes.player.execute('pause');
        },

        rerecord: function() {},

        selectRecord: function() {},

        selectRecordScreen: function(isMultiStream) {},

        selectUpload: function(file) {},

        uploadCovershot: function(file) {},

        checkOrientation: function(isPortrait, next) {
            next = next || "FatalError";
            if (this.dyn.get("media-orientation")) {
                if (
                    (this.dyn.get("media-orientation") === "portrait" && !isPortrait) ||
                    (this.dyn.get("media-orientation") === "landscape" && isPortrait)
                ) {
                    this.dyn.set("recordvisible", false);
                    var message = this.dyn.string("supported-mode")
                        .replace("%s", isPortrait ? "landscape" : "portrait");
                    message += " " + this.dyn.string("re-choose-action");
                    this.next(next, {
                        message: message,
                        retry: "Chooser"
                    });
                    return false;
                }
            }
            return true;
        }


    }]);
});



Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.FatalError", [
    "module:VideoRecorder.Dynamics.RecorderStates.State",
    "browser:Info",
    "base:Timers.Timer"
], function(State, Info, Timer, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],
        _locals: ["message", "retry"],

        _started: function() {
            this.dyn.set("message", this._message || this.dyn.string("recorder-error"));
            this.dyn.set("shortMessage", this.dyn.get("message").length < 30);
            this.listenOn(this.dyn, "message-click", function() {
                this.dyn.set("placeholderstyle", "");
                if (this._retry)
                    this.next(this._retry);
            });
        }
    });
});

Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.ChooseAlternativeDevice", [
    "module:VideoRecorder.Dynamics.RecorderStates.State",
    "browser:Info"
], function(State, Info, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],
        _locals: ["message", "retry"],


        _started: function() {
            this.dyn.set("controlbar_active", true);
            this.dyn.set("message", this._message || this.dyn.string("recorder-error"));
            this.dyn.set("shortMessage", this.dyn.get("message").length < 30);

            this.listenOn(this.dyn, "message-click", function() {
                this.next("Chooser");
            }, this);

            // source
            // this.listenOn(this.dyn, "change:selectedcamera", function() {
            if (typeof this.dyn.recorder._recorder !== "undefined") {
                this.listenOn(this.dyn.recorder._recorder, "rebound", function() {
                    if (Info.isChromiumBased())
                        this.next("CameraHasAccess");
                }, this);
            }
        }
    });
});


Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.Initial", [
    "module:VideoRecorder.Dynamics.RecorderStates.State",
    "browser:Dom"
], function(State, Dom, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        _started: function() {
            this.dyn.set("is_initial_state", true);
            this.dyn.set("verified", false);
            this.dyn.set("playbacksource", null);
            this.dyn.set("playbackposter", null);
            this.dyn.set("player_active", false);
            // On rerecord need to setup as empty
            this.dyn.set("placeholderstyle", "");
            this.dyn._videoFileName = null;
            this.dyn._videoFile = null;
            this.dyn._videoFilePlaybackable = false;
            this.dyn.__firstFrameSnapshot = null;
            this.dyn._initializeUploader();
            if (!this.dyn.get("recordermode")) {
                if (!this.dyn.get("video")) {
                    console.warn("recordermode:false requires an existing video to be present and provided.");
                    this.dyn.set("recordermode", true);
                } else
                    this.next("Player");
            } else if (this.dyn.get("autorecord") || this.dyn.get("skipinitial"))
                if (this.dyn.get("onlyaudio")) {
                    Dom.userInteraction(function() {
                        this.eventualNext("RequiredSoftwareCheck");
                    }, this);
                } else {
                    this.eventualNext("RequiredSoftwareCheck");
                }
            else
                this.next("Chooser");
        },

        _end: function() {
            this.dyn.set("is_initial_state", false);
        }

    });
});


Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.Player", [
    "module:VideoRecorder.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        rerecord: function() {
            this.dyn.trigger("rerecord");
            this.dyn.set("recordermode", true);
            this.next("Initial");
        },

        _started: function() {
            this.dyn.set("player_active", true);
            if (this.dyn.get("allowtexttrackupload"))
                this.dyn.set("uploadtexttracksvisible", true);
        },

        _end: function() {
            this.dyn.set("player_active", false);
            this.dyn.set("uploadtexttracksvisible", false);
        }

    });
});


Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.Chooser", [
    "module:VideoRecorder.Dynamics.RecorderStates.State",
    "base:Strings",
    "base:Objs",
    "browser:Info",
    "module:PopupHelper",
    "media:Player.Support"
], function(State, Strings, Objs, Info, PopupHelper, PlayerSupport, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["chooser"],

        _started: function() {
            this.listenOn(this.dyn, "change:orientation change:currentorientation", function() {
                var orientation = this.dyn.get("orientation");
                var currentorientation = this.dyn.get("currentorientation");
                var result = orientation && orientation !== currentorientation;
                if (result)
                    this.dyn.set("message", this.dyn.string("orientation-" + orientation + "-required"));
                this.dyn.set("message_active", result);
                this.dyn.set("chooser_active", !result);
            }, this, {
                initcall: true
            });
        },

        _popup: function() {
            var popup = this.auto_destroy(new PopupHelper());
            var dynamic = this.auto_destroy(new this.dyn.cls({
                element: popup.containerInner,
                attrs: Objs.extend(this.dyn.cloneAttrs(), this.dyn.popupAttrs())
            }));
            this._delegatedRecorder = dynamic;
            this.dyn.delegateEvents(null, dynamic);
            popup.on("hide", function() {
                this._delegatedRecorder = null;
                dynamic.destroy();
                popup.destroy();
            }, this);
            popup.show();
            dynamic.activate();
        },

        record: function() {
            if (this.dyn.get("popup")) {
                this._popup();
                return;
            }
            this.dyn.set("autorecord", true);
            this.selectRecord();
        },

        /**
         * Will launch multistream
         * @param isMultiStream // Does stream has additional stream
         */
        selectRecordScreen: function(isMultiStream) {
            if (this.dyn.get("popup")) {
                this._popup();
                return;
            }
            this.dyn.set("record_media", isMultiStream ? "multistream" : "screen");
            this.next("RequiredSoftwareCheck");
        },

        selectRecord: function() {
            if (this.dyn.get("popup")) {
                this._popup();
                return;
            }
            this.dyn.set("record_media", "camera");
            this.next("RequiredSoftwareCheck");
        },

        selectUpload: function(file) {
            if (this.dyn.get("popup")) {
                this._popup();
                return;
            }
            if (!(Info.isMobile() && Info.isAndroid() && Info.isCordova())) {
                if (this.dyn.get("allowedextensions")) {
                    var filename = (file.files[0].name || "").toLowerCase();
                    var found = false;
                    this.dyn.get("allowedextensions").forEach(function(extension) {
                        if (Strings.ends_with(filename, "." + extension.toLowerCase()))
                            found = true;
                    }, this);
                    if (!found) {
                        var error_message = this.dyn.string("unsupported_video_type").replace("%s", this.dyn.get("allowedextensions").join(" / "));
                        this.dyn.trigger("error", {
                            error_type: "upload",
                            error_code: error_message
                        });
                        this.next("FatalError", {
                            message: error_message,
                            retry: "Chooser"
                        });
                        return;
                    }
                }
                if (this.dyn.get("filesizelimit") && file.files && file.files.length > 0 && file.files[0].size && file.files[0].size > this.dyn.get("filesizelimit")) {
                    var fact = "KB";
                    var size = Math.round(file.files[0].size / 1000);
                    var limit = Math.round(this.dyn.get("filesizelimit") / 1000);
                    if (size > 999) {
                        fact = "MB";
                        size = Math.round(size / 1000);
                        limit = Math.round(limit / 1000);
                    }
                    this.next("FatalError", {
                        message: this.dyn.string("video_file_too_large").replace("%s", size + fact + " / " + limit + fact),
                        retry: "Chooser"
                    });
                    return;
                }
            }
            try {
                PlayerSupport.videoFileInfo(file.files[0]).success(function(data) {

                    if (typeof data.width !== "undefined" && typeof data.height !== "undefined")
                        if (!this.checkOrientation((data.width / data.height) > 1))
                            return;

                    if (data.duration && this.dyn.get("enforce-duration")) {
                        if ((this.dyn.get("timeminlimit") && data.duration < this.dyn.get("timeminlimit")) || (this.dyn.get("timelimit") && data.duration > this.dyn.get("timelimit"))) {
                            this.next("FatalError", {
                                message: this.dyn.string("upload-error-duration"),
                                retry: "Chooser"
                            });
                            return;
                        }
                    }
                    if ((data.width && this.dyn.get("minuploadingwidth") && this.dyn.get("minuploadingwidth") > data.width) ||
                        (data.width && this.dyn.get("maxuploadingwidth") && this.dyn.get("maxuploadingwidth") < data.width) ||
                        (data.height && this.dyn.get("minuploadingheight") && this.dyn.get("minuploadingheight") > data.height) ||
                        (data.height && this.dyn.get("maxuploadingheight") && this.dyn.get("maxuploadingheight") < data.height)) {
                        this.next("FatalError", {
                            message: this.dyn.string("resolution-constraint-error"),
                            retry: "Chooser"
                        });
                        return;
                    }
                    this.dyn._videoFilePlaybackable = true;
                    this.dyn.set("duration", data.duration);
                    if (data.width <= 0 || data.height <= 0) {
                        this.dyn._videoFilePlaybackable = false;
                        this.dyn.set("media_src_not_supported", true);
                        this._disablePlaybackOnRecorder();
                    }
                    this._uploadFile(file);
                }, this).error(function(e) {
                    if (e.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                        this.dyn.set("media_src_not_supported", true);
                        this._disablePlaybackOnRecorder();
                    }
                    this._uploadFile(file);
                }, this);
            } catch (e) {
                this._uploadFile(file);
            }
        },

        /**
         * @param {File} file
         * @private
         */
        _uploadFile: function(file) {
            if (this.__blocked)
                return;
            this.__blocked = true;
            this.dyn.set("creation-type", Info.isMobile() ? "mobile" : "upload");
            try {
                this.dyn._videoFileName = file.files[0].name;
                this.dyn._videoFile = file.files[0];
            } catch (e) {}
            this.dyn._prepareRecording().success(function() {
                this.dyn.trigger("upload_selected", file);
                this.dyn._uploadVideoFile(file);
                this._setValueToEmpty(file);
                this.__blocked = false;
                this.next("CovershotSelection");
            }, this).error(function(s) {
                this._setValueToEmpty(file);
                this.__blocked = false;
                this.next("FatalError", {
                    message: s,
                    retry: "Chooser"
                });
            }, this);
        },

        /**
         * Try to fix twice file upload behaviour, (on change event won't be executed twice with the same file)
         * Don't set null to value, will not solve an issue
         * @param {HTMLInputElement} file
         */
        _setValueToEmpty: function(file) {
            try {
                file.value = '';
            } catch (e) {}
        },
        _disablePlaybackOnRecorder: function() {
            // skip allowtrim/localplayback/snapshotfromuploader, show different error message on uploading.
            // anything that call playback on recorder will be skipped, unless it's returned from server (transcoded)
            if (this.dyn.get("allowtrim") === true) {
                this.dyn.set("allowtrim", false);
                this.dyn.set("was_allowtrim", true);
            }
            if (this.dyn.get("localplayback") === true) {
                this.dyn.set("localplayback", false);
                this.dyn.set("was_localplayback", true);
            }
            if (this.dyn.get("snapshotfromuploader") === true) {
                this.dyn.set("snapshotfromuploader", false);
                this.dyn.set("was_snapshotfromuploader", true);
            }
        }
    });
});

Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.CreateUploadCovershot", [
    "module:VideoRecorder.Dynamics.RecorderStates.State",
    "media:Recorder.Support",
    "base:Objs",
    "base:Timers.Timer",
    "browser:Dom",
    "browser:Events",
    "browser:Info",
    "base:Async"
], function(State, RecorderSupport, Objs, Timer, Dom, DomEvents, Info, Async, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader", "message"],

        _started: function() {
            this.dyn.set("cancancel", true);
            this.dyn.set("loader_active", true);
            this.dyn.set("topmessage", this.dyn.string('please-wait'));
            this.dyn.set("message", this.dyn.string("prepare-covershot"));
            if (this.dyn.get("cancancel") && this.dyn.get("allowcancel"))
                this.dyn.set("controlbar_active", true);

            try {
                this.dyn.set("player_active", false);


                // this.dyn._videoFile only for playback able browsers
                if (this.dyn._videoFile)
                    this.dyn.set("playbacksource", (window.URL || window.webkitURL).createObjectURL(this.dyn._videoFile));
                else {
                    console.warn('Could not find source file to be able start player');
                    return this.next("Trimming");
                }

                var _video = document.createElement('video');
                var _currentTime = 0;
                var _totalDuration = 0;
                var _seekPeriod = 1;
                _video.src = this.dyn.get("playbacksource");
                _video.setAttribute('preload', 'metadata');
                _video.volume = 0;
                _video.muted = true;

                // Wait for 5 seconds before checking if any video data was be able loaded, if not proceed
                Async.eventually(function() {
                    // Have no metadata
                    if (_video.readyState < 1) {
                        console.warn('Could not be able load video metadata');
                        return this.next("Trimming");
                    }
                }, this, 5000);

                var _playerLoadedData = this.auto_destroy(new DomEvents());

                // Note that loadeddata event will not fire in mobile/tablet devices if data-saver is on in browser settings
                // So using loadedmetadata ( or canplaythrough) to be available both desktop and mobile
                // readyState is newly equal to HAVE_ENOUGH_DATA
                // HAVE_NOTHING == 0; HAVE_METADATA == 1; HAVE_CURRENT_DATA == 2; HAVE_FUTURE_DATA == 3; HAVE_ENOUGH_DATA == 4
                _playerLoadedData.on(_video, "loadedmetadata", function(ev) {
                    _totalDuration = _video.duration;
                    if (_totalDuration === Infinity || !_totalDuration) {
                        console.warn('Could not generate video covershots from uploaded file');
                        return this.next("Trimming");
                    }
                    _seekPeriod = this._calculateSeekPeriod(_totalDuration);
                    if (_video.videoWidth > 0 && _video.videoHeight > 0) {
                        var _thumbWidth = _video.videoWidth > _video.videoHeight ? 80 : 35;
                        this.dyn.set("videometadata", Objs.tree_merge(this.dyn.get("videometadata"), {
                            height: _video.videoHeight,
                            width: _video.videoWidth,
                            ratio: +(_video.videoWidth / _video.videoHeight).toFixed(2),
                            "thumbnails": {
                                width: _thumbWidth,
                                height: Math.floor(_thumbWidth / _video.videoWidth * _video.videoHeight)
                            }
                        }));
                        this.__videoSeekTimer = new Timer({
                            context: this,
                            fire: function() {
                                if (_video.volume < 0.1 || _video.muted) {
                                    _video.currentTime = _currentTime;
                                } else _video.volume = 0;
                                _currentTime = _currentTime + _seekPeriod;
                            },
                            destroy_on_stop: true,
                            delay: 500,
                            start: true
                        });
                    } else {
                        console.warn('Could not find video dimensions information to be able create covershot');
                        return this.next("Trimming");
                    }
                }, this);

                // Will take only one snapshot for selectfirstcovershotonskip & process placeholder
                if (!this.dyn.get("picksnapshots")) {
                    _playerLoadedData.on(_video, "canplay", function(ev) {
                        _video.currentTime = 0;
                        var __snap = RecorderSupport.createSnapshot(this.dyn.get("snapshottype"), _video, true);
                        if (__snap) {
                            if (this.dyn.get("selectfirstcovershotonskip"))
                                this.dyn.get("snapshots")[0] = __snap;
                            this.dyn.get("videometadata").processingPlaceholder = __snap;
                            Dom.triggerDomEvent(_video, "ended");
                        }
                    }, this);
                } else {
                    _playerLoadedData.on(_video, "seeked", function(ev) {
                        var __snap = RecorderSupport.createSnapshot(this.dyn.get("snapshottype"), _video, true);
                        if (__snap) {
                            // Will add snap images as thumbnails
                            if (this.dyn.get("createthumbnails")) {
                                this.dyn.get("videometadata").thumbnails.images.push({
                                    time: _video.currentTime,
                                    snap: __snap
                                });
                            }
                            if (this.dyn.get("snapshots").length < this.dyn.get("snapshotmax")) {
                                this.dyn.get("snapshots").push(__snap);
                            } else {
                                var i = Math.floor(Math.random() * this.dyn.get("snapshotmax"));
                                RecorderSupport.removeSnapshot(this.dyn.get("snapshots")[i]);
                                this.dyn.get("snapshots")[i] = __snap;
                            }
                        }

                        // Should trigger ended event
                        if ((_video.currentTime + _seekPeriod) >= _totalDuration) {
                            _video.currentTime = _video.currentTime + _seekPeriod;
                            // Will fire ended event if not fired already, fixes IE/Edge related bug
                            if (!_video.ended) {
                                Dom.triggerDomEvent(_video, "ended");
                            }
                        }
                    }, this);
                }

                _playerLoadedData.on(_video, "ended", function(ev) {
                    this.__videoSeekTimer.stop();
                    if (typeof _video.remove === 'function')
                        _video.remove();
                    else
                        _video.style.display = 'none';
                    this.next("CovershotSelection");
                }, this);

            } catch (exe) {
                console.warn(exe);
                this.next("Trimming");
            }
        },

        stop: function() {
            this.dyn.set("loader_active", false);
            this.dyn.set("loaderlabel", "");
            this.dyn.set("topmessage", "");
        },

        /**
         * @param {number} duration
         * @return {number}
         * @private
         */
        _calculateSeekPeriod: function(duration) {
            if (duration < 15) return 1;
            if (duration < 40) return 3;
            if (duration < 100) return 4;
            else
                return Math.floor(duration / 100) + 4;
        }
    });
});

Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.RequiredSoftwareCheck", [
    "module:VideoRecorder.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            this.dyn.set("settingsvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("skipvisible", false);
            this.dyn.set("uploadcovershotvisible", false);
            this.dyn.set("controlbarlabel", "");
            this.dyn.set("loaderlabel", "");
            this.listenOn(this.dyn, "error", function(s) {
                this.next("FatalError", {
                    message: this.dyn.string("attach-error"),
                    retry: "Initial"
                });
            }, this);
            this.dyn._attachRecorder();
            if (this.dyn) {
                this.dyn.on("message-link-click", function(link) {
                    link.execute();
                    this.next("RequiredSoftwareWait");
                }, this);
                this.dyn._softwareDependencies().error(function(dependencies) {
                    this.dyn.set("message_links", dependencies);
                    this.dyn.set("loader_active", false);
                    this.dyn.set("message_active", true);
                    this.dyn.set("message", this.dyn.string("software-required"));
                }, this).success(function() {
                    this.next("CameraAccess");
                }, this);
            }
        }
    });
});


Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.RequiredSoftwareWait", [
    "module:VideoRecorder.Dynamics.RecorderStates.State",
    "base:Promise",
    "browser:Dom"
], function(State, Promise, Dom, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],

        _started: function() {
            this.dyn.set("settingsvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("skipvisible", false);
            this.dyn.set("uploadcovershotvisible", false);
            this.dyn.set("controlbarlabel", "");
            this.dyn.set("loaderlabel", "");
            this.dyn.set("message", this.dyn.string("software-waiting"));
            Promise.resilience(function() {
                if (Dom.isTabHidden())
                    return Promise.error("Not ready");
                return this.dyn._softwareDependencies();
            }, this, 120, [], 1000).success(function() {
                this.next("CameraAccess");
            }, this).error(function() {
                this.next("RequiredSoftwareCheck");
            }, this);
            this.dyn.on("message-click", function() {
                this.next("RequiredSoftwareCheck");
            }, this);
        }

    });
});



Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.CameraAccess", [
    "module:VideoRecorder.Dynamics.RecorderStates.State",
    "base:Objs",
    "base:Types",
    "base:Timers.Timer",
    "base:Collections.Collection"
], function(State, Objs, Types, Timer, Collection, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            this.dyn.set("settingsvisible", true);
            this.dyn.set("recordvisible", true);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("skipvisible", false);
            this.dyn.set("uploadcovershotvisible", false);
            this.dyn.set("controlbarlabel", "");
            this.dyn.set("loaderlabel", "");
            this.listenOn(this.dyn, "bound", function() {
                this.dyn.set("creation-type", "webrtc");
                if (this.dyn.get("onlyaudio") || this.dyn.get("record_media") === "screen" || this.dyn.get("record_media") === "multistream") {
                    if (this.dyn.get("allowmultistreams") && this.dyn.get("record_media") === "multistream") {
                        this.dyn.recorder.enumerateDevices().success(function(devices) {
                            this.set("cameras", new Collection(Objs.values(devices.video)));
                            this.trigger(Types.is_empty(devices.video) ? "no_camera" : "has_camera");
                            this._add_new_stream();
                        }, this.dyn);
                    }
                    this.next("CameraHasAccess");
                    return;
                }
                var timer = this.auto_destroy(new Timer({
                    start: true,
                    delay: 100,
                    context: this,
                    fire: function() {
                        if (this.dyn.blankLevel() >= 0.01 && this.dyn.deltaCoefficient() >= 0.01) {
                            timer.stop();
                            this.next("CameraHasAccess");
                        }
                    }
                }));
            }, this);
            this.listenOn(this.dyn, "error", function(s) {
                this.next("FatalError", {
                    message: this.dyn.string("attach-error"),
                    retry: "Initial"
                });
            }, this);
            this.listenOn(this.dyn, "access_forbidden", function(e) {
                var message = this.dyn.string("access-forbidden");

                if (typeof e.name === 'string' && typeof this.dyn.recorder.errorHandler === 'function') {
                    var errorHandler = this.dyn.recorder.errorHandler(e.name);
                    if (typeof errorHandler === 'object') {
                        if (errorHandler.userLevel)
                            message = this.dyn.string(errorHandler.key);
                        else
                            console.warn(errorHandler.message + '. Please inform us!');
                    }
                }
                this.next("FatalError", {
                    message: message,
                    retry: "Initial"
                });
            }, this);
            this.dyn._bindMedia();
        }
    });
});


Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.CameraHasAccess", [
    "module:VideoRecorder.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["topmessage", "controlbar"],

        _started: function() {
            if (!this.checkOrientation(this.dyn.isPortrait(), "ChooseAlternativeDevice"))
                return;
            this.dyn.trigger("ready_to_record");
            this._preparePromise = null;
            if (this.dyn.get("countdown") > 0 && this.dyn.recorder && this.dyn.recorder.recordDelay(this.dyn.get("uploadoptions")) > this.dyn.get("countdown") * 1000)
                this._preparePromise = this.dyn._prepareRecording();
            //  For now available for WebRTC only
            if (this.dyn.get("pausable"))
                this.dyn.set("pausable", this.dyn.recorder.canPause());
            this.dyn.set("hovermessage", "");
            this.dyn.set("topmessage", "");
            this.dyn.set("settingsvisible", true);
            this.dyn.set("recordvisible", true);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("skipvisible", false);
            this.dyn.set("uploadcovershotvisible", false);
            this.dyn.set("controlbarlabel", "");
            this.dyn.set("isrecorderready", true);
            if (this.dyn.get("autorecord"))
                this.next("RecordPrepare", {
                    preparePromise: this._preparePromise
                });
        },

        record: function() {
            if (this.dyn.get("autorecord"))
                return;
            if (this.dyn.get("audio-test-mandatory") && !this.dyn.get("microphonehealthy") && !this._preparePromise)
                return;
            this.next("RecordPrepare", {
                preparePromise: this._preparePromise
            });
        }
    });
});


Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.RecordPrepare", [
    "module:VideoRecorder.Dynamics.RecorderStates.State",
    "base:Timers.Timer",
    "base:Time"
], function(State, Timer, Time, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],
        _locals: ["preparePromise"],

        _started: function() {
            this.dyn.set("message", "");
            this.dyn.set("loaderlabel", "");
            var startedRecording = false;
            this.dyn._accessing_camera = true;
            this._preparePromise = this._preparePromise || this.dyn._prepareRecording();
            var countdown = this.dyn.get("countdown") ? this.dyn.get("countdown") * 1000 : 0;
            var delay = this.dyn.recorder.recordDelay(this.dyn.get("uploadoptions")) || 0;
            if (countdown) {
                var displayDenominator = 1000;
                var silentTime = 0;
                var startTime = Time.now();
                var endTime = startTime + Math.max(delay, countdown);
                if (delay > countdown) {
                    silentTime = Math.min(500, delay - countdown);
                    displayDenominator = (delay - silentTime) / countdown * 1000;
                } else
                    this.dyn.set("loaderlabel", this.dyn.get("countdown"));
                var timer = new Timer({
                    context: this,
                    delay: 50,
                    fire: function() {
                        var now = Time.now();
                        var time_left = Math.max(0, endTime - now);
                        if (now > silentTime + startTime) {
                            this.dyn.set("loaderlabel", "" + Math.ceil((time_left - silentTime) / displayDenominator));
                            this.dyn.trigger("countdown", Math.round((time_left - silentTime) / displayDenominator * 1000));
                        }
                        if (endTime <= now) {
                            this.dyn.set("loaderlabel", "");
                            timer.stop();
                        }
                        if ((time_left <= delay) && !startedRecording) {
                            startedRecording = true;
                            this._startRecording();
                        }
                    }
                });
                this.auto_destroy(timer);
            } else
                this._startRecording();
        },

        record: function() {
            this._startRecording();
        },

        _startRecording: function() {
            this._preparePromise.success(function() {
                this.dyn._startRecording().success(function() {
                    this.next("Recording");
                }, this).error(function(s) {
                    this.next("FatalError", {
                        message: s,
                        retry: "RequiredSoftwareCheck"
                    });
                }, this);
            }, this).error(function(s) {
                this.next("FatalError", {
                    message: s,
                    retry: "RequiredSoftwareCheck"
                });
            }, this);
        }

    });
});


Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.Recording", [
    "module:VideoRecorder.Dynamics.RecorderStates.State",
    "base:Timers.Timer",
    "base:Time",
    "base:TimeFormat",
    "base:Async",
    "browser:Info"
], function(State, Timer, Time, TimeFormat, Async, Info, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["topmessage", "controlbar"],

        _started: function() {
            this.dyn.set("hovermessage", "");
            this.dyn.set("topmessage", "");
            this.dyn._accessing_camera = true;
            this.dyn.trigger("recording");
            this.dyn.set("settingsvisible", false);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn.set("stopvisible", true);
            this.dyn.set("skipvisible", false);
            this.dyn.set("uploadcovershotvisible", false);
            this._startTime = Time.now();
            this._stopping = false;
            this.__timerDelay = 10;
            this._timer = this.auto_destroy(new Timer({
                immediate: true,
                delay: this.__timerDelay,
                context: this,
                fire: this._timerFire
            }));
            this._framerateWarning = false;
        },

        _timerFire: function() {
            var limit = this.dyn.get("timelimit");
            if (this.dyn.__paused) return;
            var current = Time.now() - this.dyn.__pauseDelta;
            var display = Math.max(0, limit ? (this._startTime + limit * 1000 - current) : (current - this._startTime));
            this.dyn.trigger("recording_progress", current - this._startTime, !!this.dyn.__paused);
            this.dyn.set("controlbarlabel", this.dyn.get("display-timer") ? TimeFormat.format(TimeFormat.ELAPSED_MINUTES_SECONDS, display) : "");

            if (this.dyn.get("timeminlimit"))
                this.dyn.set("mintimeindicator", (Time.now() - this._startTime) / 1000 <= this.dyn.get("timeminlimit"));

            if (limit && this._startTime + limit * 1000 <= current) {
                this._timer.stop();
                this.stop();
            }


            if (this.dyn.get("framerate-warning") && this.dyn.averageFrameRate()) {
                var framerateWarning = this.dyn.averageFrameRate() < this.dyn.get("framerate-warning");
                if (framerateWarning !== this._framerateWarning) {
                    this._framerateWarning = framerateWarning;
                    if (framerateWarning)
                        this.dyn.set("hovermessage", this.dyn.string("framerate-warning"));
                    else
                        this.dyn.set("hovermessage", "");
                }
            }
        },

        stop: function() {
            var minlimit = this.dyn.get("timeminlimit");
            if (minlimit) {
                var delta = (Time.now() - (this._startTime + this.dyn.__pauseDelta)) / 1000;
                if (delta < minlimit) {
                    var limit = this.dyn.get("timelimit");
                    if (!limit || limit > delta)
                        return;
                }
            }
            if (this._stopping)
                return;
            this.dyn.set("loader_active", true);
            this.dyn.set("controlbar_active", false);
            this.dyn.set("topmessage_active", false);
            this.dyn.set("message_active", true);
            this.dyn.set("message", "");
            this._stopping = true;
            Async.eventually(function() {
                this.dyn._stopRecording().success(function() {
                    this._hasStopped();
                    this.next("CovershotSelection");
                }, this).error(function(s) {
                    this.next("FatalError", {
                        message: s,
                        retry: "RequiredSoftwareCheck"
                    });
                }, this);
            }, this);
        },

        _hasStopped: function() {
            this.dyn.set("duration", (Time.now() - (this._startTime + this.dyn.__pauseDelta)) / 1000);
            if (this.dyn.get("snapshots").length > 0)
                this.dyn._showBackgroundSnapshot();
            this.dyn._unbindMedia();
            this.dyn.trigger("recording_stopped");
        }

    });
});

Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.Trimming", [
    "module:VideoRecorder.Dynamics.RecorderStates.State",
    "base:Types"
], function(State, Types, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        _started: function() {
            if (!this.dyn.isFormatSupported() || !this.dyn.get("allowtrim") || this.dyn.get("duration") < this.dyn.get("timeminlimit")) {
                if (!this.dyn.isFormatSupported()) {
                    this.dyn.set("allowtrim", false);
                    this.dyn.set("was_allowtrim", true);
                }
                this.next("Uploading");
            } else {
                if (this.dyn.get("trimoverlay")) {
                    this.dyn._getFirstFrameSnapshot()
                        .success(function(snapshot) {
                            this.showTrimmingOverlay(snapshot);
                        }, this)
                        .error(function() {
                            this.showTrimmingOverlay(this.dyn.__backgroundSnapshot);
                        }, this);
                } else {
                    this.dyn.set("message_active", true);
                    this.dyn.set("message", this.dyn.string("wait-for-trim"));
                    this.listenOnce(this.dyn, "manual-trim", function(start, end) {
                        if (Types.isNumber(start) && start > 0) this.dyn.set("starttime", start);
                        if (Types.isNumber(end) && end <= this.get("duration")) this.dyn.set("endtime", end);
                        this.dyn.trigger("video-trimmed", this.dyn.get("starttime"), this.dyn.get("endtime"), this.dyn.get("duration"));
                        this.next("Uploading");
                    });
                }
                this.dyn.trigger("ready-to-trim");
            }
        },

        showTrimmingOverlay: function(poster) {
            this._playerAttrs = this.dyn.get("playerattrs");

            this.dyn.set("playerattrs", {
                poster: poster,
                source: this.dyn._videoFile || this.dyn.recorder.localPlaybackSource(),
                trimmingmode: true,
                hidecontrolbar: true
            });
            this.dyn.set("playertopmessage", this.dyn.string("trim-prompt"));
            this.dyn.set("player_active", true);

            this.listenOnce(this.dyn.scopes.player, "playing", function() {
                this.dyn.scopes.player.set("skipinitial", true);
                this.dyn.set("playertopmessage", this.dyn.string("trim-video"));
            });

            this.listenOnce(this.dyn.scopes.player, "video-trimmed skip", function(data) {
                if (data && data.start) this.dyn.set("starttime", data.start);
                if (data && data.end) this.dyn.set("endtime", data.end);
                this.dyn.trigger("video-trimmed", this.dyn.get("starttime"), this.dyn.get("endtime"), this.dyn.get("duration"));
                this.hideTrimmingOverlay();
                this.next("Uploading");
            }, this);
        },

        hideTrimmingOverlay: function() {
            this.dyn.set("trimmingmode", false);
            this.dyn.set("playerattrs", this._playerAttrs);
            this.dyn.set("player_active", false);
        }
    });
});


Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.CovershotSelection", [
    "module:VideoRecorder.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        _started: function() {
            if ((this.dyn.get("picksnapshots") || this.dyn.get("custom-covershots")) && !this.dyn.get("onlyaudio")) {
                if (this.dyn.get("pickcovershotframe")) {
                    if (this.dyn.recorder && this.dyn.recorder.supportsLocalPlayback()) {
                        this.next("CovershotSelectionFromPlayer");
                    } else if (this.dyn.get("snapshotfromuploader") && this.dyn.isFormatSupported()) {
                        this.next("CovershotSelectionFromPlayer");
                    } else {
                        this._next(true);
                    }
                } else if (this.dyn.get("snapshots") && this.dyn.get("snapshots").length > 0) {
                    this.next("CovershotSelectionFromGallery");
                } else if (this.dyn.get("snapshotfromuploader") || (this.dyn.get("snapshotfrommobilecapture") && this.dyn.get("recordviafilecapture"))) {
                    this.next("CreateUploadCovershot");
                } else {
                    this._next(true);
                }
            } else if (!this.dyn.get("snapshots") && this.dyn.get("snapshotfromuploader") || (this.dyn.get("snapshotfrommobilecapture") && this.dyn.get("recordviafilecapture"))) {
                this.dyn.set("snapshotmax", 1);
                this.dyn.set("snapshots", []);
                this.next("CreateUploadCovershot");
            } else {
                this._next(true);
            }
        },

        rerecord: function() {
            this.dyn._hideBackgroundSnapshot();
            this.dyn._detachRecorder();
            this.dyn.trigger("rerecord");
            this.dyn.set("recordermode", true);
            this.next("Initial");
        },

        _next: function(skippedCovershot) {
            if (skippedCovershot && this.dyn.get("selectfirstcovershotonskip") && this.dyn.get("snapshots")) {
                if (this.dyn.get("snapshots")[0]) {
                    this.dyn._uploadCovershot(this.dyn.get("snapshots")[0]);
                }
            }
            if (!this.dyn.get("videometadata").processingPlaceholder && this.dyn.get("snapshots")[0])
                this.dyn.get("videometadata").processingPlaceholder = this.dyn.get("snapshots")[0];
            if (this.dyn.get("videometadata").thumbnails.images.length > 3 && this.dyn.get("createthumbnails")) {
                this.next("UploadThumbnails");
            } else {
                this.next("Trimming");
            }
        }

    });
});

Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.CovershotSelectionFromGallery", [
    "module:VideoRecorder.Dynamics.RecorderStates.CovershotSelection"
], function(CovershotSelectionState, scoped) {
    return CovershotSelectionState.extend({
        scoped: scoped
    }, {

        dynamics: ["imagegallery", "topmessage", "controlbar"],

        _started: function() {
            this.dyn.set("settingsvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("skipvisible", !this.dyn.get("picksnapshotmandatory"));
            this.dyn.set("controlbarlabel", "");
            this.dyn.set("rerecordvisible", this.dyn.get("early-rerecord"));
            this.dyn.set("uploadcovershotvisible", this.dyn.get("custom-covershots"));
            this.dyn.set("hovermessage", "");
            this.dyn.set("topmessage", this.dyn.string('pick-covershot'));
            this.dyn.set("isrecorderready", false);
            if (this.dyn.get("snapshots").length > 0) {
                var imagegallery = this.dyn.scope(">[tagname='ba-videorecorder-imagegallery']").materialize(true);
                imagegallery.loadSnapshots();
                imagegallery.updateContainerSize();
            }
            this.listenOn(this.dyn, "invoke-skip", function() {
                this._next(true);
            }, this);
            this.listenOn(this.dyn, "select-image", function(image) {
                this.dyn._uploadCovershot(image);
                this.dyn.get("videometadata").processingPlaceholder = image;
                this._next(false);
            }, this);
        },

        uploadCovershot: function(file) {
            // If passed file in HTMLInputElement get file
            if (typeof file.files !== 'undefined')
                if (file.files[0])
                    file = file.files[0];
            this.dyn._uploadCovershotFile(file);
            this._next(false);
        }
    });
});

Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.CovershotSelectionFromPlayer", [
    "module:VideoRecorder.Dynamics.RecorderStates.CovershotSelection"
], function(CovershotSelectionState, scoped) {
    return CovershotSelectionState.extend({
        scoped: scoped
    }, {

        _started: function() {
            this.dyn._getFirstFrameSnapshot()
                .success(function(snapshot) {
                    this.startFrameSelection(snapshot);
                }, this)
                .error(function() {
                    this.startFrameSelection(this.dyn.__backgroundSnapshot);
                }, this);
        },

        startFrameSelection: function(poster) {
            this._playerattrs = this.dyn.get("playerattrs");

            this.dyn.set("playerattrs", {
                poster: poster,
                source: this.dyn._videoFile || this.dyn.recorder.localPlaybackSource(),
                skipinitial: true
            });

            this.dyn.set("frameselectionmode", true);
            this.dyn.set("playertopmessage", this.dyn.string("pick-covershot-frame"));
            this.dyn.set("player_active", true);

            this.listenOn(this.dyn.scopes.player, "image-selected", function(image) {
                this.dyn._uploadCovershot(image);
                this._next(false);
            }, this);
        },

        endFrameSelection: function() {
            this.dyn.set("frameselectionmode", false);
            this.dyn.set("playerattrs", this._playerattrs);
        },

        _end: function() {
            this.endFrameSelection();
        }
    });
});

Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.UploadThumbnails", [
    "module:VideoRecorder.Dynamics.RecorderStates.State",
    "base:Objs",
    "base:Promise",
    "base:Time",
    "base:TimeFormat",
    "media:WebRTC.Support",
    "browser:Events"
], function(State, Objs, Promise, Time, TimeFormat, Support, Events, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            this.dyn.set("loader_active", true);
            this.dyn.set("loadlabel", "Thumbnails");
            this.dyn.set("message", this.dyn.string("prepare-thumbnails"));
            this.dyn.set("hovermessage", "");
            this.dyn.set("topmessage", "");

            this._drawIntoCanvas(this.dyn.get("videometadata").thumbnails)
                .success(function(canvas) {
                    this.dyn._uploadThumbnails(Support.dataURItoBlob(canvas.toDataURL('image/jpg')));
                    this.dyn._uploadThumbnailTracks(new Blob(this._vttDescripitions, {
                        type: "text/vtt"
                    }));
                    this.next("Trimming");
                }, this)
                .error(function(err) {
                    console.warn(err);
                    this.next("Trimming");
                }, this);
        },

        _drawIntoCanvas: function(thumbnails) {
            var promise = Promise.create();
            var w = thumbnails.width;
            var h = thumbnails.height;
            var imagesCount = thumbnails.images.length;
            var rowsCount = thumbnails.images.length > 10 ? Math.ceil(imagesCount / 10) : 1;
            var canvas = document.createElement('canvas');
            canvas.width = rowsCount > 1 ? w * 10 : w * imagesCount;
            canvas.height = rowsCount * h;
            this._vttDescripitions = [];
            this._vttDescripitions.push('WEBVTT \n\n');
            var ctx = canvas.getContext('2d');
            var index = 0;
            try {
                if (typeof thumbnails.images[index] !== 'undefined') {
                    this._imageEvent = this.auto_destroy(new Events());
                    var image = image || new Image();
                    image.width = w;
                    image.height = h;
                    image.src = (window.URL || window.webkitURL).createObjectURL(thumbnails.images[index].snap);

                    this._imageEvent.on(image, "load", function() {
                        this._recursivelyDrawImage(canvas, thumbnails, ctx, w, h, image, index, promise);
                    }, this);

                    this._imageEvent.on(image, "error", function(err) {
                        throw "Error with loading thumbnail image. ".err;
                    }, this);
                }
            } catch (err) {
                promise.asyncError(err);
            }
            return promise;
        },

        _recursivelyDrawImage: function(canvas, thumbnails, ctx, w, h, image, index, promise, column, row) {
            column = column || 0;
            row = row || 0;
            index = index || 0;
            ctx.drawImage(image, column * w, row * h, w, h);
            if ((index > 0 && (index % 10 === 0))) {
                row++;
                column = 0;
            } else if (index !== 0) column++;
            index++;
            if (typeof thumbnails.images[index] !== 'undefined' && thumbnails.images.length >= index) {
                var _image, _prevIndex, _nextIndex, _startTime, _endTime, _averageSecond, _formattedStartTime, _formattedEndTime;
                _prevIndex = index - 1;
                _nextIndex = index + 1;

                _averageSecond = Math.round((thumbnails.images[index].time - thumbnails.images[_prevIndex].time) / 2);
                _startTime = thumbnails.images[_prevIndex].time + _averageSecond;
                // For the latest thumb no need add average time
                if (!thumbnails.images[_nextIndex + 1]) _averageSecond = 0;
                _endTime = thumbnails.images[index].time + _averageSecond;

                _formattedStartTime = _startTime === 0 ? '00:00:00' : TimeFormat.format('HH:MM:ss', _startTime * 1000);
                _formattedEndTime = _endTime === 0 ? '00:00:00' : TimeFormat.format('HH:MM:ss', _endTime * 1000);

                // If we have have next index
                if (typeof thumbnails.images[_nextIndex] !== 'undefined') {
                    this._vttDescripitions.push(
                        _formattedStartTime + ".000" + " --> " + _formattedEndTime + ".000" + "\n" + this.dyn.get("uploadoptions").thumbnail.url + "#xywh=" + (column * w) + "," + (row * h) + "," + w + "," + h + "\n\n"
                    );
                }

                _image = new Image();
                _image.width = w;
                _image.height = h;
                _image.src = (window.URL || window.webkitURL).createObjectURL(thumbnails.images[index].snap);

                this._imageEvent.on(_image, "load", function() {
                    this._recursivelyDrawImage(canvas, thumbnails, ctx, w, h, _image, index, promise, column, row);
                }, this);

                this._imageEvent.on(_image, "error", function(err) {
                    throw "Error with loading thumbnail image. Error: ".err;
                }, this);

            } else {
                if (thumbnails.images.length <= index) {
                    promise.asyncSuccess(canvas);
                } else {
                    throw "Could not draw all images";
                }
            }
        }
    });
});

Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.Uploading", [
    "module:VideoRecorder.Dynamics.RecorderStates.State",
    "base:Time",
    "base:Async",
    "base:Objs"
], function(State, Time, Async, Objs, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader", "message"],

        _started: function() {
            this.dyn.set("cancancel", true);
            this.dyn.set("skipinitial", this.dyn.get("skipinitial") || this.dyn.get("skipinitialonrerecord"));
            this.dyn.set("settingsvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("loadlabel", "");
            this.dyn.set("controlbarlabel", "");
            this.dyn.set("isrecorderready", false);
            this.dyn.trigger("uploading");
            this.dyn.set("rerecordvisible", this.dyn.get("early-rerecord"));
            if (this.dyn.get("early-rerecord") || (this.dyn.get("cancancel") && this.dyn.get("allowcancel")))
                this.dyn.set("controlbar_active", true);
            this.dyn.set("hovermessage", "");
            this.dyn.set("topmessage", "");

            if (this.dyn.get("media_src_not_supported") === true &&
                ((this.dyn.get("was_allowtrim") === true) ||
                    (this.dyn.get("was_localplayback") === true) ||
                    (this.dyn.get("was_snapshotfromuploader") === true)
                )
            ) {
                this.dyn.set("uploading-message", this.dyn.string("uploading-src-error"));
            } else {
                this.dyn.set("uploading-message", this.dyn.string("uploading"));
            }

            this.dyn.set("message", this.dyn.get("uploading-message"));
            this.dyn.set("playertopmessage", this.dyn.get("message"));
            var uploader = this.dyn._dataUploader;
            this.listenOn(uploader, "success", function() {
                Async.eventually(function() {
                    if (this.destroyed())
                        return;
                    this._finished();
                    this.next("Verifying");
                }, this);
            });
            this.listenOn(uploader, "error", function(e) {
                var bestError = this.dyn.string("uploading-failed");
                try {
                    e.forEach(function(ee) {
                        for (var key in ee)
                            if (this.dyn.string("upload-error-" + key))
                                bestError = this.dyn.string("upload-error-" + key);
                    }, this);
                } catch (err) {}
                this.dyn.set("player_active", false);
                this.next("FatalError", {
                    message: bestError,
                    retry: this.dyn.recorderAttached() ? "Uploading" : "Initial"
                });
            });
            this.listenOn(uploader, "progress", function(uploaded, total) {
                this.dyn.trigger("upload_progress", uploaded, total);
                if (total !== 0 && total > 0 && uploaded >= 0) {
                    var up = Math.min(100, Math.round(uploaded / total * 100));
                    if (!isNaN(up)) {
                        this.dyn.set("message", this.dyn.get("uploading-message") + ": " + up + "%");
                        this.dyn.set("playertopmessage", this.dyn.get("message"));
                    }
                }
            });
            if (this.dyn.get("localplayback") && this.dyn.isFormatSupported()) {
                if (this.dyn.recorder && this.dyn.recorder.supportsLocalPlayback())
                    this.dyn.set("playbacksource", this.dyn.recorder.localPlaybackSource());
                else
                    this.dyn.set("playbacksource", (window.URL || window.webkitURL).createObjectURL(this.dyn._videoFile));
                if (this.dyn.__lastCovershotUpload && this.dyn.recorder)
                    this.dyn.set("playbackposter", this.dyn.recorder.snapshotToLocalPoster(this.dyn.__lastCovershotUpload));
                this.dyn.set("loader_active", false);
                this.dyn.set("message_active", false);
                this.dyn._hideBackgroundSnapshot();
                this.dyn.set("player_active", true);
            } else {
                // show background image while verify and processing
                if (this.dyn.get("videometadata").processingPlaceholder && typeof window.URL !== "undefined") {
                    var dyn = this.dyn;
                    var placeholder = URL.createObjectURL(this.dyn.get("videometadata").processingPlaceholder);

                    var XHR = new XMLHttpRequest();
                    XHR.open('GET', placeholder);
                    XHR.onload = function() {
                        var reader = new FileReader();
                        reader.onloadend = function() {
                            // bs-styles not works as expected
                            dyn.set("placeholderstyle", "background: url('" + reader.result + "') center/contain no-repeat");
                        };
                        reader.readAsDataURL(XHR.response);
                    };
                    XHR.responseType = 'blob';
                    XHR.send();
                }
            }
            this.dyn.set("start-upload-time", Time.now());
            uploader.reset();
            uploader.upload();
        },

        rerecord: function() {
            this.dyn._hideBackgroundSnapshot();
            this.dyn._detachRecorder();
            this.dyn.trigger("rerecord");
            this.dyn.set("recordermode", true);
            this.dyn.set("placeholderstyle", "");
            this.next("Initial");
        },

        _finished: function() {
            this.dyn.set("cancancel", false);
            this.dyn.trigger("uploaded");
            this.dyn.set("end-upload-time", Time.now());
        }

    });
});


Scoped.define("module:VideoRecorder.Dynamics.RecorderStates.Verifying", [
    "module:VideoRecorder.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader", "message"],

        _started: function() {
            this.dyn.set("loadlabel", "");
            this.dyn.trigger("verifying");
            this.dyn.set("message", this.dyn.string("verifying") + "...");
            this.dyn.set("playertopmessage", this.dyn.get("message"));
            if (this.dyn.get("localplayback") && this.dyn.isFormatSupported()) {
                this.dyn.set("loader_active", false);
                this.dyn.set("message_active", false);
            } else {
                this.dyn.set("rerecordvisible", this.dyn.get("early-rerecord"));
                if (this.dyn.get("early-rerecord"))
                    this.dyn.set("controlbar_active", true);
            }
            this.dyn._verifyRecording().success(function() {
                this.dyn.trigger("verified");
                this.dyn._hideBackgroundSnapshot();
                this.dyn._detachRecorder();
                if (this.dyn.get("recordings"))
                    this.dyn.set("recordings", this.dyn.get("recordings") - 1);
                this.dyn.set("message", "");
                this.dyn.set("playertopmessage", "");
                this.dyn.set("verified", true);
                this.next("Player");
            }, this).error(function() {
                this.dyn.set("player_active", false);
                this.dyn.set("placeholderstyle", "");
                this.next("FatalError", {
                    message: this.dyn.string("verifying-failed"),
                    retry: this.dyn.recorderAttached() ? "Verifying" : "Initial"
                });
            }, this);
        },

        rerecord: function() {
            this.dyn._hideBackgroundSnapshot();
            this.dyn._detachRecorder();
            this.dyn.trigger("rerecord");
            this.dyn.set("recordermode", true);
            this.next("Initial");
        }

    });
});
Scoped.define("module:VideoRecorder.Dynamics.Topmessage", [
    "dynamics:Dynamic"
], function(Class, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{css}}-topmessage-container\">\n    <div class='{{css}}-topmessage-background'>\n    </div>\n    <div data-selector=\"recorder-topmessage-block\" class='{{css}}-topmessage-message'>\n        {{topmessage}}\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-videorecorder",
                    "csscommon": "ba-commoncss",
                    "cssrecorder": "ba-recorder",
                    "topmessage": ''
                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "topmessage": function (obj) { return obj.topmessage; }/**/
        })
        .register("ba-videorecorder-topmessage");
});
Scoped.define("module:VideoRecorder.Dynamics.Trimmer", [
    "dynamics:Dynamic",
    "browser:Events",
    "base:Promise"
], function(Class, DomEvents, Promise, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {
                template: "<div class=\"{{csstrimmer}}-container {{csscommon}}-accent-color-bg\">\n    \n    <button ba-click=\"{{togglePlay()}}\" class=\"{{csstrimmer}}-button-play\" aria-label=\"{{playing || wasPlaying ? 'Pause' : 'Play'}}\">\n        <i class=\"{{csscommon + '-icon-' + (playing || wasPlaying ? 'pause' : 'play')}} {{csscommon}}-accent-color\"></i>\n    </button>\n    \n    <div\n        class=\"{{csstrimmer}}-progress-bar\"\n        ontouchstart=\"{{handleProgressBarClick(domEvent)}}\"\n        onmousedown=\"{{handleProgressBarClick(domEvent)}}\"\n        data-selector=\"progressbar\"\n    >\n        \n        <div\n            class=\"{{csstrimmer}}-snapshots\"\n            data-selector=\"snapshots\"\n        ></div>\n        \n        <div\n            class=\"{{csstrimmer}}-playhead\"\n            style=\"left: calc({{duration ? position / duration * 100 : 0}}% - 1px)\"\n        ></div>\n        \n        <div\n            class=\"{{csstrimmer}}-selection {{csscommon}}-accent-color-border\"\n            ontouchstart=\"{{handleSelectionClick(domEvent)}}\"\n            onmousedown=\"{{handleSelectionClick(domEvent)}}\"\n            data-selector=\"selection\"\n            style=\"\n                left: calc({{duration && startposition ? startposition / duration * 100 : 0}}% - 4px);\n                right: calc({{100 - (duration && endposition ? endposition / duration * 100 : 100)}}% - 4px);\n            \"\n        ></div>\n    </div>\n    \n    <div class=\"{{csstrimmer}}-right-button-container\">\n        \n        <button\n            class=\"{{csscommon}}-{{trimButtonEnabled ? 'accent-color-bg' : 'disabled'}} {{csstrimmer}}-button-trim\"\n            ba-click=\"{{trim()}}\"\n        >Trim</button>\n        \n        <button\n            class=\"{{csstrimmer}}-button-skip\"\n            ba-click=\"{{skip()}}\"\n        >Skip</button>\n    </div>\n</div>",

                attrs: {
                    "csscommon": "ba-commoncss",
                    "csstrimmer": "ba-videorecorder-trimmer"
                },

                computed: {
                    "trimButtonEnabled:startposition,endposition,duration": function(startPosition, endPosition, duration) {
                        return (startPosition !== 0 && startPosition !== null) || (endPosition !== duration && endPosition !== null);
                    }
                },

                events: {
                    "change:progress-bar-width": function() {
                        this.call("updateThumbnails");
                    }
                },

                destroy: function() {
                    if (this._progressBarResizeObserver) this._progressBarResizeObserver.disconnect();
                    inherited.destroy.call(this);
                },

                functions: {
                    skip: function() {
                        this.chainedTrigger("skip");
                    },
                    trim: function() {
                        this.chainedTrigger("video-trimmed", {
                            start: this.get("startposition"),
                            end: this.get("endposition")
                        });
                    },
                    togglePlay: function() {
                        this.trigger(this.get("playing") ? "pause" : "play");
                    },
                    handleSelectionClick: function(events) {
                        var event = events[0];
                        event.preventDefault();
                        if (event.type === "mousedown" && event.button !== 0) return;
                        var clientX = this.call("getClientX", event);
                        var elementRect = event.target.getBoundingClientRect();
                        var borderWidth = event.target.clientLeft;

                        var isClickingOnLeftBorder = clientX >= elementRect.left && clientX <= (elementRect.left + borderWidth);
                        var isClickingOnRightBorder = clientX >= (elementRect.right - borderWidth) && clientX <= (elementRect.right);
                        if (!isClickingOnLeftBorder && !isClickingOnRightBorder) return;

                        event.stopPropagation();
                        if (isClickingOnLeftBorder) this.call("attachUpdatePositionEventListeners", clientX, "startposition");
                        else this.call("attachUpdatePositionEventListeners", clientX, "endposition");
                    },

                    handleProgressBarClick: function(events) {
                        var event = events[0];
                        event.preventDefault();
                        if (event.type === "mousedown" && event.button !== 0) return;
                        var clientX = this.call("getClientX", event);
                        var selectionRect = this._selectionElement.getBoundingClientRect();

                        var isClickingOnLeftOfSelection = clientX <= selectionRect.left;
                        var isClickingOnRightOfSelection = clientX >= selectionRect.right;

                        if (isClickingOnLeftOfSelection) {
                            this.call("attachUpdatePositionEventListeners", clientX, "startposition");
                            return;
                        }

                        if (isClickingOnRightOfSelection) {
                            this.call("attachUpdatePositionEventListeners", clientX, "endposition");
                            return;
                        }

                        if (this.get("playing")) {
                            this.set("wasPlaying", true);
                            this.trigger("pause");
                        }

                        this.call("attachUpdatePositionEventListeners", clientX, "position");
                    },

                    attachUpdatePositionEventListeners: function(clientX, position) {
                        this.call("updatePosition", clientX, position);

                        var events = this._events;
                        events.on(document, "mousemove touchmove", function(e) {
                            e.preventDefault();
                            this.call("updatePosition", this.call("getClientX", e), position);
                        }, this);
                        events.on(document, "mouseup touchend", function(e) {
                            e.preventDefault();
                            if (this.get("wasPlaying")) {
                                this.trigger("play");
                                setTimeout(function() { // we need this delay to avoid switching to play button icon while video doesn't start playing
                                    this.set("wasPlaying", false);
                                }.bind(this), 100);
                            }
                            events.off(document, "mouseup touchend mousemove touchmove");
                        }, this);
                    },

                    updatePosition: function(clientX, position) {
                        var newPosition = this.call("getCurrentPosition", clientX);
                        var minDuration = this.get("minduration") || 1;
                        switch (position) {
                            case "position":
                                this.trigger("seek", newPosition);
                                break;
                            case "startposition":
                                var endPosition = this.get("endposition") || this.get("duration");
                                if (newPosition > endPosition - minDuration)
                                    this.set(position, endPosition - minDuration);
                                else this.set(position, newPosition);
                                break;
                            case "endposition":
                                var startPosition = this.get("startposition") || 0;
                                if (newPosition < startPosition + minDuration)
                                    this.set(position, startPosition + minDuration);
                                else this.set(position, newPosition);
                                break;
                        }
                    },

                    getClientX: function(event) {
                        return event.clientX === 0 ? 0 : event.clientX || event.targetTouches[0].clientX;
                    },

                    getCurrentPosition: function(clientX) {
                        var percentageFromStart;
                        var dimensions = this._progressBarElement.getBoundingClientRect();

                        if (clientX < dimensions.left) percentageFromStart = 0;
                        else if (clientX > (dimensions.left + dimensions.width)) percentageFromStart = 1;
                        else percentageFromStart = (clientX - dimensions.left) / (dimensions.width || 1);

                        return this.get("duration") * percentageFromStart;
                    },

                    updateThumbnails: function() {
                        if (!this._internalVideoElement || this._progressBarElement.clientWidth === 0) return;
                        this.call("drawSnapshotRecursive", 1);
                    },

                    createNewCanvas: function() {
                        var canvas = document.createElement("canvas");
                        canvas.height = this._canvasHeight;
                        canvas.width = this._canvasWidth;
                        this._snapshotsElement.appendChild(canvas);
                        return canvas;
                    },

                    drawSnapshot: function(canvas, position) {
                        var promise = Promise.create();
                        this._internalVideoElement.currentTime = position || 0;
                        this._events.on(this._internalVideoElement, "seeked", function() {
                            canvas.getContext("2d").drawImage(this._internalVideoElement, 0, 0, canvas.width, canvas.height);
                            this._events.off(this._internalVideoElement, "seeked");
                            promise.asyncSuccess();
                        }, this);
                        return promise;
                    },

                    drawSnapshotRecursive: function(i) {
                        if (i * this._canvasWidth > this._progressBarElement.clientWidth) return;
                        if (i + 1 >= this._canvases.length) this._canvases.push(this.call("createNewCanvas"));
                        this.call("drawSnapshot", this._canvases[i], this.get("duration") * ((i * this._canvasWidth) / this._progressBarElement.clientWidth)).success(function() {
                            this.call("drawSnapshotRecursive", ++i);
                        }, this);
                    }
                },

                create: function() {
                    this._events = this.auto_destroy(new DomEvents());
                    this._progressBarElement = this.activeElement().querySelector("[data-selector='progressbar'");
                    this._selectionElement = this.activeElement().querySelector("[data-selector='selection']");
                    this._snapshotsElement = this.activeElement().querySelector("[data-selector='snapshots']");

                    this._progressBarResizeObserver = new ResizeObserver(function(entries) {
                        entries.forEach(function(entry) {
                            if (entry.contentRect.width === this.get("progress-bar-width")) return;
                            this.set("progress-bar-width", entry.contentRect.width);
                        }.bind(this));
                    }.bind(this));

                    this._progressBarResizeObserver.observe(this._progressBarElement);

                    this._loadVideo().success(function() {
                        this.call("updateThumbnails");
                    }, this);
                },

                _loadVideo: function() {
                    var promise = Promise.create();
                    var video = document.createElement("video");
                    var source = this.get("source").src || this.get("source");
                    video.src = typeof source === "string" ? source : URL.createObjectURL(source);
                    this._events.on(video, "loadedmetadata", function() {
                        if (!this || this.destroyed()) return;
                        if (!this.get("duration")) this.set("duration", video.duration);
                        this._internalVideoElement = video;
                        this._canvasHeight = 34; // TODO calculate instead of hard coding value
                        this._canvasWidth = this._canvasHeight * video.videoWidth / video.videoHeight;
                        this._canvases = [];
                        this._canvases.push(this.call("createNewCanvas"));
                        this.call("drawSnapshot", this._canvases[0], 0).success(function() {
                            promise.asyncSuccess(video);
                        });
                    }, this);
                    return promise;
                }
            };
        })
        .register("ba-videorecorder-trimmer")
        .registerFunctions({
            /**/"csstrimmer": function (obj) { return obj.csstrimmer; }, "csscommon": function (obj) { return obj.csscommon; }, "togglePlay()": function (obj) { return obj.togglePlay(); }, "playing || wasPlaying ? 'Pause' : 'Play'": function (obj) { return obj.playing || obj.wasPlaying ? 'Pause' : 'Play'; }, "csscommon + '-icon-' + (playing || wasPlaying ? 'pause' : 'play')": function (obj) { return obj.csscommon + '-icon-' + (obj.playing || obj.wasPlaying ? 'pause' : 'play'); }, "handleProgressBarClick(domEvent)": function (obj) { return obj.handleProgressBarClick(obj.domEvent); }, "duration ? position / duration * 100 : 0": function (obj) { return obj.duration ? obj.position / obj.duration * 100 : 0; }, "handleSelectionClick(domEvent)": function (obj) { return obj.handleSelectionClick(obj.domEvent); }, "duration && startposition ? startposition / duration * 100 : 0": function (obj) { return obj.duration && obj.startposition ? obj.startposition / obj.duration * 100 : 0; }, "100 - (duration && endposition ? endposition / duration * 100 : 100)": function (obj) { return 100 - (obj.duration && obj.endposition ? obj.endposition / obj.duration * 100 : 100); }, "trimButtonEnabled ? 'accent-color-bg' : 'disabled'": function (obj) { return obj.trimButtonEnabled ? 'accent-color-bg' : 'disabled'; }, "trim()": function (obj) { return obj.trim(); }, "skip()": function (obj) { return obj.skip(); }/**/
        });
});
Scoped.define("module:ImageViewer.Dynamics.Controlbar", [
    "dynamics:Dynamic",
    "module:Assets",
    "browser:Info"
], [
    "dynamics:Partials.ShowPartial",
    "dynamics:Partials.IfPartial",
    "dynamics:Partials.ClickPartial"
], function(Class, Assets, Info, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{css}}-dashboard {{activitydelta > 5000 && hideoninactivity ? (css + '-dashboard-hidden') : ''}}\">\n\t<div class=\"{{css}}-backbar\"></div>\n\n\t<div class=\"{{css}}-controlbar\">\n\n        <div tabindex=\"0\" data-selector=\"submit-image-button\"\n\t\t\t ba-hotkey:space^enter=\"{{submit()}}\" onmouseout=\"this.blur()\"\n\t\t\t class=\"{{css}}-leftbutton-container\"\n\t\t\t ba-if=\"{{submittable}}\" ba-click=\"{{submit()}}\">\n            <div class=\"{{css}}-button-inner\">\n                {{string('submit-image')}}\n            </div>\n        </div>\n\n        <div tabindex=\"0\" data-selector=\"button-icon-ccw\"\n\t\t\t ba-hotkey:space^enter=\"{{rerecord()}}\" onmouseout=\"this.blur()\"\n\t\t\t class=\"{{css}}-leftbutton-container\" ba-if=\"{{rerecordable}}\"\n\t\t\t ba-click=\"{{rerecord()}}\" title=\"{{string('rerecord-image')}}\"\n\t\t>\n            <div class=\"{{css}}-button-inner\">\n                <i class=\"{{csscommon}}-icon-ccw\"></i>\n            </div>\n        </div>\n\n\t\t<div data-selector=\"image-title-block\" class=\"{{css}}-image-title-container\" ba-if=\"{{title}}\">\n\t\t\t<p class=\"{{css}}-image-title\">\n\t\t\t\t{{title}}\n\t\t\t</p>\n\t\t</div>\n\n\t\t<div tabindex=\"8\" data-selector=\"button-icon-resize-full\"\n\t\t\t ba-hotkey:space^enter=\"{{toggle_fullscreen()}}\" onmouseout=\"this.blur()\"\n\t\t\t class=\"{{css}}-rightbutton-container\"\n\t\t\t onkeydown=\"{{tab_index_move(domEvent)}}\" ba-if=\"{{fullscreen}}\"\n\t\t\t ba-click=\"{{toggle_fullscreen()}}\" title=\"{{ fullscreened ? string('exit-fullscreen-image') : string('fullscreen-image') }}\">\n\t\t\t<div class=\"{{css}}-button-inner\">\n\t\t\t\t<i class=\"{{csscommon}}-icon-resize-{{fullscreened ? 'small' : 'full'}}\"></i>\n\t\t\t</div>\n\t\t</div>\n\n\t</div>\n</div>\n",

                attrs: {
                    "css": "ba-imageviewer",
                    "rerecordable": false,
                    "submittable": false,
                    "fullscreen": true,
                    "fullscreened": false,
                    "activitydelta": 0,
                    "title": ""
                },

                functions: {

                    toggle_fullscreen: function() {
                        this.trigger("fullscreen");
                    },

                    rerecord: function() {
                        this.trigger("rerecord");
                    },

                    submit: function() {
                        this.set("submittable", false);
                        this.set("rerecordable", false);
                        this.trigger("submit");
                    },

                    tab_index_move: function(ev, nextSelector, focusingSelector) {
                        this.trigger("tab_index_move", ev[0], nextSelector, focusingSelector);
                    }
                },

                create: function() {
                    this.set("ismobile", Info.isMobile());
                }
            };
        })
        .register("ba-imageviewer-controlbar")
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "activitydelta > 5000 && hideoninactivity ? (css + '-dashboard-hidden') : ''": function (obj) { return obj.activitydelta > 5000 && obj.hideoninactivity ? (obj.css + '-dashboard-hidden') : ''; }, "submit()": function (obj) { return obj.submit(); }, "submittable": function (obj) { return obj.submittable; }, "string('submit-image')": function (obj) { return obj.string('submit-image'); }, "rerecord()": function (obj) { return obj.rerecord(); }, "rerecordable": function (obj) { return obj.rerecordable; }, "string('rerecord-image')": function (obj) { return obj.string('rerecord-image'); }, "csscommon": function (obj) { return obj.csscommon; }, "title": function (obj) { return obj.title; }, "toggle_fullscreen()": function (obj) { return obj.toggle_fullscreen(); }, "tab_index_move(domEvent)": function (obj) { return obj.tab_index_move(obj.domEvent); }, "fullscreen": function (obj) { return obj.fullscreen; }, "fullscreened ? string('exit-fullscreen-image') : string('fullscreen-image')": function (obj) { return obj.fullscreened ? obj.string('exit-fullscreen-image') : obj.string('fullscreen-image'); }, "fullscreened ? 'small' : 'full'": function (obj) { return obj.fullscreened ? 'small' : 'full'; }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "rerecord-image": "Redo?",
            "submit-image": "Confirm",
            "fullscreen-image": "Enter fullscreen",
            "exit-fullscreen-image": "Exit fullscreen"
        });
});
Scoped.define("module:ImageViewer.Dynamics.Message", [
    "dynamics:Dynamic"
], [
    "dynamics:Partials.ClickPartial"
], function(Class, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{css}}-message-container\" ba-click=\"{{click()}}\">\n    <div data-selector=\"message-block\" class='{{css}}-message-message'>\n        {{message}}\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-imageviewer",
                    "message": ''
                },

                functions: {

                    click: function() {
                        this.trigger("click");
                    }

                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "click()": function (obj) { return obj.click(); }, "message": function (obj) { return obj.message; }/**/
        })
        .register("ba-imageviewer-message");
});
Scoped.define("module:ImageViewer.Dynamics.Topmessage", [
    "dynamics:Dynamic"
], function(Class, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{css}}-topmessage-container\">\n    <div class='{{css}}-topmessage-background'>\n    </div>\n    <div data-selector=\"topmessage-message-block\" class='{{css}}-topmessage-message'>\n        {{topmessage}}\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-imageviewer",
                    "topmessage": ''
                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "topmessage": function (obj) { return obj.topmessage; }/**/
        })
        .register("ba-imageviewer-topmessage");
});
Scoped.define("module:ImageViewer.Dynamics.ImageViewer", [
    "dynamics:Dynamic",
    "module:Assets",
    "browser:Info",
    "browser:Dom",
    "base:Types",
    "base:Objs",
    "base:Strings",
    "base:Time",
    "base:Timers",
    "base:Classes.ClassRegistry",
    "base:Async",
    "browser:Events"
], [
    "module:ImageViewer.Dynamics.Message",
    "module:ImageViewer.Dynamics.Controlbar",
    "dynamics:Partials.EventPartial",
    "dynamics:Partials.OnPartial",
    "dynamics:Partials.TemplatePartial",
    "dynamics:Partials.HotkeyPartial"
], function(Class, Assets, Info, Dom, Types, Objs, Strings, Time, Timers, ClassRegistry, Async, DomEvents, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<div itemscope itemtype=\"http://schema.org/ImageObject\"\n    class=\"{{css}}-container {{css}}-size-{{csssize}} {{iecss}}-{{ie8 ? 'ie8' : 'noie8'}}\n    {{csstheme}} {{css}}-{{ fullscreened ? 'fullscreen' : 'normal' }}-view {{css}}-{{ firefox ? 'firefox' : 'common'}}-browser\n    {{css}}-{{themecolor}}-color\"\n    ba-on:mousemove=\"{{user_activity()}}\"\n    ba-on:mousedown=\"{{user_activity(true)}}\"\n    ba-on:touchstart=\"{{user_activity(true)}}\"\n\tba-styles=\"{{widthHeightStyles}}\"\n>\n    <img tabindex=\"-1\" class=\"{{css}}-image\" data-image=\"image\" />\n    <div class=\"{{css}}-overlay\">\n\t    <ba-{{dyncontrolbar}}\n\t\t    ba-css=\"{{csscontrolbar || css}}\"\n\t\t\tba-csscommon=\"{{csscommon || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t    ba-template=\"{{tmplcontrolbar}}\"\n\t\t    ba-show=\"{{controlbar_active}}\"\n\t\t    ba-event:rerecord=\"rerecord\"\n\t\t    ba-event:submit=\"submit\"\n\t\t    ba-event:fullscreen=\"toggle_fullscreen\"\n\t\t\tba-event:tab_index_move=\"tab_index_move\"\n\t\t\tba-tabindex=\"{{tabindex}}\"\n\t\t    ba-title=\"{{title}}\"\n\t\t    ba-activitydelta=\"{{activity_delta}}\"\n\t\t    ba-hideoninactivity=\"{{hideoninactivity}}\"\n\t\t    ba-rerecordable=\"{{rerecordable}}\"\n\t\t    ba-submittable=\"{{submittable}}\"\n\t\t    ba-fullscreen=\"{{fullscreensupport && !nofullscreen}}\"\n            ba-fullscreened=\"{{fullscreened}}\"\n            ba-source=\"{{source}}\"\n\t\t></ba-{{dyncontrolbar}}>\n\n\t\t<ba-{{dynmessage}}\n\t\t    ba-css=\"{{cssmessage || css}}\"\n\t\t\tba-csscommon=\"{{csscommon || css}}\"\n\t\t\tba-theme-color=\"{{themecolor}}\"\n\t\t    ba-template=\"{{tmplmessage}}\"\n\t\t    ba-show=\"{{message_active}}\"\n\t\t    ba-message=\"{{message}}\"\n\t\t    ba-event:click=\"message_click\"\n\t\t></ba-{{dynmessage}}>\n\n\t\t<ba-{{dyntopmessage}}\n\t\t    ba-css=\"{{csstopmessage || css}}\"\n\t\t\tba-csscommon=\"{{csscommon || css}}\"\n\t\t\tba-theme-color=\"{{themecolor}}\"\n\t\t    ba-template=\"{{tmpltopmessage}}\"\n\t\t    ba-show=\"{{topmessage}}\"\n\t\t    ba-topmessage=\"{{topmessage}}\"\n\t\t></ba-{{dyntopmessage}}>\n\t\t\n\t\t<meta itemprop=\"caption\" content=\"{{title}}\" />\n\t\t<meta itemprop=\"thumbnailUrl\" content=\"{{poster}}\"/>\n\t\t<meta itemprop=\"contentUrl\" content=\"{{source}}\"/>\n    </div>\n</div>\n",

                attrs: {
                    /* CSS */
                    "css": "ba-imageviewer",
                    "csscommon": "ba-commoncss",
                    "iecss": "ba-imageviewer",
                    "cssmessage": "",
                    "csstopmessage": "",
                    "csscontrolbar": "",
                    "width": "",
                    "height": "",
                    "popup-width": "",
                    "popup-height": "",
                    /* Themes */
                    "theme": "",
                    "csstheme": "",
                    "themecolor": "",
                    /* Dynamics */
                    "dynmessage": "imageviewer-message",
                    "dyntopmessage": "imageviewer-topmessage",
                    "dyncontrolbar": "imageviewer-controlbar",
                    /* Templates */
                    "tmplmessage": "",
                    "tmpltopmessage": "",
                    "tmplcontrolbar": "",
                    /* Attributes */
                    "source": "",
                    "title": "",
                    "fullscreened": false,
                    "visibilityfraction": 0.8,

                    /* Options */
                    "rerecordable": false,
                    "submittable": false,
                    "popup": false,
                    "nofullscreen": false,
                    "ready": true,
                    "stretch": false,
                    "popup-stretch": false,
                    "hideoninactivity": true,
                    "topmessage": "",
                    "closebuttonvisible": false,
                    "customcaptionvisible": false,
                    "initialoptions": {
                        "hideoninactivity": null
                    }
                },

                types: {
                    "rerecordable": "boolean",
                    "ready": "boolean",
                    "nofullscreen": "boolean",
                    "stretch": "boolean",
                    "hideoninactivity": "boolean",
                    "popup": "boolean",
                    "popup-stretch": "boolean",
                    "popup-width": "int",
                    "popup-height": "int",
                    "fullscreened": "boolean",
                    "themecolor": "string",
                    "closebuttonvisible": "boolean",
                    "customcaptionvisible": "boolean"
                },

                computed: {
                    "widthHeightStyles:width,height": function() {
                        var result = {};
                        var width = this.get("width");
                        var height = this.get("height");
                        if (width)
                            result.width = width + ((width + '').match(/^\d+$/g) ? 'px' : '');
                        if (height)
                            result.height = height + ((height + '').match(/^\d+$/g) ? 'px' : '');
                        return result;
                    }
                },

                events: {
                    "change:source": function() {
                        var img = this.image();
                        if (img)
                            img.src = this.get("source");
                    }
                },

                remove_on_destroy: true,

                create: function() {
                    if (this.get("theme")) this.set("theme", this.get("theme").toLowerCase());
                    if (this.get("theme") in Assets.imageviewerthemes) {
                        Objs.iter(Assets.imageviewerthemes[this.get("theme")], function(value, key) {
                            if (!this.isArgumentAttr(key))
                                this.set(key, value);
                        }, this);
                    }

                    if (!this.get("themecolor"))
                        this.set("themecolor", "default");

                    this.set("ie8", Info.isInternetExplorer() && Info.internetExplorerVersion() < 9);
                    this.set("firefox", Info.isFirefox());
                    this.set("message", "");
                    this.set("fullscreensupport", Dom.elementSupportsFullscreen(this.activeElement()));
                    this.set("csssize", "normal");

                    this.set("controlbar_active", this.get("fullscreensupport") || this.get("submittable") || this.get("rerecordable"));
                    this.set("message_active", false);

                    this.set("last_activity", Time.now());
                    this.set("activity_delta", 0);

                    this.__currentStretch = null;
                    this.__imageViewer = {};

                    // Set initial options for further help actions
                    this.set("initialoptions", {
                        hideoninactivity: this.get("hideoninactivity")
                    });
                    this.activeElement().onkeydown = this._keyDownActivity.bind(this, this.activeElement());

                    this.on("change:stretch", function() {
                        this._updateStretch();
                    }, this);

                    this._timer = new Timers.Timer({
                        context: this,
                        fire: this._timerFire,
                        delay: 100,
                        start: true
                    });
                },

                getMediaType: function() {
                    return "image";
                },

                _keyDownActivity: function(element, ev) {
                    var _keyCode = ev.which || ev.keyCode;
                    // Prevent whitespace browser center scroll and arrow buttons behaviours
                    if (_keyCode === 32 || _keyCode === 37 || _keyCode === 38 || _keyCode === 39 || _keyCode === 40) ev.preventDefault();

                    if (_keyCode === 32 || _keyCode === 13 || _keyCode === 9) {
                        this._resetActivity();
                        if (this.get("fullscreened") && this.get("hideoninactivity")) this.set("hideoninactivity", false);
                    }

                    if (_keyCode === 9 && ev.shiftKey) {
                        this._resetActivity();
                        this._findNextTabStop(element, ev, function(target, index) {
                            target.focus();
                        }, -1);
                    } else if (_keyCode === 9) {
                        this._resetActivity();
                        this._findNextTabStop(element, ev, function(target, index) {
                            target.focus();
                        });
                    }
                },

                _findNextTabStop: function(parentElement, ev, callback, direction) {
                    var _currentIndex, _direction, _tabIndexes, _tabIndexesArray, _maxIndex, _minIndex, _looked, _tabIndex, _delta, _element, _imagePlayersCount;
                    _maxIndex = _minIndex = 0;
                    _direction = direction || 1;
                    _element = ev.target;
                    _currentIndex = _element.tabIndex;
                    _tabIndexes = parentElement.querySelectorAll('[tabindex]');
                    _tabIndexesArray = Array.prototype.slice.call(_tabIndexes, 0);
                    _tabIndexes = _tabIndexesArray
                        .filter(function(element) {
                            if ((element.clientWidth > 0 || element.clientHeight > 0) && (element.tabIndex !== -1)) {
                                if (_maxIndex <= element.tabIndex) _maxIndex = element.tabIndex;
                                if (_minIndex >= element.tabIndex) _minIndex = element.tabIndex;
                                return true;
                            } else return false;
                        });

                    if ((_direction === 1 && _currentIndex === _maxIndex) || (direction === -1 && _currentIndex === _minIndex) || _maxIndex === 0) {
                        _imagePlayersCount = document.querySelectorAll('ba-imageviewer').length;
                        if (_imagePlayersCount > 1) {
                            parentElement.tabIndex = -1;
                            parentElement.blur();
                        }
                        return;
                    }

                    for (var i = 0; i < _tabIndexes.length; i++) {
                        if (!_tabIndexes[i])
                            continue;
                        _tabIndex = _tabIndexes[i].tabIndex;
                        _delta = _tabIndex - _currentIndex;
                        if (_tabIndex < _minIndex || _tabIndex > _maxIndex || Math.sign(_delta) !== _direction)
                            continue;

                        if (!_looked || Math.abs(_delta) < Math.abs(_looked.tabIndex - _currentIndex))
                            _looked = _tabIndexes[i];
                    }

                    if (_looked) {
                        ev.preventDefault();
                        callback(_looked, _looked.tabIndex);
                    }
                },

                _afterActivate: function(element) {
                    inherited._afterActivate.call(this, element);
                    this.image().src = this.get("source");
                },

                _resetActivity: function() {
                    this.set("last_activity", Time.now());
                    this.set("activity_delta", 0);
                },

                object_functions: ["rerecord"],

                functions: {

                    user_activity: function(strong) {
                        this.set("last_activity", Time.now());
                        this.set("activity_delta", 0);
                    },

                    message_click: function() {
                        this.trigger("message:click");
                    },

                    rerecord: function() {
                        if (!this.get("rerecordable"))
                            return;
                        this.trigger("rerecord");
                    },

                    toggle_fullscreen: function() {
                        if (this.get("fullscreened") && this.__imageViewer.imageWrapper) {
                            this._close_image();
                        } else {
                            this._open_image();
                        }
                    },

                    submit: function() {
                        if (!this.get("submittable"))
                            return;
                        this.trigger("submit");
                        this.set("submittable", false);
                        this.set("rerecordable", false);
                    },

                    tab_index_move: function(ev, nextSelector, focusingSelector) {
                        var _targetElement, _activeElement, _selector, _keyCode;
                        _keyCode = ev.which || ev.keyCode;
                        _activeElement = this.activeElement();
                        if (_keyCode === 13 || _keyCode === 32) {
                            if (focusingSelector) {
                                _selector = "[data-selector='" + focusingSelector + "']";
                                _targetElement = _activeElement.querySelector(_selector);
                                if (_targetElement)
                                    Async.eventually(function() {
                                        this.trigger("keyboardusecase", _activeElement);
                                        _targetElement.focus({
                                            preventScroll: false
                                        });
                                    }, this, 100);
                            } else {
                                _selector = '[data-image="image"]';
                                _targetElement = _activeElement.querySelector(_selector);
                                Async.eventually(function() {
                                    this.trigger("keyboardusecase", _activeElement);
                                    _targetElement.focus({
                                        preventScroll: true
                                    });
                                }, this, 100);
                            }
                        } else if (_keyCode === 9 && nextSelector) {
                            _selector = "[data-selector='" + nextSelector + "']";
                            _targetElement = _activeElement.querySelector(_selector);
                            if (_targetElement)
                                Async.eventually(function() {
                                    this.trigger("keyboardusecase", _activeElement);
                                    _targetElement.focus({
                                        preventScroll: false
                                    });
                                }, this, 100);

                        }
                    }
                },

                destroy: function() {
                    this._timer.destroy();
                    this.host.destroy();
                    inherited.destroy.call(this);
                },

                _open_image: function(sourceFile) {
                    this.__imageViewer.counter = 0;
                    // Main container
                    this.__imageViewer.imageViewer = document.createElement('div');

                    // Wrapper
                    this.__imageViewer.imageWrapper = document.createElement('div');
                    this.__imageViewer.imageWrapper.className = this.get('css') + '-image-viewer-wrapper';

                    // image viewer overlay
                    this.__imageViewer.overlayElement = document.createElement('div');
                    this.__imageViewer.overlayElement.className = this.get('css') + '-image-viewer-overlay';

                    this.__imageViewer.image = document.createElement('img');
                    this.__imageViewer.image.className = this.get('css') + '-image-viewer-expanded';
                    this.__imageViewer.image.src = sourceFile || this.get('source');

                    // Will show caption in the middle bottom side
                    if (this.get("customcaptionvisible")) {
                        var _titleText;
                        this.__imageViewer.title = document.createElement('div');
                        this.__imageViewer.title.className = this.get('css') + '-image-viewer-title';
                        _titleText = document.createTextNode(this.get('title'));
                        this.__imageViewer.title.appendChild(_titleText);
                    }

                    // Show close button on the top right corner
                    if (this.get("closebuttonvisible")) {
                        this.__imageViewer.closeButton = document.createElement('div');
                        this.__imageViewer.closeButton.className = this.get('css') + '-close-button';
                        this.__imageViewer.closeButton.tabIndex = 0;

                        // Listen event on close button
                        this.__imageViewer.clickEvent = this.auto_destroy(new DomEvents());
                        this.__imageViewer.clickEvent.on(this.__imageViewer.closeButton, "click", function() {
                            this._close_image();
                        }, this);
                        this.__imageViewer.clickEvent.on(this.__imageViewer.closeButton, "keydown", function() {
                            this._close_image();
                        }, this);
                    }


                    // Show title on the image, if require could be added as a future


                    this.__imageViewer.bodyOverlay = document.querySelector('ba-imageviewer');

                    this.__imageViewer.imageViewer.appendChild(this.__imageViewer.overlayElement);
                    this.__imageViewer.imageViewer.appendChild(this.__imageViewer.image);

                    if (this.get("customcaptionvisible"))
                        this.__imageViewer.imageViewer.appendChild(this.__imageViewer.title);
                    if (this.get("closebuttonvisible"))
                        this.__imageViewer.imageViewer.appendChild(this.__imageViewer.closeButton);

                    // Append child
                    this.__imageViewer.bodyOverlay.parentNode.insertBefore(this.__imageViewer.imageWrapper, this.__imageViewer.bodyOverlay);

                    this.__imageViewer.imageViewer.style.opacity = 0;
                    this.__imageViewer.imageWrapper.appendChild(this.__imageViewer.imageViewer);

                    // Start fadIn process
                    this.__imageViewer.fadeInCounter = new Timers.Timer({
                        context: this,
                        fire: this.__fadeIn,
                        delay: 40,
                        start: true
                    });

                    this.set("hideoninactivity", false);
                    this.set("fullscreened", true);
                },

                _close_image: function() {
                    this.set("fullscreened", false);
                    this.set("hideoninactivity", this.get("initialoptions").hideoninactivity);
                    this.__imageViewer.fadeInCounter = new Timers.Timer({
                        context: this,
                        fire: this.__fadeOut,
                        delay: 20,
                        start: true
                    });
                },

                __fadeIn: function() {
                    if (!this.__imageViewer.fadeInCounter) return;
                    if (this.__imageViewer.fadeInCounter.destroyed()) return;
                    if (this.__imageViewer.counter < 1.05) {
                        this.__imageViewer.imageViewer.style.opacity = this.__imageViewer.counter;
                        this.__imageViewer.counter += 0.05;
                    } else {
                        this.__imageViewer.imageViewer.opacity = 1.00;
                        this.__imageViewer.fadeInCounter.stop();
                    }
                },

                __fadeOut: function() {
                    if (!this.__imageViewer.fadeInCounter) return;
                    if (this.__imageViewer.fadeInCounter.destroyed()) return;
                    if (this.__imageViewer.counter > 0) {
                        this.__imageViewer.imageViewer.style.opacity = this.__imageViewer.counter;
                        this.__imageViewer.counter -= 0.05;
                    } else {
                        this.__imageViewer.fadeInCounter.stop();
                        this.__imageViewer.bodyOverlay.parentNode.removeChild(this.__imageViewer.imageWrapper);
                    }
                },

                _timerFire: function() {
                    if (this.destroyed())
                        return;
                    try {
                        this.set("activity_delta", Time.now() - this.get("last_activity"));
                    } catch (e) {}
                    try {
                        this._updateStretch();
                    } catch (e) {}
                    try {
                        this._updateCSSSize();
                    } catch (e) {}
                },

                _updateCSSSize: function() {
                    var width = Dom.elementDimensions(this.activeElement()).width;
                    this.set("csssize", width > 400 ? "normal" : (width > 300 ? "medium" : "small"));
                },

                image: function() {
                    return this.activeElement().querySelector("img");
                },

                imageHeight: function() {
                    var _height = this.image().height;
                    var _clientHeight = (window.innerHeight || document.body.clientHeight);
                    if (!this._image())
                        return _clientHeight;
                    else
                        return _height > _clientHeight ? _clientHeight : _height;
                },

                imageWidth: function() {
                    var _clientWidth = (window.innerWidth || document.body.clientWidth);
                    var _width = this.image().width;
                    if (!this._image())
                        return _clientWidth;
                    else
                        return _width > _clientWidth ? _clientWidth : _width;
                },

                aspectRatio: function() {
                    // Don't use shortcut way of getting aspect ratio, will act as not expected.
                    var height = this.imageHeight();
                    var width = this.imageWidth();

                    return width / height;
                },

                parentWidth: function() {
                    return Dom.elementDimensions(this.activeElement().parentElement).width;
                },

                parentHeight: function() {
                    return Dom.elementDimensions(this.activeElement().parentElement).height;
                },

                parentAspectRatio: function() {
                    return this.parentWidth() / this.parentHeight();
                },

                _updateStretch: function() {
                    var newStretch = null;
                    if (this.get("stretch")) {
                        var ar = this.aspectRatio();
                        if (isFinite(ar)) {
                            var par = this.parentAspectRatio();
                            if (isFinite(par)) {
                                if (par > ar)
                                    newStretch = "height";
                                if (par < ar)
                                    newStretch = "width";
                            } else if (par === Infinity)
                                newStretch = "height";
                        }
                    }
                    if (this.__currentStretch !== newStretch) {
                        if (this.__currentStretch)
                            Dom.elementRemoveClass(this.activeElement(), this.get("css") + "-stretch-" + this.__currentStretch);
                        if (newStretch)
                            Dom.elementAddClass(this.activeElement(), this.get("css") + "-stretch-" + newStretch);
                    }
                    this.__currentStretch = newStretch;
                },

                cloneAttrs: function() {
                    return Objs.map(this.attrs, function(value, key) {
                        return this.get(key);
                    }, this);
                },

                popupAttrs: function() {
                    return {
                        popup: false,
                        width: this.get("popup-width"),
                        height: this.get("popup-height"),
                        stretch: this.get("popup-stretch")
                    };
                }

            };
        }, {

        }).register("ba-imageviewer")
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "csssize": function (obj) { return obj.csssize; }, "iecss": function (obj) { return obj.iecss; }, "ie8 ? 'ie8' : 'noie8'": function (obj) { return obj.ie8 ? 'ie8' : 'noie8'; }, "csstheme": function (obj) { return obj.csstheme; }, "fullscreened ? 'fullscreen' : 'normal'": function (obj) { return obj.fullscreened ? 'fullscreen' : 'normal'; }, "firefox ? 'firefox' : 'common'": function (obj) { return obj.firefox ? 'firefox' : 'common'; }, "themecolor": function (obj) { return obj.themecolor; }, "user_activity()": function (obj) { return obj.user_activity(); }, "user_activity(true)": function (obj) { return obj.user_activity(true); }, "widthHeightStyles": function (obj) { return obj.widthHeightStyles; }, "dyncontrolbar": function (obj) { return obj.dyncontrolbar; }, "csscontrolbar || css": function (obj) { return obj.csscontrolbar || obj.css; }, "csscommon || css": function (obj) { return obj.csscommon || obj.css; }, "tmplcontrolbar": function (obj) { return obj.tmplcontrolbar; }, "controlbar_active": function (obj) { return obj.controlbar_active; }, "tabindex": function (obj) { return obj.tabindex; }, "title": function (obj) { return obj.title; }, "activity_delta": function (obj) { return obj.activity_delta; }, "hideoninactivity": function (obj) { return obj.hideoninactivity; }, "rerecordable": function (obj) { return obj.rerecordable; }, "submittable": function (obj) { return obj.submittable; }, "fullscreensupport && !nofullscreen": function (obj) { return obj.fullscreensupport && !obj.nofullscreen; }, "fullscreened": function (obj) { return obj.fullscreened; }, "source": function (obj) { return obj.source; }, "dynmessage": function (obj) { return obj.dynmessage; }, "cssmessage || css": function (obj) { return obj.cssmessage || obj.css; }, "tmplmessage": function (obj) { return obj.tmplmessage; }, "message_active": function (obj) { return obj.message_active; }, "message": function (obj) { return obj.message; }, "dyntopmessage": function (obj) { return obj.dyntopmessage; }, "csstopmessage || css": function (obj) { return obj.csstopmessage || obj.css; }, "tmpltopmessage": function (obj) { return obj.tmpltopmessage; }, "topmessage": function (obj) { return obj.topmessage; }, "poster": function (obj) { return obj.poster; }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "image-error": "An error occurred, please try again later. Click to retry."
        });
});
Scoped.define("module:ImageCapture.Dynamics.Recorder", [
    "dynamics:Dynamic",
    "module:Assets",
    "browser:Info",
    "browser:Dom",
    "browser:Upload.MultiUploader",
    "browser:Upload.FileUploader",
    "media:ImageRecorder.ImageRecorderWrapper",
    "base:Types",
    "base:Objs",
    "base:Strings",
    "base:Time",
    "base:Timers",
    "base:States.Host",
    "base:Classes.ClassRegistry",
    "base:Collections.Collection",
    "base:Promise",
    "module:ImageCapture.Dynamics.RecorderStates.Initial",
    "module:ImageCapture.Dynamics.RecorderStates"
], [
    "module:ImageCapture.Dynamics.Loader",
    "module:ImageCapture.Dynamics.Controlbar",
    "module:ImageCapture.Dynamics.Message",
    "module:ImageCapture.Dynamics.Topmessage",
    "module:ImageCapture.Dynamics.Chooser",
    "module:ImageCapture.Dynamics.Faceoutline",
    "dynamics:Partials.ShowPartial",
    "dynamics:Partials.IfPartial",
    "dynamics:Partials.EventPartial",
    "dynamics:Partials.OnPartial",
    "dynamics:Partials.DataPartial",
    "dynamics:Partials.AttrsPartial",
    "dynamics:Partials.StylesPartial",
    "dynamics:Partials.TemplatePartial",
    "dynamics:Partials.HotkeyPartial"
], function(Class, Assets, Info, Dom, MultiUploader, FileUploader, ImageRecorderWrapper, Types, Objs, Strings, Time, Timers, Host, ClassRegistry, Collection, Promise, InitialState, RecorderStates, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div data-selector=\"capture-container\" ba-show=\"{{!player_active}}\"\n     class=\"{{css}}-container {{css}}-size-{{csssize}} {{iecss}}-{{ie8 ? 'ie8' : 'noie8'}} {{csstheme}}\n     \t{{css}}-{{ fullscreened ? 'fullscreen' : 'normal' }}-view {{css}}-{{ firefox ? 'firefox' : 'common'}}-browser\n    \t{{css}}-{{themecolor}}-color\"\n     ba-styles=\"{{widthHeightStyles}}\"\n>\n\n    <img tabindex=\"-1\" data-selector=\"recorder-status\" class=\"{{css}}-video {{css}}-{{hasrecorder ? 'hasrecorder' : 'norecorder'}}\" data-image=\"image\" />\n\t<ba-imagecapture-faceoutline class=\"{{css}}-overlay\" ba-if=\"{{faceoutline && hasrecorder}}\">\n\t</ba-imagecapture-faceoutline>\n    <div data-selector=\"recorder-overlay\" class='{{css}}-overlay' ba-show=\"{{!hideoverlay}}\" data-overlay=\"overlay\">\n\t\t<ba-{{dynloader}}\n\t\t    ba-css=\"{{cssloader || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t    ba-template=\"{{tmplloader}}\"\n\t\t    ba-show=\"{{loader_active}}\"\n\t\t    ba-tooltip=\"{{loadertooltip}}\"\n\t\t\tba-hovermessage=\"{{=hovermessage}}\"\n\t\t    ba-label=\"{{loaderlabel}}\"\n\t\t></ba-{{dynloader}}>\n\n\t\t<ba-{{dynmessage}}\n\t\t    ba-css=\"{{cssmessage || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t    ba-template=\"{{tmplmessage}}\"\n\t\t    ba-show=\"{{message_active}}\"\n\t\t    ba-message=\"{{message}}\"\n\t\t\tba-links=\"{{message_links}}\"\n\t\t    ba-event:click=\"message_click\"\n\t\t\tba-event:link=\"message_link_click\"\n\t\t></ba-{{dynmessage}}>\n\n\t\t<ba-{{dyntopmessage}}\n\t\t    ba-css=\"{{csstopmessage || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t    ba-template=\"{{tmpltopmessage}}\"\n\t\t    ba-show=\"{{topmessage_active && (topmessage || hovermessage)}}\"\n\t\t    ba-topmessage=\"{{hovermessage || topmessage}}\"\n\t\t></ba-{{dyntopmessage}}>\n\n\t\t<ba-{{dynchooser}}\n\t\t\tba-recordviafilecapture=\"{{recordviafilecapture}}\"\n\t\t    ba-css=\"{{csschooser || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t    ba-template=\"{{tmplchooser}}\"\n\t\t    ba-if=\"{{chooser_active && !is_initial_state}}\"\n\t\t    ba-allowrecord=\"{{allowrecord}}\"\n\t\t    ba-allowupload=\"{{allowupload}}\"\n\t\t    ba-allowcustomupload=\"{{allowcustomupload}}\"\n\t\t    ba-allowedextensions=\"{{allowedextensions}}\"\n\t\t    ba-primaryrecord=\"{{primaryrecord}}\"\n\t\t    ba-event:record=\"capture_image\"\n\t\t    ba-event:upload=\"upload_image\"\n\t\t></ba-{{dynchooser}}>\n\n\t\t<ba-{{dyncontrolbar}}\n\t\t    ba-css=\"{{csscontrolbar || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t    ba-template=\"{{tmplcontrolbar}}\"\n\t\t    ba-show=\"{{controlbar_active}}\"\n\t\t    ba-cameras=\"{{cameras}}\"\n\t\t    ba-selectedcamera=\"{{selectedcamera || 0}}\"\n\t\t    ba-camerahealthy=\"{{camerahealthy}}\"\n\t\t    ba-hovermessage=\"{{=hovermessage}}\"\n\t\t    ba-settingsvisible=\"{{settingsvisible}}\"\n\t\t    ba-recordvisible=\"{{recordvisible}}\"\n\t\t\tba-cancelvisible=\"{{allowcancel && cancancel}}\"\n\t\t    ba-rerecordvisible=\"{{rerecordvisible}}\"\n\t\t    ba-controlbarlabel=\"{{controlbarlabel}}\"\n\t\t    ba-event:select-camera=\"select_camera\"\n\t\t    ba-event:invoke-record=\"record\"\n\t\t    ba-event:invoke-rerecord=\"rerecord\"\n\t\t></ba-{{dyncontrolbar}}>\n    </div>\n</div>\n\n<div data-selector=\"recorder-player\" ba-if=\"{{player_active}}\" ba-styles=\"{{widthHeightStyles}}\">\n\t<span ba-show=\"{{ie8}}\">&nbsp;</span>\n\t<ba-{{dynimageviewer}}\n\t    ba-theme=\"{{theme || 'default'}}\"\n        ba-themecolor=\"{{themecolor}}\"\n        ba-source=\"{{playbacksource}}\"\n        ba-hideoninactivity=\"{{false}}\"\n        ba-stretch=\"{{stretch}}\"\n        ba-attrs=\"{{playerattrs}}\"\n        ba-data:id=\"player\"\n        ba-width=\"{{width}}\"\n        ba-height=\"{{height}}\"\n        ba-rerecordable=\"{{rerecordable && (recordings === null || recordings > 0)}}\"\n        ba-submittable=\"{{manualsubmit && verified}}\"\n        ba-nofullscreen=\"{{nofullscreen}}\"\n        ba-event:rerecord=\"rerecord\"\n        ba-event:submit=\"manual_submit\"\n\t>\n\t</ba-{{dynimageviewer}}>\n</div>\n",

                attrs: {
                    /* CSS */
                    "css": "ba-imagecapture",
                    "csscommon": "ba-commoncss",
                    "iecss": "ba-imagecapture",
                    "cssimagegallery": "",
                    "cssloader": "",
                    "csscontrolbar": "",
                    "cssmessage": "",
                    "csstopmessage": "",
                    "csschooser": "",
                    "width": "",
                    "height": "",
                    "gallerysnapshots": 3,

                    /* Themes */
                    "theme": "",
                    "csstheme": "",

                    /* Dynamics */
                    "dynloader": "imagecapture-loader",
                    "dyncontrolbar": "imagecapture-controlbar",
                    "dynmessage": "imagecapture-message",
                    "dyntopmessage": "imagecapture-topmessage",
                    "dynchooser": "imagecapture-chooser",
                    "dynimageviewer": "imageviewer",

                    /* Templates */
                    "tmplloader": "",
                    "tmplcontrolbar": "",
                    "tmplmessage": "",
                    "tmpltopmessage": "",
                    "tmplchooser": "",

                    /* Attributes */
                    "autorecord": false,
                    "allowrecord": true,
                    "allowupload": true,
                    "allowcustomupload": true,
                    "camerafacefront": false,
                    "primaryrecord": true,
                    "nofullscreen": false,
                    "recordingwidth": undefined,
                    "recordingheight": undefined,
                    "minuploadingwidth": undefined,
                    "maxuploadingwidth": undefined,
                    "minuploadingheight": undefined,
                    "maxuploadingheight": undefined,
                    "countdown": 3,
                    "webrtconmobile": "boolean",
                    "snapshottype": "jpg",
                    "playbacksource": "",
                    "recordermode": true,
                    "skipinitial": false,
                    "skipinitialonrerecord": false,
                    "flip-camera": false,
                    "early-rerecord": false,
                    "manualsubmit": false,
                    "allowedextensions": null,
                    "filesizelimit": null,
                    "faceoutline": false,

                    /* Configuration */
                    "simulate": false,
                    "localplayback": false,
                    "uploadoptions": {},
                    "playerattrs": {},
                    "shortMessage": true,

                    /* Options */
                    "rerecordable": true,
                    "recordings": null,
                    "ready": true,
                    "orientation": false,
                    "stretch": false

                },

                computed: {
                    "nativeRecordingWidth:recordingwidth,record_media": function() {
                        return this.get("recordingwidth") || (this.get("record_media") !== "screen" ? 640 : (window.innerWidth || document.body.clientWidth));
                    },
                    "nativeRecordingHeight:recordingheight,record_media": function() {
                        return this.get("recordingheight") || (this.get("record_media") !== "screen" ? 480 : (window.innerHeight || document.body.clientHeight));
                    },
                    "widthHeightStyles:width,height": function() {
                        var result = {};
                        var width = this.get("width");
                        var height = this.get("height");
                        if (width)
                            result.width = width + ((width + '').match(/^\d+$/g) ? 'px' : '');
                        if (height)
                            result.height = height + ((height + '').match(/^\d+$/g) ? 'px' : '');
                        return result;
                    },
                    "canswitchcamera:recordviafilecapture": function() {
                        return !this.get("recordviafilecapture") && Info.isMobile();
                    }
                },

                scopes: {
                    player: ">[id='player']"
                },

                types: {
                    "rerecordable": "boolean",
                    "ready": "boolean",
                    "stretch": "boolean",
                    "autorecord": "boolean",
                    "allowrecord": "boolean",
                    "allowupload": "boolean",
                    "allowcustomupload": "boolean",
                    "primaryrecord": "boolean",
                    "recordermode": "boolean",
                    "nofullscreen": "boolean",
                    "skipinitialonrerecord": "boolean",
                    "localplayback": "boolean",
                    "camerafacefront": "boolean",
                    "skipinitial": "boolean",
                    "minuploadingwidth": "int",
                    "maxuploadingwidth": "int",
                    "minuploadingheight": "int",
                    "maxuploadingheight": "int",
                    "webrtconmobile": "boolean",
                    "flip-camera": "boolean",
                    "faceoutline": "boolean",
                    "early-rerecord": "boolean",
                    "manualsubmit": "boolean",
                    "simulate": "boolean",
                    "allowedextensions": "array"
                },

                extendables: ["states"],

                remove_on_destroy: true,

                events: {
                    "change:camerahealthy": function(value) {
                        this.trigger("camerahealth", value);
                    },
                    "change:webrtconmobile": function() {
                        this.set("recordviafilecapture", Info.isMobile() && (!this.get("webrtconmobile") || !ImageRecorderWrapper.anySupport(this._imageCaptureWrapperOptions())));
                    },
                    "change:recordviafilecapture": function() {
                        if (this.get("recordviafilecapture")) {
                            this.set("skipinitial", false);
                            this.set("skipinitialonrerecord", false);
                            this.set("allowscreen", false);
                            this.set("autorecord", false);
                        }
                    }
                },

                create: function() {
                    if (this.get("theme")) this.set("theme", this.get("theme").toLowerCase());
                    if (this.get("theme") in Assets.recorderthemes) {
                        Objs.iter(Assets.recorderthemes[this.get("theme")], function(value, key) {
                            if (!this.isArgumentAttr(key))
                                this.set(key, value);
                        }, this);
                    }
                    this.set("ie8", Info.isInternetExplorer() && Info.internetExplorerVersion() < 9);
                    this.set("hideoverlay", false);

                    this.set("canswitchcamera", false);
                    this.set("recordviafilecapture", Info.isMobile() && (!this.get("webrtconmobile") || !ImageRecorderWrapper.anySupport(this._imageCaptureWrapperOptions())));

                    if (this.get("recordviafilecapture")) {
                        this.set("skipinitial", false);
                        this.set("skipinitialonrerecord", false);
                        this.set("autorecord", false);
                    }

                    this.__attachRequested = false;
                    this.__activated = false;
                    this._bound = false;
                    this.__recording = false;
                    this.__error = null;
                    this.__currentStretch = null;

                    this.on("change:stretch", function() {
                        this._updateStretch();
                    }, this);
                    this.host = new Host({
                        stateRegistry: new ClassRegistry(this.cls.recorderStates())
                    });
                    this.host.dynamic = this;
                    this.host.initialize(this._initialState);

                    this._timer = new Timers.Timer({
                        context: this,
                        fire: this._timerFire,
                        delay: 250,
                        start: true
                    });

                    this.__cameraResponsive = true;
                    this.__cameraSignal = true;

                    if (!Info.isMobile())
                        this.set("orientation", false);
                    this.set("currentorientation", window.innerHeight > window.innerWidth ? "portrait" : "landscape");
                },

                getMediaType: function() {
                    return "image";
                },

                getImageFile: function() {
                    return this._imageFile || (this.recorder && this.recorder.localPlaybackSource()) || null;
                },

                _initialState: InitialState,

                state: function() {
                    return this.host.state();
                },

                recorderAttached: function() {
                    return !!this.recorder;
                },

                imageError: function() {
                    return this.__error;
                },

                isFormatSupported: function() {
                    return (this.dyn.recorder && this.dyn.recorder.supportsLocalPlayback()) || this.dyn._imageFilePlaybackable;
                },

                _error: function(error_type, error_code) {
                    this.__error = {
                        error_type: error_type,
                        error_code: error_code
                    };
                    this.trigger("error:" + error_type, error_code);
                    this.trigger("error", error_type, error_code);
                },

                _clearError: function() {
                    this.__error = null;
                },

                _detachRecorder: function() {
                    if (this.recorder)
                        this.recorder.weakDestroy();
                    this.recorder = null;
                    this.set("hasrecorder", false);
                },

                _imageCaptureWrapperOptions: function() {
                    return {
                        simulate: this.get("simulate"),
                        // webrtcOnMobile: !!this.get("webrtconmobile"),
                        localPlaybackRequested: this.get("localplayback"),
                        flip: this.get("flip-camera")
                    };
                },

                _attachRecorder: function() {
                    if (this.recorderAttached())
                        return;
                    if (!this.__activated) {
                        this.__attachRequested = true;
                        return;
                    }
                    this.set("hasrecorder", true);
                    this.__attachRequested = false;
                    var image = this.activeElement().querySelector("[data-image='image']");
                    this._clearError();
                    this.recorder = ImageRecorderWrapper.create(Objs.extend({
                        element: image
                    }, this._imageCaptureWrapperOptions()));
                    if (this.recorder)
                        this.trigger("attached");
                    else
                        this._error("attach");
                },

                _softwareDependencies: function() {
                    if (!this.recorderAttached() || !this.recorder)
                        return Promise.error("No recorder attached.");
                    return this.recorder.softwareDependencies();
                },

                _bindMedia: function() {
                    if (this._bound || !this.recorderAttached() || !this.recorder)
                        return;
                    this.recorder.ready.success(function() {
                        this.recorder.on("require_display", function() {
                            this.set("hideoverlay", true);
                        }, this);
                        this.recorder.bindMedia().error(function(e) {
                            this.trigger("access_forbidden", e);
                            this.set("hideoverlay", false);
                            this.off("require_display", null, this);
                            this._error("bind", e);
                        }, this).success(function() {
                            this.trigger("access_granted");
                            this.set("hideoverlay", false);
                            this.off("require_display", null, this);
                            this.recorder.enumerateDevices().success(function(devices) {
                                var selected = this.recorder.currentDevices();
                                this.set("selectedcamera", selected.video);
                                this.set("cameras", new Collection(Objs.values(devices.video)));
                            }, this);
                            this.set("devicetesting", true);
                            this._updateStretch();
                            this._bound = true;
                            this.trigger("bound");
                        }, this);
                    }, this);
                },

                _initializeUploader: function() {
                    if (this._dataUploader)
                        this._dataUploader.weakDestroy();
                    this._dataUploader = new MultiUploader();
                },

                _unbindMedia: function() {
                    if (!this._bound)
                        return;
                    this.recorder.unbindMedia();
                    this._bound = false;
                },

                _uploadImageFile: function(file) {
                    if (this.get("simulate"))
                        return;
                    var uploader = FileUploader.create(Objs.extend({
                        source: file
                    }, this.get("uploadoptions").image));
                    uploader.upload();
                    this._dataUploader.addUploader(uploader);
                },

                _prepareRecording: function() {
                    return Promise.create(true);
                },

                _captureImage: function() {
                    this._snapshot = this.recorder.createSnapshot(this.get("snapshottype"));
                },

                _uploadCapture: function() {
                    if (this.get("simulate"))
                        return;
                    var uploader = this.recorder.createSnapshotUploader(this._snapshot, this.get("snapshottype"), this.get("uploadoptions").image);
                    uploader.upload();
                    this._dataUploader.addUploader(uploader);
                },


                _verifyRecording: function() {
                    return Promise.create(true);
                },

                _afterActivate: function(element) {
                    inherited._afterActivate.call(this, element);
                    this.__activated = true;
                    if (this.__attachRequested)
                        this._attachRecorder();
                    this.persistentTrigger("loaded");
                },

                object_functions: ["record", "rerecord", "reset"],

                functions: {

                    record: function() {
                        this.host.state().record();
                    },

                    record_image: function() {
                        this.host.state().selectRecord();
                    },

                    upload_image: function(file) {
                        this.host.state().selectUpload(file);
                    },

                    select_camera: function(camera_id) {
                        if (this.recorder) {
                            this.recorder.setCurrentDevices({
                                video: camera_id
                            });
                            this.set("selectedcamera", camera_id);
                        }
                    },

                    select_camera_face: function(faceFront) {
                        if (this.recorder) {
                            this.recorder.setCameraFace(faceFront);
                            this.set("camerafacefront", faceFront);
                        }
                    },

                    rerecord: function() {
                        if (confirm(this.stringUnicode("rerecord-confirm")))
                            this.host.state().rerecord();
                    },

                    message_click: function() {
                        this.trigger("message-click");
                    },

                    message_link_click: function(link) {
                        this.trigger("message-link-click", link);
                    },

                    reset: function() {
                        this._stopRecording().callback(function() {
                            this._unbindMedia();
                            this._detachRecorder();
                            this.host.state().next("Initial");
                        }, this);
                    },

                    manual_submit: function() {
                        this.set("rerecordable", false);
                        this.set("manualsubmit", false);
                        this.trigger("manually_submitted");
                    },

                    ready_to_play: function() {
                        this.trigger("ready_to_play");
                    }

                },

                destroy: function() {
                    this._timer.destroy();
                    this.host.destroy();
                    this._detachRecorder();
                    inherited.destroy.call(this);
                },

                deltaCoefficient: function() {
                    return this.recorderAttached() ? this.recorder.deltaCoefficient() : null;
                },

                blankLevel: function() {
                    return this.recorderAttached() ? this.recorder.blankLevel() : null;
                },

                lightLevel: function() {
                    return this.recorderAttached() ? this.recorder.lightLevel() : null;
                },

                _timerFire: function() {
                    if (this.destroyed())
                        return;
                    this.set("currentorientation", window.innerHeight > window.innerWidth ? "portrait" : "landscape");
                    try {
                        if (this.recorderAttached() && this.get("devicetesting")) {
                            var lightLevel = this.lightLevel();
                            this.set("camerahealthy", lightLevel >= 100 && lightLevel <= 200);
                        }
                    } catch (e) {}

                    try {
                        if (this.recorderAttached() && this._timer.fire_count() % 20 === 0 && this._accessing_camera) {
                            var signal = this.blankLevel() >= 0.01;
                            if (signal !== this.__cameraSignal) {
                                this.__cameraSignal = signal;
                                this.trigger(signal ? "camera_signal" : "camera_nosignal");
                            }
                        }
                        if (this.recorderAttached() && this._timer.fire_count() % 20 === 10 && this._accessing_camera) {
                            var delta = this.recorder.deltaCoefficient();
                            var responsive = delta === null || delta >= 0.5;
                            if (responsive !== this.__cameraResponsive) {
                                this.__cameraResponsive = responsive;
                                this.trigger(responsive ? "camera_responsive" : "camera_unresponsive");
                            }
                        }
                    } catch (e) {}

                    this._updateStretch();
                    this._updateCSSSize();
                },

                _updateCSSSize: function() {
                    var width = Dom.elementDimensions(this.activeElement()).width;
                    this.set("csssize", width > 400 ? "normal" : (width > 300 ? "medium" : "small"));
                },

                imageHeight: function() {
                    return this.recorderAttached() ? this.recorder.cameraHeight() : NaN;
                },

                imageWidth: function() {
                    return this.recorderAttached() ? this.recorder.cameraWidth() : NaN;
                },

                aspectRatio: function() {
                    return this.imageWidth() / this.imageHeight();
                },

                parentWidth: function() {
                    return this.get("width") || Dom.elementDimensions(this.activeElement()).width;
                },

                parentHeight: function() {
                    return this.get("height") || Dom.elementDimensions(this.activeElement()).height;
                },

                parentAspectRatio: function() {
                    return this.parentWidth() / this.parentHeight();
                },

                _updateStretch: function() {
                    var newStretch = null;
                    if (this.get("stretch")) {
                        var ar = this.aspectRatio();
                        if (isFinite(ar)) {
                            var par = this.parentAspectRatio();
                            if (isFinite(par)) {
                                if (par > ar)
                                    newStretch = "height";
                                if (par < ar)
                                    newStretch = "width";
                            } else if (par === Infinity)
                                newStretch = "height";
                        }
                    }
                    if (this.__currentStretch !== newStretch) {
                        if (this.__currentStretch)
                            Dom.elementRemoveClass(this.activeElement(), this.get("css") + "-stretch-" + this.__currentStretch);
                        if (newStretch)
                            Dom.elementAddClass(this.activeElement(), this.get("css") + "-stretch-" + newStretch);
                    }
                    this.__currentStretch = newStretch;
                }

            };
        }, {

            recorderStates: function() {
                return [RecorderStates];
            }

        })
        .register("ba-imagecapture")
        .registerFunctions({
            /**/"!player_active": function (obj) { return !obj.player_active; }, "css": function (obj) { return obj.css; }, "csssize": function (obj) { return obj.csssize; }, "iecss": function (obj) { return obj.iecss; }, "ie8 ? 'ie8' : 'noie8'": function (obj) { return obj.ie8 ? 'ie8' : 'noie8'; }, "csstheme": function (obj) { return obj.csstheme; }, "fullscreened ? 'fullscreen' : 'normal'": function (obj) { return obj.fullscreened ? 'fullscreen' : 'normal'; }, "firefox ? 'firefox' : 'common'": function (obj) { return obj.firefox ? 'firefox' : 'common'; }, "themecolor": function (obj) { return obj.themecolor; }, "widthHeightStyles": function (obj) { return obj.widthHeightStyles; }, "hasrecorder ? 'hasrecorder' : 'norecorder'": function (obj) { return obj.hasrecorder ? 'hasrecorder' : 'norecorder'; }, "faceoutline && hasrecorder": function (obj) { return obj.faceoutline && obj.hasrecorder; }, "!hideoverlay": function (obj) { return !obj.hideoverlay; }, "dynloader": function (obj) { return obj.dynloader; }, "cssloader || css": function (obj) { return obj.cssloader || obj.css; }, "tmplloader": function (obj) { return obj.tmplloader; }, "loader_active": function (obj) { return obj.loader_active; }, "loadertooltip": function (obj) { return obj.loadertooltip; }, "hovermessage": function (obj) { return obj.hovermessage; }, "loaderlabel": function (obj) { return obj.loaderlabel; }, "dynmessage": function (obj) { return obj.dynmessage; }, "cssmessage || css": function (obj) { return obj.cssmessage || obj.css; }, "tmplmessage": function (obj) { return obj.tmplmessage; }, "message_active": function (obj) { return obj.message_active; }, "message": function (obj) { return obj.message; }, "message_links": function (obj) { return obj.message_links; }, "dyntopmessage": function (obj) { return obj.dyntopmessage; }, "csstopmessage || css": function (obj) { return obj.csstopmessage || obj.css; }, "tmpltopmessage": function (obj) { return obj.tmpltopmessage; }, "topmessage_active && (topmessage || hovermessage)": function (obj) { return obj.topmessage_active && (obj.topmessage || obj.hovermessage); }, "hovermessage || topmessage": function (obj) { return obj.hovermessage || obj.topmessage; }, "dynchooser": function (obj) { return obj.dynchooser; }, "recordviafilecapture": function (obj) { return obj.recordviafilecapture; }, "csschooser || css": function (obj) { return obj.csschooser || obj.css; }, "tmplchooser": function (obj) { return obj.tmplchooser; }, "chooser_active && !is_initial_state": function (obj) { return obj.chooser_active && !obj.is_initial_state; }, "allowrecord": function (obj) { return obj.allowrecord; }, "allowupload": function (obj) { return obj.allowupload; }, "allowcustomupload": function (obj) { return obj.allowcustomupload; }, "allowedextensions": function (obj) { return obj.allowedextensions; }, "primaryrecord": function (obj) { return obj.primaryrecord; }, "dyncontrolbar": function (obj) { return obj.dyncontrolbar; }, "csscontrolbar || css": function (obj) { return obj.csscontrolbar || obj.css; }, "tmplcontrolbar": function (obj) { return obj.tmplcontrolbar; }, "controlbar_active": function (obj) { return obj.controlbar_active; }, "cameras": function (obj) { return obj.cameras; }, "selectedcamera || 0": function (obj) { return obj.selectedcamera || 0; }, "camerahealthy": function (obj) { return obj.camerahealthy; }, "settingsvisible": function (obj) { return obj.settingsvisible; }, "recordvisible": function (obj) { return obj.recordvisible; }, "allowcancel && cancancel": function (obj) { return obj.allowcancel && obj.cancancel; }, "rerecordvisible": function (obj) { return obj.rerecordvisible; }, "controlbarlabel": function (obj) { return obj.controlbarlabel; }, "player_active": function (obj) { return obj.player_active; }, "ie8": function (obj) { return obj.ie8; }, "dynimageviewer": function (obj) { return obj.dynimageviewer; }, "theme || 'default'": function (obj) { return obj.theme || 'default'; }, "playbacksource": function (obj) { return obj.playbacksource; }, "false": function (obj) { return false; }, "stretch": function (obj) { return obj.stretch; }, "playerattrs": function (obj) { return obj.playerattrs; }, "width": function (obj) { return obj.width; }, "height": function (obj) { return obj.height; }, "rerecordable && (recordings === null || recordings > 0)": function (obj) { return obj.rerecordable && (obj.recordings === null || obj.recordings > 0); }, "manualsubmit && verified": function (obj) { return obj.manualsubmit && obj.verified; }, "nofullscreen": function (obj) { return obj.nofullscreen; }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "recorder-error": "An error occurred, please try again later. Click to retry.",
            "attach-error": "We could not access the media interface. Depending on the device and browser, you might need to access the page via SSL.",
            "software-required": "Please click below to install / activate the following requirements in order to proceed.",
            "software-waiting": "Waiting for the requirements to be installed / activated. You might need to refresh the page after completion.",
            "access-forbidden": "Access to the media was forbidden. Click to retry.",
            "uploading": "Uploading",
            "uploading-failed": "Uploading failed - click here to retry.",
            "upload-error-duration": "Length of the uploaded image does not meet the requirements - click here to retry.",
            "resolution-constraint-error": "The file you've selected does not match the required resolution - click here to retry.",
            "verifying": "Verifying",
            "verifying-failed": "Verifying failed - click here to retry.",
            "rerecord-confirm": "Do you really want to retake your image?",
            "image_file_too_large": "Your image file is too large (%s) - click here to try again with a smaller image file.",
            "unsupported_image_type": "Please upload: %s - click here to retry.",
            "orientation-portrait-required": "Please rotate your device to record in portrait mode.",
            "orientation-landscape-required": "Please rotate your device to record in landscape mode."
        });
});
Scoped.define("module:ImageCapture.Dynamics.RecorderStates.State", [
    "base:States.State",
    "base:Events.ListenMixin",
    "base:Objs"
], function(State, ListenMixin, Objs, scoped) {
    return State.extend({
        scoped: scoped
    }, [ListenMixin, {

        dynamics: [],

        _start: function() {
            this.dyn = this.host.dynamic;
            Objs.iter(Objs.extend({
                "message": false,
                "chooser": false,
                "topmessage": false,
                "controlbar": false,
                "loader": false
            }, Objs.objectify(this.dynamics)), function(value, key) {
                this.dyn.set(key + "_active", value);
            }, this);
            this.dyn.set("playertopmessage", "");
            this.dyn.set("message_links", null);
            this.dyn._accessing_camera = false;
            this._started();
        },

        _started: function() {},

        record: function() {
            this.dyn.set("autorecord", true);
        },

        rerecord: function() {},

        selectRecord: function() {},

        selectUpload: function(file) {}

    }]);
});



Scoped.define("module:ImageCapture.Dynamics.RecorderStates.FatalError", [
    "module:ImageCapture.Dynamics.RecorderStates.State",
    "browser:Info",
    "base:Timers.Timer"
], function(State, Info, Timer, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],
        _locals: ["message", "retry"],

        _started: function() {
            this.dyn.set("message", this._message || this.dyn.string("recorder-error"));
            this.dyn.set("shortMessage", this.dyn.get("message").length < 30);
            this.listenOn(this.dyn, "message-click", function() {
                if (this._retry)
                    this.next(this._retry);
            });
        }

    });
});


Scoped.define("module:ImageCapture.Dynamics.RecorderStates.Initial", [
    "module:ImageCapture.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        _started: function() {
            this.dyn.set("is_initial_state", true);
            this.dyn.set("verified", false);
            this.dyn.set("playbacksource", null);
            this.dyn.set("player_active", false);
            this.dyn._imageFileName = null;
            this.dyn._imageFile = null;
            this.dyn._imageFilePlaybackable = false;
            this.dyn._initializeUploader();
            if (!this.dyn.get("recordermode")) {
                if (!this.dyn.get("image")) {
                    console.warn("recordermode:false requires an existing video to be present and provided.");
                    this.dyn.set("recordermode", true);
                } else
                    this.next("Player");
            } else if (this.dyn.get("autorecord") || this.dyn.get("skipinitial"))
                this.eventualNext("RequiredSoftwareCheck");
            else
                this.next("Chooser");
        },

        _end: function() {
            this.dyn.set("is_initial_state", false);
        }

    });
});


Scoped.define("module:ImageCapture.Dynamics.RecorderStates.Player", [
    "module:ImageCapture.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        rerecord: function() {
            this.dyn.trigger("rerecord");
            this.dyn.set("recordermode", true);
            this.next("Initial");
        },

        _started: function() {
            this.dyn.set("player_active", true);
        },

        _end: function() {
            this.dyn.set("player_active", false);
        }

    });
});


Scoped.define("module:ImageCapture.Dynamics.RecorderStates.Chooser", [
    "module:ImageCapture.Dynamics.RecorderStates.State",
    "base:Strings",
    "browser:Info",
    "media:Player.Support"
], function(State, Strings, Info, PlayerSupport, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["chooser"],

        _started: function() {
            this.listenOn(this.dyn, "change:orientation change:currentorientation", function() {
                var orientation = this.dyn.get("orientation");
                var currentorientation = this.dyn.get("currentorientation");
                var result = orientation && orientation !== currentorientation;
                if (result)
                    this.dyn.set("message", this.dyn.string("orientation-" + orientation + "-required"));
                this.dyn.set("message_active", result);
                this.dyn.set("chooser_active", !result);
            }, this, {
                initcall: true
            });
        },

        record: function() {
            this.dyn.set("autorecord", true);
            this.selectRecord();
        },

        selectRecord: function() {
            this.dyn.set("record_media", "camera");
            this.next("RequiredSoftwareCheck");
        },

        selectUpload: function(file) {
            if (!(Info.isMobile() && Info.isAndroid() && Info.isCordova())) {
                if (this.dyn.get("allowedextensions")) {
                    var filename = (file.files[0].name || "").toLowerCase();
                    var found = false;
                    this.dyn.get("allowedextensions").forEach(function(extension) {
                        if (Strings.ends_with(filename, "." + extension.toLowerCase()))
                            found = true;
                    }, this);
                    if (!found) {
                        this.next("FatalError", {
                            message: this.dyn.string("unsupported_image_type").replace("%s", this.dyn.get("allowedextensions").join(" / ")),
                            retry: "Chooser"
                        });
                        return;
                    }
                }
                if (this.dyn.get("filesizelimit") && file.files && file.files.length > 0 && file.files[0].size && file.files[0].size > this.dyn.get("filesizelimit")) {
                    var fact = "KB";
                    var size = Math.round(file.files[0].size / 1000);
                    var limit = Math.round(this.dyn.get("filesizelimit") / 1000);
                    if (size > 999) {
                        fact = "MB";
                        size = Math.round(size / 1000);
                        limit = Math.round(limit / 1000);
                    }
                    this.next("FatalError", {
                        message: this.dyn.string("image_file_too_large").replace("%s", size + fact + " / " + limit + fact),
                        retry: "Chooser"
                    });
                    return;
                }
            }
            try {
                PlayerSupport.imageFileInfo(file.files[0]).success(function(data) {
                    if ((data.width && this.dyn.get("minuploadingwidth") && this.dyn.get("minuploadingwidth") > data.width) ||
                        (data.width && this.dyn.get("maxuploadingwidth") && this.dyn.get("maxuploadingwidth") < data.width) ||
                        (data.height && this.dyn.get("minuploadingheight") && this.dyn.get("minuploadingheight") > data.height) ||
                        (data.height && this.dyn.get("maxuploadingheight") && this.dyn.get("maxuploadingheight") < data.height)) {
                        this.next("FatalError", {
                            message: this.dyn.string("resolution-constraint-error"),
                            retry: "Chooser"
                        });
                        return;
                    }
                    this.dyn._imageFilePlaybackable = true;
                    this._uploadFile(file);
                }, this).error(function() {
                    this._uploadFile(file);
                }, this);
            } catch (e) {
                this._uploadFile(file);
            }
        },

        _uploadFile: function(file) {
            this.dyn.set("creation-type", Info.isMobile() ? "mobile" : "upload");
            try {
                this.dyn._imageFileName = file.files[0].name;
                this.dyn._imageFile = file.files[0];
            } catch (e) {}
            this.dyn._prepareRecording().success(function() {
                this.dyn.trigger("upload_selected", file);
                this.dyn._uploadImageFile(file);
                this.next("Uploading");
            }, this).error(function(s) {
                this.next("FatalError", {
                    message: s,
                    retry: "Chooser"
                });
            }, this);
        }

    });
});


Scoped.define("module:ImageCapture.Dynamics.RecorderStates.RequiredSoftwareCheck", [
    "module:ImageCapture.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            this.dyn.set("settingsvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("controlbarlabel", "");
            this.dyn.set("loaderlabel", "");
            this.listenOn(this.dyn, "error", function(s) {
                this.next("FatalError", {
                    message: this.dyn.string("attach-error"),
                    retry: "Initial"
                });
            }, this);
            this.dyn._attachRecorder();
            if (this.dyn) {
                this.dyn.on("message-link-click", function(link) {
                    link.execute();
                    this.next("RequiredSoftwareWait");
                }, this);
                this.dyn._softwareDependencies().error(function(dependencies) {
                    this.dyn.set("message_links", dependencies);
                    this.dyn.set("loader_active", false);
                    this.dyn.set("message_active", true);
                    this.dyn.set("message", this.dyn.string("software-required"));
                }, this).success(function() {
                    this.next("CameraAccess");
                }, this);
            }
        }

    });
});


Scoped.define("module:ImageCapture.Dynamics.RecorderStates.RequiredSoftwareWait", [
    "module:ImageCapture.Dynamics.RecorderStates.State",
    "base:Promise",
    "browser:Dom"
], function(State, Promise, Dom, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],

        _started: function() {
            this.dyn.set("settingsvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("controlbarlabel", "");
            this.dyn.set("loaderlabel", "");
            this.dyn.set("message", this.dyn.string("software-waiting"));
            Promise.resilience(function() {
                if (Dom.isTabHidden())
                    return Promise.error("Not ready");
                return this.dyn._softwareDependencies();
            }, this, 120, [], 1000).success(function() {
                this.next("CameraAccess");
            }, this).error(function() {
                this.next("RequiredSoftwareCheck");
            }, this);
            this.dyn.on("message-click", function() {
                this.next("RequiredSoftwareCheck");
            }, this);
        }

    });
});



Scoped.define("module:ImageCapture.Dynamics.RecorderStates.CameraAccess", [
    "module:ImageCapture.Dynamics.RecorderStates.State",
    "base:Timers.Timer"
], function(State, Timer, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            this.dyn.set("settingsvisible", true);
            this.dyn.set("recordvisible", true);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("controlbarlabel", "");
            this.dyn.set("loaderlabel", "");
            this.listenOn(this.dyn, "bound", function() {
                this.dyn.set("creation-type", "webrtc");
                var timer = this.auto_destroy(new Timer({
                    start: true,
                    delay: 100,
                    context: this,
                    fire: function() {
                        if (this.dyn.blankLevel() >= 0.01 && this.dyn.deltaCoefficient() >= 0.01) {
                            timer.stop();
                            this.next("CameraHasAccess");
                        }
                    }
                }));
            }, this);
            this.listenOn(this.dyn, "error", function(s) {
                this.next("FatalError", {
                    message: this.dyn.string("attach-error"),
                    retry: "Initial"
                });
            }, this);
            this.listenOn(this.dyn, "access_forbidden", function() {
                this.next("FatalError", {
                    message: this.dyn.string("access-forbidden"),
                    retry: "Initial"
                });
            }, this);
            this.dyn._bindMedia();
        }

    });
});


Scoped.define("module:ImageCapture.Dynamics.RecorderStates.CameraHasAccess", [
    "module:ImageCapture.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["topmessage", "controlbar"],

        _started: function() {
            this.dyn.trigger("ready_to_record");
            this._preparePromise = null;
            if (this.dyn.get("countdown") > 0 && this.dyn.recorder && this.dyn.recorder.recordDelay(this.dyn.get("uploadoptions")) > this.dyn.get("countdown") * 1000)
                this._preparePromise = this.dyn._prepareRecording();
            this.dyn.set("hovermessage", "");
            this.dyn.set("topmessage", "");
            this.dyn.set("settingsvisible", true);
            this.dyn.set("recordvisible", true);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("controlbarlabel", "");
            if (this.dyn.get("autorecord"))
                this.next("RecordPrepare", {
                    preparePromise: this._preparePromise
                });
        },

        record: function() {
            if (this.dyn.get("autorecord"))
                return;
            this.next("RecordPrepare", {
                preparePromise: this._preparePromise
            });
        }

    });
});


Scoped.define("module:ImageCapture.Dynamics.RecorderStates.RecordPrepare", [
    "module:ImageCapture.Dynamics.RecorderStates.State",
    "base:Timers.Timer",
    "base:Time"
], function(State, Timer, Time, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],
        _locals: ["preparePromise"],

        _started: function() {
            this.dyn.set("message", "");
            this.dyn.set("loaderlabel", "");
            var startedRecording = false;
            this.dyn._accessing_camera = true;
            this._preparePromise = this._preparePromise || this.dyn._prepareRecording();
            var countdown = this.dyn.get("countdown") ? this.dyn.get("countdown") * 1000 : 0;
            var delay = this.dyn.recorder.recordDelay(this.dyn.get("uploadoptions")) || 0;
            if (countdown) {
                var displayDenominator = 1000;
                var silentTime = 0;
                var startTime = Time.now();
                var endTime = startTime + Math.max(delay, countdown);
                if (delay > countdown) {
                    silentTime = Math.min(500, delay - countdown);
                    displayDenominator = (delay - silentTime) / countdown * 1000;
                } else
                    this.dyn.set("loaderlabel", this.dyn.get("countdown"));
                var timer = new Timer({
                    context: this,
                    delay: 50,
                    fire: function() {
                        var now = Time.now();
                        var time_left = Math.max(0, endTime - now);
                        if (now > silentTime + startTime) {
                            this.dyn.set("loaderlabel", "" + Math.ceil((time_left - silentTime) / displayDenominator));
                            this.dyn.trigger("countdown", Math.round((time_left - silentTime) / displayDenominator * 1000));
                        }
                        if (endTime <= now) {
                            this.dyn.set("loaderlabel", "");
                            timer.stop();
                        }
                        if ((time_left <= delay) && !startedRecording) {
                            startedRecording = true;
                            this._startRecording();
                        }
                    }
                });
                this.auto_destroy(timer);
            } else
                this._startRecording();
        },

        record: function() {
            this._startRecording();
        },

        _startRecording: function() {
            this.next("Recording");
        }

    });
});


Scoped.define("module:ImageCapture.Dynamics.RecorderStates.Recording", [
    "module:ImageCapture.Dynamics.RecorderStates.State",
    "base:Timers.Timer",
    "base:Time",
    "base:TimeFormat",
    "base:Async"
], function(State, Timer, Time, TimeFormat, Async, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["topmessage", "controlbar"],

        _started: function() {
            this.dyn.set("hovermessage", "");
            this.dyn.set("topmessage", "");
            this.dyn._accessing_camera = true;
            this.dyn.trigger("recording");
            this.dyn.set("settingsvisible", false);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn._captureImage();
            this.dyn._uploadCapture();
            this.dyn._unbindMedia();
            this.next("Uploading");
        }

    });
});


Scoped.define("module:ImageCapture.Dynamics.RecorderStates.Uploading", [
    "module:ImageCapture.Dynamics.RecorderStates.State",
    "base:Time",
    "base:Async",
    "base:Objs"
], function(State, Time, Async, Objs, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader", "message"],

        _started: function() {
            this.dyn.set("cancancel", true);
            this.dyn.set("skipinitial", this.dyn.get("skipinitial") || this.dyn.get("skipinitialonrerecord"));
            this.dyn.set("settingsvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn.set("loadlabel", "");
            this.dyn.set("controlbarlabel", "");
            this.dyn.trigger("uploading");
            this.dyn.set("rerecordvisible", this.dyn.get("early-rerecord"));
            if (this.dyn.get("early-rerecord"))
                this.dyn.set("controlbar_active", true);
            this.dyn.set("hovermessage", "");
            this.dyn.set("topmessage", "");
            this.dyn.set("message", this.dyn.string("uploading"));
            this.dyn.set("playertopmessage", this.dyn.get("message"));
            var uploader = this.dyn._dataUploader;
            this.listenOn(uploader, "success", function() {
                Async.eventually(function() {
                    if (this.destroyed())
                        return;
                    this._finished();
                    this.next("Verifying");
                }, this);
            });
            this.listenOn(uploader, "error", function(e) {
                var bestError = this.dyn.string("uploading-failed");
                try {
                    e.forEach(function(ee) {
                        for (var key in ee)
                            if (this.dyn.string("upload-error-" + key))
                                bestError = this.dyn.string("upload-error-" + key);
                    }, this);
                } catch (err) {}
                this.dyn.set("player_active", false);
                this.next("FatalError", {
                    message: bestError,
                    retry: this.dyn.recorderAttached() ? "Uploading" : "Initial"
                });
            });
            this.listenOn(uploader, "progress", function(uploaded, total) {
                this.dyn.trigger("upload_progress", uploaded, total);
                if (total !== 0 && total > 0 && uploaded >= 0) {
                    var up = Math.min(100, Math.round(uploaded / total * 100));
                    if (!isNaN(up)) {
                        this.dyn.set("message", this.dyn.string("uploading") + ": " + up + "%");
                        this.dyn.set("playertopmessage", this.dyn.get("message"));
                    }
                }
            });
            if (this.dyn.get("localplayback") && this.dyn.isFormatSupported()) {
                if (this.dyn.recorder && this.dyn.recorder.supportsLocalPlayback())
                    this.dyn.set("playbacksource", this.dyn.recorder.localPlaybackSource());
                else
                    this.dyn.set("playbacksource", (window.URL || window.webkitURL).createObjectURL(this.dyn._imageFile));
                this.dyn.set("loader_active", false);
                this.dyn.set("message_active", false);
                this.dyn.set("player_active", true);
            }
            this.dyn.set("start-upload-time", Time.now());
            uploader.reset();
            uploader.upload();
        },

        rerecord: function() {
            this.dyn._detachRecorder();
            this.dyn.trigger("rerecord");
            this.dyn.set("recordermode", true);
            this.next("Initial");
        },

        _finished: function() {
            this.dyn.set("cancancel", false);
            this.dyn.trigger("uploaded");
            this.dyn.set("end-upload-time", Time.now());
        }

    });
});


Scoped.define("module:ImageCapture.Dynamics.RecorderStates.Verifying", [
    "module:ImageCapture.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader", "message"],

        _started: function() {
            this.dyn.set("loadlabel", "");
            this.dyn.trigger("verifying");
            this.dyn.set("message", this.dyn.string("verifying") + "...");
            this.dyn.set("playertopmessage", this.dyn.get("message"));
            if (this.dyn.get("localplayback") && this.dyn.isFormatSupported()) {
                this.dyn.set("loader_active", false);
                this.dyn.set("message_active", false);
            } else {
                this.dyn.set("rerecordvisible", this.dyn.get("early-rerecord"));
                if (this.dyn.get("early-rerecord"))
                    this.dyn.set("controlbar_active", true);
            }
            this.dyn._verifyRecording().success(function() {
                this.dyn.trigger("verified");
                this.dyn._detachRecorder();
                if (this.dyn.get("recordings"))
                    this.dyn.set("recordings", this.dyn.get("recordings") - 1);
                this.dyn.set("message", "");
                this.dyn.set("playertopmessage", "");
                this.dyn.set("verified", true);
                this.next("Player");
            }, this).error(function() {
                this.dyn.set("player_active", false);
                this.next("FatalError", {
                    message: this.dyn.string("verifying-failed"),
                    retry: this.dyn.recorderAttached() ? "Verifying" : "Initial"
                });
            }, this);
        },

        rerecord: function() {
            this.dyn._detachRecorder();
            this.dyn.trigger("rerecord");
            this.dyn.set("recordermode", true);
            this.next("Initial");
        }

    });
});
Scoped.define("module:ImageCapture.Dynamics.Chooser", [
    "dynamics:Dynamic",
    "module:Assets",
    "browser:Info"
], [
    "dynamics:Partials.ClickPartial",
    "dynamics:Partials.IfPartial"
], function(Class, Assets, Info, scoped) {

    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<div class=\"{{css}}-chooser-container\">\n\t<div class=\"{{css}}-chooser-button-container\">\n\t\t<div ba-repeat=\"{{action :: actions}}\">\n\t\t\t<div ba-hotkey:space^enter=\"{{click_action(action)}}\" onmouseout=\"this.blur()\"\n\t\t\t\t tabindex=\"0\" class=\"{{css}}-chooser-button-{{action.index}}\"\n\t\t\t     ba-click=\"{{click_action(action)}}\"\n\t\t\t>\n\t\t\t\t<input ba-if=\"{{action.select && action.capture}}\"\n\t\t\t\t\t   type=\"file\"\n\t\t\t\t\t   class=\"{{css}}-chooser-file\"\n\t\t\t\t\t   onchange=\"{{select_file_action(action, domEvent)}}\"\n\t\t\t\t\t   accept=\"{{action.accept}}\"\n\t\t\t\t\t   capture />\n\t\t\t\t<input ba-if=\"{{action.select && !action.capture}}\"\n\t\t\t\t\t   type=\"file\"\n\t\t\t\t\t   class=\"{{css}}-chooser-file\"\n\t\t\t\t\t   onchange=\"{{select_file_action(action, domEvent)}}\"\n\t\t\t\t\t   accept=\"{{action.accept}}\"\n\t\t\t\t\t   />\n\t\t\t\t<i class=\"{{csscommon}}-icon-{{action.icon}}\"\n\t\t\t\t   ba-if=\"{{action.icon}}\"></i>\n\t\t\t\t<span>\n\t\t\t\t\t{{action.label}}\n\t\t\t\t</span>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n",

                attrs: {
                    "css": "ba-imagecapture",
                    "allowrecord": true,
                    "allowupload": true,

                    "primaryrecord": true,
                    "recordviafilecapture": false,

                    "allowcustomupload": true,
                    "allowedextensions": null

                },

                types: {
                    "allowedextensions": "array",
                    "recordviafilecapture": "boolean"
                },

                collections: ["actions"],

                create: function() {
                    var custom_accept_string = "";
                    if (this.get("allowedextensions") && this.get("allowedextensions").length > 0) {
                        var browser_support = Info.isEdge() || Info.isChrome() || Info.isOpera() || (Info.isFirefox() && Info.firefoxVersion() >= 42) || (Info.isInternetExplorer() && Info.internetExplorerVersion() >= 10);
                        if (browser_support)
                            custom_accept_string = "." + this.get("allowedextensions").join(",.");
                    } else if (!this.get("allowcustomupload")) {
                        custom_accept_string = "image/*,image/png";
                    }

                    var order = [];
                    if (this.get("primaryrecord")) {
                        if (this.get("allowrecord"))
                            order.push("record");
                        if (this.get("allowupload"))
                            order.push("upload");
                    } else {
                        if (this.get("allowupload"))
                            order.push("upload");
                        if (this.get("allowrecord"))
                            order.push("record");
                    }
                    var actions = this.get("actions");
                    order.forEach(function(act, index) {
                        switch (act) {
                            case "record":
                                actions.add({
                                    type: "record",
                                    index: index,
                                    icon: 'videocam',
                                    label: this.string("capture-image"),
                                    select: Info.isMobile() && !(Info.isAndroid() && Info.isCordova()) && this.get("recordviafilecapture"),
                                    capture: true,
                                    accept: "image/*,image/png;capture=camcorder"
                                });
                                break;
                            case "upload":
                                actions.add({
                                    type: "upload",
                                    index: index,
                                    icon: "upload",
                                    label: this.string("upload-image"),
                                    select: !(Info.isiOS() && Info.isCordova()),
                                    accept: Info.isMobile() && !(Info.isAndroid() && Info.isCordova()) ? "image/*,image/png" : custom_accept_string
                                });
                                break;
                        }
                    }, this);
                },

                functions: {

                    click_action: function(action) {
                        if (action.get("select"))
                            return;
                        if (Info.isMobile() && Info.isCordova()) {
                            var self = this;
                            if (Info.isAndroid()) {
                                navigator.device.capture.captureImage(function(mediaFiles) {
                                    self.trigger("upload", mediaFiles[0]);
                                }, function(error) {}, {
                                    limit: 1
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
                                    mediaType: Camera.MediaType.IMAGE
                                });
                            }
                        } else
                            this.trigger("record");
                    },

                    select_file_action: function(action, domEvent) {
                        if (!action.get("select"))
                            return;
                        this.trigger("upload", domEvent[0].target);
                    }

                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "actions": function (obj) { return obj.actions; }, "click_action(action)": function (obj) { return obj.click_action(obj.action); }, "action.index": function (obj) { return obj.action.index; }, "action.select && action.capture": function (obj) { return obj.action.select && obj.action.capture; }, "select_file_action(action, domEvent)": function (obj) { return obj.select_file_action(obj.action, obj.domEvent); }, "action.accept": function (obj) { return obj.action.accept; }, "action.select && !action.capture": function (obj) { return obj.action.select && !obj.action.capture; }, "csscommon": function (obj) { return obj.csscommon; }, "action.icon": function (obj) { return obj.action.icon; }, "action.label": function (obj) { return obj.action.label; }/**/
        })
        .register("ba-imagecapture-chooser")
        .attachStringTable(Assets.strings)
        .addStrings({
            "image-capture": "Capture Image",
            "upload-image": "Upload Image"
        });
});
Scoped.define("module:ImageCapture.Dynamics.Controlbar", [
    "dynamics:Dynamic",
    "module:Assets",
    "base:Timers.Timer"
], [
    "dynamics:Partials.ShowPartial",
    "dynamics:Partials.RepeatPartial"
], function(Class, Assets, Timer, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<div class=\"{{css}}-dashboard\">\n\t<div class=\"{{css}}-backbar\"></div>\n\t<div data-selector=\"recorder-settings\" class=\"{{css}}-settings\" ba-show=\"{{settingsvisible && settingsopen}}\">\n\t\t<div class=\"{{css}}-settings-backbar\"></div>\n\t\t<div data-selector=\"settings-list-front\" class=\"{{css}}-settings-front\">\n\t\t\t<ul data-selector=\"camera-settings\" ba-repeat=\"{{camera :: cameras}}\">\n\t\t\t\t<li>\n\t\t\t\t\t<input tabindex=\"0\"\n\t\t\t\t\t\t   ba-hotkey:space^enter=\"{{selectCamera(camera.id)}}\" onmouseout=\"this.blur()\"\n\t\t\t\t\t\t   type='radio' name='camera' value=\"{{selectedcamera == camera.id}}\" onclick=\"{{selectCamera(camera.id)}}\"\n\t\t\t\t\t/>\n\t\t\t\t\t<span></span>\n\t\t\t\t\t<label tabindex=\"0\"\n\t\t\t\t\t\t   ba-hotkey:space^enter=\"{{selectCamera(camera.id)}}\" onmouseout=\"this.blur()\"\n\t\t\t\t\t\t   onclick=\"{{selectCamera(camera.id)}}\"\n\t\t\t\t\t>\n\t\t\t\t\t\t{{camera.label}}\n\t\t\t\t\t</label>\n\t\t\t\t </li>\n\t\t\t</ul>\n\t\t</div>\n\t</div>\n\t<div data-selector=\"controlbar\" class=\"{{css}}-controlbar\">\n\n        <div class=\"{{css}}-leftbutton-container\" ba-show=\"{{settingsvisible}}\">\n            <div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{settingsopen=!settingsopen}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"record-button-icon-cog\" class=\"{{css}}-button-inner {{css}}-button-{{settingsopen ? 'selected' : 'unselected'}}\"\n                 onclick=\"{{settingsopen=!settingsopen}}\"\n                 onmouseenter=\"{{hover(string('settings'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n                <i class=\"{{csscommon}}-icon-cog\"></i>\n            </div>\n        </div>\n\n        <div class=\"{{css}}-lefticon-container\" ba-show=\"{{settingsvisible}}\">\n            <div data-selector=\"record-button-icon-videocam\" class=\"{{csscommon}}-icon-inner\"\n                 onmouseenter=\"{{hover(string(camerahealthy ? 'camerahealthy' : 'cameraunhealthy'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n                <i class=\"{{csscommon}}-icon-videocam {{csscommon}}-icon-state-{{camerahealthy ? 'good' : 'bad' }}\"></i>\n            </div>\n        </div>\n\n        <div class=\"{{css}}-label-container\" ba-show=\"{{controlbarlabel}}\">\n        \t<div data-selector=\"record-label-block\" class=\"{{css}}-label-label\">\n        \t\t{{controlbarlabel}}\n        \t</div>\n        </div>\n\n        <div class=\"{{css}}-rightbutton-container\" ba-show=\"{{recordvisible}}\">\n        \t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{record()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"record-primary-button\" class=\"{{css}}-button-primary\"\n                 onclick=\"{{record()}}\"\n                 onmouseenter=\"{{hover(string('record-tooltip'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n        \t\t{{string('record')}}\n        \t</div>\n        </div>\n\n        <div class=\"{{css}}-rightbutton-container\" ba-show=\"{{rerecordvisible}}\">\n        \t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{rerecord()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"rerecord-primary-button\" class=\"{{css}}-button-primary\"\n                 onclick=\"{{rerecord()}}\"\n                 onmouseenter=\"{{hover(string('rerecord-tooltip'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n        \t\t{{string('rerecord')}}\n        \t</div>\n        </div>\n\n\t\t<div class=\"{{css}}-rightbutton-container\" ba-show=\"{{cancelvisible}}\">\n\t\t\t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{cancel()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"cancel-primary-button\" class=\"{{css}}-button-primary\"\n\t\t\t\t onclick=\"{{cancel()}}\"\n\t\t\t\t onmouseenter=\"{{hover(string('cancel-tooltip'))}}\"\n\t\t\t\t onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n\t\t\t\t{{string('cancel')}}\n\t\t\t</div>\n\t\t</div>\n\n\t</div>\n</div>\n",

                attrs: {
                    "css": "ba-imagecapture",
                    "hovermessage": ""
                },

                functions: {
                    selectCamera: function(cameraId) {
                        this.trigger("select-camera", cameraId);
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
                    cancel: function() {
                        this.trigger("invoke-cancel");
                    }
                }

            };
        })
        .register("ba-imagecapture-controlbar")
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "settingsvisible && settingsopen": function (obj) { return obj.settingsvisible && obj.settingsopen; }, "cameras": function (obj) { return obj.cameras; }, "selectCamera(camera.id)": function (obj) { return obj.selectCamera(obj.camera.id); }, "selectedcamera == camera.id": function (obj) { return obj.selectedcamera == obj.camera.id; }, "camera.label": function (obj) { return obj.camera.label; }, "settingsvisible": function (obj) { return obj.settingsvisible; }, "settingsopen=!settingsopen": function (obj) { return obj.settingsopen=!obj.settingsopen; }, "settingsopen ? 'selected' : 'unselected'": function (obj) { return obj.settingsopen ? 'selected' : 'unselected'; }, "hover(string('settings'))": function (obj) { return obj.hover(obj.string('settings')); }, "unhover()": function (obj) { return obj.unhover(); }, "csscommon": function (obj) { return obj.csscommon; }, "hover(string(camerahealthy ? 'camerahealthy' : 'cameraunhealthy'))": function (obj) { return obj.hover(obj.string(obj.camerahealthy ? 'camerahealthy' : 'cameraunhealthy')); }, "camerahealthy ? 'good' : 'bad'": function (obj) { return obj.camerahealthy ? 'good' : 'bad'; }, "controlbarlabel": function (obj) { return obj.controlbarlabel; }, "recordvisible": function (obj) { return obj.recordvisible; }, "record()": function (obj) { return obj.record(); }, "hover(string('record-tooltip'))": function (obj) { return obj.hover(obj.string('record-tooltip')); }, "string('record')": function (obj) { return obj.string('record'); }, "rerecordvisible": function (obj) { return obj.rerecordvisible; }, "rerecord()": function (obj) { return obj.rerecord(); }, "hover(string('rerecord-tooltip'))": function (obj) { return obj.hover(obj.string('rerecord-tooltip')); }, "string('rerecord')": function (obj) { return obj.string('rerecord'); }, "cancelvisible": function (obj) { return obj.cancelvisible; }, "cancel()": function (obj) { return obj.cancel(); }, "hover(string('cancel-tooltip'))": function (obj) { return obj.hover(obj.string('cancel-tooltip')); }, "string('cancel')": function (obj) { return obj.string('cancel'); }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "settings": "Settings",
            "camerahealthy": "Lighting is good",
            "cameraunhealthy": "Lighting is not optimal",
            "record": "Capture",
            "record-tooltip": "Click here to capture.",
            "rerecord": "Redo",
            "rerecord-tooltip": "Click here to redo.",
            "cancel": "Cancel",
            "cancel-tooltip": "Click here to cancel."
        });
});
Scoped.define("module:ImageCapture.Dynamics.Faceoutline", [
    "dynamics:Dynamic"
], function(Class, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<svg viewBox=\"0 0 301 171\" style=\"width:100%; height:100%; position: absolute; top: 0; left: 0\">\n    <g>\n        <path fill=\"none\" stroke=\"white\" stroke-width=\"2\" stroke-miterlimit=\"10\" stroke-dasharray=\"3.0228,3.0228\" d=\"M198.5,79.831c0,40.542-22.752,78.579-47.5,78.579c-24.749,0-47.5-38.036-47.5-78.579c0-40.543,17.028-68.24,47.5-68.24C185.057,11.591,198.5,39.288,198.5,79.831z\"></path>\n    </g>\n</svg>"

            };
        })
        .registerFunctions({
            /**//**/
        })
        .register("ba-imagecapture-faceoutline");
});
Scoped.define("module:ImageCapture.Dynamics.Loader", [
    "dynamics:Dynamic",
    "module:Assets"
], [
    "dynamics:Partials.ShowPartial"
], function(Class, Assets, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{css}}-loader-container\">\n    <div data-selector=\"recorder-loader-block\" class=\"{{css}}-loader-loader\" title=\"{{tooltip || ''}}\">\n    </div>\n</div>\n<div data-selector=\"recorder-loader-label-container\" class=\"{{css}}-loader-label\" ba-show=\"{{label}}\">\n\t{{label}}\n</div>\n",

                attrs: {
                    "css": "ba-imagecapture",
                    "tooltip": "",
                    "label": "",
                    "message": "",
                    "hovermessage": ""
                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "tooltip || ''": function (obj) { return obj.tooltip || ''; }, "label": function (obj) { return obj.label; }/**/
        })
        .register("ba-imagecapture-loader")
        .attachStringTable(Assets.strings)
        .addStrings({});
});
Scoped.define("module:ImageCapture.Dynamics.Message", [
    "dynamics:Dynamic"
], [
    "dynamics:Partials.ClickPartial"
], function(Class, Templates, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div data-selector=\"recorder-message-container\" class=\"{{css}}-message-container\" ba-click=\"{{click()}}\">\n    <div data-selector=\"recorder-message-block\" class='{{css}}-message-message'>\n        <p>\n            {{message || \"\"}}\n        </p>\n        <ul ba-if=\"{{links && links.length > 0}}\" ba-repeat=\"{{link :: links}}\">\n            <li>\n                <a href=\"javascript:;\" ba-click=\"{{linkClick(link)}}\">\n                    {{link.title}}\n                </a>\n            </li>\n        </ul>\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-imagecapture",
                    "message": '',
                    "links": null
                },

                functions: {

                    click: function() {
                        this.trigger("click");
                    },

                    linkClick: function(link) {
                        this.trigger("link", link);
                    }

                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "click()": function (obj) { return obj.click(); }, "message || \"\"": function (obj) { return obj.message || ""; }, "links && links.length > 0": function (obj) { return obj.links && obj.links.length > 0; }, "links": function (obj) { return obj.links; }, "linkClick(link)": function (obj) { return obj.linkClick(obj.link); }, "link.title": function (obj) { return obj.link.title; }/**/
        })
        .register("ba-imagecapture-message");
});
Scoped.define("module:ImageCapture.Dynamics.Topmessage", [
    "dynamics:Dynamic"
], function(Class, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{css}}-topmessage-container\">\n    <div class='{{css}}-topmessage-background'>\n    </div>\n    <div data-selector=\"recorder-topmessage-block\" class='{{css}}-topmessage-message'>\n        {{topmessage}}\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-imagecapture",
                    "topmessage": ''
                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "topmessage": function (obj) { return obj.topmessage; }/**/
        })
        .register("ba-imagecapture-topmessage");
});
Scoped.define("module:AudioPlayer.Dynamics.Controlbar", [
    "dynamics:Dynamic",
    "base:TimeFormat",
    "browser:Dom",
    "module:Assets",
    "browser:Info",
    "browser:Events"
], [
    "dynamics:Partials.StylesPartial",
    "dynamics:Partials.ShowPartial",
    "dynamics:Partials.IfPartial",
    "dynamics:Partials.ClickPartial"
], function(Class, TimeFormat, Dom, Assets, Info, DomEvents, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{css}}-dashboard\">\n\t<div tabindex=\"2\" data-selector=\"progress-bar-inner\" class=\"{{css}}-progressbar {{disableseeking ? cssplayer + '-disabled' : ''}}\"\n\t\t ba-hotkey:right=\"{{seek(position + skipseconds)}}\"\n\t\t ba-hotkey:left=\"{{seek(position - skipseconds)}}\"\n         ba-hotkey:alt+right=\"{{seek(position + skipseconds * 3)}}\"\n         ba-hotkey:alt+left=\"{{seek(position - skipseconds * 3)}}\"\n\t\t onmouseout=\"this.blur()\"\n\t\t ontouchstart=\"{{startUpdatePosition(domEvent)}}\"\n\t\t onmousedown=\"{{startUpdatePosition(domEvent)}}\"\n\t>\n\t\t<div class=\"{{css}}-progressbar-cache\" ba-styles=\"{{{width: Math.round(duration ? cached / duration * 100 : 0) + '%'}}}\"></div>\n\t\t<div class=\"{{css}}-progressbar-position\"\n\t\t\t ba-styles=\"{{{width: Math.round(duration ? position / duration * 100 : 0) + '%'}}}\"\n\t\t\t title=\"{{string('audio-progress')}}\"\n\t\t>\n\t\t\t<div class=\"{{css}}-progressbar-button\"></div>\n\t\t</div>\n\t</div>\n\n\t<div class=\"{{css}}-backbar\"></div>\n\n\t<div class=\"{{css}}-controlbar\">\n\n        <div tabindex=\"0\" data-selector=\"submit-audio-button\"\n\t\t\t ba-hotkey:space^enter=\"{{submit()}}\" onmouseout=\"this.blur()\"\n\t\t\t class=\"{{css}}-leftbutton-container\"\n\t\t\t ba-if=\"{{submittable}}\" ba-click=\"{{submit()}}\">\n            <div class=\"{{css}}-button-inner\">\n                {{string('submit-audio')}}\n            </div>\n        </div>\n\n        <div tabindex=\"0\" data-selector=\"button-icon-ccw\"\n\t\t\t ba-hotkey:space^enter=\"{{rerecord()}}\" onmouseout=\"this.blur()\"\n\t\t\t class=\"{{css}}-leftbutton-container\" ba-if=\"{{rerecordable}}\"\n\t\t\t ba-click=\"{{rerecord()}}\" title=\"{{string('rerecord-audio')}}\"\n\t\t>\n            <div class=\"{{css}}-button-inner\">\n                <i class=\"{{csscommon}}-icon-ccw\"></i>\n            </div>\n        </div>\n\n        <div tabindex=\"0\" data-selector=\"button-icon-play\"\n\t\t\t onmouseout=\"this.blur()\"\n\t\t\t class=\"{{css}}-leftbutton-container\" title=\"{{string('play-audio')}}\"\n\t\t\t onkeydown=\"{{tab_index_move(domEvent, null, 'button-icon-pause')}}\" ba-if=\"{{!playing}}\" ba-click=\"{{play()}}\"\n\t\t>\n            <div class=\"{{css}}-button-inner\">\n                <i class=\"{{csscommon}}-icon-play\"></i>\n            </div>\n        </div>\n\n        <div tabindex=\"0\" data-selector=\"button-icon-pause\"\n\t\t\t onmouseout=\"this.blur()\"\n\t\t\t class=\"{{css}}-leftbutton-container {{disablepause ? cssplayer + '-disabled' : ''}}\"\n\t\t\t onkeydown=\"{{tab_index_move(domEvent, null, 'button-icon-play')}}\" ba-if=\"{{playing}}\" ba-click=\"{{pause()}}\"\n\t\t\t title=\"{{disablepause ? string('pause-audio-disabled') : string('pause-audio')}}\"\n\t\t>\n            <div class=\"{{css}}-button-inner\">\n                <i class=\"{{csscommon}}-icon-pause\"></i>\n            </div>\n        </div>\n\n\t\t<div class=\"{{css}}-time-container\">\n\t\t\t<div class=\"{{css}}-time-value\" title=\"{{string('elapsed-time')}}\">{{formatTime(position)}}</div>\n\t\t\t<div class=\"{{css}}-time-sep\">/</div>\n\t\t\t<div class=\"{{css}}-time-value\" title=\"{{string('total-time')}}\">{{formatTime(duration || position)}}</div>\n\t\t</div>\n\n\t\t<div data-selector=\"audio-title-block\" class=\"{{css}}-title-container\" ba-if=\"{{title}}\">\n\t\t\t<p class=\"{{css}}-title\">\n\t\t\t\t{{title}}\n\t\t\t</p>\n\t\t</div>\n\n\t\t<div class=\"{{css}}-volumebar\">\n\t\t\t<div tabindex=\"5\" data-selector=\"button-volume-bar\"\n\t\t\t\t ba-hotkey:right=\"{{set_volume(volume + 0.1)}}\" ba-hotkey:left=\"{{set_volume(volume - 0.1)}}\"\n\t\t\t\t ba-hotkey:up=\"{{set_volume(1)}}\" ba-hotkey:down=\"{{set_volume(0)}}\"\n\t\t\t\t onmouseout=\"this.blur()\"\n\t\t\t\t class=\"{{css}}-volumebar-inner\"\n\t\t\t\t ontouchstart=\"{{startUpdateVolume(domEvent)}}\"\n\t\t\t\t ontouchmove=\"{{progressUpdateVolume(domEvent)}}\"\n\t\t\t\t ontouchend=\"{{stopUpdateVolume(domEvent); this.blur()}};\"\n\t\t\t\t onmousedown=\"{{startUpdateVolume(domEvent)}}\"\n                 onmouseup=\"{{stopUpdateVolume(domEvent)}}\"\n                 onmouseleave=\"{{stopUpdateVolume(domEvent)}}\"\n                 onmousemove=\"{{progressUpdateVolume(domEvent)}}\"\n\t\t\t>\n\t\t\t\t<div class=\"{{css}}-volumebar-position\" ba-styles=\"{{{width: Math.min(100, Math.round(volume * 100)) + '%'}}}\">\n\t\t\t\t    <div class=\"{{css}}-volumebar-button\" title=\"{{string('volume-button')}}\"></div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\n\t\t<div tabindex=\"4\" data-selector=\"button-icon-volume\"\n\t\t\t ba-hotkey:space^enter=\"{{toggle_volume()}}\" onmouseout=\"this.blur()\"\n\t\t\t class=\"{{css}}-rightbutton-container\"\n\t\t\t ba-click=\"{{toggle_volume()}}\" title=\"{{string(volume > 0 ? 'volume-mute' : 'volume-unmute')}}\">\n\t\t\t<div class=\"{{css}}-button-inner\">\n\t\t\t\t<i class=\"{{csscommon + '-icon-volume-' + (volume >= 0.5 ? 'up' : (volume > 0 ? 'down' : 'off')) }}\"></i>\n\t\t\t</div>\n\t\t</div>\n\n\t</div>\n</div>\n",

                attrs: {
                    "css": "ba-audioplayer",
                    "csscommon": "ba-commoncss",
                    "cssplayer": "ba-player",
                    "csstheme": "ba-audiooplayer-default-theme",
                    "duration": 0,
                    "position": 0,
                    "cached": 0,
                    "volume": 1.0,
                    "manuallypaused": false,
                    "expandedprogress": true,
                    "playing": false,
                    "rerecordable": false,
                    "submittable": false,
                    "title": ""
                },

                functions: {

                    formatTime: function(time) {
                        time = Math.max(time || 0, 0.1);
                        return TimeFormat.format(TimeFormat.ELAPSED_MINUTES_SECONDS, time * 1000);
                    },

                    startUpdatePosition: function(event) {
                        if (this.get("disableseeking")) return;
                        event[0].preventDefault();
                        if (!this.__parent.get("playing") && this.__parent.player && !this.get("manuallypaused"))
                            this.__parent.player.play();

                        var target = event[0].currentTarget;
                        this.set("dimensions", target.getBoundingClientRect());

                        this.set("_updatePosition", true);
                        this.call("progressUpdatePosition", event[0]);

                        var events = this.get("events");
                        events.on(document, "mousemove touchmove", function(e) {
                            e.preventDefault();
                            this.call("progressUpdatePosition", e);
                        }, this);
                        events.on(document, "mouseup touchend", function(e) {
                            e.preventDefault();
                            this.call("stopUpdatePosition");
                            events.off(document, "mouseup touchend mousemove touchmove");
                        }, this);
                    },

                    progressUpdatePosition: function(event) {
                        if (!this.get("dimensions")) return;
                        var ev = event[0] || event;
                        ev.preventDefault();
                        // Mouse or Touch Event
                        var clientX = ev.clientX === 0 ? 0 : ev.clientX || ev.targetTouches[0].clientX;
                        var dimensions = this.get("dimensions");
                        var percentageFromStart;
                        if (clientX < dimensions.left) {
                            percentageFromStart = 0;
                        } else if (clientX > (dimensions.left + dimensions.width)) {
                            percentageFromStart = 1;
                        } else {
                            percentageFromStart = (clientX - dimensions.left) / (dimensions.width || 1);
                        }
                        var onDuration = this.get("duration") * percentageFromStart;

                        if (!this.get("_updatePosition")) return;

                        this.set("position", onDuration);
                        this.trigger("position", this.get("position"));
                    },

                    stopUpdatePosition: function() {
                        this.set("_updatePosition", false);
                    },

                    startUpdateVolume: function(event) {
                        event[0].preventDefault();
                        this.set("_updateVolume", true);
                        this.call("progressUpdateVolume", event);
                    },

                    progressUpdateVolume: function(event) {
                        var ev = event[0];
                        ev.preventDefault();
                        if (!this.get("_updateVolume"))
                            return;
                        var clientX = ev.clientX;
                        var target = ev.currentTarget;
                        var offset = Dom.elementOffset(target);
                        var dimensions = Dom.elementDimensions(target);
                        this.set("volume", (clientX - offset.left) / (dimensions.width || 1));
                        this.trigger("volume", this.get("volume"));
                    },

                    stopUpdateVolume: function(event) {
                        event[0].preventDefault();
                        this.set("_updateVolume", false);
                    },

                    startVerticallyUpdateVolume: function(event) {
                        event[0].preventDefault();
                        this.set("_updateVolume", true);
                        this.call("progressVerticallyUpdateVolume", event);
                    },

                    progressVerticallyUpdateVolume: function(event) {
                        var ev = event[0];
                        ev.preventDefault();
                        if (!this.get("_updateVolume"))
                            return;
                        var pageY = ev.pageY;
                        var target = ev.currentTarget;
                        var offset = Dom.elementOffset(target);
                        var dimensions = Dom.elementDimensions(target);
                        this.set("volume", 1 - (pageY - offset.top) / dimensions.height);
                        this.trigger("volume", this.get("volume"));
                    },

                    stopVerticallyUpdateVolume: function(event) {
                        event[0].preventDefault();
                        this.set("_updateVolume", false);
                    },


                    play: function() {
                        this.trigger("play");
                    },

                    pause: function() {
                        this.trigger("pause");
                    },

                    toggle_volume: function() {
                        if (this.get("volume") > 0) {
                            this.__oldVolume = this.get("volume");
                            this.set("volume", 0);
                        } else
                            this.set("volume", this.__oldVolume || 1);
                        this.trigger("volume", this.get("volume"));
                    },

                    rerecord: function() {
                        this.trigger("rerecord");
                    },

                    seek: function(position) {
                        this.trigger("seek", position);
                    },

                    set_volume: function(volume) {
                        this.trigger("set_volume", volume);
                    },

                    submit: function() {
                        this.set("submittable", false);
                        this.set("rerecordable", false);
                        this.trigger("submit");
                    },

                    tab_index_move: function(ev, nextSelector, focusingSelector) {
                        this.trigger("tab_index_move", ev[0], nextSelector, focusingSelector);
                    }
                },

                create: function() {
                    this.set("ismobile", Info.isMobile());
                    this.set("events", new DomEvents());
                }
            };
        })
        .register("ba-audioplayer-controlbar")
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "disableseeking ? cssplayer + '-disabled' : ''": function (obj) { return obj.disableseeking ? obj.cssplayer + '-disabled' : ''; }, "seek(position + skipseconds)": function (obj) { return obj.seek(obj.position + obj.skipseconds); }, "seek(position - skipseconds)": function (obj) { return obj.seek(obj.position - obj.skipseconds); }, "seek(position + skipseconds * 3)": function (obj) { return obj.seek(obj.position + obj.skipseconds * 3); }, "seek(position - skipseconds * 3)": function (obj) { return obj.seek(obj.position - obj.skipseconds * 3); }, "startUpdatePosition(domEvent)": function (obj) { return obj.startUpdatePosition(obj.domEvent); }, "{width: Math.round(duration ? cached / duration * 100 : 0) + '%'}": function (obj) { return {width: Math.round(obj.duration ? obj.cached / obj.duration * 100 : 0) + '%'}; }, "{width: Math.round(duration ? position / duration * 100 : 0) + '%'}": function (obj) { return {width: Math.round(obj.duration ? obj.position / obj.duration * 100 : 0) + '%'}; }, "string('audio-progress')": function (obj) { return obj.string('audio-progress'); }, "submit()": function (obj) { return obj.submit(); }, "submittable": function (obj) { return obj.submittable; }, "string('submit-audio')": function (obj) { return obj.string('submit-audio'); }, "rerecord()": function (obj) { return obj.rerecord(); }, "rerecordable": function (obj) { return obj.rerecordable; }, "string('rerecord-audio')": function (obj) { return obj.string('rerecord-audio'); }, "csscommon": function (obj) { return obj.csscommon; }, "string('play-audio')": function (obj) { return obj.string('play-audio'); }, "tab_index_move(domEvent, null, 'button-icon-pause')": function (obj) { return obj.tab_index_move(obj.domEvent, null, 'button-icon-pause'); }, "!playing": function (obj) { return !obj.playing; }, "play()": function (obj) { return obj.play(); }, "disablepause ? cssplayer + '-disabled' : ''": function (obj) { return obj.disablepause ? obj.cssplayer + '-disabled' : ''; }, "tab_index_move(domEvent, null, 'button-icon-play')": function (obj) { return obj.tab_index_move(obj.domEvent, null, 'button-icon-play'); }, "playing": function (obj) { return obj.playing; }, "pause()": function (obj) { return obj.pause(); }, "disablepause ? string('pause-audio-disabled') : string('pause-audio')": function (obj) { return obj.disablepause ? obj.string('pause-audio-disabled') : obj.string('pause-audio'); }, "string('elapsed-time')": function (obj) { return obj.string('elapsed-time'); }, "formatTime(position)": function (obj) { return obj.formatTime(obj.position); }, "string('total-time')": function (obj) { return obj.string('total-time'); }, "formatTime(duration || position)": function (obj) { return obj.formatTime(obj.duration || obj.position); }, "title": function (obj) { return obj.title; }, "set_volume(volume + 0.1)": function (obj) { return obj.set_volume(obj.volume + 0.1); }, "set_volume(volume - 0.1)": function (obj) { return obj.set_volume(obj.volume - 0.1); }, "set_volume(1)": function (obj) { return obj.set_volume(1); }, "set_volume(0)": function (obj) { return obj.set_volume(0); }, "startUpdateVolume(domEvent)": function (obj) { return obj.startUpdateVolume(obj.domEvent); }, "progressUpdateVolume(domEvent)": function (obj) { return obj.progressUpdateVolume(obj.domEvent); }, "stopUpdateVolume(domEvent); this.blur()": function (obj) { return obj.stopUpdateVolume(obj.domEvent); this.blur(); }, "stopUpdateVolume(domEvent)": function (obj) { return obj.stopUpdateVolume(obj.domEvent); }, "{width: Math.min(100, Math.round(volume * 100)) + '%'}": function (obj) { return {width: Math.min(100, Math.round(obj.volume * 100)) + '%'}; }, "string('volume-button')": function (obj) { return obj.string('volume-button'); }, "toggle_volume()": function (obj) { return obj.toggle_volume(); }, "string(volume > 0 ? 'volume-mute' : 'volume-unmute')": function (obj) { return obj.string(obj.volume > 0 ? 'volume-mute' : 'volume-unmute'); }, "csscommon + '-icon-volume-' + (volume >= 0.5 ? 'up' : (volume > 0 ? 'down' : 'off'))": function (obj) { return obj.csscommon + '-icon-volume-' + (obj.volume >= 0.5 ? 'up' : (obj.volume > 0 ? 'down' : 'off')); }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "audio-progress": "Progress",
            "rerecord-audio": "Redo?",
            "submit-audio": "Confirm",
            "play-audio": "Play",
            "pause-audio": "Pause",
            "pause-audio-disabled": "Pause not supported",
            "elapsed-time": "Elapsed time",
            "total-time": "Total length of",
            "volume-button": "Set volume",
            "volume-mute": "Mute sound",
            "volume-unmute": "Unmute sound"
        });
});
Scoped.define("module:AudioPlayer.Dynamics.Loader", [
    "dynamics:Dynamic",
    "module:Assets"
], function(Class, Assets, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{cssplayer}}-loader-container\">\n    <div data-selector=\"loader-block\" class=\"{{cssplayer}}-loader-loader\" title=\"{{string('tooltip')}}\">\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-audioplayer"
                }

            };
        })
        .register("ba-audioplayer-loader")
        .registerFunctions({
            /**/"cssplayer": function (obj) { return obj.cssplayer; }, "string('tooltip')": function (obj) { return obj.string('tooltip'); }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "tooltip": "Loading..."
        });
});
Scoped.define("module:AudioPlayer.Dynamics.Message", [
    "dynamics:Dynamic"
], [
    "dynamics:Partials.ClickPartial"
], function(Class, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{css}}-message-container\" ba-click=\"{{click()}}\">\n    <div data-selector=\"message-block\" class='{{css}}-message-message'>\n        <p> {{message}} </p>\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-audioplayer",
                    "message": ''
                },

                functions: {

                    click: function() {
                        this.trigger("click");
                    }

                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "click()": function (obj) { return obj.click(); }, "message": function (obj) { return obj.message; }/**/
        })
        .register("ba-audioplayer-message");
});
Scoped.define("module:AudioPlayer.Dynamics.Player", [
    "dynamics:Dynamic",
    "module:Assets",
    "module:AudioVisualization",
    "browser:Info",
    "browser:Dom",
    "media:AudioPlayer.AudioPlayerWrapper",
    "base:Types",
    "base:Objs",
    "base:Strings",
    "base:Time",
    "base:Timers",
    "base:States.Host",
    "base:Classes.ClassRegistry",
    "base:Async",
    "module:AudioPlayer.Dynamics.PlayerStates.Initial",
    "module:AudioPlayer.Dynamics.PlayerStates",
    "browser:Events"
], [
    "module:Common.Dynamics.Settingsmenu",
    "module:AudioPlayer.Dynamics.Message",
    "module:AudioPlayer.Dynamics.Loader",
    "module:AudioPlayer.Dynamics.Controlbar",
    "dynamics:Partials.EventPartial",
    "dynamics:Partials.OnPartial",
    "dynamics:Partials.TogglePartial",
    "dynamics:Partials.StylesPartial",
    "dynamics:Partials.TemplatePartial",
    "dynamics:Partials.HotkeyPartial"
], function(Class, Assets, AudioVisualization, Info, Dom, AudioPlayerWrapper, Types, Objs, Strings, Time, Timers, Host, ClassRegistry, Async, InitialState, PlayerStates, DomEvents, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<div itemscope itemtype=\"http://schema.org/AudioObject\"\n    class=\"{{css}}-container {{cssplayer}}-size-{{csssize}} {{iecss}}-{{ie8 ? 'ie8' : 'noie8'}} {{csstheme}}\n    {{cssplayer}}-normal-view {{cssplayer}}-common-browser {{cssplayer}}-{{themecolor}}-color\n    {{cssplayer}}-{{title ? 'has-title' : 'no-title'}} {{visualeffectvisible ? cssplayer + '-visual-effect-applied' : ''}}\"\n\tba-styles=\"{{widthHeightStyles}}\"\n>\n\t<canvas data-selector=\"audio-canvas\" class=\"{{csstheme}}-audio-canvas\" ba-on:click=\"{{toggle_player()}}\"></canvas>\n    <audio crossorigin=\"anonymous\" tabindex=\"-1\" class=\"{{css}}-audio\" data-audio=\"audio\"></audio>\n    <div class=\"{{css}}-overlay\">\n\t\t<div tabindex=\"-1\" class=\"{{css}}-player-toggle-overlay\" data-selector=\"player-toggle-overlay\"\n\t\t\t ba-hotkey:right=\"{{seek(position + skipseconds)}}\" ba-hotkey:left=\"{{seek(position - skipseconds)}}\"\n\t\t\t ba-hotkey:alt+right=\"{{seek(position + skipseconds * 3)}}\" ba-hotkey:alt+left=\"{{seek(position - skipseconds * 3)}}\"\n\t\t\t ba-hotkey:up=\"{{set_volume(volume + 0.1)}}\" ba-hotkey:down=\"{{set_volume(volume - 0.1)}}\"\n\t\t\t ba-hotkey:space^enter=\"{{toggle_player()}}\"\n\t\t\t ba-on:click=\"{{toggle_player()}}\"\n\t\t></div>\n\t    <ba-{{dyncontrolbar}}\n\t\t    ba-css=\"{{csscontrolbar || css}}\"\n\t\t\tba-cssplayer=\"{{cssplayer || css}}\"\n\t\t\tba-csscommon=\"{{csscommon || css}}\"\n\t\t\tba-csstheme=\"{{csstheme || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t    ba-template=\"{{tmplcontrolbar}}\"\n\t\t    ba-show=\"{{controlbar_active}}\"\n\t\t    ba-playing=\"{{playing}}\"\n\t\t\tba-playwhenvisible=\"{{playwhenvisible}}\"\n\t\t    ba-event:rerecord=\"rerecord\"\n\t\t    ba-event:submit=\"submit\"\n\t\t    ba-event:play=\"play\"\n\t\t    ba-event:pause=\"pause\"\n\t\t    ba-event:position=\"seek\"\n\t\t    ba-event:volume=\"set_volume\"\n\t\t\tba-event:tab_index_move=\"tab_index_move\"\n\t\t\tba-event:seek=\"seek\"\n\t\t\tba-event:set_volume=\"set_volume\"\n\t\t\tba-event:settings_menu=\"toggle_settings_menu\"\n\t\t\tba-tabindex=\"{{tabindex}}\"\n\t\t    ba-volume=\"{{volume}}\"\n\t\t    ba-duration=\"{{duration}}\"\n\t\t    ba-cached=\"{{buffered}}\"\n\t\t    ba-title=\"{{title}}\"\n\t\t    ba-position=\"{{position}}\"\n\t\t    ba-rerecordable=\"{{rerecordable}}\"\n\t\t    ba-submittable=\"{{submittable}}\"\n            ba-source=\"{{source}}\"\n\t\t\tba-disablepause=\"{{disablepause}}\"\n\t\t\tba-disableseeking=\"{{disableseeking}}\"\n\t\t\tba-skipseconds=\"{{skipseconds}}\"\n\t\t\tba-settingsmenubutton=\"{{showsettingsmenu}}\"\n\t\t\tba-settingsmenuactive=\"{{settingsmenu_active}}\"\n\t\t></ba-{{dyncontrolbar}}>\n\n\t\t<ba-{{dynloader}}\n\t\t    ba-css=\"{{cssloader || css}}\"\n\t\t\tba-cssplayer=\"{{cssplayer || css}}\"\n\t\t\tba-csscommon=\"{{csscommon || css}}\"\n\t\t\tba-theme-color=\"{{themecolor}}\"\n\t\t    ba-template=\"{{tmplloader}}\"\n\t\t\tba-playwhenvisible=\"{{playwhenvisible}}\"\n\t\t    ba-show=\"{{loader_active}}\"\n\t\t></ba-{{dynloader}}>\n\n\t\t<ba-{{dynmessage}}\n\t\t    ba-css=\"{{cssmessage || css}}\"\n\t\t\tba-cssplayer=\"{{cssplayer || css}}\"\n\t\t\tba-csscommon=\"{{csscommon || css}}\"\n\t\t\tba-theme-color=\"{{themecolor}}\"\n\t\t    ba-template=\"{{tmplmessage}}\"\n\t\t    ba-show=\"{{message_active}}\"\n\t\t    ba-message=\"{{message}}\"\n\t\t    ba-event:click=\"message_click\"\n\t\t></ba-{{dynmessage}}>\n\n\t\t<ba-{{dynsettingsmenu}}\n\t\t\tba-css=\"{{css}}\"\n\t\t\tba-csstheme=\"{{csstheme || css}}\"\n\t\t\tba-show=\"{{settingsmenu_active}}\"\n\t\t\tba-template=\"{{tmplsettingsmenu}}\"\n\t\t></ba-{{dynsettingsmenu}}>\n\n\t\t<meta itemprop=\"caption\" content=\"{{title}}\" />\n\t\t<meta itemprop=\"contentUrl\" content=\"{{source}}\"/>\n\t</div>\n</div>\n",

                attrs: {
                    /* CSS */
                    "css": "ba-audioplayer",
                    "csscommon": "ba-commoncss",
                    "cssplayer": "ba-player",
                    "iecss": "ba-audioplayer",
                    "cssloader": "",
                    "cssmessage": "",
                    "csscontrolbar": "",
                    "width": "",
                    "height": "",
                    /* Themes */
                    "theme": "",
                    "csstheme": "",
                    "themecolor": "",
                    /* Dynamics */
                    "dynloader": "audioplayer-loader",
                    "dynmessage": "audioplayer-message",
                    "dyncontrolbar": "audioplayer-controlbar",
                    "dynsettingsmenu": "common-settingsmenu",

                    /* Templates */
                    "tmplloader": "",
                    "tmplmessage": "",
                    "tmplcontrolbar": "",
                    "tmplsettingsmenu": "",

                    /* Attributes */
                    "source": "",
                    "sources": [],
                    "sourcefilter": {},
                    "playlist": null,
                    "volume": 1.0,
                    "title": "",
                    "initialseek": null,
                    "visibilityfraction": 0.8,
                    "unmuted": false, // Reference to Chrome renewed policy, we have to setup mute for auto plyed players.

                    /* Configuration */
                    "reloadonplay": false,
                    "playonclick": true,
                    "pauseonclick": true,
                    /* Options */
                    "rerecordable": false,
                    "submittable": false,
                    "autoplay": false,
                    "preload": false,
                    "loop": false,
                    "loopall": false,
                    "ready": true,
                    "totalduration": null,
                    "playwhenvisible": false,
                    "playedonce": false,
                    "manuallypaused": false,
                    "disablepause": false,
                    "disableseeking": false,
                    "postervisible": false,
                    "showsettingsmenu": true, // As a property show/hide from users
                    "visualeffectvisible": false,
                    "visualeffectsupported": false,
                    "visualeffectheight": null,
                    "visualeffectminheight": 120,
                    "visualeffecttheme": "red-bars", // types: `balloon`, 'red-bars'
                    "skipseconds": 5,

                    /* States (helper variables which are controlled by application itself not set by user) */
                    "initialoptions": {
                        "volumelevel": null,
                        "playlist": []
                    },
                    "lastplaylistitem": false,
                    // Reference to Chrome renewed policy, we have to setup mute for auto-playing players.
                    // If we do it forcibly then will set as true
                    "forciblymuted": false,
                    // When volume was un muted, by user himself, not automatically
                    "volumeafterinteraction": false
                },

                types: {
                    "rerecordable": "boolean",
                    "loop": "boolean",
                    "loopall": "boolean",
                    "autoplay": "boolean",
                    "preload": "boolean",
                    "ready": "boolean",
                    "volume": "float",
                    "initialseek": "float",
                    "themecolor": "string",
                    "totalduration": "float",
                    "playwhenvisible": "boolean",
                    "playedonce": "boolean",
                    "manuallypaused": "boolean",
                    "disablepause": "boolean",
                    "disableseeking": "boolean",
                    "playonclick": "boolean",
                    "pauseonclick": "boolean",
                    "showsettings": "boolean",
                    "skipseconds": "integer",
                    "visualeffectvisible": "boolean",
                    "visualeffectmode": "string",
                    "visualeffectheight": "integer"
                },

                extendables: ["states"],

                scopes: {
                    settingsmenu: ">[tagname='ba-common-settingsmenu']"
                },

                computed: {
                    "widthHeightStyles:width,height": function() {
                        var result = {};
                        var width = this.get("width");
                        var height = this.get("height");
                        if (width)
                            result.width = width + ((width + '').match(/^\d+$/g) ? 'px' : '');
                        if (height)
                            result.height = height + ((height + '').match(/^\d+$/g) ? 'px' : '');
                        return result;
                    },
                    "buffering:buffered,position,last_position_change_delta,playing": function() {
                        return this.get("playing") && this.get("buffered") < this.get("position") && this.get("last_position_change_delta") > 1000;
                    }
                },

                events: {
                    "change:visualeffectsupported": function(supported) {
                        if (!supported && this.audioVisualization) this.audioVisualization.destroy();
                    }
                },

                remove_on_destroy: true,

                create: function() {
                    if (this.get("visualeffectvisible") && (!this.get("height") || this.get("height") < this.get("visualeffectminheight")))
                        this.set("height", this.get("visualeffectminheight"));
                    // Will set volume initial state
                    this.set("initialoptions", Objs.tree_merge(this.get("initialoptions"), {
                        volumelevel: this.get("volume")
                    }));

                    if (this.get("theme")) this.set("theme", this.get("theme").toLowerCase());
                    if (this.get("theme") in Assets.audioplayerthemes) {
                        Objs.iter(Assets.audioplayerthemes[this.get("theme")], function(value, key) {
                            if (!this.isArgumentAttr(key))
                                this.set(key, value);
                        }, this);
                    }

                    if (!this.get("themecolor"))
                        this.set("themecolor", "default");

                    if (this.get("playlist")) {
                        var pl0 = (this.get("playlist"))[0];
                        this.set("source", pl0.source);
                        this.set("sources", pl0.sources);
                    }

                    this.set("ie8", Info.isInternetExplorer() && Info.internetExplorerVersion() < 9);
                    this.set("duration", this.get("totalduration") || 0.0);
                    this.set("position", 0.0);
                    this.set("buffered", 0.0);
                    this.set("message", "");
                    this.set("csssize", "normal");

                    this.set("loader_active", false);
                    this.set("controlbar_active", false);
                    this.set("message_active", false);

                    this.set("playing", false);

                    this.__attachRequested = false;
                    this.__activated = false;
                    this.__error = null;

                    this.activeElement().onkeydown = this._keyDownActivity.bind(this, this.activeElement());

                    this.host = new Host({
                        stateRegistry: new ClassRegistry(this.cls.playerStates())
                    });
                    this.host.dynamic = this;
                    this.host.initialize(this._initialState);

                    this._timer = new Timers.Timer({
                        context: this,
                        fire: this._timerFire,
                        delay: 100,
                        start: true
                    });
                },

                getMediaType: function() {
                    return "audio";
                },

                _initialState: InitialState,

                state: function() {
                    return this.host.state();
                },

                audioAttached: function() {
                    return !!this.player;
                },

                audioLoaded: function() {
                    return this.audioAttached() && this.player.loaded();
                },

                audioError: function() {
                    return this.__error;
                },

                _error: function(error_type, error_code) {
                    this.__error = {
                        error_type: error_type,
                        error_code: error_code
                    };
                    this.trigger("error:" + error_type, error_code);
                    this.trigger("error", error_type, error_code);
                },

                _clearError: function() {
                    this.__error = null;
                },

                _detachAudio: function() {
                    this.set("playing", false);
                    if (this.player)
                        this.player.weakDestroy();
                    this.player = null;
                    this.__audio = null;
                    this.set("audioelement_active", false);
                },

                _attachAudio: function() {
                    if (this.audioAttached())
                        return;
                    if (!this.__activated) {
                        this.__attachRequested = true;
                        return;
                    }
                    this.__attachRequested = false;
                    this.set("audioelement_active", true);
                    var audio = this.activeElement().querySelector("[data-audio='audio']");
                    this._clearError();
                    AudioPlayerWrapper.create(Objs.extend(this._getSources(), {
                        element: audio,
                        preload: !!this.get("preload"),
                        loop: !!this.get("loop") || (this.get("lastplaylistitem") && this.get("loopall")),
                        reloadonplay: !!this.get("reloadonplay") // reload of AudioMediaElement not act like in VideoMediaElement, no need for reload
                    })).error(function(e) {
                        if (this.destroyed())
                            return;
                        this._error("attach", e);
                    }, this).success(function(instance) {
                        if (this.destroyed())
                            return;

                        this.player = instance;
                        this.__audio = audio;
                        // Draw audio visualization effect
                        if (this.get("visualeffectvisible") && AudioVisualization.supported() && !this.audioVisualization) {
                            if (this.get("height") && this.get("height") > this.get("visualeffectminheight")) {
                                this.set('visualeffectheight', this.get("height"));
                            } else if (this.get("visualeffectheight") < this.get("visualeffectminheight")) {
                                this.set('visualeffectheight', this.get("visualeffectminheight"));
                            }

                            this.audioVisualization = new AudioVisualization(audio, {
                                height: this.get('visualeffectheight'),
                                element: this.activeElement(),
                                theme: this.get("visualeffecttheme")
                            });
                            try {
                                this.audioVisualization.initializeVisualEffect();
                                this.set("visualeffectsupported", true);
                            } catch (e) {
                                this.set("visualeffectsupported", false);
                                console.warn(e);
                            }
                        }

                        if (this.get("visualeffectvisible") && this.audioVisualization) {
                            this.player.on("playing", function() {
                                this.audioVisualization.start();
                            }, this);
                            this.player.on("paused", function() {
                                this.audioVisualization.pause();
                            }, this);
                            this.player.on("ended", function() {
                                this.audioVisualization.stop();
                            }, this);
                        }

                        if (this.get("playwhenvisible")) {
                            this._playWhenVisible(audio);
                        }
                        // If browser is Chrome, and we have manually forcibly muted player
                        if (Info.isChromiumBased() && this.get("forciblymuted")) {
                            audio.isMuted = true;
                            Dom.userInteraction(function() {
                                this.set_volume(this.get("initialoptions").volumelevel);
                                if (this.get("volume") > 0.00)
                                    audio.isMuted = false;
                                this.set("forciblymuted", false);
                            }, this);
                        }
                        this.player.on("playing", function() {
                            this.set("playing", true);
                            this.trigger("playing");
                        }, this);
                        this.player.on("error", function(e) {
                            this._error("audio", e);
                        }, this);
                        if (this.player.error())
                            this.player.trigger("error", this.player.error());
                        this.player.on("paused", function() {
                            this.set("playing", false);
                            this.trigger("paused");
                        }, this);
                        this.player.on("ended", function() {
                            this.set("playing", false);
                            this.set('playedonce', true);
                            this.set("settingsmenu_active", false);
                            this.trigger("ended");
                        }, this);
                        this.trigger("attached", instance);
                        this.player.once("loaded", function() {
                            var volume = Math.min(1.0, this.get("volume"));
                            this.player.setVolume(volume);
                            this.player.setMuted(volume <= 0.0);
                            this.trigger("loaded");
                            this.trigger("ready_to_play");
                            if (this.get("totalduration") || this.player.duration() < Infinity)
                                this.set("duration", this.get("totalduration") || this.player.duration());
                            if (this.get("initialseek"))
                                this.player.setPosition(this.get("initialseek"));
                        }, this);
                        if (this.player.loaded())
                            this.player.trigger("loaded");
                    }, this);
                },

                _getSources: function() {
                    var filter = this.get("sourcefilter");
                    var source = this.get("source");
                    var sources = filter ? Objs.filter(this.get("sources"), function(source) {
                        return Objs.subset_of(filter, source);
                    }, this) : this.get("sources");
                    return {
                        source: source,
                        sources: sources
                    };
                },

                _afterActivate: function(element) {
                    inherited._afterActivate.call(this, element);
                    this.__activated = true;
                    if (this.__attachRequested)
                        this._attachAudio();
                    this.__settingsMenu = this.scopes.settingsmenu;
                    if (this.__settingsMenu.get('settings'))
                        this.set("hassettings", true);

                },

                _playWhenVisible: function(audio) {
                    var _self = this;

                    if (Dom.isElementVisible(audio, this.get("visibilityfraction"))) {
                        this.player.play();
                    }

                    this._visiblityScrollEvent = this.auto_destroy(new DomEvents());
                    this._visiblityScrollEvent.on(document, "scroll", function() {
                        if (!_self.get('playedonce') && !_self.get("manuallypaused")) {
                            if (Dom.isElementVisible(audio, _self.get("visibilityfraction"))) {
                                _self.player.play();
                            } else if (_self.get("playing")) {
                                _self.player.pause();
                            }
                        } else if (_self.get("playing") && !Dom.isElementVisible(audio, _self.get("visibilityfraction"))) {
                            _self.player.pause();
                        }
                    });

                },

                reattachAudio: function() {
                    this.set("reloadonplay", true);
                    this._detachAudio();
                    this._attachAudio();
                },

                _keyDownActivity: function(element, ev) {
                    var _keyCode = ev.which || ev.keyCode;
                    // Prevent whitespace browser center scroll and arrow buttons behaviours
                    if (_keyCode === 32 || _keyCode === 37 || _keyCode === 38 || _keyCode === 39 || _keyCode === 40) ev.preventDefault();


                    if (_keyCode === 9 && ev.shiftKey) {
                        this._findNextTabStop(element, ev, function(target, index) {
                            target.focus();
                        }, -1);
                    } else if (_keyCode === 9) {
                        this._findNextTabStop(element, ev, function(target, index) {
                            target.focus();
                        });
                    }
                },

                _findNextTabStop: function(parentElement, ev, callback, direction) {
                    var _currentIndex, _direction, _tabIndexes, _tabIndexesArray, _maxIndex, _minIndex, _looked, _tabIndex, _delta, _element, _audioPlayersCount;
                    _maxIndex = _minIndex = 0;
                    _direction = direction || 1;
                    _element = ev.target;
                    _currentIndex = _element.tabIndex;
                    _tabIndexes = parentElement.querySelectorAll('[tabindex]');
                    _tabIndexesArray = Array.prototype.slice.call(_tabIndexes, 0);
                    _tabIndexes = _tabIndexesArray
                        .filter(function(element) {
                            if ((element.clientWidth > 0 || element.clientHeight > 0) && (element.tabIndex !== -1)) {
                                if (_maxIndex <= element.tabIndex) _maxIndex = element.tabIndex;
                                if (_minIndex >= element.tabIndex) _minIndex = element.tabIndex;
                                return true;
                            } else return false;
                        });

                    if ((_direction === 1 && _currentIndex === _maxIndex) || (direction === -1 && _currentIndex === _minIndex) || _maxIndex === 0) {
                        _audioPlayersCount = document.querySelectorAll('ba-audioplayer').length;
                        if (_audioPlayersCount > 1) {
                            if (this.get("playing")) this.player.pause();
                            parentElement.tabIndex = -1;
                            parentElement.blur();
                        }
                        return;
                    }

                    for (var i = 0; i < _tabIndexes.length; i++) {
                        if (!_tabIndexes[i])
                            continue;
                        _tabIndex = _tabIndexes[i].tabIndex;
                        _delta = _tabIndex - _currentIndex;
                        if (_tabIndex < _minIndex || _tabIndex > _maxIndex || Math.sign(_delta) !== _direction)
                            continue;

                        if (!_looked || Math.abs(_delta) < Math.abs(_looked.tabIndex - _currentIndex))
                            _looked = _tabIndexes[i];
                    }

                    if (_looked) {
                        ev.preventDefault();
                        callback(_looked, _looked.tabIndex);
                    }
                },

                object_functions: ["play", "rerecord", "pause", "stop", "seek", "set_volume"],

                functions: {

                    message_click: function() {
                        this.trigger("message:click");
                    },

                    play: function() {
                        this.host.state().play();
                        this.set("manuallypaused", false);
                    },

                    rerecord: function() {
                        if (!this.get("rerecordable"))
                            return;
                        this.trigger("rerecord");
                    },

                    submit: function() {
                        if (!this.get("submittable"))
                            return;
                        this.trigger("submit");
                        this.set("submittable", false);
                        this.set("rerecordable", false);
                    },

                    pause: function() {
                        if (this.get('disablepause')) return;

                        if (this.get("playing")) {
                            this.player.pause();
                        }

                        if (this.get("playwhenvisible"))
                            this.set("manuallypaused", true);
                    },

                    stop: function() {
                        if (!this.audioLoaded())
                            return;
                        if (this.get("playing"))
                            this.player.pause();
                        this.player.setPosition(0);
                        this.trigger("stopped");
                    },

                    seek: function(position) {
                        if (this.get('disableseeking')) return;
                        if (this.audioLoaded()) {
                            if (position > this.player.duration()) {
                                this.player.setPosition(this.player.duration() - this.get("skipseconds"));
                            } else {
                                this.player.setPosition(position);
                                this.trigger("seek", position);
                            }
                        }
                    },

                    set_volume: function(volume) {
                        volume = Math.min(1.0, volume);
                        volume = volume <= 0 ? 0 : volume; // Don't allow negative value

                        this.set("volume", volume);
                        if (this.audioLoaded()) {
                            this.player.setVolume(volume);
                            this.player.setMuted(volume <= 0);
                        }
                    },

                    tab_index_move: function(ev, nextSelector, focusingSelector) {
                        var _targetElement, _activeElement, _selector, _keyCode;
                        _keyCode = ev.which || ev.keyCode;
                        _activeElement = this.activeElement();
                        if (_keyCode === 13 || _keyCode === 32) {
                            if (focusingSelector) {
                                _selector = "[data-selector='" + focusingSelector + "']";
                                _targetElement = _activeElement.querySelector(_selector);
                                if (_targetElement)
                                    Async.eventually(function() {
                                        this.trigger("keyboardusecase", _activeElement);
                                        _targetElement.focus({
                                            preventScroll: false
                                        });
                                    }, this, 100);
                            } else {
                                _selector = '[data-audio="audio"]';
                                _targetElement = _activeElement.querySelector(_selector);
                                Async.eventually(function() {
                                    this.trigger("keyboardusecase", _activeElement);
                                    _targetElement.focus({
                                        preventScroll: true
                                    });
                                }, this, 100);
                            }
                        } else if (_keyCode === 9 && nextSelector) {
                            _selector = "[data-selector='" + nextSelector + "']";
                            _targetElement = _activeElement.querySelector(_selector);
                            if (_targetElement)
                                Async.eventually(function() {
                                    this.trigger("keyboardusecase", _activeElement);
                                    _targetElement.focus({
                                        preventScroll: false
                                    });
                                }, this, 100);

                        }
                    },

                    toggle_settings_menu: function() {
                        this.set("settingsmenu_active", !this.get("settingsmenu_active"));
                    },

                    toggle_player: function() {
                        if (this.get("playing") && this.get("pauseonclick")) {
                            this.pause();
                        } else if (!this.get("playing") && this.get("playonclick")) {
                            this.play();
                        }
                    }

                },

                destroy: function() {
                    this._timer.destroy();
                    this.host.destroy();
                    this._detachAudio();
                    inherited.destroy.call(this);
                },

                _timerFire: function() {
                    if (this.destroyed())
                        return;
                    try {
                        if (this.audioLoaded()) {
                            var _now = Time.now();
                            var new_position = this.player.position();
                            if (new_position !== this.get("position") || this.get("last_position_change"))
                                this.set("last_position_change", _now);
                            // In case if prevent interaction with controller set to true
                            this.set("last_position_change_delta", _now - this.get("last_position_change"));
                            this.set("position", new_position);
                            this.set("buffered", this.player.buffered());
                            var pld = this.player.duration();
                            if (this.get("totalduration")) {
                                this.set("duration", this.get("totalduration"));
                            } else if (0.0 < pld && pld < Infinity) {
                                this.set("duration", this.player.duration());
                            } else {
                                this.set("duration", new_position);
                            }
                        }
                    } catch (e) {}
                    try {
                        this._updateCSSSize();
                    } catch (e) {}
                },

                _updateCSSSize: function() {
                    var width = Dom.elementDimensions(this.activeElement()).width;
                    this.set("csssize", width > 400 ? "normal" : (width > 300 ? "medium" : "small"));
                },

                cloneAttrs: function() {
                    return Objs.map(this.attrs, function(value, key) {
                        return this.get(key);
                    }, this);
                }

            };
        }, {

            playerStates: function() {
                return [PlayerStates];
            }

        }).register("ba-audioplayer")
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "cssplayer": function (obj) { return obj.cssplayer; }, "csssize": function (obj) { return obj.csssize; }, "iecss": function (obj) { return obj.iecss; }, "ie8 ? 'ie8' : 'noie8'": function (obj) { return obj.ie8 ? 'ie8' : 'noie8'; }, "csstheme": function (obj) { return obj.csstheme; }, "themecolor": function (obj) { return obj.themecolor; }, "title ? 'has-title' : 'no-title'": function (obj) { return obj.title ? 'has-title' : 'no-title'; }, "visualeffectvisible ? cssplayer + '-visual-effect-applied' : ''": function (obj) { return obj.visualeffectvisible ? obj.cssplayer + '-visual-effect-applied' : ''; }, "widthHeightStyles": function (obj) { return obj.widthHeightStyles; }, "toggle_player()": function (obj) { return obj.toggle_player(); }, "seek(position + skipseconds)": function (obj) { return obj.seek(obj.position + obj.skipseconds); }, "seek(position - skipseconds)": function (obj) { return obj.seek(obj.position - obj.skipseconds); }, "seek(position + skipseconds * 3)": function (obj) { return obj.seek(obj.position + obj.skipseconds * 3); }, "seek(position - skipseconds * 3)": function (obj) { return obj.seek(obj.position - obj.skipseconds * 3); }, "set_volume(volume + 0.1)": function (obj) { return obj.set_volume(obj.volume + 0.1); }, "set_volume(volume - 0.1)": function (obj) { return obj.set_volume(obj.volume - 0.1); }, "dyncontrolbar": function (obj) { return obj.dyncontrolbar; }, "csscontrolbar || css": function (obj) { return obj.csscontrolbar || obj.css; }, "cssplayer || css": function (obj) { return obj.cssplayer || obj.css; }, "csscommon || css": function (obj) { return obj.csscommon || obj.css; }, "csstheme || css": function (obj) { return obj.csstheme || obj.css; }, "tmplcontrolbar": function (obj) { return obj.tmplcontrolbar; }, "controlbar_active": function (obj) { return obj.controlbar_active; }, "playing": function (obj) { return obj.playing; }, "playwhenvisible": function (obj) { return obj.playwhenvisible; }, "tabindex": function (obj) { return obj.tabindex; }, "volume": function (obj) { return obj.volume; }, "duration": function (obj) { return obj.duration; }, "buffered": function (obj) { return obj.buffered; }, "title": function (obj) { return obj.title; }, "position": function (obj) { return obj.position; }, "rerecordable": function (obj) { return obj.rerecordable; }, "submittable": function (obj) { return obj.submittable; }, "source": function (obj) { return obj.source; }, "disablepause": function (obj) { return obj.disablepause; }, "disableseeking": function (obj) { return obj.disableseeking; }, "skipseconds": function (obj) { return obj.skipseconds; }, "showsettingsmenu": function (obj) { return obj.showsettingsmenu; }, "settingsmenu_active": function (obj) { return obj.settingsmenu_active; }, "dynloader": function (obj) { return obj.dynloader; }, "cssloader || css": function (obj) { return obj.cssloader || obj.css; }, "tmplloader": function (obj) { return obj.tmplloader; }, "loader_active": function (obj) { return obj.loader_active; }, "dynmessage": function (obj) { return obj.dynmessage; }, "cssmessage || css": function (obj) { return obj.cssmessage || obj.css; }, "tmplmessage": function (obj) { return obj.tmplmessage; }, "message_active": function (obj) { return obj.message_active; }, "message": function (obj) { return obj.message; }, "dynsettingsmenu": function (obj) { return obj.dynsettingsmenu; }, "tmplsettingsmenu": function (obj) { return obj.tmplsettingsmenu; }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "audio-error": "An error occurred, please try again later. Click to retry.",
            "all-settings": "All settings"
        });
});
Scoped.define("module:AudioPlayer.Dynamics.PlayerStates.State", [
    "base:States.State",
    "base:Events.ListenMixin",
    "base:Objs"
], function(State, ListenMixin, Objs, scoped) {
    return State.extend({
        scoped: scoped
    }, [ListenMixin, {

        dynamics: [],

        _start: function() {
            this.dyn = this.host.dynamic;
            Objs.iter(Objs.extend({
                "loader": false,
                "message": false,
                "controlbar": false
            }, Objs.objectify(this.dynamics)), function(value, key) {
                this.dyn.set(key + "_active", value);
            }, this);
            if (this.dyn.parent()) {
                if (this.dyn.parent().record !== 'undefined' && this.dyn.parent().host !== 'undefined') {
                    this.dyn._isRecorder = true;
                    this.dyn._recorderDyn = this.dyn.parent();
                    this.dyn._recorderHost = this.dyn._recorderDyn.host;
                }
            }
            this._started();
        },

        _started: function() {},

        play: function() {
            this.dyn.set("autoplay", true);
        },

        nextToChooser: function(message) {
            var _dyn = this.dyn;

            if (!_dyn._isRecorder)
                return false;

            if (typeof _dyn._recorderHost.next === 'function') {
                _dyn._recorderHost.next("FatalError", {
                    message: message,
                    retry: "Chooser"
                });
                return true;
            } else
                return false;
        }
    }]);
});


Scoped.define("module:AudioPlayer.Dynamics.PlayerStates.FatalError", [
    "module:AudioPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],
        _locals: ["message"],

        _started: function() {
            this.dyn.set("message", this._message || this.dyn.string("audio-error"));
        }
    });
});


Scoped.define("module:AudioPlayer.Dynamics.PlayerStates.Initial", [
    "module:AudioPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            this.dyn.set("audioelement_active", false);
            if (this.dyn.get("ready"))
                this.next("LoadPlayer");
            else {
                this.listenOn(this.dyn, "change:ready", function() {
                    this.next("LoadPlayer");
                });
            }
        }
    });
});


Scoped.define("module:AudioPlayer.Dynamics.PlayerStates.LoadPlayer", [
    "module:AudioPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            this.listenOn(this.dyn, "error:attach", function() {
                this.next("LoadError");
            }, this);
            this.listenOn(this.dyn, "attached", function() {
                this.next("LoadAudio");
            }, this);
            this.dyn.reattachAudio();
        }

    });
});


Scoped.define("module:AudioPlayer.Dynamics.PlayerStates.LoadError", [
    "module:AudioPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],

        _started: function() {
            this.dyn.set("message", this.dyn.string("audio-error"));
            this.listenOn(this.dyn, "message:click", function() {
                this.next("LoadPlayer");
            }, this);
        }

    });
});


Scoped.define("module:AudioPlayer.Dynamics.PlayerStates.LoadAudio", [
    "module:AudioPlayer.Dynamics.PlayerStates.State",
    "browser:Info",
    "browser:Dom",
    "base:Timers.Timer"
], function(State, Info, Dom, Timer, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            if (!this.dyn.get("audioelement_active")) {
                this.listenOn(this.dyn, "error:attach", function() {
                    this.next("LoadError");
                }, this);
                this.listenOn(this.dyn, "attached", function() {
                    this.__loadAudio();
                }, this);
                this.dyn.reattachAudio();
            } else {
                this.__loadAudio();
            }
        },

        __loadAudio: function() {
            this.listenOn(this.dyn, "error:audio", function() {
                this.next("ErrorAudio");
            }, this);
            this.listenOn(this.dyn, "playing", function() {
                if (this.destroyed() || this.dyn.destroyed())
                    return;
                if (this.dyn.get("autoseek"))
                    this.dyn.execute("seek", this.dyn.get("autoseek"));
                this.next("PlayAudio");
            }, this);
            if (!this.dyn.get("autoplay")) {
                this.next("PlayAudio");
            } else {
                var counter = 10;
                this.auto_destroy(new Timer({
                    context: this,
                    fire: function() {
                        if (!this.destroyed() && !this.dyn.destroyed() && this.dyn.player) {
                            try {
                                var promise = this.dyn.player.play();
                                if (promise) {
                                    promise.success(function() {
                                        this.next("PlayAudio");
                                    });
                                }
                            } catch (e) {
                                // browsers released before 2019 may not return promise on play()
                            }
                        }
                        counter--;
                        if (counter === 0)
                            this.next("PlayAudio");
                    },
                    delay: 200,
                    immediate: true
                }));
            }
        }
    });
});



Scoped.define("module:AudioPlayer.Dynamics.PlayerStates.ErrorAudio", [
    "module:AudioPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],

        _started: function() {
            this.dyn.set("message", this.dyn.string("audio-error"));
            this.listenOn(this.dyn, "message:click", function() {
                if (!this.nextToChooser(this.dyn.get("message")))
                    this.next("LoadAudio");
                else
                    this.next("Initial");
            }, this);
        }

    });
});

Scoped.define("module:AudioPlayer.Dynamics.PlayerStates.PlayAudio", [
    "module:AudioPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["controlbar"],

        _started: function() {
            this.dyn.trigger("loaded");
            this.dyn.set("autoplay", false);
            // As during loop we will play player after ended event fire, need initial cover will be hidden
            this.listenOn(this.dyn, "ended", function() {
                this.dyn.set("autoseek", null);
                this.next("NextAudio");
            }, this);
            this.listenOn(this.dyn, "change:buffering", function() {
                this.dyn.set("loader_active", this.dyn.get("buffering"));
            }, this);
            this.listenOn(this.dyn, "error:audio", function() {
                this.next("ErrorAudio");
            }, this);
        },

        play: function() {
            if (!this.dyn.get("playing"))
                this.dyn.player.play();
        }

    });
});


Scoped.define("module:AudioPlayer.Dynamics.PlayerStates.NextAudio", [
    "module:AudioPlayer.Dynamics.PlayerStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        _started: function() {
            if (this.dyn.get("playlist")) {
                var pl0, initialPlaylist;
                var list = this.dyn.get("playlist");
                var head = list.shift();
                this.dyn.get("initialoptions").playlist.push(head);
                if (list.length > 0) {
                    pl0 = list[0];
                    this.dyn.set("source", pl0.source);
                    this.dyn.set("sources", pl0.sources);
                    return this._playNext(pl0);
                } else {
                    initialPlaylist = this.dyn.get("initialoptions").playlist;
                    this.dyn.set("lastplaylistitem", true);
                    this.dyn.trigger("last-playlist-item");
                    this.dyn.set("playlist", initialPlaylist);
                    this.dyn.get("initialoptions").playlist = [];

                    pl0 = initialPlaylist[0];
                    this.dyn.set("source", pl0.source);
                    this.dyn.set("sources", pl0.sources);
                    if (this.dyn.get("loopall"))
                        return this._playNext(pl0);
                    else
                        this.dyn.reattachAudio();
                }
            } else {
                // If user will set loopall as true, single audio also will be played
                if (this.dyn.get("loopall")) {
                    this.dyn.set("loop", true);
                    this.dyn.set("autoplay", true);
                    this.dyn.reattachAudio();
                }
            }

            this.next("LoadAudio");
        },

        /**
         * Will start auto play the next play list element
         * @param {object} pl
         * @private
         */
        _playNext: function(pl) {
            this.dyn.trigger("playlist-next", pl);
            this.dyn.set("autoplay", true);
            // this.next("LoadPlayer") will reattach audio which cause twice player bidings
            // as a result old duration is set as a new one;
            this.next("LoadAudio");
        }
    });
});
Scoped.define("module:AudioRecorder.Dynamics.Chooser", [
    "dynamics:Dynamic",
    "module:Assets",
    "browser:Info"
], [
    "dynamics:Partials.ClickPartial",
    "dynamics:Partials.IfPartial"
], function(Class, Assets, Info, scoped) {

    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<div class=\"{{css}}-chooser-container\">\n\t<div class=\"{{css}}-chooser-button-container\">\n\t\t<div ba-repeat=\"{{action :: actions}}\">\n\t\t\t<div ba-hotkey:space^enter=\"{{click_action(action)}}\" onmouseout=\"this.blur()\"\n\t\t\t\t tabindex=\"0\" class=\"{{css}}-chooser-button-{{action.index}}\"\n\t\t\t     ba-click=\"{{click_action(action)}}\"\n\t\t\t>\n\t\t\t\t<input ba-if=\"{{action.select && action.capture}}\"\n\t\t\t\t\t   type=\"file\"\n\t\t\t\t\t   class=\"{{css}}-chooser-file\"\n\t\t\t\t\t   onchange=\"{{select_file_action(action, domEvent)}}\"\n\t\t\t\t\t   accept=\"{{action.accept}}\"\n\t\t\t\t\t   capture />\n\t\t\t\t<input ba-if=\"{{action.select && !action.capture}}\"\n\t\t\t\t\t   type=\"file\"\n\t\t\t\t\t   class=\"{{css}}-chooser-file\"\n\t\t\t\t\t   onchange=\"{{select_file_action(action, domEvent)}}\"\n\t\t\t\t\t   accept=\"{{action.accept}}\"\n\t\t\t\t\t   />\n\t\t\t\t<i class=\"{{csscommon}}-icon-{{action.icon}}\"\n\t\t\t\t   ba-if=\"{{action.icon}}\"></i>\n\t\t\t\t<span>\n\t\t\t\t\t{{action.label}}\n\t\t\t\t</span>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n",

                attrs: {
                    "css": "ba-audiorecorder",
                    "cssrecorder": "ba-recorder",
                    "allowrecord": true,
                    "allowupload": true,

                    "primaryrecord": true,
                    "recordviafilecapture": false,

                    "allowcustomupload": true,
                    "allowedextensions": null

                },

                types: {
                    "allowedextensions": "array",
                    "recordviafilecapture": "boolean"
                },

                collections: ["actions"],

                create: function() {
                    var custom_accept_string = "";
                    if (this.get("allowedextensions") && this.get("allowedextensions").length > 0) {
                        var browser_support = Info.isEdge() || Info.isChrome() || Info.isOpera() || (Info.isFirefox() && Info.firefoxVersion() >= 42) || (Info.isInternetExplorer() && Info.internetExplorerVersion() >= 10);
                        if (browser_support)
                            custom_accept_string = "." + this.get("allowedextensions").join(",.");
                    } else if (!this.get("allowcustomupload")) {
                        custom_accept_string = "audio/*,audio/mp3";
                    }

                    var order = [];
                    if (this.get("primaryrecord")) {
                        if (this.get("allowrecord"))
                            order.push("record");
                        if (this.get("allowupload"))
                            order.push("upload");
                    } else {
                        if (this.get("allowupload"))
                            order.push("upload");
                        if (this.get("allowrecord"))
                            order.push("record");
                    }
                    var actions = this.get("actions");
                    order.forEach(function(act, index) {
                        switch (act) {
                            case "record":
                                actions.add({
                                    type: "record",
                                    index: index,
                                    icon: 'volume-up',
                                    label: this.string("record-audio"),
                                    select: Info.isMobile() && !(Info.isAndroid() && Info.isCordova()) && this.get("recordviafilecapture"),
                                    capture: true,
                                    accept: "audio/*,audio/mp3;capture=camcorder"
                                });
                                break;
                            case "upload":
                                actions.add({
                                    type: "upload",
                                    index: index,
                                    icon: "upload",
                                    label: this.string("upload-audio"),
                                    select: !(Info.isiOS() && Info.isCordova()),
                                    accept: Info.isMobile() && !(Info.isAndroid() && Info.isCordova()) ? "audio/*,audio/mp3" : custom_accept_string
                                });
                                break;
                        }
                    }, this);
                },

                functions: {

                    click_action: function(action) {
                        if (action.get("select"))
                            return;
                        if (Info.isMobile() && Info.isCordova()) {
                            var self = this;
                            if (Info.isAndroid()) {
                                navigator.device.capture.captureAudio(function(mediaFiles) {
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
                                    mediaType: Camera.MediaType.AUDIO
                                });
                            }
                        } else
                            this.trigger("record");
                    },

                    select_file_action: function(action, domEvent) {
                        if (!action.get("select"))
                            return;
                        this.trigger("upload", domEvent[0].target);
                    }

                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "actions": function (obj) { return obj.actions; }, "click_action(action)": function (obj) { return obj.click_action(obj.action); }, "action.index": function (obj) { return obj.action.index; }, "action.select && action.capture": function (obj) { return obj.action.select && obj.action.capture; }, "select_file_action(action, domEvent)": function (obj) { return obj.select_file_action(obj.action, obj.domEvent); }, "action.accept": function (obj) { return obj.action.accept; }, "action.select && !action.capture": function (obj) { return obj.action.select && !obj.action.capture; }, "csscommon": function (obj) { return obj.csscommon; }, "action.icon": function (obj) { return obj.action.icon; }, "action.label": function (obj) { return obj.action.label; }/**/
        })
        .register("ba-audiorecorder-chooser")
        .attachStringTable(Assets.strings)
        .addStrings({
            "record-audio": "Record Audio",
            "upload-audio": "Upload Audio"
        });
});
Scoped.define("module:AudioRecorder.Dynamics.Controlbar", [
    "dynamics:Dynamic",
    "module:Assets",
    "base:Timers.Timer"
], [
    "dynamics:Partials.ShowPartial",
    "dynamics:Partials.RepeatPartial"
], function(Class, Assets, Timer, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<div class=\"{{css}}-dashboard\">\n\t<div class=\"{{css}}-backbar\"></div>\n\t<div data-selector=\"recorder-settings\" class=\"{{css}}-settings\" ba-show=\"{{settingsvisible && settingsopen}}\">\n\t\t<div class=\"{{css}}-settings-backbar\"></div>\n\t\t<div data-selector=\"settings-list-front\" class=\"{{css}}-settings-front\">\n\t\t\t<ul data-selector=\"microphone-settings\" ba-repeat=\"{{microphone :: microphones}}\">\n\t\t\t\t<li tabindex=\"0\"\n\t\t\t\t\tba-hotkey:space^enter=\"{{selectMicrophone(microphone.id)}}\" onmouseout=\"this.blur()\"\n\t\t\t\t\tonclick=\"{{selectMicrophone(microphone.id)}}\"\n\t\t\t\t>\n\t\t\t\t\t<input type='radio' name='microphone' value=\"{{selectedmicrophone == microphone.id}}\" />\n\t\t\t\t\t<span></span>\n\t\t\t\t\t<label>\n\t\t\t\t\t\t{{microphone.label}}\n\t\t\t\t\t</label>\n\t\t\t\t </li>\n\t\t\t</ul>\n\t\t</div>\n\t</div>\n\t<div data-selector=\"controlbar\" class=\"{{css}}-controlbar\">\n\n        <div class=\"{{css}}-leftbutton-container\" ba-show=\"{{settingsvisible}}\">\n            <div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{settingsopen=!settingsopen}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"record-button-icon-cog\" class=\"{{css}}-button-inner {{css}}-button-{{settingsopen ? 'selected' : 'unselected'}}\"\n                 onclick=\"{{settingsopen=!settingsopen}}\"\n                 onmouseenter=\"{{hover(string('settings'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n                <i class=\"{{csscommon}}-icon-cog\"></i>\n            </div>\n        </div>\n\n        <div class=\"{{css}}-lefticon-container\" ba-show=\"{{settingsvisible}}\">\n            <div data-selector=\"record-button-icon-mic\" class=\"{{csscommon}}-icon-inner\"\n                 onmouseenter=\"{{hover(string(microphonehealthy ? 'microphonehealthy' : 'microphoneunhealthy'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n                <i class=\"{{csscommon}}-icon-mic {{csscommon}}-icon-state-{{microphonehealthy ? 'good' : 'bad' }}\"></i>\n            </div>\n        </div>\n\n        <div class=\"{{css}}-lefticon-container\" ba-show=\"{{stopvisible && recordingindication}}\">\n            <div data-selector=\"recording-indicator\" class=\"{{css}}-recording-indication\">\n            </div>\n        </div>\n\n        <div class=\"{{css}}-label-container\" ba-show=\"{{controlbarlabel}}\">\n        \t<div data-selector=\"record-label-block\" class=\"{{css}}-label-label\">\n        \t\t{{controlbarlabel}}\n        \t</div>\n        </div>\n\n        <div class=\"{{css}}-rightbutton-container\" ba-show=\"{{recordvisible}}\">\n        \t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{record()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"record-primary-button\" class=\"{{css}}-button-primary\"\n                 onclick=\"{{record()}}\"\n                 onmouseenter=\"{{hover(string('record-tooltip'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n        \t\t{{string('record')}}\n        \t</div>\n        </div>\n\n        <div class=\"{{css}}-rightbutton-container\" ba-show=\"{{rerecordvisible}}\">\n        \t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{rerecord()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"rerecord-primary-button\" class=\"{{css}}-button-primary\"\n                 onclick=\"{{rerecord()}}\"\n                 onmouseenter=\"{{hover(string('rerecord-tooltip'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n        \t\t{{string('rerecord')}}\n        \t</div>\n        </div>\n\n\t\t<div class=\"{{css}}-rightbutton-container\" ba-show=\"{{cancelvisible}}\">\n\t\t\t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{cancel()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"cancel-primary-button\" class=\"{{css}}-button-primary\"\n\t\t\t\t onclick=\"{{cancel()}}\"\n\t\t\t\t onmouseenter=\"{{hover(string('cancel-tooltip'))}}\"\n\t\t\t\t onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n\t\t\t\t{{string('cancel')}}\n\t\t\t</div>\n\t\t</div>\n\n        <div class=\"{{css}}-rightbutton-container\" ba-show=\"{{stopvisible}}\">\n        \t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{stop()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"stop-primary-button\" class=\"{{css}}-button-primary {{mintimeindicator ? css + '-disabled': ''}}\"\n\t\t\t\t title=\"{{mintimeindicator ? string('stop-available-after').replace('%d', timeminlimit) : string('stop-tooltip')}}\"\n                 onclick=\"{{stop()}}\"\n                 onmouseenter=\"{{hover( mintimeindicator ? string('stop-available-after').replace('%d', timeminlimit) : string('stop-tooltip'))}}\"\n                 onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n        \t\t{{string('stop')}}\n        \t</div>\n        </div>\n\n\t\t<div class=\"{{css}}-rightbutton-container\" ba-show=\"{{pausable && !resumevisible && stopvisible}}\">\n\t\t\t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{pause()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"pause-primary-button\" class=\"{{css}}-button-primary\"\n\t\t\t\t title=\"{{string('pause-recorder')}}\"\n\t\t\t\t onclick=\"{{pause()}}\"\n\t\t\t\t onmouseenter=\"{{hover(string('pause-recorder'))}}\"\n\t\t\t\t onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n\t\t\t\t<i class=\"{{csscommon}}-icon-pause\"></i>\n\t\t\t</div>\n\t\t</div>\n\n\t\t<div class=\"{{css}}-rightbutton-container\" ba-show=\"{{pausable && resumevisible}}\">\n\t\t\t<div tabindex=\"0\"\n\t\t\t\t ba-hotkey:space^enter=\"{{resume()}}\" onmouseout=\"this.blur()\"\n\t\t\t\t data-selector=\"resume-primary-button\" class=\"{{css}}-button-primary\"\n\t\t\t\t title=\"{{string('resume-recorder')}}\"\n\t\t\t\t onclick=\"{{resume()}}\"\n\t\t\t\t onmouseenter=\"{{hover(string('resume-recorder'))}}\"\n\t\t\t\t onmouseleave=\"{{unhover()}}\"\n\t\t\t>\n\t\t\t\t<i class=\"{{csscommon}}-icon-ccw\"></i>\n\t\t\t</div>\n\t\t</div>\n\n\n\t</div>\n</div>\n",

                attrs: {
                    "css": "ba-audiorecorder",
                    "csscommon": "ba-commoncss",
                    "cssrecorder": "ba-recorder",
                    "hovermessage": "",
                    "recordingindication": true
                },

                create: function() {
                    this.auto_destroy(new Timer({
                        context: this,
                        fire: function() {
                            this.set("recordingindication", !this.get("recordingindication") && !this.__parent.__paused);
                        },
                        delay: 500
                    }));
                },

                functions: {
                    selectMicrophone: function(microphoneId) {
                        this.set("settingsopen", false); // Close microphoe selection after it was selected
                        this.trigger("select-microphone", microphoneId);
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
                    pause: function() {
                        this.trigger("invoke-pause");
                    },
                    resume: function() {
                        this.trigger("invoke-resume");
                    },
                    stop: function() {
                        this.trigger("invoke-stop");
                    },
                    cancel: function() {
                        this.trigger("invoke-cancel");
                    }
                }

            };
        })
        .register("ba-audiorecorder-controlbar")
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "settingsvisible && settingsopen": function (obj) { return obj.settingsvisible && obj.settingsopen; }, "microphones": function (obj) { return obj.microphones; }, "selectMicrophone(microphone.id)": function (obj) { return obj.selectMicrophone(obj.microphone.id); }, "selectedmicrophone == microphone.id": function (obj) { return obj.selectedmicrophone == obj.microphone.id; }, "microphone.label": function (obj) { return obj.microphone.label; }, "settingsvisible": function (obj) { return obj.settingsvisible; }, "settingsopen=!settingsopen": function (obj) { return obj.settingsopen=!obj.settingsopen; }, "settingsopen ? 'selected' : 'unselected'": function (obj) { return obj.settingsopen ? 'selected' : 'unselected'; }, "hover(string('settings'))": function (obj) { return obj.hover(obj.string('settings')); }, "unhover()": function (obj) { return obj.unhover(); }, "csscommon": function (obj) { return obj.csscommon; }, "hover(string(microphonehealthy ? 'microphonehealthy' : 'microphoneunhealthy'))": function (obj) { return obj.hover(obj.string(obj.microphonehealthy ? 'microphonehealthy' : 'microphoneunhealthy')); }, "microphonehealthy ? 'good' : 'bad'": function (obj) { return obj.microphonehealthy ? 'good' : 'bad'; }, "stopvisible && recordingindication": function (obj) { return obj.stopvisible && obj.recordingindication; }, "controlbarlabel": function (obj) { return obj.controlbarlabel; }, "recordvisible": function (obj) { return obj.recordvisible; }, "record()": function (obj) { return obj.record(); }, "hover(string('record-tooltip'))": function (obj) { return obj.hover(obj.string('record-tooltip')); }, "string('record')": function (obj) { return obj.string('record'); }, "rerecordvisible": function (obj) { return obj.rerecordvisible; }, "rerecord()": function (obj) { return obj.rerecord(); }, "hover(string('rerecord-tooltip'))": function (obj) { return obj.hover(obj.string('rerecord-tooltip')); }, "string('rerecord')": function (obj) { return obj.string('rerecord'); }, "cancelvisible": function (obj) { return obj.cancelvisible; }, "cancel()": function (obj) { return obj.cancel(); }, "hover(string('cancel-tooltip'))": function (obj) { return obj.hover(obj.string('cancel-tooltip')); }, "string('cancel')": function (obj) { return obj.string('cancel'); }, "stopvisible": function (obj) { return obj.stopvisible; }, "stop()": function (obj) { return obj.stop(); }, "mintimeindicator ? css + '-disabled': ''": function (obj) { return obj.mintimeindicator ? obj.css + '-disabled': ''; }, "mintimeindicator ? string('stop-available-after').replace('%d', timeminlimit) : string('stop-tooltip')": function (obj) { return obj.mintimeindicator ? obj.string('stop-available-after').replace('%d', obj.timeminlimit) : obj.string('stop-tooltip'); }, "hover( mintimeindicator ? string('stop-available-after').replace('%d', timeminlimit) : string('stop-tooltip'))": function (obj) { return obj.hover( obj.mintimeindicator ? obj.string('stop-available-after').replace('%d', obj.timeminlimit) : obj.string('stop-tooltip')); }, "string('stop')": function (obj) { return obj.string('stop'); }, "pausable && !resumevisible && stopvisible": function (obj) { return obj.pausable && !obj.resumevisible && obj.stopvisible; }, "pause()": function (obj) { return obj.pause(); }, "string('pause-recorder')": function (obj) { return obj.string('pause-recorder'); }, "hover(string('pause-recorder'))": function (obj) { return obj.hover(obj.string('pause-recorder')); }, "pausable && resumevisible": function (obj) { return obj.pausable && obj.resumevisible; }, "resume()": function (obj) { return obj.resume(); }, "string('resume-recorder')": function (obj) { return obj.string('resume-recorder'); }, "hover(string('resume-recorder'))": function (obj) { return obj.hover(obj.string('resume-recorder')); }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "settings": "Settings",
            "microphonehealthy": "Sound is good",
            "microphoneunhealthy": "Cannot pick up any sound",
            "record": "Record",
            "record-tooltip": "Click here to record.",
            "rerecord": "Redo",
            "rerecord-tooltip": "Click here to redo.",
            "stop": "Stop",
            "stop-tooltip": "Click here to stop.",
            "stop-available-after": "Minimum recording time is %d seconds",
            "cancel": "Cancel",
            "cancel-tooltip": "Click here to cancel.",
            "pause-recorder": "Pause Recorder",
            "resume-recorder": "Resume Recorder"
        });
});
Scoped.define("module:AudioRecorder.Dynamics.Loader", [
    "dynamics:Dynamic",
    "module:Assets"
], [
    "dynamics:Partials.ShowPartial"
], function(Class, Assets, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div class=\"{{cssrecorder}}-loader-container\">\n    <div data-selector=\"recorder-loader-block\" class=\"{{cssrecorder}}-loader-loader\" title=\"{{tooltip || ''}}\">\n    </div>\n</div>\n<div data-selector=\"recorder-loader-label-container\" class=\"{{cssrecorder}}-loader-label\" ba-show=\"{{label}}\">\n\t{{label}}\n</div>\n",

                attrs: {
                    "css": "ba-audiorecorder",
                    "tooltip": "",
                    "label": "",
                    "message": "",
                    "hovermessage": ""
                }

            };
        })
        .registerFunctions({
            /**/"cssrecorder": function (obj) { return obj.cssrecorder; }, "tooltip || ''": function (obj) { return obj.tooltip || ''; }, "label": function (obj) { return obj.label; }/**/
        })
        .register("ba-audiorecorder-loader")
        .attachStringTable(Assets.strings)
        .addStrings({});
});
Scoped.define("module:AudioRecorder.Dynamics.Message", [
    "dynamics:Dynamic"
], [
    "dynamics:Partials.ClickPartial"
], function(Class, Templates, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div data-selector=\"recorder-message-container\" class=\"{{css}}-message-container\" ba-click=\"{{click()}}\">\n    <div data-selector=\"recorder-message-block\" class='{{css}}-message-message'>\n        <p>\n            {{message || \"\"}}\n        </p>\n        <ul ba-if=\"{{links && links.length > 0}}\" ba-repeat=\"{{link :: links}}\">\n            <li>\n                <a href=\"javascript:;\" ba-click=\"{{linkClick(link)}}\">\n                    {{link.title}}\n                </a>\n            </li>\n        </ul>\n    </div>\n</div>\n",

                attrs: {
                    "css": "ba-audiorecorder",
                    "message": '',
                    "links": null
                },

                functions: {

                    click: function() {
                        this.trigger("click");
                    },

                    linkClick: function(link) {
                        this.trigger("link", link);
                    }

                }

            };
        })
        .registerFunctions({
            /**/"css": function (obj) { return obj.css; }, "click()": function (obj) { return obj.click(); }, "message || \"\"": function (obj) { return obj.message || ""; }, "links && links.length > 0": function (obj) { return obj.links && obj.links.length > 0; }, "links": function (obj) { return obj.links; }, "linkClick(link)": function (obj) { return obj.linkClick(obj.link); }, "link.title": function (obj) { return obj.link.title; }/**/
        })
        .register("ba-audiorecorder-message");
});
Scoped.define("module:AudioRecorder.Dynamics.Recorder", [
    "dynamics:Dynamic",
    "module:Assets",
    "module:AudioVisualization",
    "browser:Info",
    "browser:Dom",
    "browser:Upload.MultiUploader",
    "browser:Upload.FileUploader",
    "media:AudioRecorder.AudioRecorderWrapper",
    "media:WebRTC.Support",
    "base:Types",
    "base:Objs",
    "base:Strings",
    "base:Time",
    "base:Timers",
    "base:States.Host",
    "base:Classes.ClassRegistry",
    "base:Collections.Collection",
    "base:Promise",
    "module:AudioRecorder.Dynamics.RecorderStates.Initial",
    "module:AudioRecorder.Dynamics.RecorderStates"
], [
    "module:AudioRecorder.Dynamics.Loader",
    "module:AudioRecorder.Dynamics.Controlbar",
    "module:AudioRecorder.Dynamics.Message",
    "module:AudioRecorder.Dynamics.Chooser",
    "dynamics:Partials.ShowPartial",
    "dynamics:Partials.IfPartial",
    "dynamics:Partials.EventPartial",
    "dynamics:Partials.OnPartial",
    "dynamics:Partials.DataPartial",
    "dynamics:Partials.AttrsPartial",
    "dynamics:Partials.StylesPartial",
    "dynamics:Partials.TemplatePartial",
    "dynamics:Partials.HotkeyPartial"
], function(Class, Assets, AudioVisualization, Info, Dom, MultiUploader, FileUploader, AudioRecorderWrapper, WebRTCSupport, Types, Objs, Strings, Time, Timers, Host, ClassRegistry, Collection, Promise, InitialState, RecorderStates, scoped) {
    return Class.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "\n<div data-selector=\"audio-recorder-container\" ba-show=\"{{!player_active}}\"\n     class=\"{{css}}-container {{csstheme}} {{css}}-size-{{csssize}} {{iecss}}-{{ie8 ? 'ie8' : 'noie8'}}\n     \t{{cssrecorder}}-{{ firefox ? 'firefox' : 'common'}}-browser {{cssaudio}}\n    \t{{cssrecorder}}-{{themecolor}}-color\"\n     ba-styles=\"{{widthHeightStyles}}\"\n>\n\n\t<canvas data-selector=\"visualization-canvas\" class=\"{{css}}-visualization-canvas\"></canvas>\n    <audio tabindex=\"-1\" data-selector=\"recorder-status\" class=\"{{css}}-audio {{css}}-{{hasrecorder ? 'hasrecorder' : 'norecorder'}}\" data-audio=\"audio\" playsinline></audio>\n    <div data-selector=\"audio-recorder-overlay\" class='{{cssrecorder}}-overlay' ba-show=\"{{!hideoverlay}}\" data-overlay=\"overlay\">\n\t\t<ba-{{dynloader}}\n\t\t    ba-css=\"{{cssloader || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t\tba-cssrecorder=\"{{cssrecorder || css}}\"\n\t\t\tba-cssrecorder=\"{{cssrecorder || css}}\"\n\t\t    ba-template=\"{{tmplloader}}\"\n\t\t    ba-show=\"{{loader_active}}\"\n\t\t    ba-tooltip=\"{{loadertooltip}}\"\n\t\t\tba-hovermessage=\"{{=hovermessage}}\"\n\t\t    ba-label=\"{{loaderlabel}}\"\n\t\t></ba-{{dynloader}}>\n\n\t\t<ba-{{dynmessage}}\n\t\t    ba-css=\"{{cssmessage || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t\tba-cssrecorder=\"{{cssrecorder || css}}\"\n\t\t    ba-template=\"{{tmplmessage}}\"\n\t\t    ba-show=\"{{message_active}}\"\n\t\t    ba-message=\"{{message}}\"\n\t\t\tba-links=\"{{message_links}}\"\n\t\t    ba-event:click=\"message_click\"\n\t\t\tba-event:link=\"message_link_click\"\n\t\t></ba-{{dynmessage}}>\n\n\t\t<ba-{{dynchooser}}\n\t\t\tba-recordviafilecapture=\"{{recordviafilecapture}}\"\n\t\t    ba-css=\"{{csschooser || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t\tba-cssrecorder=\"{{cssrecorder || css}}\"\n\t\t    ba-template=\"{{tmplchooser}}\"\n\t\t    ba-if=\"{{chooser_active && !is_initial_state}}\"\n\t\t    ba-allowrecord=\"{{allowrecord}}\"\n\t\t    ba-allowupload=\"{{allowupload}}\"\n\t\t    ba-allowcustomupload=\"{{allowcustomupload}}\"\n\t\t    ba-allowedextensions=\"{{allowedextensions}}\"\n\t\t    ba-primaryrecord=\"{{primaryrecord}}\"\n\t\t    ba-timelimit=\"{{timelimit}}\"\n\t\t    ba-event:record=\"record_audio\"\n\t\t    ba-event:upload=\"upload_audio\"\n\t\t></ba-{{dynchooser}}>\n\n\t\t<ba-{{dyncontrolbar}}\n\t\t    ba-css=\"{{csscontrolbar || css}}\"\n\t\t\tba-csstheme=\"{{csstheme || css}}\"\n\t\t\tba-themecolor=\"{{themecolor}}\"\n\t\t\tba-cssrecorder=\"{{cssrecorder || css}}\"\n\t\t    ba-template=\"{{tmplcontrolbar}}\"\n\t\t    ba-show=\"{{controlbar_active}}\"\n\t\t    ba-microphones=\"{{microphones}}\"\n\t\t\tba-pausable=\"{{pausable}}\"\n\t\t\tba-resumevisible=\"{{resumevisible}}\"\n\t\t\tba-selectedmicrophone=\"{{selectedmicrophone || 0}}\"\n\t\t    ba-microphonehealthy=\"{{microphonehealthy}}\"\n\t\t    ba-hovermessage=\"{{=hovermessage}}\"\n\t\t    ba-settingsvisible=\"{{settingsvisible}}\"\n\t\t    ba-recordvisible=\"{{recordvisible}}\"\n\t\t\tba-cancelvisible=\"{{allowcancel && cancancel}}\"\n\t\t    ba-rerecordvisible=\"{{rerecordvisible}}\"\n\t\t    ba-stopvisible=\"{{stopvisible}}\"\n\t\t    ba-controlbarlabel=\"{{controlbarlabel}}\"\n\t\t\tba-mintimeindicator=\"{{mintimeindicator}}\"\n\t\t\tba-timeminlimit=\"{{timeminlimit}}\"\n\t\t    ba-event:select-microphone=\"select_microphone\"\n\t\t    ba-event:invoke-record=\"record\"\n\t\t    ba-event:invoke-rerecord=\"rerecord\"\n\t\t    ba-event:invoke-stop=\"stop\"\n\t\t\tba-event:invoke-pause=\"pause_recorder\"\n\t\t\tba-event:invoke-resume=\"resume\"\n\t\t></ba-{{dyncontrolbar}}>\n    </div>\n</div>\n\n<div data-selector=\"recorder-player\" ba-if=\"{{player_active}}\" ba-styles=\"{{widthHeightStyles}}\">\n\t<span ba-show=\"{{ie8}}\">&nbsp;</span>\n\t<ba-{{dynaudioplayer}}\n\t    ba-theme=\"{{theme || 'default'}}\"\n        ba-themecolor=\"{{themecolor}}\"\n        ba-source=\"{{playbacksource}}\"\n        ba-hideoninactivity=\"{{false}}\"\n\t\tba-visualeffectheight=\"{{visualeffectheight}}\"\n\t\tba-visualeffecttheme=\"{{visualeffecttheme}}\"\n        ba-attrs=\"{{playerattrs}}\"\n        ba-data:id=\"player\"\n        ba-width=\"{{width}}\"\n        ba-height=\"{{height}}\"\n        ba-totalduration=\"{{duration}}\"\n        ba-rerecordable=\"{{rerecordable && (recordings === null || recordings > 0)}}\"\n        ba-submittable=\"{{manualsubmit && verified}}\"\n        ba-reloadonplay=\"{{true}}\"\n        ba-autoplay=\"{{autoplay}}\"\n\t\tba-visualeffectvisible=\"{{visualeffectvisible}}\"\n\t\tba-event:loaded=\"ready_to_play\"\n        ba-event:rerecord=\"rerecord\"\n        ba-event:playing=\"playing\"\n        ba-event:paused=\"paused\"\n        ba-event:ended=\"ended\"\n        ba-event:submit=\"manual_submit\"\n\t>\n\t</ba-{{dynaudioplayer}}>\n</div>\n",

                attrs: {
                    /* CSS */
                    "css": "ba-videorecorder", // inherit from video recorder
                    "cssaudio": "ba-audiorecorder",
                    "cssrecorder": "ba-recorder",
                    "csscommon": "ba-commoncss",
                    "iecss": "ba-audiorecorder",
                    "cssimagegallery": "",
                    "cssloader": "",
                    "csscontrolbar": "",
                    "cssmessage": "",
                    "csstopmessage": "",
                    "csschooser": "",
                    "width": "",
                    "height": "",
                    "gallerysnapshots": 3,

                    /* Themes */
                    "theme": "",
                    "csstheme": "",

                    /* Dynamics */
                    "dynloader": "audiorecorder-loader",
                    "dyncontrolbar": "audiorecorder-controlbar",
                    "dynmessage": "audiorecorder-message",
                    "dynchooser": "audiorecorder-chooser",
                    "dynaudioplayer": "audioplayer",

                    /* Templates */
                    "tmplloader": "",
                    "tmplcontrolbar": "",
                    "tmplmessage": "",
                    "tmplchooser": "",

                    /* Attributes */
                    "autorecord": false,
                    "autoplay": false,
                    "allowrecord": true,
                    "allowupload": true,
                    "allowcustomupload": true,
                    "primaryrecord": true,
                    "countdown": 3,
                    "audiobitrate": null,
                    "playbacksource": "",
                    "recordermode": true,
                    "skipinitial": false,
                    "skipinitialonrerecord": false,
                    "timelimit": null,
                    "timeminlimit": null,
                    "webrtcstreaming": false,
                    "webrtconmobile": false,
                    "webrtcstreamingifnecessary": true,
                    "microphone-volume": 1.0,
                    "early-rerecord": false,
                    "manualsubmit": false,
                    "allowedextensions": null,
                    "filesizelimit": null,
                    "display-timer": true,
                    "pausable": false,
                    "visualeffectvisible": true,
                    "visualeffectsupported": false,
                    "visualeffectheight": null,
                    "visualeffectminheight": 120,
                    "visualeffecttheme": "red-bars", // types: `balloon`, 'red-bars'

                    /* Configuration */
                    "simulate": false,
                    "enforce-duration": null,
                    "localplayback": false,
                    "uploadoptions": {},
                    "playerattrs": {},
                    "shortMessage": true,

                    /* Options */
                    "rerecordable": true,
                    "allowcancel": false,
                    "recordings": null,
                    "ready": true,
                    "audio-test-mandatory": false

                },

                scopes: {
                    player: ">[id='player']"
                },

                computed: {
                    "widthHeightStyles:width,height": function() {
                        var result = {};
                        var width = this.get("width");
                        var height = this.get("height");
                        if (width)
                            result.width = width + ((width + '').match(/^\d+$/g) ? 'px' : '');
                        if (height)
                            result.height = height + ((height + '').match(/^\d+$/g) ? 'px' : '');
                        return result;
                    }
                },

                types: {
                    "rerecordable": "boolean",
                    "ready": "boolean",
                    "autorecord": "boolean",
                    "autoplay": "boolean",
                    "allowrecord": "boolean",
                    "allowupload": "boolean",
                    "allowcustomupload": "boolean",
                    "primaryrecord": "boolean",
                    "recordermode": "boolean",
                    "skipinitialonrerecord": "boolean",
                    "localplayback": "boolean",
                    "skipinitial": "boolean",
                    "pausable": "boolean",
                    "enforce-duration": "bool",
                    "webrtcstreaming": "boolean",
                    "webrtconmobile": "boolean",
                    "webrtcstreamingifnecessary": "boolean",
                    "microphone-volume": "float",
                    "audiobitrate": "int",
                    "early-rerecord": "boolean",
                    "manualsubmit": "boolean",
                    "simulate": "boolean",
                    "allowedextensions": "array",
                    "allowcancel": "boolean",
                    "display-timer": "boolean",
                    "audio-test-mandatory": "boolean",
                    "visualeffectvisible": "boolean"
                },

                extendables: ["states"],

                remove_on_destroy: true,

                events: {
                    "change:microphonehealthy": function(value) {
                        this.trigger("microphonehealth", value);
                    },
                    "change:webrtconmobile": function() {
                        this.set("recordviafilecapture", Info.isMobile() && (!this.get("webrtconmobile") || !AudioRecorderWrapper.anySupport(this._audioRecorderWrapperOptions())));
                    },
                    "change:recordviafilecapture": function() {
                        if (this.get("recordviafilecapture")) {
                            this.set("skipinitial", false);
                            this.set("skipinitialonrerecord", false);
                            this.set("autorecord", false);
                        }
                    },
                    "change:visualeffectsupported": function(supported) {
                        if (!supported && this.audioVisualization) this.audioVisualization.destroy();
                    }
                },

                create: function() {
                    // Initialize AudioContext
                    WebRTCSupport.globals();
                    if (this.get("theme")) this.set("theme", this.get("theme").toLowerCase());
                    if (this.get("theme") in Assets.recorderthemes) {
                        Objs.iter(Assets.recorderthemes[this.get("theme")], function(value, key) {
                            if (!this.isArgumentAttr(key))
                                this.set(key, value);
                        }, this);
                    }
                    this.set("ie8", Info.isInternetExplorer() && Info.internetExplorerVersion() < 9);
                    this.set("hideoverlay", false);

                    this.set("recordviafilecapture", Info.isMobile() && (!this.get("webrtconmobile") || !AudioRecorderWrapper.anySupport(this._audioRecorderWrapperOptions())));

                    if (this.get("recordviafilecapture")) {
                        this.set("skipinitial", false);
                        this.set("skipinitialonrerecord", false);
                        this.set("autorecord", false);
                    }

                    if (this.get("pausable"))
                        this.set("resumevisible", false);

                    this.__attachRequested = false;
                    this.__activated = false;
                    this._bound = false;
                    this.__recording = false;
                    this.__error = null;

                    this.host = new Host({
                        stateRegistry: new ClassRegistry(this.cls.recorderStates())
                    });
                    this.host.dynamic = this;
                    this.host.initialize(this._initialState);

                    this._timer = new Timers.Timer({
                        context: this,
                        fire: this._timerFire,
                        delay: 250,
                        start: true
                    });

                    this._initSettings();
                },

                getMediaType: function() {
                    return "audio";
                },

                getAudioFile: function() {
                    return this._audioFile || (this.recorder && this.recorder.localPlaybackSource()) || null;
                },

                _initialState: InitialState,

                state: function() {
                    return this.host.state();
                },

                recorderAttached: function() {
                    return !!this.recorder;
                },

                audioError: function() {
                    return this.__error;
                },

                _error: function(error_type, error_code) {
                    this.__error = {
                        error_type: error_type,
                        error_code: error_code
                    };
                    this.trigger("error:" + error_type, error_code);
                    this.trigger("error", error_type, error_code);
                },

                _clearError: function() {
                    this.__error = null;
                },

                _detachRecorder: function() {
                    if (this.recorder)
                        this.recorder.weakDestroy();
                    this.recorder = null;
                    this.set("hasrecorder", false);
                },

                _audioRecorderWrapperOptions: function() {
                    return {
                        simulate: this.get("simulate"),
                        audioBitrate: this.get("audiobitrate"),
                        webrtcStreaming: !!this.get("webrtcstreaming"),
                        webrtcStreamingIfNecessary: !!this.get("webrtcstreamingifnecessary"),
                        // webrtcOnMobile: !!this.get("webrtconmobile"),
                        localPlaybackRequested: this.get("localplayback")
                    };
                },

                _attachRecorder: function() {
                    if (this.recorderAttached())
                        return;
                    if (!this.__activated) {
                        this.__attachRequested = true;
                        return;
                    }
                    this.set("hasrecorder", true);
                    this.__attachRequested = false;
                    var audio = this.activeElement().querySelector("[data-audio='audio']");
                    this._clearError();
                    this.recorder = AudioRecorderWrapper.create(Objs.extend({
                        element: audio
                    }, this._audioRecorderWrapperOptions()));
                    // Draw visualization effect for the audio player
                    // if (this.get("visualeffectvisible") && AudioVisualization.supported()) {
                    //     this.audioVisualization = new AudioVisualization(audio, {
                    //         recorder: this.recorder,
                    //         globalAudioContext: WebRTCSupport.globals().audioContext,
                    //         height: this.recorder._recorder._options.recordResolution.height || 120,
                    //         element: this.activeElement()
                    //     });
                    // }
                    if (this.recorder) {
                        this.trigger("attached");
                        this.set("pausable", this.get("pausable") && this.recorder.canPause());
                    } else {
                        this._error("attach");
                    }
                },

                _softwareDependencies: function() {
                    if (!this.recorderAttached() || !this.recorder)
                        return Promise.error("No recorder attached.");
                    return this.recorder.softwareDependencies();
                },

                _bindMedia: function() {
                    if (this._bound || !this.recorderAttached() || !this.recorder)
                        return;
                    this.recorder.ready.success(function() {
                        this.recorder.on("require_display", function() {
                            this.set("hideoverlay", true);
                        }, this);
                        this.recorder.bindMedia().error(function(e) {
                            this.trigger("access_forbidden", e);
                            this.set("hideoverlay", false);
                            this.off("require_display", null, this);
                            this._error("bind", e);
                        }, this).success(function() {
                            this.trigger("access_granted");
                            this.recorder.setVolumeGain(this.get("microphone-volume"));
                            this.set("hideoverlay", false);
                            this.off("require_display", null, this);
                            // Draw visualization effect for the audio player
                            if (this.get("visualeffectvisible") && AudioVisualization.supported()) {
                                if (this.get("height") && this.get("height") > this.get("visualeffectminheight")) {
                                    this.set('visualeffectheight', this.get("height"));
                                } else if (this.get("visualeffectheight") < this.get("visualeffectminheight")) {
                                    this.set('visualeffectheight', this.get("visualeffectminheight"));
                                }
                                this.audioVisualization = new AudioVisualization(this.recorder._recorder.stream(), {
                                    element: this.activeElement(),
                                    recorder: this.recorder,
                                    height: this.get("visualeffectheight"),
                                    theme: this.get("visualeffecttheme")
                                });
                                // To be able set width of the canvas element
                                var waitAnalyser = new Timers.Timer({
                                    context: this,
                                    immediate: true,
                                    delay: 50,
                                    fire: function() {
                                        if (this.recorder._analyser) {
                                            try {
                                                this.audioVisualization.initializeVisualEffect();
                                                this.audioVisualization.start();
                                                this.set("visualeffectsupported", true);
                                            } catch (ex) {
                                                this.set("visualeffectsupported", false);
                                                console.warn(ex);
                                            }
                                            waitAnalyser.stop();
                                        }
                                    }
                                });
                                this.auto_destroy(waitAnalyser);
                            }
                            this.recorder.enumerateDevices().success(function(devices) {
                                var selected = this.recorder.currentDevices();
                                this.set("selectedmicrophone", selected.audio);
                                this.set("microphones", new Collection(Objs.values(devices.audio)));
                            }, this);
                            this.recorder.testSoundLevel(true);
                            this.set("devicetesting", true);
                            this._bound = true;
                            this.trigger("bound");
                        }, this);
                    }, this);
                },

                isWebrtcStreaming: function() {
                    return this.recorder && this.recorder.isWebrtcStreaming();
                },

                isFormatSupported: function() {
                    return (this.recorder && this.recorder.supportsLocalPlayback()) || this._audioFilePlaybackable;
                },

                _initSettings: function() {
                    this.set("duration", 0);
                },

                _initializeUploader: function() {
                    if (this._audioUploader) this._audioUploader.weakDestroy();
                    if (this._dataUploader) this._dataUploader.weakDestroy();
                    this._dataUploader = new MultiUploader();
                },

                _unbindMedia: function() {
                    if (!this._bound)
                        return;
                    this.recorder.unbindMedia();
                    this._bound = false;
                },

                _uploadAudioFile: function(file) {
                    if (this.get("simulate"))
                        return;
                    var uploader = FileUploader.create(Objs.extend({
                        source: file
                    }, this.get("uploadoptions").audio));
                    uploader.upload();
                    this._audioUploader = uploader;
                    this._dataUploader.addUploader(uploader);
                },

                _prepareRecording: function() {
                    return Promise.create(true);
                },

                _startRecording: function() {
                    if (this.__recording)
                        return Promise.error(true);
                    this.set("devicetesting", false);
                    return this.recorder.startRecord({
                        audio: this.get("uploadoptions").audio,
                        webrtcStreaming: this.get("uploadoptions").webrtcStreaming
                    }).success(function() {
                        this.__recording = true;
                        this.__recording_start_time = Time.now();
                    }, this);
                },

                _stopRecording: function() {
                    if (!this.__recording)
                        return Promise.error(true);
                    if (this.audioVisualization) this.audioVisualization.stop();
                    return this.recorder.stopRecord({
                        audio: this.get("uploadoptions").audio,
                        webrtcStreaming: this.get("uploadoptions").webrtcStreaming,
                        noUploading: this.get("uploadoptions").noUploading
                    }).success(function(uploader) {
                        this.__recording = false;
                        uploader.upload();
                        this._dataUploader.addUploader(uploader);
                    }, this);
                },

                isRecording: function() {
                    return this.__recording;
                },

                _verifyRecording: function() {
                    return Promise.create(true);
                },

                _afterActivate: function(element) {
                    inherited._afterActivate.call(this, element);
                    this.__activated = true;
                    if (this.__attachRequested)
                        this._attachRecorder();
                    this.persistentTrigger("loaded");
                },

                object_functions: [
                    "record", "rerecord", "stop", "play", "pause", "reset", "pause_recorder", "resume"
                ],

                functions: {

                    cancel: function() {
                        if (confirm(this.stringUnicode("cancel-confirm")))
                            this.execute("reset");
                    },

                    record: function() {
                        this.host.state().record();
                    },

                    record_audio: function() {
                        this.host.state().selectRecord();
                    },

                    upload_audio: function(file) {
                        this.host.state().selectUpload(file);
                    },

                    select_microphone: function(microphone_id) {
                        if (this.recorder) {
                            this.recorder.setCurrentDevices({
                                audio: microphone_id
                            });
                            this.recorder.testSoundLevel(true);
                            this.set("selectedmicrophone", microphone_id);
                            if (this.audioVisualization) {
                                this.recorder._recorder.on("bound", function() {
                                    this.audioVisualization.updateSourceStream();
                                }, this);
                            }
                        }
                        this.set("microphonehealthy", false);
                    },

                    rerecord: function() {
                        if (confirm(this.stringUnicode("rerecord-confirm"))) {
                            this.host.state().rerecord();
                            this._initSettings();
                        }
                    },

                    stop: function() {
                        // If recorder is paused need resume first,
                        // setting this._recording to true also could be enough
                        if (this.__paused)
                            this._resume();
                        this.host.state().stop();
                    },

                    pause_recorder: function() {
                        if (typeof this.recorder !== 'undefined') {
                            this.recorder.pauseRecord();
                            this.recorder._recorder.once("paused", function() {
                                this.__paused = true;
                                this.__recording = false;
                                this.set("resumevisible", true);
                            }, this);
                        }
                    },

                    resume: function() {
                        if (typeof this.recorder !== 'undefined')
                            this._resume();
                    },

                    play: function() {
                        this.host.state().play();
                    },

                    pause: function() {
                        this.host.state().pause();
                    },

                    message_click: function() {
                        this.trigger("message-click");
                    },

                    message_link_click: function(link) {
                        this.trigger("message-link-click", link);
                    },

                    playing: function() {
                        this.trigger("playing");
                    },

                    paused: function() {
                        this.trigger("paused");
                    },

                    ended: function() {
                        this.trigger("ended");
                    },

                    reset: function() {
                        this._stopRecording().callback(function() {
                            this._unbindMedia();
                            this._detachRecorder();
                            this._initSettings();
                            this.host.state().next("Initial");
                        }, this);
                    },

                    manual_submit: function() {
                        this.set("rerecordable", false);
                        this.set("manualsubmit", false);
                        this.trigger("manually_submitted");
                    },

                    ready_to_play: function() {
                        this.trigger("ready_to_play");
                    }

                },

                _resume: function() {
                    this.__paused = false;
                    this.__recording = true;
                    this.recorder.resumeRecord();
                    this.recorder._recorder.once("resumed", function() {
                        this.set("resumevisible", false);
                    }, this);
                },

                destroy: function() {
                    this._timer.destroy();
                    this.host.destroy();
                    this._detachRecorder();
                    inherited.destroy.call(this);
                },

                soundLevel: function() {
                    return this.recorderAttached() ? this.recorder.soundLevel() : null;
                },

                _timerFire: function() {
                    if (this.destroyed())
                        return;
                    try {
                        if (this.recorderAttached() && this.get("devicetesting")) {
                            if (!this.get("microphonehealthy") && this.soundLevel() >= 1.01) {
                                this.set("microphonehealthy", true);
                                this.recorder.testSoundLevel(false);
                            }
                        }
                    } catch (e) {}

                    this._updateCSSSize();
                },

                _updateCSSSize: function() {
                    var width = Dom.elementDimensions(this.activeElement()).width;
                    this.set("csssize", width > 400 ? "normal" : (width > 300 ? "medium" : "small"));
                },

                parentWidth: function() {
                    return this.get("width") || Dom.elementDimensions(this.activeElement()).width;
                },

                parentHeight: function() {
                    return this.get("height") || Dom.elementDimensions(this.activeElement()).height;
                },

                parentAspectRatio: function() {
                    return this.parentWidth() / this.parentHeight();
                }

            };
        }, {

            recorderStates: function() {
                return [RecorderStates];
            }

        })
        .register("ba-audiorecorder")
        .registerFunctions({
            /**/"!player_active": function (obj) { return !obj.player_active; }, "css": function (obj) { return obj.css; }, "csstheme": function (obj) { return obj.csstheme; }, "csssize": function (obj) { return obj.csssize; }, "iecss": function (obj) { return obj.iecss; }, "ie8 ? 'ie8' : 'noie8'": function (obj) { return obj.ie8 ? 'ie8' : 'noie8'; }, "cssrecorder": function (obj) { return obj.cssrecorder; }, "firefox ? 'firefox' : 'common'": function (obj) { return obj.firefox ? 'firefox' : 'common'; }, "cssaudio": function (obj) { return obj.cssaudio; }, "themecolor": function (obj) { return obj.themecolor; }, "widthHeightStyles": function (obj) { return obj.widthHeightStyles; }, "hasrecorder ? 'hasrecorder' : 'norecorder'": function (obj) { return obj.hasrecorder ? 'hasrecorder' : 'norecorder'; }, "!hideoverlay": function (obj) { return !obj.hideoverlay; }, "dynloader": function (obj) { return obj.dynloader; }, "cssloader || css": function (obj) { return obj.cssloader || obj.css; }, "cssrecorder || css": function (obj) { return obj.cssrecorder || obj.css; }, "tmplloader": function (obj) { return obj.tmplloader; }, "loader_active": function (obj) { return obj.loader_active; }, "loadertooltip": function (obj) { return obj.loadertooltip; }, "hovermessage": function (obj) { return obj.hovermessage; }, "loaderlabel": function (obj) { return obj.loaderlabel; }, "dynmessage": function (obj) { return obj.dynmessage; }, "cssmessage || css": function (obj) { return obj.cssmessage || obj.css; }, "tmplmessage": function (obj) { return obj.tmplmessage; }, "message_active": function (obj) { return obj.message_active; }, "message": function (obj) { return obj.message; }, "message_links": function (obj) { return obj.message_links; }, "dynchooser": function (obj) { return obj.dynchooser; }, "recordviafilecapture": function (obj) { return obj.recordviafilecapture; }, "csschooser || css": function (obj) { return obj.csschooser || obj.css; }, "tmplchooser": function (obj) { return obj.tmplchooser; }, "chooser_active && !is_initial_state": function (obj) { return obj.chooser_active && !obj.is_initial_state; }, "allowrecord": function (obj) { return obj.allowrecord; }, "allowupload": function (obj) { return obj.allowupload; }, "allowcustomupload": function (obj) { return obj.allowcustomupload; }, "allowedextensions": function (obj) { return obj.allowedextensions; }, "primaryrecord": function (obj) { return obj.primaryrecord; }, "timelimit": function (obj) { return obj.timelimit; }, "dyncontrolbar": function (obj) { return obj.dyncontrolbar; }, "csscontrolbar || css": function (obj) { return obj.csscontrolbar || obj.css; }, "csstheme || css": function (obj) { return obj.csstheme || obj.css; }, "tmplcontrolbar": function (obj) { return obj.tmplcontrolbar; }, "controlbar_active": function (obj) { return obj.controlbar_active; }, "microphones": function (obj) { return obj.microphones; }, "pausable": function (obj) { return obj.pausable; }, "resumevisible": function (obj) { return obj.resumevisible; }, "selectedmicrophone || 0": function (obj) { return obj.selectedmicrophone || 0; }, "microphonehealthy": function (obj) { return obj.microphonehealthy; }, "settingsvisible": function (obj) { return obj.settingsvisible; }, "recordvisible": function (obj) { return obj.recordvisible; }, "allowcancel && cancancel": function (obj) { return obj.allowcancel && obj.cancancel; }, "rerecordvisible": function (obj) { return obj.rerecordvisible; }, "stopvisible": function (obj) { return obj.stopvisible; }, "controlbarlabel": function (obj) { return obj.controlbarlabel; }, "mintimeindicator": function (obj) { return obj.mintimeindicator; }, "timeminlimit": function (obj) { return obj.timeminlimit; }, "player_active": function (obj) { return obj.player_active; }, "ie8": function (obj) { return obj.ie8; }, "dynaudioplayer": function (obj) { return obj.dynaudioplayer; }, "theme || 'default'": function (obj) { return obj.theme || 'default'; }, "playbacksource": function (obj) { return obj.playbacksource; }, "false": function (obj) { return false; }, "visualeffectheight": function (obj) { return obj.visualeffectheight; }, "visualeffecttheme": function (obj) { return obj.visualeffecttheme; }, "playerattrs": function (obj) { return obj.playerattrs; }, "width": function (obj) { return obj.width; }, "height": function (obj) { return obj.height; }, "duration": function (obj) { return obj.duration; }, "rerecordable && (recordings === null || recordings > 0)": function (obj) { return obj.rerecordable && (obj.recordings === null || obj.recordings > 0); }, "manualsubmit && verified": function (obj) { return obj.manualsubmit && obj.verified; }, "true": function (obj) { return true; }, "autoplay": function (obj) { return obj.autoplay; }, "visualeffectvisible": function (obj) { return obj.visualeffectvisible; }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "recorder-error": "An error occurred, please try again later. Click to retry.",
            "attach-error": "We could not access the media interface. Depending on the device and browser, you might need to access the page via SSL.",
            "software-required": "Please click below to install / activate the following requirements in order to proceed.",
            "software-waiting": "Waiting for the requirements to be installed / activated. You might need to refresh the page after completion.",
            "access-forbidden": "Access to the media was forbidden. Click to retry.",
            "uploading": "Uploading",
            "uploading-failed": "Uploading failed - click here to retry.",
            "upload-error-duration": "Length of the uploaded audio does not meet the requirements - click here to retry.",
            "verifying": "Verifying",
            "verifying-failed": "Verifying failed - click here to retry.",
            "rerecord-confirm": "Do you really want to redo your audio?",
            "cancel-confirm": "Do you really want to cancel your audio upload?",
            "audio_file_too_large": "Your audio file is too large (%s) - click here to try again with a smaller audio file.",
            "unsupported_audio_type": "Please upload: %s - click here to retry.",
            "uploading-src-error": "Unable to play back audio now, uploading is still in progress",
            "missing-track": "Required audio track is missing",
            "device-already-in-use": "At least one of your input devices are already in use",
            "browser-permission-denied": "Permission denied by browser, please grant access and reload page"
        });
});
Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.State", [
    "base:States.State",
    "base:Events.ListenMixin",
    "base:Objs"
], function(State, ListenMixin, Objs, scoped) {
    return State.extend({
        scoped: scoped
    }, [ListenMixin, {

        dynamics: [],

        _start: function() {
            this.dyn = this.host.dynamic;
            Objs.iter(Objs.extend({
                "message": false,
                "chooser": false,
                "controlbar": false,
                "loader": false
            }, Objs.objectify(this.dynamics)), function(value, key) {
                this.dyn.set(key + "_active", value);
            }, this);
            this.dyn.set("message_links", null);
            this.dyn._accessing_microphone = false;
            this._started();
        },

        _started: function() {},

        record: function() {
            this.dyn.set("autorecord", true);
        },

        stop: function() {
            this.dyn.scopes.player.execute('stop');
        },

        play: function() {
            this.dyn.scopes.player.execute('play');
        },

        pause: function() {
            this.dyn.scopes.player.execute('pause');
        },

        rerecord: function() {},

        selectRecord: function() {},

        selectUpload: function(file) {}

    }]);
});



Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.FatalError", [
    "module:AudioRecorder.Dynamics.RecorderStates.State",
    "browser:Info",
    "base:Timers.Timer"
], function(State, Info, Timer, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],
        _locals: ["message", "retry"],

        _started: function() {
            this.dyn.set("message", this._message || this.dyn.string("recorder-error"));
            this.dyn.set("shortMessage", this.dyn.get("message").length < 30);
            this.listenOn(this.dyn, "message-click", function() {
                if (this._retry)
                    this.next(this._retry);
            });
        }

    });
});


Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.Initial", [
    "module:AudioRecorder.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        _started: function() {
            this.dyn.set("is_initial_state", true);
            this.dyn.set("verified", false);
            this.dyn.set("playbacksource", null);
            this.dyn.set("player_active", false);
            this.dyn._audioFileName = null;
            this.dyn._audioFile = null;
            this.dyn._audioFilePlaybackable = false;
            this.dyn._initializeUploader();
            if (!this.dyn.get("recordermode")) {
                if (!this.dyn.get("audio")) {
                    console.warn("recordermode:false requires an existing audio to be present and provided.");
                    this.dyn.set("recordermode", true);
                } else
                    this.next("Player");
            } else if (this.dyn.get("autorecord") || this.dyn.get("skipinitial"))
                this.eventualNext("RequiredSoftwareCheck");
            else
                this.next("Chooser");
        },

        _end: function() {
            this.dyn.set("is_initial_state", false);
        }

    });
});


Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.Player", [
    "module:AudioRecorder.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        rerecord: function() {
            this.dyn.trigger("rerecord");
            this.dyn.set("recordermode", true);
            this.next("Initial");
        },

        _started: function() {
            this.dyn.set("player_active", true);
        },

        _end: function() {
            this.dyn.set("player_active", false);
        }

    });
});


Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.Chooser", [
    "module:AudioRecorder.Dynamics.RecorderStates.State",
    "base:Strings",
    "browser:Info",
    "media:Player.Support"
], function(State, Strings, Info, PlayerSupport, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["chooser"],

        record: function() {
            this.dyn.set("autorecord", true);
            this.selectRecord();
        },

        selectRecord: function() {
            this.dyn.set("record_media", "microphone");
            this.next("RequiredSoftwareCheck");
        },

        selectUpload: function(file) {
            if (!(Info.isMobile() && Info.isAndroid() && Info.isCordova())) {
                if (this.dyn.get("allowedextensions")) {
                    var filename = (file.files[0].name || "").toLowerCase();
                    var found = false;
                    this.dyn.get("allowedextensions").forEach(function(extension) {
                        if (Strings.ends_with(filename, "." + extension.toLowerCase()))
                            found = true;
                    }, this);
                    if (!found) {
                        this.next("FatalError", {
                            message: this.dyn.string("unsupported_audio_type").replace("%s", this.dyn.get("allowedextensions").join(" / ")),
                            retry: "Chooser"
                        });
                        return;
                    }
                }
                if (this.dyn.get("filesizelimit") && file.files && file.files.length > 0 && file.files[0].size && file.files[0].size > this.dyn.get("filesizelimit")) {
                    var fact = "KB";
                    var size = Math.round(file.files[0].size / 1000);
                    var limit = Math.round(this.dyn.get("filesizelimit") / 1000);
                    if (size > 999) {
                        fact = "MB";
                        size = Math.round(size / 1000);
                        limit = Math.round(limit / 1000);
                    }
                    this.next("FatalError", {
                        message: this.dyn.string("audio_file_too_large").replace("%s", size + fact + " / " + limit + fact),
                        retry: "Chooser"
                    });
                    return;
                }
            }
            try {
                PlayerSupport.audioFileInfo(file.files[0]).success(function(data) {
                    if (data.duration && this.dyn.get("enforce-duration")) {
                        if ((this.dyn.get("timeminlimit") && data.duration < this.dyn.get("timeminlimit")) || (this.dyn.get("timelimit") && data.duration > this.dyn.get("timelimit"))) {
                            this.next("FatalError", {
                                message: this.dyn.string("upload-error-duration"),
                                retry: "Chooser"
                            });
                            return;
                        }
                    }
                    this.dyn._audioFilePlaybackable = true;
                    this.dyn.set("duration", data.duration);
                    this._uploadFile(file);
                }, this).error(function(e) {
                    if (e.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                        if (this.dyn.get("localplayback")) {
                            this.dyn.set("localplayback", false);
                            this.dyn.set("was_localplayback", true);
                        }
                        this.dyn.set("media_src_not_supported", true);
                    }

                    this._uploadFile(file);
                }, this);
            } catch (e) {
                this._uploadFile(file);
            }
        },

        _uploadFile: function(file) {
            this.dyn.set("creation-type", Info.isMobile() ? "mobile" : "upload");
            try {
                this.dyn._audioFileName = file.files[0].name;
                this.dyn._audioFile = file.files[0];
            } catch (e) {}
            this.dyn._prepareRecording().success(function() {
                this.dyn.trigger("upload_selected", file);
                this.dyn._uploadAudioFile(file);
                this._setValueToEmpty(file);
                this.next("Uploading");
            }, this).error(function(s) {
                this._setValueToEmpty(file);
                this.next("FatalError", {
                    message: s,
                    retry: "Chooser"
                });
            }, this);
        },

        /**
         * Try to fix twice file upload behaviour, (on change event won't be executed twice with the same file)
         * Don't set null to value, will not solve an issue
         * @param {HTMLInputElement} file
         */
        _setValueToEmpty: function(file) {
            try {
                file.value = '';
            } catch (e) {}
        }

    });
});


Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.RequiredSoftwareCheck", [
    "module:AudioRecorder.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            this.dyn.set("settingsvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("skipvisible", false);
            this.dyn.set("controlbarlabel", "");
            this.dyn.set("loaderlabel", "");
            this.listenOn(this.dyn, "error", function(s) {
                this.next("FatalError", {
                    message: this.dyn.string("attach-error"),
                    retry: "Initial"
                });
            }, this);
            this.dyn._attachRecorder();
            if (this.dyn) {
                this.dyn.on("message-link-click", function(link) {
                    link.execute();
                    this.next("RequiredSoftwareWait");
                }, this);
                this.dyn._softwareDependencies().error(function(dependencies) {
                    this.dyn.set("message_links", dependencies);
                    this.dyn.set("loader_active", false);
                    this.dyn.set("message_active", true);
                    this.dyn.set("message", this.dyn.string("software-required"));
                }, this).success(function() {
                    this.next("MicrophoneAccess");
                }, this);
            }
        }

    });
});


Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.RequiredSoftwareWait", [
    "module:AudioRecorder.Dynamics.RecorderStates.State",
    "base:Promise",
    "browser:Dom"
], function(State, Promise, Dom, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["message"],

        _started: function() {
            this.dyn.set("settingsvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("controlbarlabel", "");
            this.dyn.set("loaderlabel", "");
            this.dyn.set("message", this.dyn.string("software-waiting"));
            Promise.resilience(function() {
                if (Dom.isTabHidden())
                    return Promise.error("Not ready");
                return this.dyn._softwareDependencies();
            }, this, 120, [], 1000).success(function() {
                this.next("MicrophoneAccess");
            }, this).error(function() {
                this.next("RequiredSoftwareCheck");
            }, this);
            this.dyn.on("message-click", function() {
                this.next("RequiredSoftwareCheck");
            }, this);
        }

    });
});



Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.MicrophoneAccess", [
    "module:AudioRecorder.Dynamics.RecorderStates.State",
    "base:Timers.Timer"
], function(State, Timer, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],

        _started: function() {
            this.dyn.set("settingsvisible", true);
            this.dyn.set("recordvisible", true);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("controlbarlabel", "");
            this.dyn.set("loaderlabel", "");
            this.listenOn(this.dyn, "bound", function() {
                this.dyn.set("creation-type", "webrtc");
                this.next("MicrophoneHasAccess");
            }, this);
            this.listenOn(this.dyn, "error", function(s) {
                this.next("FatalError", {
                    message: this.dyn.string("attach-error"),
                    retry: "Initial"
                });
            }, this);
            this.listenOn(this.dyn, "access_forbidden", function() {
                this.next("FatalError", {
                    message: this.dyn.string("access-forbidden"),
                    retry: "Initial"
                });
            }, this);
            this.dyn._bindMedia();
        }

    });
});


Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.MicrophoneHasAccess", [
    "module:AudioRecorder.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["controlbar"],

        _started: function() {
            this.dyn.trigger("ready_to_record");
            this._preparePromise = null;
            if (this.dyn.get("countdown") > 0 && this.dyn.recorder && this.dyn.recorder.recordDelay(this.dyn.get("uploadoptions")) > this.dyn.get("countdown") * 1000)
                this._preparePromise = this.dyn._prepareRecording();
            if (this.dyn.get("pausable"))
                this.dyn.set("pausable", this.dyn.recorder.canPause());
            this.dyn.set("hovermessage", "");
            this.dyn.set("settingsvisible", true);
            this.dyn.set("recordvisible", true);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("controlbarlabel", "");
            if (this.dyn.get("autorecord"))
                this.next("RecordPrepare", {
                    preparePromise: this._preparePromise
                });
        },

        record: function() {
            if (this.dyn.get("autorecord"))
                return;
            if (this.dyn.get("audio-test-mandatory") && !this.dyn.get("microphonehealthy") && !this._preparePromise)
                return;
            this.next("RecordPrepare", {
                preparePromise: this._preparePromise
            });
        }

    });
});


Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.RecordPrepare", [
    "module:AudioRecorder.Dynamics.RecorderStates.State",
    "base:Timers.Timer",
    "base:Time"
], function(State, Timer, Time, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader"],
        _locals: ["preparePromise"],

        _started: function() {
            this.dyn.set("message", "");
            this.dyn.set("loaderlabel", "");
            var startedRecording = false;
            this.dyn._accessing_microphone = true;
            this._preparePromise = this._preparePromise || this.dyn._prepareRecording();
            var countdown = this.dyn.get("countdown") ? this.dyn.get("countdown") * 1000 : 0;
            var delay = this.dyn.recorder.recordDelay(this.dyn.get("uploadoptions")) || 0;
            if (countdown) {
                var displayDenominator = 1000;
                var silentTime = 0;
                var startTime = Time.now();
                var endTime = startTime + Math.max(delay, countdown);
                if (delay > countdown) {
                    silentTime = Math.min(500, delay - countdown);
                    displayDenominator = (delay - silentTime) / countdown * 1000;
                } else
                    this.dyn.set("loaderlabel", this.dyn.get("countdown"));
                var timer = new Timer({
                    context: this,
                    delay: 50,
                    fire: function() {
                        var now = Time.now();
                        var time_left = Math.max(0, endTime - now);
                        if (now > silentTime + startTime) {
                            this.dyn.set("loaderlabel", "" + Math.ceil((time_left - silentTime) / displayDenominator));
                            this.dyn.trigger("countdown", Math.round((time_left - silentTime) / displayDenominator * 1000));
                        }
                        if (endTime <= now) {
                            this.dyn.set("loaderlabel", "");
                            timer.stop();
                        }
                        if ((time_left <= delay) && !startedRecording) {
                            startedRecording = true;
                            this._startRecording();
                        }
                    }
                });
                this.auto_destroy(timer);
            } else
                this._startRecording();
        },

        record: function() {
            this._startRecording();
        },

        _startRecording: function() {
            this._preparePromise.success(function() {
                this.dyn._startRecording().success(function() {
                    this.next("Recording");
                }, this).error(function(s) {
                    this.next("FatalError", {
                        message: s,
                        retry: "RequiredSoftwareCheck"
                    });
                }, this);
            }, this).error(function(s) {
                this.next("FatalError", {
                    message: s,
                    retry: "RequiredSoftwareCheck"
                });
            }, this);
        }

    });
});


Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.Recording", [
    "module:AudioRecorder.Dynamics.RecorderStates.State",
    "base:Timers.Timer",
    "base:Time",
    "base:TimeFormat",
    "base:Async",
    "browser:Info"
], function(State, Timer, Time, TimeFormat, Async, Info, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["controlbar"],

        _started: function() {
            this.dyn.set("hovermessage", "");
            this.dyn.set("topmessage", "");
            this.dyn._accessing_microphone = true;
            this.dyn.trigger("recording");
            this.dyn.set("settingsvisible", false);
            this.dyn.set("rerecordvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn.set("stopvisible", true);

            this._startTime = Time.now();
            this._stopping = false;
            this.__firedTimes = 0;
            this.__pauseDelta = 0;
            this.__timerDelay = 10;
            this._timer = this.auto_destroy(new Timer({
                immediate: true,
                delay: this.__timerDelay,
                context: this,
                fire: this._timerFire
            }));
        },

        _timerFire: function() {
            this.__firedTimes += 1;
            var limit = this.dyn.get("timelimit");
            var current = Time.now() - this.__pauseDelta;
            var display = Math.max(0, limit ? (this._startTime + limit * 1000 - current) : (current - this._startTime));
            this.dyn.trigger("recording_progress", current - this._startTime, !!this.dyn.__paused);
            this.dyn.set("controlbarlabel", this.dyn.get("display-timer") ? TimeFormat.format(TimeFormat.ELAPSED_MINUTES_SECONDS, display) : "");

            // If recorder paused will slips starting second
            if (this.dyn.__paused)
                this.__pauseDelta += this.__timerDelay;

            if (this.dyn.get("timeminlimit"))
                this.dyn.set("mintimeindicator", (Time.now() - this._startTime) / 1000 <= this.dyn.get("timeminlimit"));

            if (limit && this._startTime + limit * 1000 <= current) {
                this._timer.stop();
                this.stop();
            }
        },

        stop: function() {
            var minlimit = this.dyn.get("timeminlimit");
            if (minlimit) {
                var delta = (Time.now() - this._startTime - this.__pauseDelta) / 1000;
                if (delta < minlimit) {
                    var limit = this.dyn.get("timelimit");
                    if (!limit || limit > delta)
                        return;
                }
            }
            if (this._stopping)
                return;
            this.dyn.set("loader_active", true);
            this.dyn.set("controlbar_active", false);
            this.dyn.set("message_active", true);
            this.dyn.set("message", "");
            this._stopping = true;
            Async.eventually(function() {
                this.dyn._stopRecording().success(function() {
                    this._hasStopped();
                    this.next("Uploading");
                }, this).error(function(s) {
                    this.next("FatalError", {
                        message: s,
                        retry: "RequiredSoftwareCheck"
                    });
                }, this);
            }, this);
        },

        _hasStopped: function() {
            this.dyn.set("duration", (Time.now() - this._startTime - this.__pauseDelta) / 1000);
            this.dyn._unbindMedia();
            this.dyn.trigger("recording_stopped");
        }
    });
});


Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.Uploading", [
    "module:AudioRecorder.Dynamics.RecorderStates.State",
    "base:Time",
    "base:Async",
    "base:Objs"
], function(State, Time, Async, Objs, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader", "message"],

        _started: function() {
            this.dyn.set("cancancel", true);
            this.dyn.set("skipinitial", this.dyn.get("skipinitial") || this.dyn.get("skipinitialonrerecord"));
            this.dyn.set("settingsvisible", false);
            this.dyn.set("recordvisible", false);
            this.dyn.set("stopvisible", false);
            this.dyn.set("loadlabel", "");
            this.dyn.set("controlbarlabel", "");
            this.dyn.trigger("uploading");
            this.dyn.set("rerecordvisible", this.dyn.get("early-rerecord"));
            if (this.dyn.get("media_src_not_supported") && this.dyn.get("was_localplayback")) {
                this.dyn.set("uploading-message", this.dyn.string("uploading-src-error"));
            } else {
                this.dyn.set("uploading-message", this.dyn.string("uploading"));
            }
            if (this.dyn.get("early-rerecord"))
                this.dyn.set("controlbar_active", true);
            this.dyn.set("hovermessage", "");
            this.dyn.set("message", this.dyn.get("uploading-message"));
            var uploader = this.dyn._dataUploader;
            this.listenOn(uploader, "success", function() {
                Async.eventually(function() {
                    if (this.destroyed())
                        return;
                    this._finished();
                    this.next("Verifying");
                }, this);
            });
            this.listenOn(uploader, "error", function(e) {
                var bestError = this.dyn.string("uploading-failed");
                try {
                    e.forEach(function(ee) {
                        for (var key in ee)
                            if (this.dyn.string("upload-error-" + key))
                                bestError = this.dyn.string("upload-error-" + key);
                    }, this);
                } catch (err) {}
                this.dyn.set("player_active", false);
                this.next("FatalError", {
                    message: bestError,
                    retry: this.dyn.recorderAttached() ? "Uploading" : "Initial"
                });
            });
            this.listenOn(uploader, "progress", function(uploaded, total) {
                this.dyn.trigger("upload_progress", uploaded, total);
                if (total !== 0 && total > 0 && uploaded >= 0) {
                    var up = Math.min(100, Math.round(uploaded / total * 100));
                    if (!isNaN(up)) {
                        this.dyn.set("message", this.dyn.get("uploading-message") + ": " + up + "%");
                        this.dyn.set("playertopmessage", this.dyn.get("message"));
                    }
                }
            });
            if (this.dyn.get("localplayback") && this.dyn.isFormatSupported()) {
                if (this.dyn.recorder && this.dyn.recorder.supportsLocalPlayback())
                    this.dyn.set("playbacksource", this.dyn.recorder.localPlaybackSource());
                else
                    this.dyn.set("playbacksource", (window.URL || window.webkitURL).createObjectURL(this.dyn._audioFile));
                this.dyn.set("loader_active", false);
                this.dyn.set("message_active", false);
                this.dyn.set("player_active", true);
            }
            this.dyn.set("start-upload-time", Time.now());
            uploader.reset();
            uploader.upload();
        },

        rerecord: function() {
            this.dyn._detachRecorder();
            this.dyn.trigger("rerecord");
            this.dyn.set("recordermode", true);
            this.next("Initial");
        },

        _finished: function() {
            this.dyn.set("cancancel", false);
            this.dyn.trigger("uploaded");
            this.dyn.set("end-upload-time", Time.now());
        }

    });
});


Scoped.define("module:AudioRecorder.Dynamics.RecorderStates.Verifying", [
    "module:AudioRecorder.Dynamics.RecorderStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        dynamics: ["loader", "message"],

        _started: function() {
            this.dyn.set("loadlabel", "");
            this.dyn.trigger("verifying");
            this.dyn.set("message", this.dyn.string("verifying") + "...");
            this.dyn.set("playertopmessage", this.dyn.get("message"));
            if (this.dyn.get("localplayback") && this.dyn.isFormatSupported()) {
                this.dyn.set("loader_active", false);
                this.dyn.set("message_active", false);
            } else {
                this.dyn.set("rerecordvisible", this.dyn.get("early-rerecord"));
                if (this.dyn.get("early-rerecord"))
                    this.dyn.set("controlbar_active", true);
            }
            this.dyn._verifyRecording().success(function() {
                this.dyn.trigger("verified");
                this.dyn._detachRecorder();
                if (this.dyn.get("recordings"))
                    this.dyn.set("recordings", this.dyn.get("recordings") - 1);
                this.dyn.set("message", "");
                this.dyn.set("verified", true);
                this.next("Player");
            }, this).error(function() {
                this.dyn.set("player_active", false);
                this.next("FatalError", {
                    message: this.dyn.string("verifying-failed"),
                    retry: this.dyn.recorderAttached() ? "Verifying" : "Initial"
                });
            }, this);
        },

        rerecord: function() {
            this.dyn._detachRecorder();
            this.dyn.trigger("rerecord");
            this.dyn.set("recordermode", true);
            this.next("Initial");
        }

    });
});
Scoped.define("module:VideoCall.Dynamics.CallViewer", [
    "dynamics:Dynamic"
], function(Dynamic, scoped) {
    return Dynamic.extend({
            scoped: scoped
        }, {
            template: "<div class=\"ba-commoncss-full-width\">\n\t<ba-local-view  ba-stream=\"{{=local_stream}}\"\n\t\t\t\t\tba-camera_active={{local_camera_active}}\n\t\t\t\t\tba-microphone_active=\"{{local_microphone_active}}\"\n\t></ba-local-view>\n\t<ba-remote-view ba-stream=\"{{=remote_stream}}\"\n\t\t\t\t\tba-camera_active={{remote_camera_active}}\n\t\t\t\t\tba-microphone_active=\"{{remote_microphone_active}}\"\n\t></ba-remote-view>\n\t<ba-call-controlbar></ba-call-controlbar>\n</div>"
        })
        .register("ba-call-view")
        .registerFunctions({
            /**/"local_stream": function (obj) { return obj.local_stream; }, "local_camera_active": function (obj) { return obj.local_camera_active; }, "local_microphone_active": function (obj) { return obj.local_microphone_active; }, "remote_stream": function (obj) { return obj.remote_stream; }, "remote_camera_active": function (obj) { return obj.remote_camera_active; }, "remote_microphone_active": function (obj) { return obj.remote_microphone_active; }/**/
        });
});
Scoped.define("module:VideoCall.Dynamics.BaseView", [
    "dynamics:Dynamic"
], [

], function(Dynamic, scoped) {
    return Dynamic.extend({
            scoped: scoped
        }, function(inherited) {
            return {
                template: "<div class=\"{{cssclass}}\">\n\t\n\t<video ba-if=\"{{camera_active}}\"></video>\n</div>\n",

				attrs: {
					cssclass: "ba-call-camera-view"
				},

                events: {
                    "change:stream": function(stream) {
						if (!stream || !this.video) return;
                        this.video.srcObject = stream;
						this.video.play();
                    }
                },

                create: function() {
                    this.video = this.activeElement().querySelector("video");
					if (this.get("stream")) {
						this.video.srcObject = this.get("stream");
						this.video.play();
					}
                }
            };
        })
        .registerFunctions({
            /**/"cssclass": function (obj) { return obj.cssclass; }, "camera_active": function (obj) { return obj.camera_active; }/**/
        });
});
Scoped.define("module:VideoCall.Dynamics.LocalView", [
    "module:Assets",
    "module:VideoCall.Dynamics.BaseView"
], [

], function(Assets, BaseView, scoped) {
    return BaseView.extend({
            scoped: scoped
        }, function(inherited) {
            return {
                template: inherited.template.replace("<video", "<div ba-if=\"{{error}}\" ba-click=\"{{retry()}}\">\n    <p>{{error}}</p>\n</div>\n<video muted"),

				attrs: {
					cssclass: "ba-call-local-view"
				},

                channels: {
                    "errors:local_camera_error": function() {
                        this.set("error", this.string("local-camera-connection-error"));
                    }
                },

                functions: {
                    retry: function() {
                        this.set("error", "");
                        this.channel("local_camera").trigger("retry");
                    }
                }
            };
        })
        .register("ba-local-view")
        .registerFunctions({
            /**/"error": function (obj) { return obj.error; }, "retry()": function (obj) { return obj.retry(); }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "local-camera-connection-error": "There was an error when connecting to local camera. Click to try again."
        });
});
Scoped.define("module:VideoCall.Dynamics.RemoteView", [
    "module:VideoCall.Dynamics.BaseView"
], [

], function(BaseView, scoped) {
    return BaseView.extend({
        scoped: scoped
    }, function(inherited) {
        return {
            template: inherited.template.replace("<video", "<video"),

			attrs: {
				cssclass: "ba-call-remote-view"
			},

            create: function() {
				inherited.create.call(this);
            }
        };
    })
    .register("ba-remote-view")
    .registerFunctions({
        /**//**/
    });
});
Scoped.define("module:VideoCall.Dynamics.Controlbar", [
    "dynamics:Dynamic",
    "module:Assets"
], [

], function(Dynamic, Assets, scoped) {
    return Dynamic.extend({
            scoped: scoped
        }, function(inherited) {
            return {
                template: "<div class=\"ba-call-controlbar\">\n\t<button class=\"ba-call-mute-btn\" ba-click=\"{{toggle_mute()}}\">{{string('mute-button')}}</button>\n\t<button class=\"ba-call-camera-btn\" ba-click=\"{{toggle_camera()}}\">{{string('camera-button')}}</button>\n\t<button class=\"ba-call-leave-btn\" ba-click=\"{{leave_call()}}\">Leave Call</button>\n</div>",

                functions: {
                    toggle_mute: function() {
                        this.channel("call").trigger("toggle_mute");
                    },
                    toggle_camera: function() {
                        this.channel("call").trigger("toggle_camera");
                    },
                    leave_call: function() {
                        this.channel("call").trigger("leave_call");
                    }
                }
            };
        })
        .register("ba-call-controlbar")
        .registerFunctions({
            /**/"toggle_mute()": function (obj) { return obj.toggle_mute(); }, "string('mute-button')": function (obj) { return obj.string('mute-button'); }, "toggle_camera()": function (obj) { return obj.toggle_camera(); }, "string('camera-button')": function (obj) { return obj.string('camera-button'); }, "leave_call()": function (obj) { return obj.leave_call(); }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "camera-button": "Show/Hide Camera",
            "leave-button": "Leave Call",
            "mute-button": "Mute/Unmute"
        });
});
Scoped.define("module:VideoCall.Dynamics.Lobby", [
    "dynamics:Dynamic",
    "module:Assets"
], [

], function(Dynamic, Assets, scoped) {
    return Dynamic.extend({
            scoped: scoped
        }, function(inherited) {
            return {
                template: "<div class=\"ba-video-call-lobby\">\n\t<h1>{{title}}</h1>\n\t<p>{{description}}</p>\n\t<button ba-click=\"{{connect()}}\">{{button}}</button>\n\t<div class=\"ba-call-lobby-camera\">\n\t\t<button class=\"ba-call-lobby-mute-btn\" ba-click=\"{{toggle_mute()}}\">{{string('mute-button')}}</button>\n\t\t<button class=\"ba-call-lobby-camera-btn\" ba-click=\"{{toggle_camera()}}\">{{string('camera-button')}}</button>\n\t\t<ba-local-view ba-stream=\"{{=stream}}\"\n\t\t\t\t\t   ba-camera_active=\"{{camera_active}}\"\n\t\t\t\t\t   ba-microphone_active=\"{{microphone_active}}\"\n\t\t></ba-local-view>\n\t</div>\n</div>\n",

                attrs: {
                    mode: "join"
                },

                computed: {
                    "title:mode": function(mode) {
                        return mode === "create" ? this.string("title-create") : this.string("title-join");
                    },
                    "description:mode": function(mode) {
                        return mode === "create" ? this.string("description-create") : this.string("description-join");
                    },
                    "button:mode": function(mode) {
                        return mode === "create" ? this.string("create-button") : this.string("join-button");
                    }
                },

                functions: {
                    connect: function() {
                        this.channel("call").trigger("connect");
                    },
                    toggle_mute: function() {
                        this.channel("call").trigger("toggle_mute");
                    },
                    toggle_camera: function() {
                        this.channel("call").trigger("toggle_camera");
                    }
                }
            };
        })
        .register("ba-call-lobby")
        .registerFunctions({
            /**/"title": function (obj) { return obj.title; }, "description": function (obj) { return obj.description; }, "connect()": function (obj) { return obj.connect(); }, "button": function (obj) { return obj.button; }, "toggle_mute()": function (obj) { return obj.toggle_mute(); }, "string('mute-button')": function (obj) { return obj.string('mute-button'); }, "toggle_camera()": function (obj) { return obj.toggle_camera(); }, "string('camera-button')": function (obj) { return obj.string('camera-button'); }, "stream": function (obj) { return obj.stream; }, "camera_active": function (obj) { return obj.camera_active; }, "microphone_active": function (obj) { return obj.microphone_active; }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "camera-button": "Camera",
            "description-create": "When you're ready click on the button below to create a call.",
            "description-join": "When you're ready click on the button below to join the call.",
            "join-button": "Join",
            "create-button": "Create",
            "mute-button": "Mute",
            "title-create": "Create Call",
            "title-join": "Join Call"
        });
});
Scoped.define("module:VideoCall.Dynamics.CallStates.State", [
    "base:States.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        _start: function() {
            this.dyn = this.host.dynamic;
            this._started();
        }
    });
});

Scoped.define("module:VideoCall.Dynamics.CallStates.Initial", [
    "module:VideoCall.Dynamics.CallStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        _started: function() {
            this.dyn._getUserMedia({
                audio: true,
                video: true
            });

            if (this.dyn.get("skipinitial")) {
                this.next("Connecting");
                return;
            }

            this.dyn.channel("call").on("connect", function() {
                this.next("Connecting");
            }.bind(this));
            this.dyn.set("lobby_active", true);
        },

        _end: function() {
            this.dyn.set("lobby_active", false);
        }
    });
});

Scoped.define("module:VideoCall.Dynamics.CallStates.Connecting", [
    "module:VideoCall.Dynamics.CallStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {

        _started: function() {
            this.dyn.set("message", this.dyn.string("connecting"));
            this.dyn.trigger("connecting");
            this.dyn._connect().success(function() {
                this.dyn.set("connected", true);
                this.dyn.trigger("connected", this.dyn.get("call_data"));
                this.next("Active");
            }.bind(this)).error(function() {
                this.next("ConnectionFailed");
            }.bind(this));
        },

        _end: function() {
            this.dyn.set("message", "");
        }
    });
});

Scoped.define("module:VideoCall.Dynamics.CallStates.ConnectionFailed", [
    "module:VideoCall.Dynamics.CallStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {
        dynamics: ["loader"],

        _started: function() {
            this.dyn.set("message", this.dyn.string("connection-error"));
            this.dyn.activeElement().addEventListener("click", function() {
                this.next("Connecting");
            }.bind(this), {
                once: true
            });
        },

        _end: function() {
            this.dyn.set("message", "");
        }
    });
});

Scoped.define("module:VideoCall.Dynamics.CallStates.Active", [
    "module:VideoCall.Dynamics.CallStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {
        dynamics: ["loader"],

        _started: function() {
            this.dyn.set("call_active", true);
            this.dyn.on("ended", function() {
                this.next("Ended");
            }.bind(this));
        },

        _end: function() {
            this.dyn.set("call_active", false);
        }
    });
});

Scoped.define("module:VideoCall.Dynamics.CallStates.Ended", [
    "module:VideoCall.Dynamics.CallStates.State"
], function(State, scoped) {
    return State.extend({
        scoped: scoped
    }, {
        dynamics: ["loader"],

        _started: function() {
            this.dyn.get("local_stream").getVideoTracks()[0].stop();
            this.dyn.set("message", this.dyn.string("call-ended"));
        },

        _end: function() {
            this.set("message", "");
        }
    });
});
Scoped.define("module:VideoCall.Dynamics.Call", [
    "base:Classes.ClassRegistry",
    "base:Promise",
    "base:States.Host",
    "dynamics:Dynamic",
    "media:WebRTC.Support",
    "module:Assets",
    "module:VideoCall.Dynamics.CallStates.Initial",
    "module:VideoCall.Dynamics.CallStates"
], function(ClassRegistry, Promise, Host, Dynamic, WebRTCSupport, Assets, InitialState, CallStates, scoped) {
    return Dynamic.extend({
            scoped: scoped
        }, function(inherited) {
            return {

                template: "<div class=\"video-call-container ba-commoncss-full-width ba-commoncss-landscape-aspect-ratio\">\n\t\n\t<ba-call-lobby ba-if=\"{{lobby_active}}\"\n\t\t\t\t   ba-stream=\"{{=local_stream}}\"\n\t\t\t\t   ba-camera_active=\"{{local_camera_active}}\"\n\t\t\t\t   ba-microphone_active=\"{{local_microphone_active}}\"\n\t\t\t\t   ba-mode=\"{{mode}}\"\n\t></ba-call-lobby>\n\n\t\n\t<p ba-if=\"{{message}}\"\n\t   class=\"ba-commoncss-full-width ba-commoncss-full-height\"\n\t>{{message}}</p>\n\n\t\n\t<ba-call-view ba-if=\"{{call_active}}\"\n\t\t\t\t  ba-local_stream=\"{{=local_stream}}\"\n\t\t\t\t  ba-remote_stream=\"{{=remote_stream}}\"\n\t\t\t\t  ba-local_camera_active=\"{{local_camera_active}}\"\n\t\t\t\t  ba-local_microphone_active=\"{{local_microphone_active}}\"\n\t\t\t\t  ba-remote_camera_active=\"{{remote_camera_active}}\"\n\t\t\t\t  ba-remote_microphone_active=\"{{remote_microphone_active}}\"\n\t></ba-call-view>\n</div>",

                attrs: {
                    local_camera_active: false,
                    local_microphone_active: false,
                    local_stream: undefined,
                    remote_camera_active: false,
                    remote_microphone_active: false,
                    remote_stream: undefined,
                    skipinitial: false
                },

                registerchannels: ["call", "local_camera", "errors"],

                channels: {
                    "call:leave_call": function() {
                        this.trigger("ended");
                    },
                    "call:toggle_camera": function() {
                        this.set("local_camera_active", !this.get("local_camera_active"));
                    },
                    "call:toggle_mute": function() {
                        this.set("local_microphone_active", !this.get("local_microphone_active"));
                    },
                    "local_camera:retry": function() {
                        this._getUserMedia({
                            audio: true,
                            video: true
                        });
                    }
                },

                object_functions: ["leave"],

                functions: {
                    leave: function() {
                        if (!this.get("connected")) return;
                        this.channel("call").trigger("leave_call");
                    }
                },

                events: {
                    "change:local_camera_active": function(active) {
                        if (!this.get("local_stream")) return;
                        this.get("local_stream").getVideoTracks()[0].enabled = active;
                        if (!this._dataChannelIsReady()) return;
                        this._dataChannel.send(JSON.stringify({
                            remote_camera_active: active
                        }));
                    },
                    "change:local_microphone_active": function(active) {
                        if (!this.get("local_stream")) return;
                        this.get("local_stream").getAudioTracks()[0].enabled = active;
                        if (!this._dataChannelIsReady()) return;
                        this._dataChannel.send(JSON.stringify({
                            remote_microphone_active: active
                        }));
                    },
                    "change:local_stream": function(stream) {
                        if (!stream) return;
                        this.get("local_stream").getVideoTracks()[0].enabled = !!this.get("local_camera_active");
                        this.get("local_stream").getAudioTracks()[0].enabled = !!this.get("local_microphone_active");
                    },
                    "error": function(error_type, error) {
                        this.channel("errors").trigger(error_type);
                        this.trigger(error_type, error);
                    }
                },

                _afterActivate: function(element) {
                    inherited._afterActivate.call(this, element);
                    this.persistentTrigger("loaded");
                },

                create: function() {
                    this._initStateMachine();
                },

                _initStateMachine: function() {
                    var host = new Host({
                        stateRegistry: new ClassRegistry(this.cls.callStates())
                    });
                    host.dynamic = this;
                    host.initialize(InitialState);
                },

                _getUserMedia: function(constraints) {
                    if (!WebRTCSupport.userMediaSupported()) {
                        var error = new Error("Camera access is only available in secure contexts (HTTPS).");
                        console.error(error);
                        this.trigger("error", "camera_access_unsupported", error);
                        return Promise.error(error);
                    }
                    return WebRTCSupport.userMedia(constraints).success(function(stream) {
                        this.trigger("access_granted");
                        this.set("local_stream", stream);
                        return stream;
                    }, this).error(function(error) {
                        if (error.message === "Permission denied") this.trigger("error", "access_forbidden");
                        else this.trigger("error", "local_camera_error", error);
                    }, this);
                },

                _connect: function() { // Simulates connection, needs to be replaced with actual connection
                    var connectionPromise = Promise.create();
                    setTimeout(function() {
                        Promise.conditional(!this.get("local_stream"), function() {
                            var localStreamPromise = Promise.create();
                            this.once("change:local_stream", function(stream) {
                                if (stream) localStreamPromise.asyncSuccess(stream);
                            });
                            return localStreamPromise;
                        }.bind(this), this.get("local_stream")).success(function(stream) {
                            this.set("remote_stream", stream);
                            this.set("remote_camera_active", true);
                            this.set("remote_microphone_active", true);
                        }, this);
                        connectionPromise.asyncSuccess();
                    }.bind(this), 1000);
                    return connectionPromise;
                },

                _createPeerConnection: function(configuration) {
                    if (this._peerConnection) return;
                    this._peerConnection = new RTCPeerConnection(configuration);
                    this._createDataChannel();
                },

                _createDataChannel: function() {
                    if (!this._peerConnection) return;
                    this._dataChannel = this._peerConnection.createDataChannel("call", {
                        negotiated: true,
                        id: 0
                    });
                    this._dataChannel.onopen = function(event) {
                        this._dataChannel.send(JSON.stringify({
                            remote_camera_active: this.get("local_camera_active"),
                            remote_microphone_active: this.get("local_microphone_active")
                        }));
                    }.bind(this);
                    this._dataChannel.onmessage = function(event) {
                        this.setAll(JSON.parse(event.data));
                    }.bind(this);
                },

                _dataChannelIsReady: function() {
                    return this._dataChannel && this._dataChannel.readyState === "open";
                }
            };
        }, {
            callStates: function() {
                return [CallStates];
            }
        })
        .register("ba-video-call")
        .registerFunctions({
            /**/"lobby_active": function (obj) { return obj.lobby_active; }, "local_stream": function (obj) { return obj.local_stream; }, "local_camera_active": function (obj) { return obj.local_camera_active; }, "local_microphone_active": function (obj) { return obj.local_microphone_active; }, "mode": function (obj) { return obj.mode; }, "message": function (obj) { return obj.message; }, "call_active": function (obj) { return obj.call_active; }, "remote_stream": function (obj) { return obj.remote_stream; }, "remote_camera_active": function (obj) { return obj.remote_camera_active; }, "remote_microphone_active": function (obj) { return obj.remote_microphone_active; }/**/
        })
        .attachStringTable(Assets.strings)
        .addStrings({
            "call-ended": "Call ended",
            "connecting": "Connecting...",
            "connection-error": "There was an error while connecting, please click to try again."
        });
});
}).call(Scoped);