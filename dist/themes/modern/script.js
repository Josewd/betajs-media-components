/*!
betajs-media-components - v0.0.150 - 2019-01-11
Copyright (c) Ziggeo,Oliver Friedmann,Rashad Aliyev
Apache-2.0 Software License.
*/
(function () {

var Scoped = this.subScope();

Scoped.binding("browser", "global:BetaJS.Browser");
Scoped.binding("dynamics", "global:BetaJS.Dynamics");
Scoped.binding("module", "global:BetaJS.MediaComponents");

Scoped.extend("module:Assets.playerthemes", [
    "browser:Info",
    "dynamics:Parser"
], function(Info, Parser) {
    var ie8 = Info.isInternetExplorer() && Info.internetExplorerVersion() <= 8;
    Parser.registerFunctions({
        /**/"csstheme": function (obj) { with (obj) { return csstheme; } }, "activitydelta > hidebarafter && hideoninactivity ? (cssplayer + '-dashboard-hidden') : ''": function (obj) { with (obj) { return activitydelta > hidebarafter && hideoninactivity ? (cssplayer + '-dashboard-hidden') : ''; } }, "title": function (obj) { with (obj) { return title; } }, "submit()": function (obj) { with (obj) { return submit(); } }, "submittable": function (obj) { with (obj) { return submittable; } }, "string('submit-video')": function (obj) { with (obj) { return string('submit-video'); } }, "rerecord()": function (obj) { with (obj) { return rerecord(); } }, "rerecordable": function (obj) { with (obj) { return rerecordable; } }, "string('rerecord-video')": function (obj) { with (obj) { return string('rerecord-video'); } }, "csscommon": function (obj) { with (obj) { return csscommon; } }, "skipinitial ? 0 : 1": function (obj) { with (obj) { return skipinitial ? 0 : 1; } }, "play()": function (obj) { with (obj) { return play(); } }, "tab_index_move(domEvent, null, 'button-icon-pause')": function (obj) { with (obj) { return tab_index_move(domEvent, null, 'button-icon-pause'); } }, "!playing": function (obj) { with (obj) { return !playing; } }, "string('play-video')": function (obj) { with (obj) { return string('play-video'); } }, "pause()": function (obj) { with (obj) { return pause(); } }, "tab_index_move(domEvent, null, 'button-icon-play')": function (obj) { with (obj) { return tab_index_move(domEvent, null, 'button-icon-play'); } }, "disablepause ? cssplayer + '-disabled' : ''": function (obj) { with (obj) { return disablepause ? cssplayer + '-disabled' : ''; } }, "playing": function (obj) { with (obj) { return playing; } }, "disablepause ? string('pause-video-disabled') : string('pause-video')": function (obj) { with (obj) { return disablepause ? string('pause-video-disabled') : string('pause-video'); } }, "string('elapsed-time')": function (obj) { with (obj) { return string('elapsed-time'); } }, "formatTime(position)": function (obj) { with (obj) { return formatTime(position); } }, "formatTime(duration || position)": function (obj) { with (obj) { return formatTime(duration || position); } }, "toggle_settings()": function (obj) { with (obj) { return toggle_settings(); } }, "cssplayer": function (obj) { with (obj) { return cssplayer; } }, "settingsoptionsvisible ? 'visible' : 'hidden'": function (obj) { with (obj) { return settingsoptionsvisible ? 'visible' : 'hidden'; } }, "settings": function (obj) { with (obj) { return settings; } }, "string('settings')": function (obj) { with (obj) { return string('settings'); } }, "tab_index_move(domEvent)": function (obj) { with (obj) { return tab_index_move(domEvent); } }, "toggle_tracks()": function (obj) { with (obj) { return toggle_tracks(); } }, "(tracktags.length > 0 && tracktagssupport) || allowtexttrackupload": function (obj) { with (obj) { return (tracktags.length > 0 && tracktagssupport) || allowtexttrackupload; } }, "tracktextvisible ? 'active' : 'inactive'": function (obj) { with (obj) { return tracktextvisible ? 'active' : 'inactive'; } }, "tracktextvisible ? string('close-tracks') : string('show-tracks')": function (obj) { with (obj) { return tracktextvisible ? string('close-tracks') : string('show-tracks'); } }, "hover_cc(true)": function (obj) { with (obj) { return hover_cc(true); } }, "hover_cc(false)": function (obj) { with (obj) { return hover_cc(false); } }, "toggle_fullscreen()": function (obj) { with (obj) { return toggle_fullscreen(); } }, "fullscreen": function (obj) { with (obj) { return fullscreen; } }, "fullscreened ? string('exit-fullscreen-video') : string('fullscreen-video')": function (obj) { with (obj) { return fullscreened ? string('exit-fullscreen-video') : string('fullscreen-video'); } }, "fullscreened ? 'small' : 'full'": function (obj) { with (obj) { return fullscreened ? 'small' : 'full'; } }, "show_airplay_devices()": function (obj) { with (obj) { return show_airplay_devices(); } }, "airplaybuttonvisible": function (obj) { with (obj) { return airplaybuttonvisible; } }, "castbuttonvisble": function (obj) { with (obj) { return castbuttonvisble; } }, "toggle_stream()": function (obj) { with (obj) { return toggle_stream(); } }, "streams.length > 1 && currentstream": function (obj) { with (obj) { return streams.length > 1 && currentstream; } }, "string('change-resolution')": function (obj) { with (obj) { return string('change-resolution'); } }, "currentstream_label": function (obj) { with (obj) { return currentstream_label; } }, "set_volume(volume + 0.1)": function (obj) { with (obj) { return set_volume(volume + 0.1); } }, "set_volume(volume - 0.1)": function (obj) { with (obj) { return set_volume(volume - 0.1); } }, "startUpdateVolume(domEvent)": function (obj) { with (obj) { return startUpdateVolume(domEvent); } }, "stopUpdateVolume(domEvent)": function (obj) { with (obj) { return stopUpdateVolume(domEvent); } }, "progressUpdateVolume(domEvent)": function (obj) { with (obj) { return progressUpdateVolume(domEvent); } }, "{width: Math.ceil(1+Math.min(99, Math.round(volume * 100))) + '%'}": function (obj) { with (obj) { return {width: Math.ceil(1+Math.min(99, Math.round(volume * 100))) + '%'}; } }, "string('volume-button')": function (obj) { with (obj) { return string('volume-button'); } }, "toggle_volume()": function (obj) { with (obj) { return toggle_volume(); } }, "string(volume > 0 ? 'volume-mute' : 'volume-unmute')": function (obj) { with (obj) { return string(volume > 0 ? 'volume-mute' : 'volume-unmute'); } }, "csscommon + '-icon-volume-' + (volume >= 0.5 ? 'up' : (volume > 0 ? 'down' : 'off'))": function (obj) { with (obj) { return csscommon + '-icon-volume-' + (volume >= 0.5 ? 'up' : (volume > 0 ? 'down' : 'off')); } }, "disableseeking ? cssplayer + '-disabled' : ''": function (obj) { with (obj) { return disableseeking ? cssplayer + '-disabled' : ''; } }, "seek(position + skipseconds)": function (obj) { with (obj) { return seek(position + skipseconds); } }, "seek(position - skipseconds)": function (obj) { with (obj) { return seek(position - skipseconds); } }, "startUpdatePosition(domEvent)": function (obj) { with (obj) { return startUpdatePosition(domEvent); } }, "stopUpdatePosition(domEvent)": function (obj) { with (obj) { return stopUpdatePosition(domEvent); } }, "progressUpdatePosition(domEvent)": function (obj) { with (obj) { return progressUpdatePosition(domEvent); } }, "{width: Math.round(duration ? cached / duration * 100 : 0) + '%'}": function (obj) { with (obj) { return {width: Math.round(duration ? cached / duration * 100 : 0) + '%'}; } }, "{width: Math.round(duration ? position / duration * 100 : 0) + '%'}": function (obj) { with (obj) { return {width: Math.round(duration ? position / duration * 100 : 0) + '%'}; } }, "string('video-progress')": function (obj) { with (obj) { return string('video-progress'); } }/**/
    });
    Parser.registerFunctions({
        /**/"play()": function (obj) { with (obj) { return play(); } }, "tab_index_move(domEvent, null, 'player-toggle-overlay')": function (obj) { with (obj) { return tab_index_move(domEvent, null, 'player-toggle-overlay'); } }, "cssplayer": function (obj) { with (obj) { return cssplayer; } }, "string('tooltip')": function (obj) { with (obj) { return string('tooltip'); } }, "rerecordable || submittable": function (obj) { with (obj) { return rerecordable || submittable; } }, "submittable": function (obj) { with (obj) { return submittable; } }, "submit()": function (obj) { with (obj) { return submit(); } }, "string('submit-video')": function (obj) { with (obj) { return string('submit-video'); } }, "rerecordable": function (obj) { with (obj) { return rerecordable; } }, "rerecord()": function (obj) { with (obj) { return rerecord(); } }, "string('rerecord')": function (obj) { with (obj) { return string('rerecord'); } }/**/
    });
    return {
        "modern": {
            css: "ba-videoplayer",
            csstheme: "ba-player-theme-modern",
            cssplayer: "ba-player",
            tmplcontrolbar: "<div data-selector=\"video-title-block\" class=\"{{csstheme}}-title-container {{activitydelta > hidebarafter && hideoninactivity ? (cssplayer + '-dashboard-hidden') : ''}}\" ba-if=\"{{title}}\">\n\t<p class=\"{{csstheme}}-title\">\n\t\t{{title}}\n\t</p>\n</div>\n\n<div class=\"{{csstheme}}-dashboard {{activitydelta > hidebarafter && hideoninactivity ? (cssplayer + '-dashboard-hidden') : ''}}\">\n\n    <div tabindex=\"0\" data-selector=\"submit-video-button\"\n\t\t ba-hotkey:space^enter=\"{{submit()}}\" onmouseout=\"this.blur()\"\n\t\t class=\"{{csstheme}}-leftbutton-container\"\n\t\t ba-if=\"{{submittable}}\" ba-click=\"{{submit()}}\"\n\t>\n        <div class=\"{{csstheme}}-button-inner\">\n        \t{{string('submit-video')}}\n        </div>\n    </div>\n\n    <div tabindex=\"0\" data-selector=\"button-icon-ccw\"\n\t\t ba-hotkey:space^enter=\"{{rerecord()}}\" onmouseout=\"this.blur()\"\n\t\t class=\"{{csstheme}}-leftbutton-container\"\n\t\t ba-if=\"{{rerecordable}}\" ba-click=\"{{rerecord()}}\" title=\"{{string('rerecord-video')}}\"\n\t>\n    \t<div class=\"{{csstheme}}-button-inner\">\n    \t\t<i class=\"{{csscommon}}-icon-ccw\"></i>\n    \t</div>\n    </div>\n\n\t<div tabindex=\"{{skipinitial ? 0 : 1}}\" data-selector=\"button-icon-play\"\n\t\t ba-hotkey:space^enter=\"{{play()}}\" onmouseout=\"this.blur()\"\n\t\t onkeydown=\"{{tab_index_move(domEvent, null, 'button-icon-pause')}}\"\n\t\t class=\"{{csstheme}}-leftbutton-container\"\n\t\t ba-if=\"{{!playing}}\" ba-click=\"{{play()}}\" title=\"{{string('play-video')}}\"\n\t>\n\t\t<div class=\"{{csstheme}}-button-inner\">\n\t\t\t<i class=\"{{csscommon}}-icon-play\"></i>\n\t\t</div>\n\t</div>\n\n\t<div tabindex=\"{{skipinitial ? 0 : 1}}\" data-selector=\"button-icon-pause\"\n\t\t ba-hotkey:space^enter=\"{{pause()}}\" onmouseout=\"this.blur()\"\n\t\t onkeydown=\"{{tab_index_move(domEvent, null, 'button-icon-play')}}\"\n\t\t class=\"{{csstheme}}-leftbutton-container {{disablepause ? cssplayer + '-disabled' : ''}}\"\n\t\t ba-if=\"{{playing}}\" ba-click=\"{{pause()}}\" title=\"{{disablepause ? string('pause-video-disabled') : string('pause-video')}}\"\n\t>\n\t\t<div class=\"{{csstheme}}-button-inner\">\n\t\t\t<i class=\"{{csscommon}}-icon-pause\"></i>\n\t\t</div>\n\t</div>\n\t<div class=\"{{csstheme}}-time-container\">\n\t\t<div class=\"{{csstheme}}-time-value\" title=\"{{string('elapsed-time')}}\">{{formatTime(position)}}/{{formatTime(duration || position)}}</div>\n\t</div>\n\n\t<div tabindex=\"10\" data-selector=\"button-icon-settings\"\n\t\t ba-hotkey:space^enter=\"{{toggle_settings()}}\" onmouseout=\"this.blur()\"\n\t\t class=\"{{csstheme}}-rightbutton-container {{cssplayer}}-settings-{{settingsoptionsvisible ? 'visible' : 'hidden'}}\"\n\t\t ba-if=\"{{settings}}\" ba-click=\"{{toggle_settings()}}\"\n\t\t title=\"{{string('settings')}}\"\n\t\t onkeydown=\"{{tab_index_move(domEvent)}}\"\n\t>\n\t\t<div class=\"{{csstheme}}-button-inner {{csstheme}}-settings-button\">\n\t\t\t<i class=\"{{csscommon}}-icon-cog\"></i>\n\t\t</div>\n\t</div>\n\n\t<div tabindex=\"9\" data-selector=\"cc-button-container\"\n\t\t ba-hotkey:space^enter=\"{{toggle_tracks()}}\" onmouseout=\"this.blur()\"\n\t\t ba-if=\"{{(tracktags.length > 0 && tracktagssupport) || allowtexttrackupload}}\"\n\t\t class=\"{{csstheme}}-rightbutton-container  {{cssplayer}}-cc-{{tracktextvisible ? 'active' : 'inactive'}}\"\n\t\t title=\"{{ tracktextvisible ? string('close-tracks') : string('show-tracks')}}\"\n\t\t ba-click=\"{{toggle_tracks()}}\"\n\t\t onmouseover=\"{{hover_cc(true)}}\"\n\t\t onmouseleave=\"{{hover_cc(false)}}\"\n\t>\n\t\t<div class=\"{{csstheme}}-button-inner {{csstheme}}-subtitle-button-inner\">\n\t\t\t<i class=\"{{csscommon}}-icon-subtitle\"></i>\n\t\t</div>\n\t</div>\n\n\n\t<div tabindex=\"8\" data-selector=\"button-icon-resize-full\"\n\t\t ba-hotkey:space^enter=\"{{toggle_fullscreen()}}\" onmouseout=\"this.blur()\"\n\t\t onkeydown=\"{{tab_index_move(domEvent)}}\"\n\t\t class=\"{{csstheme}}-rightbutton-container\"\n\t\tba-if=\"{{fullscreen}}\" ba-click=\"{{toggle_fullscreen()}}\" title=\"{{ fullscreened ? string('exit-fullscreen-video') : string('fullscreen-video') }}\"\n\t>\n\t\t<div class=\"{{csstheme}}-button-inner {{csstheme}}-full-screen-btn-inner\">\n\t\t\t<i class=\"{{csscommon}}-icon-resize-{{fullscreened ? 'small' : 'full'}}\"></i>\n\t\t</div>\n\t</div>\n\n\t<div tabindex=\"7\" data-selector=\"button-airplay\"\n\t\t ba-hotkey:space^enter=\"{{show_airplay_devices()}}\" onmouseout=\"this.blur()\"\n\t\t class=\"{{csstheme}}-rightbutton-container {{cssplayer}}-airplay-container\" ba-show=\"{{airplaybuttonvisible}}\"\n\t\t ba-click=\"{{show_airplay_devices()}}\"\n\t>\n\t\t<svg width=\"16px\" height=\"11px\" viewBox=\"0 0 16 11\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n\t\t\t\n\t\t\t<title>Airplay</title>\n\t\t\t<desc>Airplay icon.</desc>\n\t\t\t<defs></defs>\n\t\t\t<g stroke=\"none\" stroke-width=\"1\" fill-rule=\"evenodd\" sketch:type=\"MSPage\">\n\t\t\t\t<path d=\"M4,11 L12,11 L8,7 L4,11 Z M14.5454545,0 L1.45454545,0 C0.654545455,0 0,0.5625 0,1.25 L0,8.75 C0,9.4375 0.654545455,10 1.45454545,10 L4.36363636,10 L4.36363636,8.75 L1.45454545,8.75 L1.45454545,1.25 L14.5454545,1.25 L14.5454545,8.75 L11.6363636,8.75 L11.6363636,10 L14.5454545,10 C15.3454545,10 16,9.4375 16,8.75 L16,1.25 C16,0.5625 15.3454545,0 14.5454545,0 L14.5454545,0 Z\" sketch:type=\"MSShapeGroup\"></path>\n\t\t\t</g>\n\t\t</svg>\n\t</div>\n\n\t<div data-selector=\"button-chromecast\" class=\"{{csstheme}}-rightbutton-container {{csstheme}}-cast-button-container\" ba-show=\"{{castbuttonvisble}}\">\n\t\t<button tabindex=\"6\" class=\"{{csstheme}}-gcast-button\" is=\"google-cast-button\"></button>\n\t</div>\n\n\t<div tabindex=\"5\" data-selector=\"button-stream-label\"\n\t\t ba-hotkey:space^enter=\"{{toggle_stream()}}\" onmouseout=\"this.blur()\"\n\t\t class=\"{{csstheme}}-rightbutton-container\" ba-if=\"{{streams.length > 1 && currentstream}}\"\n\t\t ba-click=\"{{toggle_stream()}}\" title=\"{{string('change-resolution')}}\"\n\t>\n\t\t<div class=\"{{csstheme}}-button-inner\">\n\t\t\t<span class=\"{{csstheme}}-button-text\">{{currentstream_label}}</span>\n\t\t</div>\n\t</div>\n\n\t<div class=\"{{csstheme}}-volumebar\">\n\t\t<div tabindex=\"4\" data-selector=\"button-volume-bar\"\n\t\t\t ba-hotkey:right=\"{{set_volume(volume + 0.1)}}\"\n\t\t\t ba-hotkey:left=\"{{set_volume(volume - 0.1)}}\"\n\t\t\t onmouseout=\"this.blur()\"\n\t\t\t class=\"{{csstheme}}-volumebar-inner\"\n\t\t\t onmousedown=\"{{startUpdateVolume(domEvent)}}\"\n\t\t\t onmouseup=\"{{stopUpdateVolume(domEvent)}}\"\n\t\t\t onmouseleave=\"{{stopUpdateVolume(domEvent)}}\"\n\t\t\t onmousemove=\"{{progressUpdateVolume(domEvent)}}\"\n\t\t>\n\t\t\t<div class=\"{{csstheme}}-volumebar-position\" ba-styles=\"{{{width: Math.ceil(1+Math.min(99, Math.round(volume * 100))) + '%'}}}\" title=\"{{string('volume-button')}}\"></div>\n\t\t</div>\n\t</div>\n\n\t<div tabindex=\"3\" data-selector=\"button-icon-volume\"\n\t\t ba-hotkey:space^enter=\"{{toggle_volume()}}\" onmouseout=\"this.blur()\"\n\t\t class=\"{{csstheme}}-rightbutton-container {{csstheme}}-volume-button-container\"\n\t\t ba-click=\"{{toggle_volume()}}\" title=\"{{string(volume > 0 ? 'volume-mute' : 'volume-unmute')}}\"\n\t>\n\t\t<div class=\"{{csstheme}}-button-inner\">\n\t\t\t<i class=\"{{csscommon + '-icon-volume-' + (volume >= 0.5 ? 'up' : (volume > 0 ? 'down' : 'off')) }}\"></i>\n\t\t</div>\n\t</div>\n\n\t<div class=\"{{csstheme}}-progressbar {{disableseeking ? cssplayer + '-disabled' : ''}}\">\n\t\t<div tabindex=\"2\" data-selector=\"progress-bar-inner\"\n\t\t\t ba-hotkey:right=\"{{seek(position + skipseconds)}}\"\n\t\t\t ba-hotkey:left=\"{{seek(position - skipseconds)}}\"\n\t\t\t onmouseout=\"this.blur()\"\n\t\t\t class=\"{{csstheme}}-progressbar-inner\"\n\t\t     onmousedown=\"{{startUpdatePosition(domEvent)}}\"\n\t\t     onmouseup=\"{{stopUpdatePosition(domEvent)}}\"\n\t\t     onmouseleave=\"{{stopUpdatePosition(domEvent)}}\"\n\t\t     onmousemove=\"{{progressUpdatePosition(domEvent)}}\"\n\t\t>\n\t\t<div class=\"{{csstheme}}-progressbar-cache\" ba-styles=\"{{{width: Math.round(duration ? cached / duration * 100 : 0) + '%'}}}\"></div>\n\t\t<div class=\"{{csstheme}}-progressbar-position\" ba-styles=\"{{{width: Math.round(duration ? position / duration * 100 : 0) + '%'}}}\" title=\"{{string('video-progress')}}\"></div>\n\t</div>\n</div>\n",
            tmplplaybutton: "\n<div tabindex=\"0\" data-selector=\"play-button\"\n     ba-hotkey:space^enter=\"{{play()}}\" onmouseout=\"this.blur()\"\n     onkeydown=\"{{tab_index_move(domEvent, null, 'player-toggle-overlay')}}\"\n     class=\"{{cssplayer}}-playbutton-container\" ba-click=\"{{play()}}\" title=\"{{string('tooltip')}}\"\n>\n\t<div class=\"{{cssplayer}}-playbutton-button\"></div>\n</div>\n\n<div class=\"{{cssplayer}}-rerecord-bar\" ba-if=\"{{rerecordable || submittable}}\">\n\t<div class=\"{{cssplayer}}-rerecord-backbar\"></div>\n\t<div class=\"{{cssplayer}}-rerecord-frontbar\">\n        <div class=\"{{cssplayer}}-rerecord-button-container\" ba-if=\"{{submittable}}\">\n            <div tabindex=\"0\" data-selector=\"player-submit-button\"\n                 ba-hotkey:space^enter=\"{{submit()}}\" onmouseout=\"this.blur()\"\n                 class=\"{{cssplayer}}-rerecord-button\" onclick=\"{{submit()}}\">\n                {{string('submit-video')}}\n            </div>\n        </div>\n        <div class=\"{{cssplayer}}-rerecord-button-container\" ba-if=\"{{rerecordable}}\">\n        \t<div tabindex=\"0\" data-selector=\"player-rerecord-button\"\n                 ba-hotkey:space^enter=\"{{rerecord()}}\" onmouseout=\"this.blur()\"\n                 class=\"{{cssplayer}}-rerecord-button\" onclick=\"{{rerecord()}}\">\n        \t\t{{string('rerecord')}}\n        \t</div>\n        </div>\n\t</div>\n</div>\n",
            cssloader: ie8 ? "ba-videoplayer" : "",
            cssmessage: "ba-videoplayer",
            cssplaybutton: ie8 ? "ba-videoplayer" : ""
        }
    };
});
Scoped.extend("module:Assets.recorderthemes", [
    "dynamics:Parser"
], function(Parser) {
    Parser.registerFunctions({
        /**/"css": function (obj) { with (obj) { return css; } }, "csscommon": function (obj) { with (obj) { return csscommon; } }, "actions.first().get('icon')": function (obj) { with (obj) { return actions.first().get('icon'); } }, "actions": function (obj) { with (obj) { return actions; } }, "click_action(action)": function (obj) { with (obj) { return click_action(action); } }, "action.index": function (obj) { with (obj) { return action.index; } }, "action.select && action.capture": function (obj) { with (obj) { return action.select && action.capture; } }, "select_file_action(action, domEvent)": function (obj) { with (obj) { return select_file_action(action, domEvent); } }, "action.accept": function (obj) { with (obj) { return action.accept; } }, "action.select && !action.capture": function (obj) { with (obj) { return action.select && !action.capture; } }, "action.label": function (obj) { with (obj) { return action.label; } }/**/
    });
    return {
        "modern": {
            css: "ba-videorecorder",
            csstheme: "ba-recorder-theme-modern",
            cssrecorder: "ba-recorder",
            cssloader: "ba-videorecorder",
            tmplchooser: "<div class=\"{{css}}-chooser-container\">\n\n\t<div class=\"{{css}}-chooser-button-container\">\n\n\t\t<div class=\"{{css}}-chooser-icon-container\">\n\t\t\t<i class=\"{{csscommon}}-icon-{{actions.first().get('icon')}}\"></i>\n\t\t</div>\n\t\t<div ba-repeat=\"{{action :: actions}}\">\n\t\t\t<div tabindex=\"0\"\n\t\t\t\tba-hotkey:space^enter=\"{{click_action(action)}}\" onmouseout=\"this.blur()\"\n\t\t\t\t class=\"{{css}}-chooser-button-{{action.index}}\"\n\t\t\t\t ba-click=\"{{click_action(action)}}\"\n\t\t\t>\n\t\t\t\t<input ba-if=\"{{action.select && action.capture}}\"\n\t\t\t\t\t   type=\"file\"\n\t\t\t\t\t   class=\"{{css}}-chooser-file\"\n\t\t\t\t\t   onchange=\"{{select_file_action(action, domEvent)}}\"\n\t\t\t\t\t   accept=\"{{action.accept}}\"\n\t\t\t\t\t   capture />\n\t\t\t\t<input ba-if=\"{{action.select && !action.capture}}\"\n\t\t\t\t\t   type=\"file\"\n\t\t\t\t\t   class=\"{{css}}-chooser-file\"\n\t\t\t\t\t   onchange=\"{{select_file_action(action, domEvent)}}\"\n\t\t\t\t\t   accept=\"{{action.accept}}\"\n\t\t\t\t/>\n\t\t\t\t<span>\n\t\t\t\t\t{{action.label}}\n\t\t\t\t</span>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n"
        }
    };
});
Scoped.extend("module:Assets.imageviewerthemes", [
    "browser:Info",
    "dynamics:Parser"
], function(Info, Parser) {
    var ie8 = Info.isInternetExplorer() && Info.internetExplorerVersion() <= 8;
    Parser.registerFunctions({
        /**/"css": function (obj) { with (obj) { return css; } }, "activitydelta > 5000 && hideoninactivity ? (css + '-dashboard-hidden') : ''": function (obj) { with (obj) { return activitydelta > 5000 && hideoninactivity ? (css + '-dashboard-hidden') : ''; } }, "title": function (obj) { with (obj) { return title; } }, "submit()": function (obj) { with (obj) { return submit(); } }, "submittable": function (obj) { with (obj) { return submittable; } }, "string('submit-image')": function (obj) { with (obj) { return string('submit-image'); } }, "rerecord()": function (obj) { with (obj) { return rerecord(); } }, "rerecordable": function (obj) { with (obj) { return rerecordable; } }, "string('rerecord-image')": function (obj) { with (obj) { return string('rerecord-image'); } }, "csscommon": function (obj) { with (obj) { return csscommon; } }, "toggle_fullscreen()": function (obj) { with (obj) { return toggle_fullscreen(); } }, "tab_index_move(domEvent)": function (obj) { with (obj) { return tab_index_move(domEvent); } }, "fullscreen": function (obj) { with (obj) { return fullscreen; } }, "fullscreened ? string('exit-fullscreen-image') : string('fullscreen-image')": function (obj) { with (obj) { return fullscreened ? string('exit-fullscreen-image') : string('fullscreen-image'); } }, "fullscreened ? 'small' : 'full'": function (obj) { with (obj) { return fullscreened ? 'small' : 'full'; } }/**/
    });
    return {
        "modern": {
            css: "ba-imageviewer",
            csstheme: "ba-imageviewer-theme-modern",
            tmplcontrolbar: "<div data-selector=\"image-title-block\" class=\"{{css}}-image-title-container {{activitydelta > 5000 && hideoninactivity ? (css + '-dashboard-hidden') : ''}}\" ba-if=\"{{title}}\">\n\t<p class=\"{{css}}-image-title\">\n\t\t{{title}}\n\t</p>\n</div>\n\n<div class=\"{{css}}-dashboard {{activitydelta > 5000 && hideoninactivity ? (css + '-dashboard-hidden') : ''}}\">\n\n    <div tabindex=\"0\" data-selector=\"submit-image-button\"\n\t\t ba-hotkey:space^enter=\"{{submit()}}\" onmouseout=\"this.blur()\"\n\t\t class=\"{{css}}-leftbutton-container\"\n\t\t ba-if=\"{{submittable}}\" ba-click=\"{{submit()}}\"\n\t>\n        <div class=\"{{css}}-button-inner\">\n        \t{{string('submit-image')}}\n        </div>\n    </div>\n\n    <div tabindex=\"0\" data-selector=\"button-icon-ccw\"\n\t\t ba-hotkey:space^enter=\"{{rerecord()}}\" onmouseout=\"this.blur()\"\n\t\t class=\"{{css}}-leftbutton-container\"\n\t\t ba-if=\"{{rerecordable}}\" ba-click=\"{{rerecord()}}\" title=\"{{string('rerecord-image')}}\"\n\t>\n    \t<div class=\"{{css}}-button-inner\">\n    \t\t<i class=\"{{csscommon}}-icon-ccw\"></i>\n    \t</div>\n    </div>\n\n\t<div tabindex=\"8\" data-selector=\"button-icon-resize-full\"\n\t\t ba-hotkey:space^enter=\"{{toggle_fullscreen()}}\" onmouseout=\"this.blur()\"\n\t\t onkeydown=\"{{tab_index_move(domEvent)}}\"\n\t\t class=\"{{css}}-rightbutton-container\"\n\t\tba-if=\"{{fullscreen}}\" ba-click=\"{{toggle_fullscreen()}}\" title=\"{{ fullscreened ? string('exit-fullscreen-image') : string('fullscreen-image') }}\"\n\t>\n\t\t<div class=\"{{css}}-button-inner {{css}}-full-screen-btn-inner\">\n\t\t\t<i class=\"{{csscommon}}-icon-resize-{{fullscreened ? 'small' : 'full'}}\"></i>\n\t\t</div>\n\t</div>\n\n\n</div>\n",
            cssloader: ie8 ? "ba-imageviewer" : "",
            cssmessage: "ba-imageviewer"
        }
    };
});
Scoped.extend("module:Assets.audioplayerthemes", [
    "browser:Info",
    "dynamics:Parser"
], function(Info, Parser) {
    var ie8 = Info.isInternetExplorer() && Info.internetExplorerVersion() <= 8;
    Parser.registerFunctions({
        /**/"csstheme": function (obj) { with (obj) { return csstheme; } }, "title": function (obj) { with (obj) { return title; } }, "submit()": function (obj) { with (obj) { return submit(); } }, "submittable": function (obj) { with (obj) { return submittable; } }, "string('submit-audio')": function (obj) { with (obj) { return string('submit-audio'); } }, "rerecord()": function (obj) { with (obj) { return rerecord(); } }, "rerecordable": function (obj) { with (obj) { return rerecordable; } }, "string('rerecord-audio')": function (obj) { with (obj) { return string('rerecord-audio'); } }, "csscommon": function (obj) { with (obj) { return csscommon; } }, "play()": function (obj) { with (obj) { return play(); } }, "tab_index_move(domEvent, null, 'button-icon-pause')": function (obj) { with (obj) { return tab_index_move(domEvent, null, 'button-icon-pause'); } }, "!playing": function (obj) { with (obj) { return !playing; } }, "string('play-audio')": function (obj) { with (obj) { return string('play-audio'); } }, "pause()": function (obj) { with (obj) { return pause(); } }, "tab_index_move(domEvent, null, 'button-icon-play')": function (obj) { with (obj) { return tab_index_move(domEvent, null, 'button-icon-play'); } }, "disablepause ? cssplayer + '-disabled' : ''": function (obj) { with (obj) { return disablepause ? cssplayer + '-disabled' : ''; } }, "playing": function (obj) { with (obj) { return playing; } }, "disablepause ? string('pause-audio-disabled') : string('pause-audio')": function (obj) { with (obj) { return disablepause ? string('pause-audio-disabled') : string('pause-audio'); } }, "string('elapsed-time')": function (obj) { with (obj) { return string('elapsed-time'); } }, "formatTime(position)": function (obj) { with (obj) { return formatTime(position); } }, "formatTime(duration || position)": function (obj) { with (obj) { return formatTime(duration || position); } }, "set_volume(volume + 0.1)": function (obj) { with (obj) { return set_volume(volume + 0.1); } }, "set_volume(volume - 0.1)": function (obj) { with (obj) { return set_volume(volume - 0.1); } }, "startUpdateVolume(domEvent)": function (obj) { with (obj) { return startUpdateVolume(domEvent); } }, "stopUpdateVolume(domEvent)": function (obj) { with (obj) { return stopUpdateVolume(domEvent); } }, "progressUpdateVolume(domEvent)": function (obj) { with (obj) { return progressUpdateVolume(domEvent); } }, "{width: Math.ceil(1+Math.min(99, Math.round(volume * 100))) + '%'}": function (obj) { with (obj) { return {width: Math.ceil(1+Math.min(99, Math.round(volume * 100))) + '%'}; } }, "string('volume-button')": function (obj) { with (obj) { return string('volume-button'); } }, "toggle_volume()": function (obj) { with (obj) { return toggle_volume(); } }, "string(volume > 0 ? 'volume-mute' : 'volume-unmute')": function (obj) { with (obj) { return string(volume > 0 ? 'volume-mute' : 'volume-unmute'); } }, "csscommon + '-icon-volume-' + (volume >= 0.5 ? 'up' : (volume > 0 ? 'down' : 'off'))": function (obj) { with (obj) { return csscommon + '-icon-volume-' + (volume >= 0.5 ? 'up' : (volume > 0 ? 'down' : 'off')); } }, "disableseeking ? cssplayer + '-disabled' : ''": function (obj) { with (obj) { return disableseeking ? cssplayer + '-disabled' : ''; } }, "seek(position + skipseconds)": function (obj) { with (obj) { return seek(position + skipseconds); } }, "seek(position - skipseconds)": function (obj) { with (obj) { return seek(position - skipseconds); } }, "startUpdatePosition(domEvent)": function (obj) { with (obj) { return startUpdatePosition(domEvent); } }, "stopUpdatePosition(domEvent)": function (obj) { with (obj) { return stopUpdatePosition(domEvent); } }, "progressUpdatePosition(domEvent)": function (obj) { with (obj) { return progressUpdatePosition(domEvent); } }, "{width: Math.round(duration ? cached / duration * 100 : 0) + '%'}": function (obj) { with (obj) { return {width: Math.round(duration ? cached / duration * 100 : 0) + '%'}; } }, "{width: Math.round(duration ? position / duration * 100 : 0) + '%'}": function (obj) { with (obj) { return {width: Math.round(duration ? position / duration * 100 : 0) + '%'}; } }, "string('audio-progress')": function (obj) { with (obj) { return string('audio-progress'); } }/**/
    });
    return {
        "modern": {
            css: "ba-audioplayer",
            csstheme: "ba-player-theme-modern",
            tmplcontrolbar: "<div data-selector=\"audio-title-block\" class=\"{{csstheme}}-title-container \" ba-if=\"{{title}}\">\n\t<p class=\"{{csstheme}}-title\">\n\t\t{{title}}\n\t</p>\n</div>\n\n<div class=\"{{csstheme}}-dashboard \">\n\n    <div tabindex=\"0\" data-selector=\"submit-audio-button\"\n\t\t ba-hotkey:space^enter=\"{{submit()}}\" onmouseout=\"this.blur()\"\n\t\t class=\"{{csstheme}}-leftbutton-container\"\n\t\t ba-if=\"{{submittable}}\" ba-click=\"{{submit()}}\"\n\t>\n        <div class=\"{{csstheme}}-button-inner\">\n        \t{{string('submit-audio')}}\n        </div>\n    </div>\n\n    <div tabindex=\"0\" data-selector=\"button-icon-ccw\"\n\t\t ba-hotkey:space^enter=\"{{rerecord()}}\" onmouseout=\"this.blur()\"\n\t\t class=\"{{csstheme}}-leftbutton-container\"\n\t\t ba-if=\"{{rerecordable}}\" ba-click=\"{{rerecord()}}\" title=\"{{string('rerecord-audio')}}\"\n\t>\n    \t<div class=\"{{csstheme}}-button-inner\">\n    \t\t<i class=\"{{csscommon}}-icon-ccw\"></i>\n    \t</div>\n    </div>\n\n\t<div tabindex=\"0\" data-selector=\"button-icon-play\"\n\t\t ba-hotkey:space^enter=\"{{play()}}\" onmouseout=\"this.blur()\"\n\t\t onkeydown=\"{{tab_index_move(domEvent, null, 'button-icon-pause')}}\"\n\t\t class=\"{{csstheme}}-leftbutton-container\"\n\t\t ba-if=\"{{!playing}}\" ba-click=\"{{play()}}\" title=\"{{string('play-audio')}}\"\n\t>\n\t\t<div class=\"{{csstheme}}-button-inner\">\n\t\t\t<i class=\"{{csscommon}}-icon-play\"></i>\n\t\t</div>\n\t</div>\n\n\t<div tabindex=\"0\" data-selector=\"button-icon-pause\"\n\t\t ba-hotkey:space^enter=\"{{pause()}}\" onmouseout=\"this.blur()\"\n\t\t onkeydown=\"{{tab_index_move(domEvent, null, 'button-icon-play')}}\"\n\t\t class=\"{{csstheme}}-leftbutton-container {{disablepause ? cssplayer + '-disabled' : ''}}\"\n\t\t ba-if=\"{{playing}}\" ba-click=\"{{pause()}}\" title=\"{{disablepause ? string('pause-audio-disabled') : string('pause-audio')}}\"\n\t>\n\t\t<div class=\"{{csstheme}}-button-inner\">\n\t\t\t<i class=\"{{csscommon}}-icon-pause\"></i>\n\t\t</div>\n\t</div>\n\t<div class=\"{{csstheme}}-time-container\">\n\t\t<div class=\"{{csstheme}}-time-value\" title=\"{{string('elapsed-time')}}\">{{formatTime(position)}}/{{formatTime(duration || position)}}</div>\n\t</div>\n\n\n\t<div class=\"{{csstheme}}-volumebar\">\n\t\t<div tabindex=\"4\" data-selector=\"button-volume-bar\"\n\t\t\t ba-hotkey:right=\"{{set_volume(volume + 0.1)}}\"\n\t\t\t ba-hotkey:left=\"{{set_volume(volume - 0.1)}}\"\n\t\t\t onmouseout=\"this.blur()\"\n\t\t\t class=\"{{csstheme}}-volumebar-inner\"\n\t\t\t onmousedown=\"{{startUpdateVolume(domEvent)}}\"\n\t\t\t onmouseup=\"{{stopUpdateVolume(domEvent)}}\"\n\t\t\t onmouseleave=\"{{stopUpdateVolume(domEvent)}}\"\n\t\t\t onmousemove=\"{{progressUpdateVolume(domEvent)}}\"\n\t\t>\n\t\t\t<div class=\"{{csstheme}}-volumebar-position\" ba-styles=\"{{{width: Math.ceil(1+Math.min(99, Math.round(volume * 100))) + '%'}}}\" title=\"{{string('volume-button')}}\"></div>\n\t\t</div>\n\t</div>\n\n\t<div tabindex=\"3\" data-selector=\"button-icon-volume\"\n\t\t ba-hotkey:space^enter=\"{{toggle_volume()}}\" onmouseout=\"this.blur()\"\n\t\t class=\"{{csstheme}}-rightbutton-container {{csstheme}}-volume-button-container\"\n\t\t ba-click=\"{{toggle_volume()}}\" title=\"{{string(volume > 0 ? 'volume-mute' : 'volume-unmute')}}\"\n\t>\n\t\t<div class=\"{{csstheme}}-button-inner\">\n\t\t\t<i class=\"{{csscommon + '-icon-volume-' + (volume >= 0.5 ? 'up' : (volume > 0 ? 'down' : 'off')) }}\"></i>\n\t\t</div>\n\t</div>\n\n\t<div class=\"{{csstheme}}-progressbar {{disableseeking ? cssplayer + '-disabled' : ''}}\">\n\t\t<div tabindex=\"2\" data-selector=\"progress-bar-inner\"\n\t\t\t ba-hotkey:right=\"{{seek(position + skipseconds)}}\"\n\t\t\t ba-hotkey:left=\"{{seek(position - skipseconds)}}\"\n\t\t\t onmouseout=\"this.blur()\"\n\t\t\t class=\"{{csstheme}}-progressbar-inner\"\n\t\t     onmousedown=\"{{startUpdatePosition(domEvent)}}\"\n\t\t     onmouseup=\"{{stopUpdatePosition(domEvent)}}\"\n\t\t     onmouseleave=\"{{stopUpdatePosition(domEvent)}}\"\n\t\t     onmousemove=\"{{progressUpdatePosition(domEvent)}}\"\n\t\t>\n\t\t<div class=\"{{csstheme}}-progressbar-cache\" ba-styles=\"{{{width: Math.round(duration ? cached / duration * 100 : 0) + '%'}}}\"></div>\n\t\t<div class=\"{{csstheme}}-progressbar-position\" ba-styles=\"{{{width: Math.round(duration ? position / duration * 100 : 0) + '%'}}}\" title=\"{{string('audio-progress')}}\"></div>\n\t</div>\n</div>\n",
            cssloader: ie8 ? "ba-audioplayer" : "",
            cssmessage: "ba-audioplayer",
            cssplaybutton: ie8 ? "ba-audioplayer" : ""
        }
    };
});
Scoped.extend("module:Assets.audiorecorderthemes", [
    "dynamics:Parser"
], function(Parser) {
    Parser.registerFunctions({
        /**/"css": function (obj) { with (obj) { return css; } }, "csscommon": function (obj) { with (obj) { return csscommon; } }, "actions.first().get('icon')": function (obj) { with (obj) { return actions.first().get('icon'); } }, "actions": function (obj) { with (obj) { return actions; } }, "click_action(action)": function (obj) { with (obj) { return click_action(action); } }, "action.index": function (obj) { with (obj) { return action.index; } }, "action.select && action.capture": function (obj) { with (obj) { return action.select && action.capture; } }, "select_file_action(action, domEvent)": function (obj) { with (obj) { return select_file_action(action, domEvent); } }, "action.accept": function (obj) { with (obj) { return action.accept; } }, "action.select && !action.capture": function (obj) { with (obj) { return action.select && !action.capture; } }, "action.label": function (obj) { with (obj) { return action.label; } }/**/
    });
    return {
        "modern": {
            css: "ba-audiorecorder",
            csstheme: "ba-audiorecorder-theme-modern",
            cssrecorder: "ba-recorder",
            //            cssmessage: "ba-audiorecorder",
            cssloader: "ba-audiorecorder",
            tmplchooser: "<div class=\"{{css}}-chooser-container\">\n\n\t<div class=\"{{css}}-chooser-button-container\">\n\n\t\t<div class=\"{{css}}-chooser-icon-container\">\n\t\t\t<i class=\"{{csscommon}}-icon-{{actions.first().get('icon')}}\"></i>\n\t\t</div>\n\t\t<div ba-repeat=\"{{action :: actions}}\">\n\t\t\t<div tabindex=\"0\"\n\t\t\t\tba-hotkey:space^enter=\"{{click_action(action)}}\" onmouseout=\"this.blur()\"\n\t\t\t\t class=\"{{css}}-chooser-button-{{action.index}}\"\n\t\t\t\t ba-click=\"{{click_action(action)}}\"\n\t\t\t>\n\t\t\t\t<input ba-if=\"{{action.select && action.capture}}\"\n\t\t\t\t\t   type=\"file\"\n\t\t\t\t\t   class=\"{{css}}-chooser-file\"\n\t\t\t\t\t   onchange=\"{{select_file_action(action, domEvent)}}\"\n\t\t\t\t\t   accept=\"{{action.accept}}\"\n\t\t\t\t\t   capture />\n\t\t\t\t<input ba-if=\"{{action.select && !action.capture}}\"\n\t\t\t\t\t   type=\"file\"\n\t\t\t\t\t   class=\"{{css}}-chooser-file\"\n\t\t\t\t\t   onchange=\"{{select_file_action(action, domEvent)}}\"\n\t\t\t\t\t   accept=\"{{action.accept}}\"\n\t\t\t\t/>\n\t\t\t\t<span>\n\t\t\t\t\t{{action.label}}\n\t\t\t\t</span>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n"
        }
    };
});
}).call(Scoped);