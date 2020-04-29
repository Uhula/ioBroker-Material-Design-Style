/* 
#### Material Design CSS for ioBroker.vis
(c) 2017ff Uhula, MIT License
   
version: v2.5 30.04.2020

source: https://github.com/Uhula/ioBroker-Material-Design-Style
changelog: https://github.com/Uhula/ioBroker-Material-Design-Style/blob/master/changelog.MD
*/

// Zur sicheren CSS-Erkennung der Runtime eine CSS-Klasse anlegen
document.documentElement.className +=  " mdui-runtime";

// Überprüfen ob touch zur Verfügung steht und entsprechend eine 
// CSS Klasse touch bzw no-touch erzeugen 
document.documentElement.className += 
    (("ontouchstart" in document.documentElement) ? " mdui-touch" : " mdui-notouch");


/* -----
   MDUI
   ----- 
   Sammlung von JS-Funktionen für das Material Design
   (c) 2017ff Uhula, MIT License
*/

var MDUI = (function () {


let defConfig = {"primary_color":"indigo",
                 "secondary_color":"blue",
                 "content_color":"#f8f8f8",
                 "color1":"#ff0000",
                 "color1_dark":"#800000",
                 "color2":"#00ff00",
                 "color2_dark":"#008000",
                 "color3":"#0000ff",
                 "color3_dark":"#000080"
                },
    lastConfig = defConfig,
    styleSheet = null,
    lastPageID = "";
    observerSlider = null;
    observerConfig = null;
    observerPage = null;
    observerDialog = null;
    swipe = {enabled:false};
    tooltip = {hint:null, timeout:null};
    lockclick = false;

//                      light         normal        dark 
let colors = { 
        red:        {c200:"#ff7961", c500:"#f44336", c700:"#ba000d" },
        pink:       {c200:"#ff6090", c500:"#e91e63", c700:"#b0003a" },
        purple:     {c200:"#d05ce3", c500:"#9c27b0", c700:"#6a0080" },
        deeppurple: {c200:"#9a67ea", c500:"#673ab7", c700:"#320b86" },
        indigo:     {c200:"#757de8", c500:"#3f51b5", c700:"#002984" },
        blue:       {c200:"#6ec6ff", c500:"#2196f3", c700:"#0069c0" },
        lightblue:  {c200:"#67daff", c500:"#03a9f4", c700:"#007ac1" },
        cyan:       {c200:"#62efff", c500:"#00bcd4", c700:"#008ba3" },
        teal:       {c200:"#52c7b8", c500:"#009688", c700:"#00675b" },
        green:      {c200:"#80e27e", c500:"#4caf50", c700:"#087f23" },
        lightgreen: {c200:"#bef67a", c500:"#8bc34a", c700:"#5a9216" },
        lime:       {c200:"#ffff6e", c500:"#cddc39", c700:"#99aa00" },
        yellow:     {c200:"#ffff72", c500:"#ffeb3b", c700:"#c8b900" },
        amber:      {c200:"#fff350", c500:"#ffc107", c700:"#c79100" },
        orange:     {c200:"#ffc947", c500:"#ff9800", c700:"#c66900" },
        deeporange: {c200:"#ff8a50", c500:"#ff5722", c700:"#c41c00" },
        brown:      {c200:"#a98274", c500:"#795548", c700:"#4b2c20" },
        grey:       {c200:"#cfcfcf", c500:"#9e9e9e", c700:"#707070" },
        darkgrey:   {c200:"#383838", c500:"#303030", c700:"#212121" },
        bluegrey:   {c200:"#8eacbb", c500:"#607d8b", c700:"#34515e" },
        white:      {c200:"#ffffff", c500:"#f8f8f8", c700:"#f0f0f0" },
        black:      {c200:"#303030", c500:"#212121", c700:"#000000" }
        
     };


function _init() {
    observerSlider = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            _onChangeSlider( mutation.target );
        });
    });
    observerConfig = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            _onChangeConfig( mutation.target );
        });
    });
    observerPage = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            _onChangePage( mutation.target );
        });
    });
    observerDialog = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            _onChangeDialog( mutation.target );
        });
    });
}

// für alle ui-slider-handle Instanzen "style" überwachen um die Wertanzeige via css
// durchführen zu können (vis rendert dort die left/bottom neu)
function _initObserverSlider() {
    observerSlider.disconnect();
    let nodelist = document.querySelectorAll('.mdui-slider .ui-slider-handle');
    if (nodelist) {
        let i;
        for (i = 0; i < nodelist.length; i++) {
           _onChangeSlider( nodelist[i] );
           observerSlider.observe(nodelist[i], {
              attributes: true,
              attributeFilter: ["style"]
           });
        }
    }
    
}

// für mdui-config Elemente überwachen
function _initObserverConfig() {
    observerConfig.disconnect();
    let nodelist = document.querySelectorAll('.mdui-config');
    if (nodelist) {
        let i;
        for (i = 0; i < nodelist.length; i++) {
           observerConfig.observe(nodelist[i], {
              subtree: true,
              childList: true
           });
        }
    }
    
}

// vis_container überwachen: childlist
function _initObserverPage() {
    observerPage.disconnect();
    let nodelist = document.querySelectorAll('#vis_container');
    if (nodelist) {
        let i;
        for (i = 0; i < nodelist.length; i++) {
           observerPage.observe(nodelist[i], {
              subtree: true,
              childList: true
           });
        }
    }
    
}

// ui-dialog
function _initObserverDialog() {
    observerDialog.disconnect();
    let nodelist = document.querySelectorAll('.ui-dialog');
    if (nodelist) {
        let i;
        for (i = 0; i < nodelist.length; i++) {
           observerDialog.observe(nodelist[i], {
              attributes: true,
              attributeFilter: ["style"]
           });
        }
    }
}

// ui-slider haben keine Werte im HTML, lediglich "left" bzw. "bottom" (bei vertikal)
// werden für das ui-slider-handle gerendert. Hier wird dieser Wert in ein
// neues Attribut "mdui-slider-value" gesetzt um dieses via CSS als Bubble
// anzeigen zu können
function _onChangeSlider( ele ) {
    let value = "0%";
    if (ele.style.left!=="")
        value = ele.style.left;
    if (ele.style.bottom!=="")
        value = ele.style.bottom;
    // nn% -> nn
    value = value.replace(/%/g, "");
    if (ele.style.left!=="")
        ele.style.width = (100 - value) + "%";
    if (ele.style.bottom!=="")
        ele.style.height = (100 - value) + "%";

    // mdui-range angegeben?
    let values = ele.parentElement.parentElement.className;
    values = _getSuffix(values, "mdui-range-");
    if (values!="") {
        values = values.split("-");
        if (values.length>1)
            value = value/100 * (values[1]-values[0]) + values[0] * 1.0;
        else if (values.length>0)
            value = value/100 * values[0];
    }

    if (Math.abs(value)<10)
      value = Math.round( value*10 ) / 10;
    else 
      value = Math.round( value );
    ele.setAttribute("mdui-slider-value",value);

}

// wenn sich die config ändert, muss evtl ein reload der Seite stattfinden
function _onChangeConfig( ele ) {
    _getConfig();
    _patchColors();
    _patchWidgetColors();
    _initObserverConfig();
}


function _onLoad() {
  let sel = "#"+lastPageID+" ";
  try {
        $(sel+"[class*='mdui-onload'][class*='mdui-expand']:not(.mdui-active)").each( function (index) {
            _toggleExpand( $(this) );
        });
        $(sel+"[class*='mdui-onload'][class*='mdui-toggle']:not(.mdui-active)").each( function (index) {
            _handleToggle( $(this) );
        });
        $(sel+"[class*='mdui-onload'][class*='mdui-fullscreen']:not(.mdui-active)").each( function (index) {
            _toggleFullscreen( $(this) );
        });
  } catch(err) { console.log("[MDUI._onLoad] ",err.message ); } 
    
}

// wenn sich die config ändert, muss evtl ein reload der Seite stattfinden
function _onChangePage( ele ) {
    let pageID = "";
    let $eles = $( "#vis_container>:not([style*='display: none'])[id*='visview_']" );
    if ( $eles.length < 1 || $eles.length > 2) return;

    pageID = $eles[$eles.length-1].id;
//console.log("[MDUI.onChangePage] ",lastPageID," ",pageID);            

    // wenn ein ui-datepicker hinzugekommen ist, dann dort die Farben anpassen
    if (this.datepickerCount != $(".ui-datepicker").length ) {
        this.datepickerCount = $(".ui-datepicker").length;
        _patchColors();
    }

    // beim Seitenwechsel ausführen
    if ( (pageID!="") && (lastPageID!=pageID) ) {
        lastPageID=pageID;
        setTimeout( function () { 
            _getConfig();
            _patchColors();
            _patchWidgetColors();
            _handleTables();
            _handleDialogs();
            _handleInputs();
            _handleVIS();
            _initObserverSlider();
            _initObserverConfig();
            _initObserverDialog();
            _onResizeWindow( $(window) ); 
            _onLoad();
            
            // favicon anpassen
            $("#vis_container>:not([style*='display: none']) .mdui-favicon img").each( function (index) {
                if ($(this)[0].src)
                     $("link[rel='shortcut icon']").attr("href", $(this)[0].src);
            });
            
            // page-name anpassen
            let pagename = decodeURI( window.location.hash.substr(1,255) );
            $(".mdui-page-name").each( function (index) {
                $(this).html( pagename );
            });
            $(".mdui-page-title").each( function (index) {
                // "pageMeine_ioBroker_Vis" -> "Meine ioBroker Vis"
                let title = '';
                let c;
                for (let i=0; i<pagename.length; i++) {
                    c = pagename[i];
                    if (title=='') {
                        if (c==c.toUpperCase()) title += c; 
                    } else {
                        if (c=='_') c = ' '; 
                        title += c;
                    }    
                }
                $(this).html( title );
            });

        }, 100);
    }
    _initObserverPage();
}

// wenn ein Dialog sichtbar wird, dann seine Farben anpassen
function _onChangeDialog( ele ) {
    _patchWidgetColors();
    //_handleDialogs();
    _initObserverDialog();
}

// liefert den suffix einer gegebenen class zurück
// Bsp: mdui-target-w00002 -> w00002
//      mdui-range-100-200 -> 100-200
function _getSuffix( s, classname ) {
    let suf = "";
    if (s.includes(classname)) {
        suf = s.substr(s.indexOf(classname)+classname.length,1000)+" ";
        suf = suf.substr(0,suf.indexOf(" "));
    }
    return suf;    
}

// liefert den suffix einer gegebenen class eine $ele zurück
function _getClassSuffix( $ele, classname ) {
    if ($ele) 
        return _getSuffix($ele.attr( "class" ),classname);
    else     
        return "";    
}

// aktuelle mdui-config entladen
function _getConfig() {
    $("#vis_container>:not([style*='display: none']) [class*='mdui-config ']").each( function (index) {
        try {
            lastConfig = JSON.parse("{"+$(this)[0].innerText+"}");
        } catch(err) { console.log( "MDUI._getConfig: ", err.message ); }             
    });
    if (!lastConfig.hasOwnProperty("primary_color")) 
        lastConfig.primary_color = defConfig.primary_color
    if (!lastConfig.hasOwnProperty("secondary_color")) 
        lastConfig.secondary_color = defConfig.secondary_color;
    if (!lastConfig.hasOwnProperty("content_color")) 
        lastConfig.content_color = defConfig.content_color;
}

//
function _getGroupID( ele ) { return _getClassSuffix(ele, "mdui-group-" ); }
//
function _getTargetID( ele ) { return _getClassSuffix(ele, "mdui-target-" ); }

//
function _getScrollbarWidth() {
    let $outer = $('<div>').css({visibility: 'hidden', width: 100, overflow: 'scroll'}).appendTo('body'),
        widthWithScroll = $('<div>').css({width: '100%'}).appendTo($outer).outerWidth();
    $outer.remove();
    return 100 - widthWithScroll;
}
//
function _getScrollbarHeight() {
    var $outer = $('<div>').css({visibility: 'hidden', height: 100, overflow: 'scroll'}).appendTo('body'),
        heightWithScroll = $('<div>').css({height: '100%'}).appendTo($outer).outerHeight();
    $outer.remove();
    return 100 - heightWithScroll;
}

// action: command(param1,param2,...)
function _executeAction(action){ try {
    if (action) {
        let cmd = action.split('(')[0];
        let param = action.split('(')[1];
        param = param.slice(0,param.length-1);
        param = param.split(',');
        switch (cmd.toUpperCase() ) {
            case 'SETVALUE' :
                vis.setValue(param[0], param[1]);
                break;
            case 'CHANGEVIEW' :
                vis.changeView( param[0] );
                break;
            //showMessage(message, title, icon, width, callback)                
            case 'SHOWMESSAGE' :
                vis.showMessage( param[0], param[1], param[2], param[3] );
                _patchColors();
                break;
        }
    }
} catch(err) { console.log( "[MDUI._executeAction] " + err.message ); } 
}


function _isDarkTheme(ele) {
  while (ele) {
      if (ele.classList.contains('mdui-dark'))
          return true;
      ele = ele.parentElement;
  };
  return false;
}


function _formatDatetime(date, format) {
    function fill(comp) {
        return ((parseInt(comp) < 10) ? ('0' + comp) : comp)
    }
        
    var months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    var d = format;
    var o = {
            "y+": date.getFullYear(), // year
            "m+": fill(date.getMonth()+1), //month
            "M+": months[date.getMonth()], //month
            "d+": fill(date.getDate()), //day
            "H+": fill((date.getHours() > 12) ? date.getHours() % 12 : date.getHours()), //hour
            "h+": fill(date.getHours()), //hour
            "n+": fill(date.getMinutes()), //minute
            "s+": fill(date.getSeconds()), //second
            "S+": fill(date.getMilliseconds()), //millisecond,
            "b+": (date.getHours() >= 12) ? 'PM' : 'AM'
        };
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            d = d.replace(RegExp.$1, o[k]);
        }
    }
    return d;
}



// alle Elemente mit class "mdui-group-XXX" togglen, in denen 
// XXX aus class "mdui-group-XXX" des ele ist UND
// alle Elemente mit class "mdui-target-XXX" togglen, in denen 
// XXX aus class "mdui-target-XXX" des ele ist
function _handleToggle( $ele ) {
    $ele.toggleClass("ui-state-active");
    $ele.toggleClass("mdui-active");

    var id = _getGroupID( $ele );
    if (id!=="") 
        $("[class*='mdui-group-"+id+"']").not("[class*='mdui-toggle']").each( function (index) {
            $(this).toggleClass("mdui-hide");
            $(this).toggleClass("mdui-hide-show");
        });    
    id = _getTargetID( $ele );
    if (id!=="") 
        $( "[class*='mdui-target-"+id+"']").not("[class*='mdui-toggle']").each( function (index) {
            $(this).toggleClass("mdui-hide");
            $(this).toggleClass("mdui-hide-show");
        });
 
}


// das nächste übergeordnete .mdui-card* Element wird 
// - collapsed, wenn es expanded ist
// - expanded, wenn es collapsed ist
function _toggleExpand( $ele ){
    if (!$ele) return;
    let $target = $ele.closest("[class*='mdui-listitem']");
    if ($target.length===0) $target = $ele.closest("[class*='mdui-card']");
    if ($target.length===0) return;
    // wurde im ele eine Höhe mit angegeben?
    let h = _getClassSuffix( $ele, "mdui-expand-" ) ;
    if (h==="") h="64";
    // element um 180° drehen
    let styleold = $ele.attr("styleold");
    $ele.toggleClass("mdui-active");

    if (styleold) {
        $ele.attr("style",styleold);
        $ele.removeAttr("styleold");
    } else {
        styleold = $ele.attr("style");
        $ele.attr("styleold",styleold);
        $ele.attr("style",styleold + " transform:rotate(180deg); transition:transform 0.33s; ");
    }
    // target Element expandieren oder collabieren
    styleold = $target.attr("styleold") || "";
    if (styleold!=="") {
        $target.attr("style",styleold + " transition:all 0.33s;");
        $target.removeAttr("styleold");
    } else {
        styleold = $target.attr("style") || "";
        if (styleold==="") styleold="top:0;";
        $target.attr("styleold",styleold);
        $target.attr("style",styleold + " max-height:"+h+"px !important; " + " min-height:"+h+"px !important; transition:all 0.33s; ");
    }
}


// das nächste übergeordnete .vis-view Element wird 
// - fullscreen angezeigt, wenn es noch nicht fullscreen ist
// - wieder normal angezeigt, wenn es fullscreen ist
/* <div class="vis-widget mdui-button mdui-fullscreen mdui-center vis-tpl-basic-HTML" style="width: 36px; height: 36px; left: calc(100% - 52px); top: 16px; z-index: 1;" id="w00005">
        <div class="vis-widget-body">
            <i class="material-icons">fullscreen</i>
        </div>
    </div>
    */
function _toggleFullscreen( $ele ){
    if (!$ele) return;
    let $target = $ele.closest(".vis-view");
    if (!$target) return;
    var styleold = $target.attr("styleold");
    $ele.toggleClass("mdui-active");
    
    if (styleold) {
        let html = $ele.html();
        html = html.replace(/fullscreen_exit/g, "fullscreen");
        $ele.html( html );
        $target.attr("style",styleold);
        $target.removeAttr("styleold");
        $target.appendTo(".mdui-id-"+$target.attr("id"));
    } else {
        let html = $ele.html();
        html = html.replace(/fullscreen/g, "fullscreen_exit");
        $ele.html( html );
        $target.parent().addClass("mdui-id-"+$target.attr("id"));
        $target.attr("styleold",$target.attr("style"));
        // dark-theme?
        if ($ele.closest(".mdui-content.mdui-dark").length) $target.addClass("mdui-dark");
        $target.attr("style","position:fixed; left:8px; top:8px; min-width:0; width:calc(100% - 16px); min-height:0; height:calc(100% - 16px); z-index: 2147483647 !important; background-color: "+lastConfig.content_color+" !important;   box-shadow: 0 0 0 1px rgba(0,0,0,0.3), 0 14px 28px rgba(0,0,0,0.65), 0 10px 10px rgba(0,0,0,0.62); border-radius: 4px;");
        $target.appendTo( "body" );
    }
}


// ele muss class Einträge für das Target und den Skalierungsmodus haben
// "mdui-target-(id) mdui-scale-(scalemode)" 
// id: Ziel-Element mit id=id, welches ein zu skalierendes img enthält
// scalemode: fit / hfit / vfit / in / out / (number)
// number: Zahl in %
function _scale( ele ) {
    var id = _getTargetID( ele );
    var $img = $( "#"+id+" img" );
    if ($img) {
        var scale = _getClassSuffix(ele, "mdui-scale-" );
        $img.width("1px"); // Scrollbars entfernen um die echte Höhe zu bekommen
        $img.height("1px");
        var dim = {
            pw : $img.parent().width(), 
            ph : $img.parent().height(), 
            w  : $img[0].naturalWidth, 
            h  : $img[0].naturalHeight
        };
        switch(scale) {
            case "fit":
                if (dim.pw / dim.w < dim.ph / dim.h ) scale = dim.pw / dim.w;  
                else scale = dim.ph / dim.h;
                break;
            case "hfit":
                if (dim.pw / dim.w < dim.ph / dim.h ) scale = dim.pw / dim.w;
                else scale = (dim.pw - _getScrollbarWidth() - 4  ) / dim.w;
                break;
            case "vfit":
                if ( dim.pw / dim.w > dim.ph / dim.h ) scale = dim.ph / dim.h;
                else scale = (dim.ph - _getScrollbarHeight() - 4  ) / dim.h;
                break;
            case "in":
            case "out":
                var old = $img.attr( "style" );
                old = old.substr(old.indexOf("scale(")+6,20);  
                old = old.substr(0,old.indexOf(")"));  
                if (old * 1==0) scale = 1;
                else if (scale=="in") scale = old * 1.41;
                     else scale = old / 1.41;
                break;
            default:
                if (scale<=0 || scale>10000)
                    scale = 100;
                scale = scale/100;
        }
        scale = Math.round(scale*100)/100;
        $img.attr( "style", "position:absolute;top:0;left:0;transform-origin:0 0;transition: transform 0.3s ease-out; transform:scale("+scale+");" );
        }
}

// ersetzt im src-Attribute des Unter-Elements von (id) den "&range=& 
// durch den Wert des in ele angegebenen (span). Für flot-Diagramme
// "mdui-target-(id) mdui-timespan-(span)" 
// id: Ziel-Element mit id=id, welches das flot (src) enthält
// span: inc / dec / (number)
// number: Zahl in Minuten
function _timespan( ele ) {
    var src = "";

    function __patchParam( paramName, offset ) {
        let reParam = RegExp(paramName+"=[^&]*", "i");
        let reVal = RegExp("[+-][0-9]*", "i");
        let param = src.match(reParam);
        console.log("timespan param:",param);                    
        if ( param ) {
            param = param[0];
            let paramval = param.match( reVal );
            if (paramval) {
                paramval = Math.floor(paramval) + offset; 
                param = param.replace( reVal, paramval<0 ? paramval : "-0" );
            } else { 
                if ( (param[param.length-2]=="/") && ("smhdwMy".indexOf(param[param.length-1])>=0) )
                    param = param.substr(0,param.length-2) + (offset<0 ? offset : "-0") + param[param.length-1] + param.substr(param.length-2,2); 
            }
            console.log("timespan src:",src);                    
            src = src.replace(reParam, param);
            console.log("timespan src:",src);    
        }                

    }

    var id = _getTargetID( ele );
    var target = $( "#"+id+" [src]" );
    if (target) {
        let timespan = _getClassSuffix(ele, "mdui-timespan-" );
        src = target.attr( "src" );

        // flot
        if (src.indexOf("&range=">=0)) {
            let min = src.substr(src.indexOf("&range=")+7,20);  
            min = min.substr(0,min.indexOf("&"));  
            switch(timespan) {
                case "inc":
                    min = min * 2;
                    break;
                case "dec":
                    min = min / 2;
                    break;
                default:
                    if ( timespan<=0 )
                        timespan = 1440;
                    min = timespan;
            }
            src = src.replace(/&range=[0-9]*&/g, "&range="+min+"&");
            target.attr("src",src);
        }

        // grafana
        // from=now/d, from=now-1d/d 
        if (src.indexOf("from=">=0) && src.indexOf("to=">=0)) {
            __patchParam( "from", timespan=="inc" ? +1 : -1);
            __patchParam( "to", timespan=="inc" ? +1 : -1);
            target.attr("src",src);
        }
    }
}

// ersetzt im src-Attribute des Unter-Elements von (id) einen url-Parameter
function _srcparam( ele ) {
    var id = _getTargetID( ele );
    var target = $( "#"+id+" [src]" );
    if (target) {
        let params = _getClassSuffix(ele, "mdui-srcparam-" ).split("&");
        let src = target.attr( "src" );

        // grafana
        // http://192.168.2.8:3000/d/ek8fMryWz/iobroker-cpu?orgId=1&from=1580383496316&to=1580405096316&var-ID_WC_Temp=20&var-ID_HZR_Temp=17&panelId=4&fullscreen
        
        for (let i=0; i<params.length; i++) {
            let key = params[i].substr(0,params[i].indexOf("="));
            let value = params[i].substr(key.length+1,1000);
            let re = new RegExp(key+"=[^&]*", 'g');               
            src = src.replace(re, key+"="+value);  // encodeURI()
        }
        target.attr("src",src);
    }
}


/*  */
function _resetTable( $ele, $table ) {
    $table.find("tbody>tr").each( function(index) {
        $(this).width("auto");
        $(this).height("auto");
        $(this).find("td").each( function(index) {
            $(this).attr("labelth","");
        });  
    });
}

/*  */
function _handleTable( $ele, $table, opt ) {

    function setColWidth( colwidth ) {
        $table.find("tbody>tr").each( function(index) {
            $(this).outerWidth(colwidth);
        });
    }
    function setColHeight() {
        var height = 0;
        $table.find("tbody>tr").each( function(index) {
            if ($(this).height() > height ) height = $(this).height();
        });
        if ( height > 0 )
            $table.find("tbody>tr").each( function(index) {
                $(this).height( height );
            });
    }
    
    var innerWidth = $ele.innerWidth();

    _resetTable($ele, $table);
    if (opt.label) {
        // Zellen mit Labels aus <th> ergänzen ?    
        var labels = [];
        $table.find("thead>tr>th").each( function(index) {
            labels[index] = $(this).text();
        });
        $table.find("tbody>tr").each( function(index) {
            $(this).find("td").each( function(index) {
                if (index < labels.length) 
                    $(this).attr("labelth",labels[index]);
            });  
        });
    }

    if (opt.colwidth>1) setColWidth(opt.colwidth);
    if (opt.colwidth>2) setColHeight();

    return true;    
}


/* Alle mdui-table durchlaufen und überprüfen, ob die minimale Width erreicht
wurde um sie in den responsive State zu überführen 
mdui-table-(mode)(-opt1)(-opt2)...(-optn)
mdui-table-ascard-r600-w200-l */
function _handleTables( ) {

    $("[class*='mdui-table-']").each( function (index) {
        var $ele = $(this);
        var $table;
        $table = $ele;
        if (!$table.is("table")) $table=$table.find("table");
        if (!$table.is("table")) return true; // next each 
        
        var innerWidth = $ele.innerWidth();
        var classes = $ele.attr("class")
            .split(" ")
            .filter( function ( ele ) { 
                    return  (ele.indexOf("mdui-table-opt") > -1); });
        var opts = [];
        var opt;
        for (var i = 0; i < classes.length; i++) {
            opts[i] = [];
            opts[i].reswidth = 9999;
            opts[i].colwidth = 0;
            opts[i].label = false;
            opt = classes[i].substr(15,200).split("-"); 
            for (var j = 0; j < opt.length; j++) {
                switch(opt[j][0]) {
                case "r":
                    opts[i].reswidth = parseInt(opt[j].substr(1,5));
                    break;
                case "w":
                    opts[i].colwidth = parseInt(opt[j].substr(1,5));
                    break;
                case "c":
                opts[i].colwidth = parseInt(opt[j].substr(1,5));
                    if (opts[i].colwidth>0) opts[i].colwidth = (innerWidth-_getScrollbarWidth()) / opts[i].colwidth - 10;
                    break;
                case "l":
                    opts[i].label = true;
                    break;
                default:    
                }                       
            }
        }
        opts.sort(function(a, b){return a.reswidth-b.reswidth});
        if (opts.length === 0) return true; // next each 
        var handled = false;
        for (i = 0; i < opts.length; i++) {
            if ( innerWidth < opts[i].reswidth )
               handled = _handleTable( $ele, $table, opts[i]);
            if (handled) break;   
        }
        if (!handled) _resetTable($ele, $table);
    }); 

}

/* Dialogtitle|class=mdui-red-bg|style=min-width:50%;min-height:90%; */
function _handleDialogs( ) { 
  try {
    $("[class*='ui-dialog ']").each( function (index) {
        var $ele = $(this);
        var $title = $ele.find("div>span[class*='ui-dialog-title']");
        if ( ($title) && ($title.html()!=="") ) {
           var html = '';
           var params = $title.html().split("|");
           var param = '';
           for (var p = 0; p < params.length; p++) {
               param = params[p];
               if (param.substr(0,6)=="class=")
                  $ele.addClass(param.substr(6,1024));
               else if (param.substr(0,6)=="style=") {
                       var csss =  $ele.attr('style') + param.substr(6,1024);
                       $ele.attr('style', csss );
                    } else html = html + param + " ";
            }       
            $title.html( html );    
        }
    });

  } catch(err) { console.log("[MDUI.handleDialogs] ", err.message ); } 

}



/* Aus dem "text" Input bei mdui-input-number ein "number" machen */
function _handleInputs( ) { 
  try {
    $("[class*='mdui-placeholder-']").each( function (index) {
        let s = _getClassSuffix( $(this), "mdui-placeholder-" );
        $(this).find("input").each( function (index) {
            $(this)[0].placeholder = s;
        } );
    });
    $(".mdui-input-number input").each( function () {
        let $ele = $(this);
        $ele[0].type = "number";
    });
    $(".mdui-input-color input").each( function () {
        let $ele = $(this);
        $ele[0].type = "color";
    });
    $(".mdui-input-date input").each( function () {
        let $ele = $(this);
        $ele[0].type = "date";
    });
    $(".mdui-input-time input").each( function () {
        let $ele = $(this);
        $ele[0].type = "time";
    });
  } catch(err) { console.log("[MDUI.handleInputs] ", err.message ); } 

}

/*  */
function _handleVIS( ) { try {

    function _addHeadline(headline) {
        return `<tr>
<td class='mdui-value mdui-blue'>${headline}</td>
<td></td>
</tr>`;
    }

    function _addRow(key, keydef, val) {
        let icon = keydef.hasOwnProperty('icon')?keydef.icon:'';
        return `<tr>
<td class='mdui-subtitle' style='width:50%;'>${key}</td>
<td class='mdui-label' style='width:50%;'>${val}</td>
</tr>`;
    }

    const VIS_INFO = {
        'version':{'icon':'build'},
        'user':{'icon':'person'},
        'language':{'icon':'language'},
        'instance':{'icon':'looks_one'},
        'activeView':{'icon':'crop_square'},
        'isTouch':{'icon':'touch_app'},
        '__views_count':{},
        '__states_count':{}
        };
    const VIS_INFO_CONN = {
        'namespace':{},
        '_isConnected':{},
        '_reloadInterval':{},
        '_reconnectInterval':{}
        };
    const HEAD = `<table style='width:100%; table-layout:fixed; word-break:break-all;'>`;
    const FOOT = `</table>`;

    vis.__views_count = Object.keys(vis.views).length;
    vis.__states_count = Math.round( Object.keys(vis.states).length / 4);
        
    $(".mdui-vis-info").each( function () {
        let ele = $(this)[0];
        let html='', key='';
        html += _addHeadline('vis');
        for (key in VIS_INFO) 
            html += _addRow(key,VIS_INFO[key],vis[key]);
            
        html += _addHeadline('vis connection');
        for (key in VIS_INFO_CONN) 
            html += _addRow(key,VIS_INFO_CONN[key],vis.conn[key]);

        html += _addHeadline('views');
        for (key in vis.views) {
            let val=vis.views[key].hasOwnProperty('widgets')?Object.keys(vis.views[key].widgets).length:'0';
            html += _addRow(key,{},val+' Widgets');
        }
        html += _addHeadline('states');
        for (key in vis.states) {
            if (key.includes('.val'))
                html += _addRow(key,{},vis.states[key]);
        }
        
        ele.innerHTML = HEAD + html + FOOT;
    });
} catch(err) { console.log("[MDUI.handleVIS] ", err.message ); } 
}


// wandelt ein integer in die #rrggbb Darstellung um
function _toRGB(n) {
    if ( (n.length>0) && ((n[0]<"0") || (n[0]>"9")) )
        return n;
    if(n < 0) {
        n = 0xFFFFFFFF + n + 1;
    }
    return "#" + ("000000" + n.toString(16).toUpperCase()).substr(-6);
}

// wandelt eine Farbe im hex-Format (#000000) in ein RGB-Array[2] um
function _hexToRGB(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
        ? [parseInt(result[1],16),parseInt(result[2],16),parseInt(result[3],16)]
        : [0,0,0];
};

//
function _hexToRGBA(hex, transparence) {
    let RGB = _hexToRGB(hex);
    return 'rgba('+RGB[0]+','+RGB[1]+','+RGB[2]+','+transparence+')';
}

function _getLuminance(r, g, b) {
    var a = [r, g, b].map(function (v) {
        v /= 255;
        return v <= 0.03928
            ? v / 12.92
            : Math.pow( (v + 0.055) / 1.055, 2.4 );
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function _contrast(rgb1, rgb2) {
    var l1 = _getLuminance(rgb1[0], rgb1[1], rgb1[2]) + 0.05;
    var l2 = _getLuminance(rgb2[0], rgb2[1], rgb2[2]) + 0.05;
    if ( l1 > l2 )
        return l1 / l2
    else 
        return l2 / l1;
}

// liefert die fontColor auf Basis der backgroundColor durch Berechnung
// des Kontrasts
function _getFontColor(bc) {
    if ( _contrast(_hexToRGB(bc),_hexToRGB("#000000")) < 6 ) 
        return "#ffffff";
    else
        return "#000000";
}




// ersetzt in bekannten WIdgets schwarze und weisse Font 
function _patchWidgetColors( ) {
    let fontColor = _getFontColor( _getColorFromConfig("content_color",lastConfig.content_color,200,defConfig.content_color) );
    let isDark = fontColor=="#ffffff";

    // flot Widget 
    
    $("#vis_container:not([style*='display: none']) iframe[src*='flot'],.ui-dialog iframe[src*='flot']").each( 
      function (index) {
        var $ele = $(this)[0];
        var src = $ele.src;
/*
        src = src.replace(/&bg=%23[0-9]*&/g, "&bg=%23f00000&");
        src = src.replace(/&x_labels_color=%23[0-9]*&/g, "&x_labels_color=%23f00000&");
*/

        if (isDark) {
            src = src.replace(/%23000000/g, "%23111111");
            src = src.replace(/%23ffffff/g, "%23000001");
            src = src.replace(/%23111111/g, "%23fffffe");
        } else {
            src = src.replace(/%23000001/g, "%23111111");
            src = src.replace(/%23fffffe/g, "%23000000");
            src = src.replace(/%23111111/g, "%23ffffff");
        }
        $ele.src = src;
    });    
    
    // svg-clock
    
    /* Striche, Ticks */
    $(".svg--clock defs line").each( function (index) {
        $(this)[0].style.stroke = fontColor;
    }); 
    /* Stundenzeiger */
    $("#hands > g.hand--h").each( function (index) {
        $(this)[0].style.stroke = fontColor;
    }); 
    $("#hands > g.hand--h > line").each( function (index) {
        $(this)[0].style.stroke = fontColor;
    }); 
    /* Minutenzeiger */
    $("#hands > g.hand--m").each( function (index) {
        $(this)[0].style.stroke = fontColor;
    }); 
    $("#hands > g.hand--m > line").each( function (index) {
        $(this)[0].style.stroke = fontColor;
    }); 
    /* Ziffern */
    $(".svg--clock .svg--ticks text").each( function (index) {
        $(this)[0].style.fill = fontColor;
    }); 
    
    // meteoblue (Wetter)
    $("#vis_container:not([style*='display: none']) iframe[src*='meteoblue'], .ui-dialog iframe[src*='meteoblue']").each( function (index) {
        var $ele = $(this)[0];
        var src = $ele.src;
        if (isDark) {
            src = src.replace(/layout=light/g, "layout=dark");
        } else {
            src = src.replace(/layout=dark/g, "layout=light");
        }
        $ele.src = src;
    });     
    // flot Widget 
    
    $("#vis_container:not([style*='display: none']) iframe[src*='orgId='],.ui-dialog iframe[src*='orgId=']").each( 
        function (index) {
          var $ele = $(this)[0];
          var src = $ele.src;
  /*
          src = src.replace(/&bg=%23[0-9]*&/g, "&bg=%23f00000&");
          src = src.replace(/&x_labels_color=%23[0-9]*&/g, "&x_labels_color=%23f00000&");
  */
  
          if (isDark) {
              src = src.replace(/&theme=light/ig, "&theme=dark");
          } else {
            src = src.replace(/&theme=dark/ig, "&theme=light");
        }
          $ele.src = src;
      });    
     
      
}

// holt den CSSFarbwert aus dem Colors-Array
function _getColorFromColors( color, luminance ) {
    // colorType in Config?
    if (colors.hasOwnProperty(color) ) 
        switch(luminance) {
            case 200: color = colors[color].c200; break;
            case 700: color = colors[color].c700; break;
            default:  color =  colors[color].c500;
        }    
    return color;
}

// wandelt den gewünschten Color-Wert in eine CSSColor um
function _getColorFromConfig( colorType, color, luminance, defColor ) {
//console.log("[_getColorFromConfig]:",colorType,color,luminance,defColor);    
    // colorType in Config?
    if (lastConfig.hasOwnProperty(colorType) && colors.hasOwnProperty(lastConfig[colorType]) ) {
            color = _getColorFromColors(lastConfig[colorType], luminance);
        } 
    // Check color
    try {
        let $div = $("<div>");
        $div.css("border", "1px solid "+color);
        $div = $div.css("border-color");
        if ( ($div=="") || ($div=="initial") ) color = _getColorFromColors(defColor,luminance);
    } catch(err) { 
        console.log( "[MDUI.getColorFromConfig] (",color,") ", err.message ); 
        color = _getColorFromColors(defColor,luminance);
    } 

//console.log("[_getColorFromConfig] return:",color);    

    return color;
}


function _setBKColor(selector, bkcolor, varname) {
    // wenn die fc=#ffffff ist, also dark-scheme, dann mdui-dark setzen
    if (_getFontColor( bkcolor )=='#ffffff') $(selector).addClass("mdui-dark")
    else $(selector).removeClass("mdui-dark");
    if (varname!="") document.documentElement.style.setProperty(varname, bkcolor); 
}

function _patchColors() {
   try {
        let primary_color = defConfig.primary_color,
            secondary_color = defConfig.secondary_color,
            content_color = defConfig.content_color;

        // lastConfig entladen
        primary_color = _getColorFromConfig("primary_color",lastConfig.primary_color,500,defConfig.primary_color);
        let abar_color=primary_color; 
        let tnav_color=primary_color; 
        let bnav_color=primary_color; 

        // abar
        abar_color = _getColorFromConfig("abar_color",lastConfig.abar_color,700,abar_color);
        _setBKColor('.mdui-abar',abar_color,'--abar-background');
        
        // tnav
        tnav_color = _getColorFromConfig("tnav_color",lastConfig.tnav_color,700,tnav_color);
        _setBKColor('.mdui-tnav',tnav_color,'--tnav-background');

        // bnav
        bnav_color = _getColorFromConfig("bnav_color",lastConfig.bnav_color,700,bnav_color);
        _setBKColor('.mdui-bnav',bnav_color,'--bnav-background');

        // content
        content_color = _getColorFromConfig("content_color",lastConfig.content_color,200,defConfig.content_color);
        let lnav_color = content_color;
        let rnav_color = content_color;
        _setBKColor('.mdui-content',content_color,'--content-background');
        _setBKColor('.ui-dialog',content_color,'');
        _setBKColor('.ui-datepicker',content_color,'');

        // lnav
        lnav_color = _getColorFromConfig("lnav_color",lastConfig.lnav_color,500,lnav_color);
        _setBKColor('.mdui-lnav',lnav_color,'--lnav-background');

        // rnav
        rnav_color = _getColorFromConfig("rnav_color",lastConfig.rnav_color,500,rnav_color);
        _setBKColor('.mdui-rnav',rnav_color,'--rnav-background');

        // secondary
        secondary_color = _getColorFromConfig("secondary_color",lastConfig.secondary_color,500,defConfig.secondary_color);
        document.documentElement.style.setProperty('--accent-color', secondary_color); 
        document.documentElement.style.setProperty('--accent-color-033', _hexToRGBA(secondary_color, 0.33)); 


        // custom
        let custom = _getColorFromConfig("color1",lastConfig.color1,200,defConfig.color1);
        document.documentElement.style.setProperty('--color1', custom); 
        custom = _getColorFromConfig("color1_dark",lastConfig.color1_dark,500,defConfig.color1_dark);
        document.documentElement.style.setProperty('--color1-dark', custom); 

        custom = _getColorFromConfig("color2",lastConfig.color2,200,defConfig.color2);
        document.documentElement.style.setProperty('--color2', custom); 
        custom = _getColorFromConfig("color2_dark",lastConfig.color2_dark,500,defConfig.color2_dark);
        document.documentElement.style.setProperty('--color2-dark', custom); 

        custom = _getColorFromConfig("color3",lastConfig.color3,200,defConfig.color3);
        document.documentElement.style.setProperty('--color3', custom); 
        custom = _getColorFromConfig("color3_dark",lastConfig.color3_dark,500,defConfig.color3_dark);
        document.documentElement.style.setProperty('--color3-dark', custom); 

//console.log("primary:",primary_color,"secondary:",secondary_color,"content:",content_color," abar:",abar_color," tnav:",tnav_color," lnav:",lnav_color);          
    } catch(err) { console.log( "[MDUI.patchColors] " + err.message ); } 
}


function _onResizeWindow( $ele ) {
  var win = $ele; //this = window

//console.log("[MDUI.onResizeWindow] width:",win.width());
  
  // lnav als fixiertes Seitenmenü?
  if (lastConfig.hasOwnProperty("lnav_fixed_width")) {
      if (win.width() >= lastConfig.lnav_fixed_width) { 
          $( "#vis_container" ).addClass("mdui-lnav-fixed"); 
          // sofort öffnen?
          if ( (lastConfig.hasOwnProperty("lnav_fixed_open")) && 
               (lastConfig.lnav_fixed_open=="true") ) {
              $( "#vis_container" ).addClass( "mdui-lnav-fixed-open" );
          }
      } else {
          $( "#vis_container" ).removeClass("mdui-lnav-fixed-open"); 
          $( "#vis_container" ).removeClass("mdui-lnav-fixed"); 
      }
  }

}

// ----------------------------
// swipe
// ----------------------------

// mdui-swipe-left?dist=48&background=red&icon=delete&text=Löschen&action=setValue(demo_listitem,listitem0+swipeleft+delete)
function _checkSwipeTo(swipeTo, swipeX) { try {
    swipeX.enabled = false;
    let s = _getSuffix( swipe.ele.className, 'mdui-swipe-'+swipeTo+'?' );
    if (!s || s=='') return;
    s = '{"'+s.replace(/:/g,'":"')+'"}';
    s = s.replace(/;/g,'","');
    s = s.replace(/\+/g,' ');
    swipeX.opt = JSON.parse(s);

    swipeX.enabled = swipeX.opt.dist!=null;
    if (swipeX.enabled) {
        swipeX.ele = document.createElement('div');         
        swipeX.ele.style.position = 'absolute';   
        swipeX.ele.style.overflow = 'hidden';   
        swipeX.ele.style.zIndex = '32000';   
        switch (swipeTo) {
            case 'left' : 
              swipeX.ele.style.left = (swipe.ele.offsetLeft + swipe.ele.offsetWidth - 2)+'px';
              swipeX.ele.style.top = swipe.ele.offsetTop+'px';
              swipeX.ele.style.height = swipe.ele.offsetHeight+'px';
              swipeX.ele.style.width = '0px';
              break;
            case 'right' : 
              swipeX.ele.style.left = swipe.ele.offsetLeft + 2 +'px';
              swipeX.ele.style.top = swipe.ele.offsetTop+'px';
              swipeX.ele.style.height = swipe.ele.offsetHeight+'px';
              swipeX.ele.style.width = '0px';
              break;
            case 'up' : 
              swipeX.ele.style.left = swipe.ele.offsetLeft+'px';
              swipeX.ele.style.top = (swipe.ele.offsetTop+swipe.ele.offsetHeight-2)+'px';
              swipeX.ele.style.height = '0px';
              swipeX.ele.style.width = swipe.ele.offsetWidth+'px';
              break;
            case 'down' : 
              swipeX.ele.style.left = swipe.ele.offsetLeft+'px';
              swipeX.ele.style.top = swipe.ele.offsetTop+2+'px';
              swipeX.ele.style.height = '0px';
              swipeX.ele.style.width = swipe.ele.offsetWidth+'px';
              break;
        }
        if (swipeX.opt.background) {
            swipeX.ele.style.background = _getColorFromColors( swipeX.opt.background, swipe.isDarkTheme?500:200 );
        }
        swipeX.ele.style.display = 'flex';
        swipeX.ele.style.alignItems = 'center';
        swipeX.ele.style.justifyContent = 'center';
        swipeX.ele.style.flexWrap = 'wrap';
        s='';
        if (swipeX.opt.icon)
            s ='<div class="mdui-icon">'+swipeX.opt.icon+'</div>';
        if (swipeX.opt.text)
            s+= '<div style="font-size:0.7em">'+swipeX.opt.text+'</div>'
        swipeX.ele.innerHTML=s;        
        // als sibling anhängen
        swipe.ele.parentNode.insertBefore(swipeX.ele, swipe.ele.nextSibling);  }    
    } catch(err) { console.log( "[MDUI._checkSwipeTo] " + err.message ); } 
}


//
function _swipeStart() {
    swipe.swipeLeft={enabled:false};
    swipe.swipeRight={enabled:false};
    swipe.swipeUp={enabled:false};
    swipe.swipeDown={enabled:false};

//    swipe.ele.classList.remove('mdui-lockclick');
    lockclick = false;
    swipe.isDarkTheme = _isDarkTheme(swipe.ele);

    // auf jede swipe-Art untersuchen
    _checkSwipeTo('left',swipe.swipeLeft);
    _checkSwipeTo('right',swipe.swipeRight);
    _checkSwipeTo('up',swipe.swipeUp);
    _checkSwipeTo('down',swipe.swipeDown);
    
    swipe.enabled =  swipe.swipeLeft.enabled || swipe.swipeRight.enabled || swipe.swipeUp.enabled || swipe.swipeDown.enabled;
}

//
//
function _swipeMove() {
    if (!swipe.enabled) return false;
    let x=0, y=0;
    const tresholdStart = 0.25;
    const tresholdEnd = 0.90;

    // welche swipes sind aktiv?
    if (swipe.swipeLeft.enabled) {
          swipe.swipeLeft.val = swipe.clientX - swipe.fromX;
          if ( 0-swipe.swipeLeft.val > swipe.swipeLeft.opt.dist ) swipe.swipeLeft.val = 0-swipe.swipeLeft.opt.dist;
          swipe.swipeLeft.active = swipe.swipeLeft.val <= 0-swipe.swipeLeft.opt.dist*tresholdStart;
          swipe.swipeLeft.swiped = swipe.swipeLeft.val <= (0-swipe.swipeLeft.opt.dist)*tresholdEnd;
          if (swipe.swipeLeft.active) x = swipe.swipeLeft.val; 
    }
    if (swipe.swipeRight.enabled) {
          swipe.swipeRight.val = swipe.clientX - swipe.fromX;
          if ( swipe.swipeRight.val > swipe.swipeRight.opt.dist ) swipe.swipeRight.val = swipe.swipeRight.opt.dist;
          swipe.swipeRight.active = swipe.swipeRight.val >= swipe.swipeRight.opt.dist*tresholdStart;
          swipe.swipeRight.swiped = swipe.swipeRight.val >= swipe.swipeRight.opt.dist*tresholdEnd;
          if (swipe.swipeRight.active) x = swipe.swipeRight.val; 
    }
    if (swipe.swipeUp.enabled) {
          swipe.swipeUp.val = swipe.clientY - swipe.fromY;
          if ( 0-swipe.swipeUp.val > swipe.swipeUp.opt.dist ) swipe.swipeUp.val = 0-swipe.swipeUp.opt.dist;
          swipe.swipeUp.active = swipe.swipeUp.val <= 0-swipe.swipeUp.opt.dist*tresholdStart;
          swipe.swipeUp.swiped = swipe.swipeUp.val <= (0-swipe.swipeUp.opt.dist)*tresholdEnd;
          if (swipe.swipeUp.active) y = swipe.swipeUp.val; 
    }
    if (swipe.swipeDown.enabled) {
          swipe.swipeDown.val = swipe.clientY - swipe.fromY;
          if ( swipe.swipeDown.val > swipe.swipeDown.opt.dist ) swipe.swipeDown.val = swipe.swipeDown.opt.dist;
          swipe.swipeDown.active = swipe.swipeDown.val >= swipe.swipeDown.opt.dist*tresholdStart;
          swipe.swipeDown.swiped = swipe.swipeDown.val >= swipe.swipeDown.opt.dist*tresholdEnd;
          if (swipe.swipeDown.active) y = swipe.swipeDown.val; 
    }


    // aktive swipes anwenden
    if (swipe.swipeLeft.enabled)
        if (swipe.swipeLeft.active ) {
            swipe.swipeLeft.ele.style.width = (0-swipe.swipeLeft.val)+'px';
            swipe.swipeLeft.ele.style.transform = 'translate('+swipe.swipeLeft.val+'px,'+y+'px)';
            if (swipe.swipeLeft.swiped) swipe.swipeLeft.ele.style.borderRadius = '0';
            else swipe.swipeLeft.ele.style.borderRadius = '0 5em 5em 0';
        } else {
            swipe.swipeLeft.ele.style.width = '0';
        }
    if (swipe.swipeRight.enabled)
        if (swipe.swipeRight.active ) {
            swipe.swipeRight.ele.style.width = swipe.swipeRight.val+'px';
            swipe.swipeRight.ele.style.transform = 'translate(0px,'+y+'px)';
            if (swipe.swipeRight.swiped) swipe.swipeRight.ele.style.borderRadius = '0';
            else swipe.swipeRight.ele.style.borderRadius = '5em 0  0 5em';
        } else {
             swipe.swipeRight.ele.style.width = '0';
        }
    if (swipe.swipeUp.enabled)
        if (swipe.swipeUp.active) {
            swipe.swipeUp.ele.style.height = (0-swipe.swipeUp.val)+'px';
            swipe.swipeUp.ele.style.transform = 'translate('+x+'px,'+swipe.swipeUp.val+'px)';
            if (swipe.swipeUp.swiped) swipe.swipeUp.ele.style.borderRadius = '0';
            else swipe.swipeUp.ele.style.borderRadius = '0 0 5em 5em';
        } else {
            swipe.swipeUp.ele.style.height = '0';
        }
    if (swipe.swipeDown.enabled)
        if (swipe.swipeDown.active ) {
            swipe.swipeDown.ele.style.height = swipe.swipeDown.val+'px';
            swipe.swipeDown.ele.style.transform = 'translate('+x+'px,0px)';
            if (swipe.swipeDown.swiped) swipe.swipeDown.ele.style.borderRadius = '0';
            else swipe.swipeDown.ele.style.borderRadius = '5em 5em 0 0';
        } else {
            swipe.swipeDown.ele.style.height = '0';
        }
    
    if (x==0 && y==0) {
        swipe.ele.style.transform = 'none'; 
        return true;
    } else {
        swipe.ele.style.transform = 'translate('+x+'px,'+y+'px)'; 
        // nach dem 1.swipe click sperren
//        swipe.ele.classList.add('mdui-lockclick');
        lockclick = true;
        return false;
    }

}


function _swipeEnd() {
    if (!swipe.enabled) return;

    if (swipe.swipeLeft.enabled) swipe.swipeLeft.ele.remove();
    if (swipe.swipeRight.enabled) swipe.swipeRight.ele.remove();
    if (swipe.swipeUp.enabled) swipe.swipeUp.ele.remove();
    if (swipe.swipeDown.enabled) swipe.swipeDown.ele.remove();

    swipe.ele.style.transform = 'none';

    if ( swipe.swipeLeft.swiped ) _executeAction(swipe.swipeLeft.opt.action);
    if ( swipe.swipeRight.swiped ) _executeAction(swipe.swipeRight.opt.action); 
    if ( swipe.swipeUp.swiped ) _executeAction(swipe.swipeUp.opt.action);
    if ( swipe.swipeDown.swiped ) _executeAction(swipe.swipeDown.opt.action);

    swipe.enabled = false;
}

function _swipeTouchStart(event, $ele) {
    let touchobj = event.originalEvent.changedTouches[0]; // erster Finger
    swipe.fromX = parseInt(touchobj.clientX); 
    swipe.fromY = parseInt(touchobj.clientY);
    swipe.ele = $ele[0];
    _swipeStart();
}

function _swipeTouchMove(event, $ele) {
    if (!swipe.enabled) return;
    let touchobj = event.originalEvent.changedTouches[0]; // erster Finger
    swipe.clientX = parseInt(touchobj.clientX);
    swipe.clientY = parseInt(touchobj.clientY);
    _swipeMove();
    event.preventDefault();
    event.stopImmediatePropagation();
}

function _swipeTouchEnd(event, $ele) {
    if (!swipe.enabled) return;
    _swipeEnd();
}

function _swipeMouseDown(event, $ele) {
    if (swipe.enabled) return;
    swipe.fromX = parseInt(event.originalEvent.x);
    swipe.fromY = parseInt(event.originalEvent.y);
    swipe.ele = $ele[0];
    _swipeStart();
    if (swipe.enabled) {
      _captureMouseEvents(_swipeMouseMove, _swipeMouseUp);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
}
function _swipeMouseMove(event, $ele) {
    if (!swipe.enabled) return;
    swipe.clientX = parseInt(event.originalEvent.x);
    swipe.clientY = parseInt(event.originalEvent.y);
    if (_swipeMove()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
}
function _swipeMouseUp(event, $ele) {
console.log('_swipeMouseUp' );
    if (!swipe.enabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    _swipeEnd();
    _releaseMouseEvents(_swipeMouseMove, _swipeMouseUp);
}

function _releaseMouseEvents(move,up) {
  document.removeEventListener ('mousemove', move, true);
  document.removeEventListener ('mouseup', up, true);
}

function _captureMouseEvents (move,up) {
  document.addEventListener ('mousemove', move, true);
  document.addEventListener ('mouseup', up, true);
}

// ----------------------------
// click
// ----------------------------
function _click(event, $ele) { try {
console.log('_click');

    // durch swipe gelockt?
/*
if (ele.classList.contains('mdui-lockclick')) {
        ele.classList.remove('mdui-lockclick');
        return;
    }
*/
    if (lockclick) {
        lockclick=false;
        return;
    }
    let s = _getSuffix( $ele[0].className, 'mdui-click?' );
    if (!s || s=='') return;
    s = '{"'+s.replace(/:/g,'":"')+'"}';
    s = s.replace(/;/g,'","');
    s = s.replace(/\+/g,' ');
    let opt = JSON.parse(s);
      
    if (opt.action)
        _executeAction(opt.action);

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
        
} catch(err) { console.log( "[MDUI._click] " + err.message ); } 
}

// ----------------------------
// tooltip
// ----------------------------

// mdui-tooltip?text:(text);background:(color);state:(stateid)
function _tooltipShow(ele) { try {
    if (tooltip.timeout!=null) clearTimeout(tooltip.timeout);
    tooltip.timeout = null;
    if (tooltip.hint!=null) tooltip.hint.remove(); 
    tooltip.ele = ele;

    tooltip.timeout = setTimeout( () => {
      let s = _getSuffix( tooltip.ele.className, 'mdui-tooltip?' );
      if (!s || s=='') return;
      s = '{"'+s.replace(/:/g,'":"')+'"}';
      s = s.replace(/;/g,'","');
      s = s.replace(/\+/g,' ');
      tooltip.opt = JSON.parse(s);
      // text aus state ?
      if (tooltip.opt.state && vis.states.hasOwnProperty(tooltip.opt.state+'.val'))
          tooltip.opt.text += ' ' + vis.states[tooltip.opt.state+'.val'];

      let rect = tooltip.ele.getBoundingClientRect();
      let win = tooltip.ele.ownerDocument.defaultView;
      rect.top = rect.top + win.pageYOffset,
      rect.left = rect.left + win.pageXOffset

      tooltip.hint = document.createElement('div');         
      tooltip.hint.classList.add('mdui-tooltip');
      tooltip.hint.style.left = rect.left+'px';
      tooltip.hint.style.top = rect.top+'px';    
      if (tooltip.opt.background)
          tooltip.hint.style.background = _getColorFromColors( tooltip.opt.background, 500) ;
      tooltip.hint.innerHTML=tooltip.opt.text;
      document.documentElement.appendChild(tooltip.hint);   
      tooltip.width = tooltip.hint.clientWidth;
      tooltip.height = tooltip.hint.clientHeight;
      let x = (rect.left-tooltip.width/2+tooltip.ele.offsetWidth/2);
      if (x<0) x = 8;
      if (x+tooltip.width > document.documentElement.clientWidth) x=document.documentElement.clientWidth - tooltip.width - 8;
      tooltip.hint.style.left = Math.floor(x)+'px';
      let y = rect.top + tooltip.ele.offsetHeight + 8;
      if (y+tooltip.height > document.documentElement.clientHeight) y= document.documentElement.clientHeight - tooltip.height - rect.height - 8;
      tooltip.hint.style.top = Math.floor(y)+'px';
      
      tooltip.timeout = setTimeout(_tooltipHide, 1000 + s.length * 40);
    }, 700);
} catch(err) { console.log( "[MDUI._tooltipShow] " + err.message ); } 
}

function _tooltipHide() {
    if (tooltip.timeout!=null) clearTimeout(tooltip.timeout);
    tooltip.timeout = null;
    if (tooltip.hint==null) return;
    tooltip.hint.remove(); 
    tooltip.hint = null; 
}

function _tooltipMouseEnter(event, $ele) {
    _tooltipShow($ele[0]);
    event.preventDefault();
    event.stopImmediatePropagation();
}

function _tooltipMouseLeave(event, $ele) {
    _tooltipHide(); 
    event.preventDefault();
    event.stopImmediatePropagation();
}


return {
    init: _init,
    initObserverPage:_initObserverPage,
    handleToggle: _handleToggle,
    toggleFullscreen: _toggleFullscreen,
    toggleExpand: _toggleExpand,
    scale: _scale,
    timespan: _timespan,
    srcparam: _srcparam,
    handleTables: _handleTables,
    handleDialogs: _handleDialogs,
    onChangePage : _onChangePage,
    onLoad : _onLoad,
    patchColors : _patchColors,
    swipeTouchStart : _swipeTouchStart,
    swipeTouchMove : _swipeTouchMove,
    swipeTouchEnd : _swipeTouchEnd,
    swipeMouseDown : _swipeMouseDown,
    swipeMouseMove : _swipeMouseMove,
    swipeMouseUp : _swipeMouseUp,
    tooltipMouseEnter : _tooltipMouseEnter,
    tooltipMouseLeave : _tooltipMouseLeave,
    click : _click,
    onResizeWindow : _onResizeWindow
};

})();

// Eventhandler für body-Delegators setzen (früher:#vis_container) 
function mdui_init() {
    MDUI.init();
   
    // click-Event für das left-nav Element zum Öffnen
    $("body").on( "click", ".mdui-lnavbutton", function() {
        // lnav als popupmenu oder fixed?
        if ($( "#vis_container.mdui-lnav-fixed" ).length==0)
            $( ".mdui-lnav" ).toggleClass( "mdui-lnav-open" );
        else
            $( "#vis_container" ).toggleClass( "mdui-lnav-fixed-open" );
    } );
    // click-Event für die left-nav zum Schließen
    $("body").on( "click", ".mdui-lnav", function() {
        if ($( "#vis_container.mdui-lnav-fixed" ).length==0)
            $( ".mdui-lnav" ).removeClass( "mdui-lnav-open" ); 
    } );
    // click-Event für das right-nav Element zum Öffnen
    $("body").on( "click", ".mdui-rnavbutton", function() { 
        $( ".mdui-rnav" ).addClass( "mdui-rnav-open" );
    } );
    // click-Event für die right-nav zum Schließen
    $("body").on( "click", ".mdui-rnav", function() { 
        $( ".mdui-rnav" ).removeClass( "mdui-rnav-open" ); 
    } );

    // click-Eventhandler für "mdui-scale-" setzen
    $("body").on( "click", "[class*='mdui-scale-']", function(event) { 
        MDUI.scale( $(this) );
    } );

    // click-Handler für "mdui-toggle"  
    $("body").on( "click", "[class*='mdui-toggle']", function(event) { 
        event.preventDefault();
        event.stopImmediatePropagation();
        MDUI.handleToggle( $(this) );
    } );
    // click-Handler für "mdui-info"  
    $("body").on( "click", ".mdui-info", function(event) { 
        event.preventDefault();
        event.stopImmediatePropagation();
        $(this).toggleClass("mdui-hide");
        $(this).toggleClass("mdui-hide-show");
    } );

    // click-Handler für "mdui-expand"  
    $("body").on( "click", "[class*='mdui-expand']", function(event) { 
        event.preventDefault();
        event.stopImmediatePropagation();
        MDUI.toggleExpand( $(this) );
    } );

    // click-Handler für "mdui-fullscreen" 
    $("body").on( "click", ".mdui-fullscreen", function(event) { 
        MDUI.toggleFullscreen( $(this) );
    } );

    // click-Handler für "mdui-timepsan-" 
    $("body").on( "click", "[class*='mdui-timespan-']", function(event) { 
        MDUI.timespan( $(this) );
    } );
    // click-Handler für "mdui-srcparam-" 
    $("body").on( "click", "[class*='mdui-srcparam-']", function(event) { 
        MDUI.srcparam( $(this) );
    } );

    // event-Handler für "mdui-swipe" 
    $("body").on( "touchstart", "[class*='mdui-swipe']", function(event) { 
        MDUI.swipeTouchStart(event, $(this) );
    } );
    $("body").on( "touchmove", "[class*='mdui-swipe']", function(event) { 
        MDUI.swipeTouchMove(event, $(this) );
    } );
    $("body").on( "touchend", "[class*='mdui-swipe']", function(event) { 
        MDUI.swipeTouchEnd(event, $(this) );
    } );

    $("body").on( "mousedown", "[class*='mdui-swipe']", function(event) { 
        MDUI.swipeMouseDown(event, $(this) );
    } );
    $("body").on( "mousemove", "[class*='mdui-swipe']", function(event) { 
        MDUI.swipeMouseMove(event, $(this) );
    } );
    $("body").on( "mouseup", "[class*='mdui-swipe']", function(event) { 
        MDUI.swipeMouseUp(event, $(this) );
    } );

    // event-Handler für "mdui-click" 
    $("body").on( "click", "[class*='mdui-click']", function(event) { 
        MDUI.click(event, $(this) );
    } );

    // event-Handler für tooltips
    $("body").on( "mouseenter", "[class*='mdui-tooltip']", function(event) { 
        MDUI.tooltipMouseEnter(event, $(this) );
    } );
    $("body").on( "mouseleave", "[class*='mdui-tooltip']", function(event) { 
        MDUI.tooltipMouseLeave(event, $(this) );
    } );
    $("body").on( "click", "[class*='mdui-tooltip']", function(event) { 
        MDUI.tooltipMouseLeave(event, $(this) );
    } );

    $( window ).on("resize", function() {
      MDUI.handleTables( $(this) );
      MDUI.onResizeWindow( $(this) );
    });

    MDUI.initObserverPage();

    // für den ersten load einmal aufrufen
    setTimeout( MDUI.onChangePage(), 100);
    
    
}; 


setTimeout( mdui_init(), 100); 

// vis ... Menu ausblenden
if (typeof app !== 'undefined') $('#cordova_menu').hide();


