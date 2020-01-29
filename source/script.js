/* -----
   Material Design JS for ioBroker.vis
   (c) 2017 Uhula, MIT License
   https://github.com/Uhula/ioBroker-Material-Design-Style
   
   V2.0.2 27.01.2020
   * Das onEvent auf DOMSubtreeModified wurde durch einen MutationObserver
     auf #vis_container ersetzt. Vorteil: Weniger Events, schnellerer Ablauf,
     da DOMSubtreeModified häufig gefeuetrt wird
   * MutationObserver für ui-dialog hinzugefügt um im dark-Style im Dialog die 
     Farbanpassungen der Widgets vornehmen zu können
     
   V2.0.1 21.01.2020
   * toggleExpand() : expandiert/collabiert ein übergeordnetes mdui-tile bzw
     mdui-card Element. Wird an die class mdui-expand[-<height>] gebunden. in
     [-<height>] kann optional eine Zielhöhe in px im collabierten Zustand angegeben
     werden, wenn nicht, werden 52px angenommen

   V1.7 28.12.2017
   * Korrektur mdui-lnav/rnav. Funktionierte mit mdui-toggle nicht korrekt  
   V1.6 16.10.2017 
   * _toggleFullscreen geändert, damit die function auch im ioBroker
                   fullscreen Mode funktioniert
   * Delegator-Eventhandler für body gesetzt (bisher #vis_container, wirkten dann aber in Dialogen nicht)
   V1.5 11.10.2017 
   * MDUI.handleTables fertig
   V1.3 24.09.2017 
   * MDUI.handleTables hinzu (in Entwicklung)
   V1.0 01.09.2017
----- */

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
   (c) 2017 Uhula, MIT License
*/

var MDUI = (function () {


let lastConfig = {"content_color":"#ffffff"},
    styleSheet = null,
    lastPageID = "";
    observerSlider = null;
    observerConfig = null;
    observerPage = null;
    observerDialog = null;

//                      light         normal        dark 
var colors = { 
        default:    {c200:"#6ec6ff", c500:"#2196f3", c700:"#0069c0" },        
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

// für mdui-config Elemente überwachen
function _initObserverPage() {
    observerPage.disconnect();
    let nodelist = document.querySelectorAll('#vis_container');
    if (nodelist) {
        let i;
        for (i = 0; i < nodelist.length; i++) {
           observerPage.observe(nodelist[i], {
              subtree: false,
              childList: true
           });
        }
    }
    
}

// für mdui-config Elemente überwachen
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

// wenn sich die config ändert, muss evtl ein reload der Seite stattfinden
function _onChangePage( ele ) {
    let pageID = "";
    let $eles = $( "#vis_container>:not([style*='display: none'])[id*='visview_']" );
    if ( $eles.length < 1 || $eles.length > 2) return;

    pageID = $eles[$eles.length-1].id;

    if ( (pageID!="") && (lastPageID!=pageID) ) {
        lastPageID=pageID;
        _getConfig();
        _patchColors();
        _patchWidgetColors();
        _handleTables();
        _handleDialogs();
        _initObserverSlider();
        _initObserverConfig();
        _initObserverDialog();
        _onResizeWindow( $(window) );
    }
    _initObserverPage();
}

// wenn sich die config ändert, muss evtl ein reload der Seite stattfinden
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
        lastConfig.primary_color = "blue";
    if (!lastConfig.hasOwnProperty("secondary_color")) 
        lastConfig.secondary_color = "amber";
    if (!lastConfig.hasOwnProperty("content_color")) 
        lastConfig.content_color = "#ffffff";
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
// - fullscreen angezeigt, wenn es noch nicht fullscreen ist
// - wieder normal angezeigt, wenn es fullscreen ist
function _toggleExpand( $ele ){
    if (!$ele) return;
    let $target = $ele.closest("[class*='mdui-card']");
    if ($target.length===0) return;
    // wurde im ele eine Höhe mit angegeben?
    let h = _getClassSuffix( $ele, "mdui-expand-" ) ;
    if (h==="") h="68";
    // element um 180° drehen
    let styleold = $ele.attr("styleold");
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
function _toggleFullscreen( $ele ){
    if (!$ele) return;
    let $target = $ele.closest(".vis-view");
    if (!$target) return;
    var styleold = $target.attr("styleold");
    if (styleold) {
        $target.attr("style",styleold);
        $target.removeAttr("styleold");
        $target.appendTo(".mdui-id-"+$target.attr("id"));
    } else {
        $target.parent().addClass("mdui-id-"+$target.attr("id"));
        $target.attr("styleold",$target.attr("style"));
        // dark-theme?
        if ($ele.closest(".mdui-content.mdui-dark").length) $target.addClass("mdui-dark");
        $target.attr("style","position:fixed; left:0; top:0; width:100%; height:100%; z-index: 2147483647 !important; background-color: "+lastConfig.content_color+" !important;");
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
    var id = _getTargetID( ele );
    var target = $( "#"+id+" [src]" );
    if (target) {
        var timespan = _getClassSuffix(ele, "mdui-timespan-" );
        var src = target.attr( "src" );
        var min = src.substr(src.indexOf("&range=")+7,20);  
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
console.log("[MDUI.timespan] ",ele);
console.log("[MDUI.timespan] ",target);
console.log("[MDUI.timespan] ",min);
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

  } catch(err) { console.log( err.message ); } 

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
    let fontColor = _getFontColor( lastConfig.content_color );
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
    
}

function _addCSS(selector, bc) {
    var fc = _getFontColor( bc );
    
//console.log("selector:",selector,"bc:",bc," ", _getLuminance(_hexToRGB(bc))," black:",_getLuminance(_hexToRGB(bc))," contrast:",_contrast(_hexToRGB(bc),_hexToRGB("#000000"))," font:",fc);    

    // wenn die fc=#ffffff ist, also dark-scheme, dann allen untergeordneten
    // Elementen die class mdui-dark hinzufügen
    if (fc=='#ffffff') $(selector).addClass("mdui-dark")
    else $(selector).removeClass("mdui-dark");

    var css = "";
    css += selector+' {background:'+bc+' !important;} ';
    css += '.mdui-runtime ' + selector+' {background:'+bc+' !important;} ';
    css += selector+' {color:'+fc+' !important;} ';

    return css;
}

function _patchColors() {
   try {
        let primary_color = 'blue',
            secondary_color = 'amber',
            content_color = '#ffffff',
            abar_color=colors[primary_color].c500, 
            tnav_color=colors[primary_color].c500, 
            lnav_color=content_color, 
            rnav_color=content_color, 
            bnav_color=colors[primary_color].c500;

        // lastConfig entladen
        if (lastConfig.hasOwnProperty("primary_color")) {
            primary_color = _toRGB( lastConfig.primary_color );
            if ( colors.hasOwnProperty(primary_color) ) {
                abar_color=colors[primary_color].c500, 
                tnav_color=colors[primary_color].c500, 
                bnav_color=colors[primary_color].c500;
            } else {
                abar_color=primary_color; 
                tnav_color=primary_color; 
                bnav_color=primary_color; 
            }
        }

        var css="";
        // abar
        if (lastConfig.hasOwnProperty("abar_color")) {
            if ( colors.hasOwnProperty(lastConfig.abar_color) )
                abar_color = colors[lastConfig.abar_color].c700
            else abar_color = lastConfig.abar_color;
        }
        css += _addCSS('.mdui-abar',abar_color);
        
        // tnav
        if (lastConfig.hasOwnProperty("tnav_color")) {
            if ( colors.hasOwnProperty(lastConfig.tnav_color) )
                tnav_color = colors[lastConfig].c500
            else tnav_color = lastConfig.tnav_color;
        }
        css += _addCSS('.mdui-tnav',tnav_color);

        // content
        if (lastConfig.hasOwnProperty("content_color")) {
            if ( colors.hasOwnProperty(lastConfig.content_color) ) {
                content_color = colors[lastConfig.content_color].c200
            } else content_color = lastConfig.content_color;
            lnav_color = content_color;
            rnav_color = content_color;
        }
        css += _addCSS('.mdui-content',content_color);
        css += _addCSS('.ui-dialog',content_color);
    
        // lnav
        if (lastConfig.hasOwnProperty("lnav_color")) {
            if ( colors.hasOwnProperty(lastConfig.lnav_color) )
                lnav_color = colors[lastConfig.lnav_color].c500
            else lnav_color = lastConfig.lnav_color;
        }
        css += _addCSS('.mdui-lnav',lnav_color);
    
        // rnav
        if (lastConfig.hasOwnProperty("rnav_color")) {
            if ( colors.hasOwnProperty(lastConfig.rnav_color) )
                rnav_color = colors[lastConfig.rnav_color].c500
            else rnav_color = lastConfig.rnav_color;
        }
        css += _addCSS('.mdui-rnav',rnav_color);

        // bnav
        if (lastConfig.hasOwnProperty("bnav_color")) {
            if ( colors.hasOwnProperty(lastConfig.bnav_color) )
                tnav_color = colors[lastConfig.bnav_color].c500
            else bnav_color = lastConfig.bnav_color;
        }
        css += _addCSS('.mdui-bnav',bnav_color);


        // secondary
        if (lastConfig.hasOwnProperty("secondary_color")) {
            if ( colors.hasOwnProperty(lastConfig.secondary_color) )
                secondary_color = colors[lastConfig.secondary_color].c500
            else secondary_color = lastConfig.secondary_color;
        }
        css +='.mdui-button.mdui-accent * {'
            + '  color:'+ secondary_color+';'
            + '} ';

        css +='.mdui-radio *[id*="_radio"] label.ui-state-active {'
            + '  border-bottom-color:'+ secondary_color+' !important;'
            + '  color:'+ secondary_color+' !important; '
            + '} ';
    
    
        css +='.mdui-chips * label.ui-state-active:before,'
            + '.mdui-chips-outlined * label.ui-state-active:before {'
            + '  background-color:'+ secondary_color+' !important; '
            + '} ';
            
        css +='.mdui-chips-outlined * label.ui-state-active:before {'
            + '  border-color:'+ secondary_color+' !important; '
            + '} ';
            

        css +='.mdui-floatingbutton {'
            + '  background-color:'+ secondary_color+'; '
            + '} ';
            

             

//console.log("primary:",primary_color,"secondary:",secondary_color,"content:",content_color," abar:",abar_color," tnav:",tnav_color);           


    // alten inlineStyle entfernen
    var inlineStyle = document.getElementById('mdui-style-overwrite');
    if (inlineStyle) inlineStyle.remove();
    inlineStyle = document.getElementById('lnav_style');
    if (inlineStyle) inlineStyle.remove();
    inlineStyle = document.getElementById('lnav_style_common_user');
    if (inlineStyle) inlineStyle.remove();
    inlineStyle = document.getElementById('lnav_style_user');
    if (inlineStyle) inlineStyle.remove();

    // neuen inlineStyle einfügen
    document.head.insertAdjacentHTML("beforeend", "<style id='mdui-style-overwrite'>"+css+"</style>");

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





return {
    init: _init,
    initObserverPage:_initObserverPage,
    handleToggle: _handleToggle,
    toggleFullscreen: _toggleFullscreen,
    toggleExpand: _toggleExpand,
    scale: _scale,
    timespan: _timespan,
    handleTables: _handleTables,
    handleDialogs: _handleDialogs,
    onChangePage : _onChangePage,
    patchColors : _patchColors,
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

    $( window ).on("resize", function() {
      MDUI.handleTables( $(this) );
      MDUI.onResizeWindow( $(this) );
    });
/*    
    // Überwachen des #vis_containers auf Änderungen (z.B. wenn views nachgeladen
    // werden)
    $( "#vis_container" ).on( "DOMSubtreeModified", function(event) { 
            MDUI.onSubTreeModified( );
    } );
*/    
    MDUI.initObserverPage();

    // für den ersten load einmal aufrufen
    setTimeout( MDUI.onChangePage(), 100);

}; 


setTimeout( mdui_init(), 10); 


// vis ... Menu ausblenden
if (typeof app !== 'undefined') $('#cordova_menu').hide();
