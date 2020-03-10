/*
*** MduiLogIOBroker
Dieses Script dient der Visualisierung des ioBroker-Logs in der vis im Material Design CSS Style als
table- bzw. list-Anzeige. Dazu wird ein onLog()-Handler instanziiert, welcher bis zu MAX_LOG_CACHE
Log-EintrÃ¤ge zwischenspeichert und daraus dann alle BUILD_TABLE_TIMER Sekunden bis zu MAX_LOG_FOLDER
Log-Ordner erzeugt. In jedem Log-Ordner befindet sich ein table- und list-HTML State, welcher direkt in 
der vis angezeigt werden kann (jeweils im basic-string (unescaped) Widget). Je Log-Ordner kann ein filter
als string (Bsp:'error') oder als RegExp (Bsp:'/warn|error/') festgelegt werden, welcher beim Aufbau der 
table-/list-HTML States berÃ¼cksichtigt wird. Weiterhin kÃ¶nnen Ã¼ber clearPressed die table-/list-States 
gelÃ¶scht werden, beim nÃ¤chsten Build werden sie dann nur solche Log-EintÃ¤ge berÃ¼cksichtigen, die spÃ¤ter hinzu kamen.

**** Installation
Einfach als serverseitiges Script installieren und starten-5 Sek warten-stoppen-starten. Beim 1.Start werden 
die notwendigen States unter STATE_PATH = '0_userdata.0.mdui.logIOBroker.' erzeugt. Erst beim 2.Start
instanziiert das Script die Event-Handler und lÃ¤uft dann.

**** Konfiguration
Optional im constructor die const anpassen, wie z.B. die IGNORE_LIST 
Optional Anpassung der tmpTable und tmpList.
Bei Anpassung der tmpTable und tmpList auch ohne MD CSS Style nutzbar.
  
**** Dokumentation
Beispiel vis-view beschrieben in: 

***** States
Unter dem STATE_PATH werden die folgenden States erzeugt:
version : Script-Version, wird verwendet um Script-Updates zu erkennen
logCache  : Cache der Log-EintrÃ¤ge als JSON 
logCount : Anzahl der Log-EintrÃ¤ge in logCache
updatePressed : auf true setzen, wenn ein table/list update auÃŸerhalb des Intervals erfolgen soll

Weiterhin werden MAX_LOG_FOLDER Unterordner im STATE_PATH erzeugt (N=0-9):

LogN.table       : enthÃ¤lt die table-HTML fÃ¼r ein basic-string (unescaped) Widget
LogN.list        : enthÃ¤lt die list-HTML fÃ¼r ein basic-string (unescaped) Widget
LogN.count       : Anzahl der Log-Zeilen
LogN.filter      : Filter, der auch die logCache angewendet wurde im .table/.list zu erzeugen (siehe Filter)
LogN.lastUpdate  : Timestamp des letzten Updates
LogN.lastClear   : Timestamp des letzten manuellen "clearPressed", d.h. anschlieÃŸend werden nur
                   noch neuere EintrÃ¤ge aus der logCache berÃ¼cksichtigt
LogN.clearPressed: auf true setzen, um die .table/.list zu lÃ¶schen


***** Filter
In den filter-States kÃ¶nnen sowohl strings (Bsp:'error') als auch RegExp-Strings (Bsp:'/warn|error/') 
hinterlegt werden. RegExp-Strings werden an den einschlieÃŸenden  '/' erkannt. Ãœber den ':' kann der Anfang
eines Feldes mit in den Filter einbezogen werden. 
Beispiele: 
'error' (string) zeigt alle Zeilen an, in denen 'error' in irgendeinem Feld vorkommt
':error:' (string) zeigt alle Zeilen an, welche den Typ 'error' besitzen (dito fÃ¼r: error, warn, info, silly, debug)
'/error|warn/' (RegExp) zeigt alle Zeilen an, in denen 'error' oder 'warn' in irgendeinem Feld vorkommen
'/:error:|:warn:/' (RegExp) zeigt alle Zeilen an, welche dem Typ 'error' oder 'warn' entsprechen
'tr-064' (string) zeigt alle Zeilen an, in denen 'tr-064' in irgendeinem Feld vorkommt
':tr-064' (string) zeigt alle Zeilen an, in welchen ein Feld mit 'tr-064' beginnt, z.B. als Adapterfilter

**** Lizenz
(c) 2020 by UH, MIT License, no warranty, use on your own risc
*/
class MduiLogIOBroker {

constructor() {
    // const
    this.DEBUG = false;
    this.VERSION = '1.0/2020-03-01';
    this.NAME = 'mduiLogIOBroker';
    this.STATE_PATH = '0_userdata.0.mdui.logIOBroker.';
    this.MAX_LOG_CACHE     = 500; // Anzahl der log-Zeilen, die zwischengespeichert werden
    this.MAX_LOG_FOLDER    = 3;  // Anzahl der Table/List Ordner mit eigenem Filter/View
    this.MAX_TABLE_ROWS    = 50; // Anzahl der Zeilen fÃ¼r die Table/List Ausgabe
    this.BUILD_TABLE_TIMER = 30; // [sec] Refresh-Zeit der Table/List Ausgaben
    this.LOG_IGNORE = [          // AufzÃ¤hlung von string / RegExp Filtern um Log-EintrÃ¤ge komplett zu ignorieren
                                 // Beispiele (wert1, wert2 ersetzen):
                                 // UND-VerknÃ¼pfung : /(?=.*wert1)(?=.*wert2)/i
                                 // ODER-VerknÃ¼pfung: /wert1|wert2/i
       /(?=.*tr-064)(?=.*"New)/i,        // tr-064 Adapter UND New-Meldungen
       /(?=.*ical)(?=.*processing URL)/i // ical UND processing Meldungen
    ];
    
    // var
    this.installed = false;
    this.onLogHandler = undefined;
    this.onBuildHTMLHandler = undefined;
    this.onFilterHandler = undefined;
    this.onClearHandler = undefined;
    this.onUpdateHandler = undefined;

    this.logs = [];

    // init der states
    this.states = [
        { id:'logCache',      common:{name:'last log as JSON', write:false, role:'json'} },
        { id:'logCount',     common:{name:'last log count', write:false, type:'number', def:'0'} },
        { id:'version',     common:{name:'installed script-version', write:false, def:this.VERSION} },
        { id:'updatePressed',common:{name:'update button pressed', write:true, type:'boolean', def:'false', role:'button' }}
    ];
    let defFilter;
    for (let i=0; i<=this.MAX_LOG_FOLDER && i<10; i++) {
        switch (i) {
            case 1 : defFilter = '/:error:|:warn:/'; break;   
            case 2 : defFilter = ':error:'; break;   
            case 3 : defFilter = '/hm-rega|hm-rpc/'; break;   
            default: defFilter = undefined;
        }
        this.states.push( { id:'log'+i+'.table',      common:{name:'ioBroker-log as table', write:false, role:'html' }} );
        this.states.push( { id:'log'+i+'.list',       common:{name:'ioBroker-log as list', write:false, role:'html' }} );
        this.states.push( { id:'log'+i+'.count',      common:{name:'ioBroker-log count', write:false, type:'number', def:'0' }} );
        this.states.push( { id:'log'+i+'.filter',     common:{name:'ioBroker-log filter', write:true, def:defFilter}} );
        this.states.push( { id:'log'+i+'.lastUpdate', common:{name:'ioBroker-log last update', write:false, def:'0' }} );
        this.states.push( { id:'log'+i+'.lastClear',  common:{name:'ioBroker-log last clear', write:false, def:'0'  }} );
        this.states.push( { id:'log'+i+'.clearPressed',common:{name:'ioBroker-log clear table/list', write:true, type:'boolean', def:'false', role:'button' }} );
    }
    // beim 1.Start nur die States erzeugen
    if ( !this.existState("version") || (this.getState('version').val!=this.VERSION) ) {
        // Anlage der States 
        for (var s=0; s<this.states.length; s++) {
            this.setState( this.states[s].id );
        }
    }
    else {   
        this.installed = true;
    }
    
}

// start the script/class
start() {
    if (!this.installed) {
        this.logWarn('cant start, states for version '+this.VERSION+' missed, please start script again');
        return;
    } 
    // bestehende states einlesen
    if (this.existState('logCache')) {
        let val = this.getState('logCache').val;
        if (val && val.length>0)
            this.logs = JSON.parse( val );
    } 
    
    // events erzeugen
    this.onLogHandler = onLog('*', data => { this.onLog(data); });
    this.onUpdateHandler = on( this.STATE_PATH+'updatePressed', obj => { this.onUpdate(obj) } );
    this.onBuildHTMLHandler = setInterval( () => { this.onBuildHTML() }, this.BUILD_TABLE_TIMER * 1000);
    this.onFilterHandler = on( new RegExp( this.STATE_PATH+'*.filter' ), obj => { this.onFilter(obj) } );
    this.onClearHandler = on( new RegExp( this.STATE_PATH+'*.clearPressed' ) , obj => { this.onClear(obj) } );

    this.onBuildHTML();
    this.log('script started');
}

// stop the script/class
stop() {
    if (this.onLogHandler!==undefined) onLogUnregister(this.onLogHandler);
    if (this.onUpdateHandler!==undefined) unsubscribe(this.onUpdateHandler);
    if (this.onBuildHTMLHandler!==undefined) clearInterval(this.onBuildHTMLHandler);
    if (this.onFilterHandler!==undefined) unsubscribe(this.onFilterHandler);
    if (this.onClearHandler!==undefined) unsubscribe(this.onClearHandler);

    this.log('script stopped');
    
}
/*
[{'severity':'warn','ts':1583095803750,'message':'javascript.1 (10360) script.js.logIOBroker: Test auf einen neuen LogEintrag, hier: warn','from':'javascript.1','_id':33289566},
 {'severity':'warn','ts':1583095803750,'message':'javascript.1 (10360) script.js.logIOBroker: Test auf einen neuen LogEintrag, hier: warn','from':'javascript.1','_id':33289567}]
*/
onLog(entry) {
  // ignore?
  for (let i=0; i<this.LOG_IGNORE.length; i++) {
      if (this.fitsFilter(':'+entry.severity + ':' + entry.ts + ':' + entry.from + ':' + entry.message + ':',this.LOG_IGNORE[i])) {
           return;
      }
  }
  if (this.logs && this.logs.constructor === Array && this.logs.length>this.MAX_LOG_CACHE) this.logs.pop();  
  this.logs.unshift( entry );
}

// 
onUpdate(obj) {
    if (obj.state.val===true) {
        this.onBuildHTML();
    }
    this.setState('updatePressed', false);
}

// filter event
onFilter(obj) {
  this.onBuildHTML();
}

// works with a copy of this.logs and creates the HTML states
onBuildHTML() {
  let logsCopy = this.logs.slice();
  this.setState('logCache', JSON.stringify(logsCopy) );
  this.setState('logCount', this.logs.length);

  for (let i=0; i<=this.MAX_LOG_FOLDER && i<10; i++) {
      let filter = '';
      let ts = 0;
      let idState = 'log'+i;
      if (this.existState(idState+'.filter')) filter = this.getState(idState+'.filter').val;
      if (this.existState(idState+'.lastClear')) ts = this.getState(idState+'.lastClear').val;
      this.convertJSON2HTML(logsCopy, idState, filter, ts);
  }
}

// obj.id = 0_userdata.0.mdui.logIOBroker.log1.clear
onClear(obj) {
    let idPath = obj.id.split('.');
    idPath = idPath[idPath.length-2]+'.';
    if (obj.state.val===true) {
        this.setState(idPath + 'lastClear', +new Date()  );
        this.setState(idPath + 'table', '');
        this.setState(idPath + 'list', '');
        this.setState(idPath + 'count', 0);
    }
    this.setState(idPath + 'clearPressed', false);
    this.onBuildHTML();
}


convertJSON2HTML(json, idState, filter, ts) {
const tmpTable = {
header : 
`<tr>
<th style='text-align:left;'>Art</th>
<th style='text-align:left;'>Zeit</th>
<th style='text-align:left;'>Quelle</th>
<th style='text-align:left;'>Meldung</th>
</tr>`,
row : 
`<tr>
<td><i class='material-icons mdui-center {icon_color}' style='font-size:1.5em;'>{icon}</i></td>
<td>{datetime}</td>
<td>{from}</td>
<td>{message}</td>
</tr>`
}

const tmpList = {
row : 
`<div class="mdui-listitem mdui-center-v">
  <i class="material-icons {icon_color}" style="width:40px;font-size:1.5em;">&nbsp;{icon}&nbsp;</i>
  <div class="mdui-label" style="width:calc(100% - 40px);">{datetime} - {from}
    <div class="mdui-subtitle">{message}</div>
  </div>
</div>`}

    // build htmlTable and htmlList
    let htmlTable  = "<table><thead>"+tmpTable.header+"</thead><tbody>";
    let htmlList  = "";
    let entry, tr;
    let count = 0;
    ts = ts || 0;
    // filter as regex?
    if ( filter!==undefined && typeof filter == 'string' && filter.startsWith('/') && filter.endsWith('/') && (filter.length>=2) )  {
//        filter = new RegExp(this.escapeRegExp(filter.substr(1,filter.length-2)),'i');
        filter = new RegExp(filter.substr(1,filter.length-2), 'i');
    }

    for (var i = 0; i < json.length && count<this.MAX_TABLE_ROWS; i++) { 
        entry = json[i];
        if (entry.ts > ts) {
            entry.datetime = formatDate(entry.ts, "TT.MM SS:mm:ss");
            if (this.fitsFilter(':'+entry.severity + ':' + entry.ts + ':' + entry.from + ':' + entry.message + ':',filter)) {
                switch (entry.severity) {
                    case 'warn'  : entry.icon = 'warning'; entry.icon_color='mdui-amber'; break;
                    case 'error' : entry.icon = 'error'; entry.icon_color='mdui-red'; break;
                    case 'debug' : entry.icon = 'bug-report'; entry.icon_color='mdui-black'; break;
                    default : entry.icon = 'info'; entry.icon_color='mdui-blue'; break;
                }
                tr = tmpTable.row;    
                for (let [key, value] of Object.entries(entry)) tr = tr.replace('{'+key+'}',value);
                htmlTable+=tr;
                tr = tmpList.row;    
                for (let [key, value] of Object.entries(entry)) tr = tr.replace('{'+key+'}',value);
                htmlList+=tr;
                count++;
            }
        }
    }
    htmlTable+="</body></table>";    
    this.setState(idState+'.table', htmlTable);  
    this.setState(idState+'.list', htmlList);  
    this.setState(idState+'.count', count);  
    this.setState(idState+'.lastUpdate', +new Date());  
    
 
}

// true, if str conatins filter string or regexp 
fitsFilter(str, filter) {
    if ( (filter===undefined) || !filter || (filter=='') )
        return true;
    if ( filter instanceof RegExp )  {
        if (str.match( filter ) != null) return true;
    } else if (typeof filter == 'string') {
        if(str.includes(filter)) return true;
    }
    return false;        
}


// --------------------- helper functions ---------------------------------

logDebug(msg) { if (this.DEBUG) console.log('['+this.NAME+'] '+msg); }
log(msg) { console.log('['+this.NAME+'] '+msg); }
logWarn(msg) { console.warn('['+this.NAME+'] '+msg); }
logError(msg) { console.error('['+this.NAME+'] '+msg); }

// Ã¼ber den $-Operator nachsehen, ob der state bereits vorhanden ist
// getState().notExists geht auch, erzeugt aber Warnmeldungen!
existState(id) {
    return ( $(this.STATE_PATH+id).length==0?false:true);
}

// wrapper, adds statepath to state-ID
getState(id) {
    return getState(this.STATE_PATH + id);
}

// like setState(), but adds statepath to state_ID and checks if state exists, when not, creates it
setState(id,value) {
    if ( !this.existState(id) ) {
        var common = {};
        // id im states-Array suchen
        for (var i=0; i<this.states.length; i++) { 
            if (this.states[i].id==id) {
                if (this.states[i].hasOwnProperty('common'))
                    common = this.states[i].common;
               break;
            }   
        }
        if ( (typeof value === 'undefined') && (common.hasOwnProperty('def'))) value = common.def;
        // unter "0_userdata.0"
        let obj = {};
        obj.type = 'state';
        obj.native = {};
        obj.common = common;
        setObject(this.STATE_PATH + id, obj, (err) => {
                if (err) {
                    this.log('cant write object for state "' + this.STATE_PATH + id + '": ' + err);
                } else { 
                    this.log('state "' + this.STATE_PATH + id + '" created');
                }
        });
        
        
        // unter javascript.x
        // createState( this.STATE_PATH + id, value, common);
        setTimeout( setState, 3000, this.STATE_PATH + id, value );
    }
    else
        setState( this.STATE_PATH + id, value);
}

escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

}



// create instance and start
var mduiLogIOBroker = new MduiLogIOBroker( );
mduiLogIOBroker.start();

// on script stop, stop instance too
onStop(function () { 
    mduiLogIOBroker.stop(); 
}, 1000 );
