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
                    Loader.loadScript('//imasdk.googleapis.com/js/sdkloader/ima3.js', function() {
                        promise.asyncSuccess(this.adsLoader(options));
                    }, this);
                } else {
                    // Just in case check if google is relate IMA SDK not other google service
                    if (typeof google.ima === "undefined") {
                        Loader.loadScript('//imasdk.googleapis.com/js/sdkloader/ima3.js', function() {
                            promise.asyncSuccess(this.adsLoader(options));
                        }, this);
                    } else promise.asyncSuccess(this.adsLoader(options));
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
                options.adElement, options.videoElement
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