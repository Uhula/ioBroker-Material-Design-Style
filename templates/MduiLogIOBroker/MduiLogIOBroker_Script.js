/*
*** MduiLogIOBroker
Dieses Script dient der Visualisierung des ioBroker-Logs in der vis im Material Design CSS Style als
table- bzw. list-Anzeige. Dazu wird ein onLog()-Handler instanziiert, welcher bis zu MAX_LOG_CACHE
Log-Einträge zwischenspeichert und daraus dann alle BUILD_TABLE_TIMER Sekunden bis zu MAX_LOG_FOLDER
Log-Ordner erzeugt. In jedem Log-Ordner befindet sich ein table- und list-HTML State, welcher direkt in 
der vis angezeigt werden kann (jeweils im basic-string (unescaped) Widget). Je Log-Ordner kann ein filter
als string (Bsp:'error') oder als RegExp (Bsp:'/warn|error/') festgelegt werden, welcher beim Aufbau der 
table-/list-HTML States berücksichtigt wird. Weiterhin können über clearPressed die table-/list-States 
gelöscht werden, beim nächsten Build werden sie dann nur solche Log-Eintäge berücksichtigen, die später hinzu kamen.

**** Voraussetzungen
Nutzung der MDCSS v2.x (siehe: https://forum.iobroker.net/topic/30363/projekt-mdcss-v2-material-design-css-version-2), für die Sortierdarstellung im Header MDCSS v2.5

**** Installation
Einfach als serverseitiges Script installieren und starten. Beim 1.Start werden die notwendigen States 
unter STATE_PATH = '0_userdata.0.mdui.logIOBroker.' erzeugt und es findet automatisch ein erneuter Start nach 10 Sek statt. 
Erst nach diesem 2.Start instanziiert das Script die Event-Handler und läuft dann.

**** Konfiguration
Optional im constructor die const anpassen, wie z.B. die IGNORE_LIST 
Optional Anpassung der tmpTable und tmpList.
  
**** Dokumentation
https://github.com/Uhula/ioBroker-Material-Design-Style/wiki/3.1-MduiLogIOBroker

**** States
Unter dem STATE_PATH werden die folgenden States erzeugt:
version : Script-Version, wird verwendet um Script-Updates zu erkennen
logCache  : Cache der Log-Einträge als JSON 
logCount : Anzahl der Log-Einträge in logCache
updatePressed : auf true setzen, wenn ein table/list update außerhalb des Intervals erfolgen soll
logPK: Zähler für eindeutigen PK (primary key) eines Eintrags
removePK: Führt zum Entfernen des gesetzten PK aus dem logCache

Weiterhin werden MAX_LOG_FOLDER Unterordner im STATE_PATH erzeugt (N=0-9):

LogN.table       : enthält die table-HTML für ein basic-string (unescaped) Widget
LogN.list        : enthält die list-HTML für ein basic-string (unescaped) Widget
LogN.count       : Anzahl der Log-Zeilen
LogN.filter      : Filter, der auch die logCache angewendet wurde im .table/.list zu erzeugen (siehe Filter)
LogN.lastUpdate  : Timestamp des letzten Updates
LogN.lastClear   : Timestamp des letzten manuellen "clearPressed", d.h. anschließend werden nur
                   noch neuere Einträge aus der logCache berücksichtigt
LogN.clearPressed: auf true setzen, um die .table/.list zu löschen

**** Filter
In den filter-States können sowohl strings (Bsp:'error') als auch RegExp-Strings (Bsp:'/warn|error/') 
hinterlegt werden. RegExp-Strings werden an den einschließenden  '/' erkannt. Über den ':' kann der Anfang
eines Feldes mit in den Filter einbezogen werden. 
Beispiele: 
'error' (string) zeigt alle Zeilen an, in denen 'error' in irgendeinem Feld vorkommt
':error:' (string) zeigt alle Zeilen an, welche den Typ 'error' besitzen (dito für: error, warn, info, silly, debug)
'/error|warn/' (RegExp) zeigt alle Zeilen an, in denen 'error' oder 'warn' in irgendeinem Feld vorkommen
'/:error:|:warn:/' (RegExp) zeigt alle Zeilen an, welche dem Typ 'error' oder 'warn' entsprechen
'tr-064' (string) zeigt alle Zeilen an, in denen 'tr-064' in irgendeinem Feld vorkommt
':tr-064' (string) zeigt alle Zeilen an, in welchen ein Feld mit 'tr-064' beginnt, z.B. als Adapterfilter

**** Lizenz
(c) 2020 by UH, MIT License, no warranty, use on your own risc

*** Changelog
2020.04.30 UH 
* Anpassung an neues MduiBase
* Einbau Löschen einzelner Log-Einträge aus dem logCache via Schaltfläche u/o swipeLeft

*/

// ------------------------------------------------------------------------------------- 
// MduiBase
// ------------------------------------------------------------------------------------- 

class MduiBase {

    constructor() {
      this.init();
    }
    
    //
    init() {
        // const
        this.DEBUG      = false;
        this.VERSION    = '1.0/2020-01-01';
        this.NAME       = 'mduiBase';
        this.STATE_PATH = '0_userdata.0.mdui.base.';
        this.STATE_UNKNOWN    =  0;
        this.STATE_INSTALLING = 10;
        this.STATE_INSTALLED  = 11;
        this.STATE_STARTING   = 20;
        this.STATE_STARTED    = 21;
        this.STATE_STOPPING   = 30;
        this.STATE_STOPPED    = 31;
    
        // var
        this.state = this.STATE_UNKNOWN;
        this.states = [];
        this.subscribers = [];
        this.schedulers = [];
    
        this.doInit();
    
        // init der states
        this.states.push( { id:'version',     common:{name:'installed script-version', write:false, def:this.VERSION} } );
    }
    
    //
    // start the script/class
    //
    start() {
        // beim 1.Start nur die States erzeugen
        if ( !this.existState("version") || (this.getState('version').val!=this.VERSION) ) {
            for (let s=0; s<this.states.length; s++) { this.createState( this.states[s].id ); }
            this.logWarn('first script start, creating states for version '+this.VERSION+', automatic restarting script again in 10 sec ...');
            setStateDelayed(this.STATE_PATH + 'version', this.VERSION, 3000);
            setTimeout( this.start.bind(this), 10000 );
            this.state = this.STATE_INSTALLED; 
            return;
        }
        switch (this.state) {
            case this.STATE_UNKNOWN : ;
            case this.STATE_INSTALLING : ;
            case this.STATE_INSTALLED : ;
            case this.STATE_STOPPED : {
                this.state = this.STATE_STARTING; 
                if (this.doStart()) {
                    this.log('script started');
                    this.state = this.STATE_STARTED;
                }
                break;    
            }
            case this.STATE_STARTING : ;
            case this.STATE_STARTED : {
                this.logWarn('script already starting/started');
                break;    
            }
            case this.STATE_STOPPING : {
                this.logWarn('script is stopping, pls start later again');
                break;    
            }
      
        } 
    }
    
    //
    // stop the script/class
    //
    stop() {
        switch (this.state) {
            case this.STATE_STARTED : {
                this.state = this.STATE_STOPPING; 
                if (this.doStop()) {
                    for (let i=0; i<this.subscribers.length; i++) if (this.subscribers[i] !== undefined) unsubscribe( this.subscribers[i] );
                    this.subscribers = [];
                    for (let i=0; i<this.schedulers.length; i++) if (this.schedulers[i] !== undefined) clearSchedule( this.schedulers[i] );
                    this.schedulers = [];
                    this.state = this.STATE_STOPPED; 
                    this.log('script stopped');
                }
                break;    
            }
            default : {
                this.log('cant stopp script, because not startet');
            }
        } 
    }
    
    //
    // virtual functions, overwrite it 
    //
    doInit() { return true; }
    doStart() { return true; }
    doStop() { return true; }
    
    //
    // tool functions 
    //
    logDebug(msg) { if (this.DEBUG) console.log('['+this.NAME+'] '+msg); }
    log(msg) { console.log('['+this.NAME+'] '+msg); }
    logWarn(msg) { console.warn('['+this.NAME+'] '+msg); }
    logError(msg) { console.error('['+this.NAME+'] '+msg); }
    
    // einen on-Handler registrieren
    subscribe( handler ) {
        this.subscribers.push( handler );
    }
    
    // einen timer registrieren
    schedule( handler ) {
        this.schedulers.push( handler );
    }
    
    
    // über den $-Operator nachsehen, ob der state bereits vorhanden ist
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
        if ( !this.existState(id) ) this.createState(id,value,undefined);
        else setState( this.STATE_PATH + id, value);
    }
    
    // like cresteState(), but adds statepath to state_ID and checks if state exists, when not, creates it
    createState(id,value,common) {
        if ( !this.existState(id) ) {
            if (common===undefined) {
                // id im states-Array suchen
                for (var i=0; i<this.states.length; i++) { 
                    if (this.states[i].id==id) {
                        if (this.states[i].hasOwnProperty('common'))
                            common = this.states[i].common;
                       break;
                    }   
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
    
            setTimeout( setState, 3000, this.STATE_PATH + id, value );
        }
    }
    
    // true, if str contains filter string or regexp 
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
    
    //
    escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
    }
    
    }
    
    // ------------------------------------------------------------------------------------- 
    // MduiLogIOBroker
    // ------------------------------------------------------------------------------------- 
    
    class MduiLogIOBroker extends MduiBase {
    
    constructor() {
        super();
    }
    
    doInit() {
      super.doInit();
        
      // const
      this.DEBUG = false;
      this.VERSION = '1.2/2020-04-30';
      this.NAME = 'mduiLogIOBroker';
      this.STATE_PATH = '0_userdata.0.mdui.logIOBroker.';
      this.MAX_LOG_CACHE     = 100; // Anzahl der log-Zeilen, die zwischengespeichert werden
      this.MAX_LOG_FOLDER    = 3;  // Anzahl der Table/List Ordner mit eigenem Filter/View
      this.MAX_TABLE_ROWS    = 50; // Anzahl der Zeilen für die Table/List Ausgabe
      this.BUILD_TABLE_TIMER = 30; // [sec] Refresh-Zeit der Table/List Ausgaben
      this.LOG_IGNORE = [          // Aufzählung von string / RegExp Filtern um Log-Einträge komplett zu ignorieren
                                   // Beispiele (wert1, wert2 ersetzen):
                                   // UND-Verknüpfung : /(?=.*wert1)(?=.*wert2)/i
                                   // ODER-Verknüpfung: /wert1|wert2/i
         /(?=.*tr-064)(?=.*"New)/i,        // tr-064 Adapter UND New-Meldungen
         /(?=.*ical)(?=.*processing URL)/i // ical UND processing Meldungen
      ];
        
      // var
      this.logs = [];
      for (let i=0; i<=this.MAX_LOG_FOLDER && i<10; i++) 
          this.logs.push({sortBy:'', sortAscending:'', sortByOld:'', filter:'' });
      this.logCache = [];
      this.logPK = 0;
    
      // init der states
      this.states.push( { id:'logCache',     common:{name:'last log as JSON', write:false, role:'json'} } );
      this.states.push( { id:'logCount',     common:{name:'last log count', write:false, type:'number', def:'0'} } );
      this.states.push( { id:'logPK',        common:{name:'primary key of log entry', write:false, type:'number', def:'0'} } );
      this.states.push( { id:'version',      common:{name:'installed script-version', write:false, def:this.VERSION} } );
      this.states.push( { id:'updatePressed',common:{name:'update button pressed', write:true, type:'boolean', def:'false', role:'button' }} );
      this.states.push( { id:'removePK',    common:{name:'für swipe left on item', write:true, def:'' }} );
      
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
    
      return true;  
    }
    
    // start the script/class
    doStart() {
        super.doStart();
        // bestehende states einlesen
        if (this.existState('logCache')) {
            let val = this.getState('logCache').val;
            if (val && val.length>0)
                this.logCache = JSON.parse( val );
        } 
        if (this.existState('logPK')) this.logPK = this.getState('logPK').val;
            
        // events erzeugen
        this.subscribe( onLog('*', data => { this.onLog(data); }));
        this.subscribe( on( this.STATE_PATH+'updatePressed', obj => { this.onUpdate(obj) } ));
        this.schedule( setInterval( () => { this.onBuildHTML() }, this.BUILD_TABLE_TIMER * 1000));
        this.subscribe( on( new RegExp( this.STATE_PATH+'*.filter' ), obj => { this.onFilter(obj) } ));
        this.subscribe( on( new RegExp( this.STATE_PATH+'*.clearPressed' ) , obj => { this.onClear(obj) } ));
        this.subscribe( on( new RegExp( this.STATE_PATH+'*.removePK' ) , obj => { this.onRemovePK(obj) } ));
    
        this.onBuildHTML();
        return true;
    }
    
    // stop the script/class
    doStop() {
        super.doStop();
        return true;
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
      entry.pk = this.logPK;
      this.logPK++;
      if (this.logCache && this.logCache.constructor === Array && this.logCache.length>this.MAX_LOG_CACHE) this.logCache.pop();  
      this.logCache.unshift( entry );
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
    
    // obj.id = 0_userdata.0.mdui.logIOBroker.log1.clearPressed
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
    
    // obj.id = 0_userdata.0.mdui.logIOBroker.log1.swipeLeft
    onRemovePK(obj) {
        let pk = obj.state.val;
        let i=0;
        while ( i<this.logCache.length )  
            if (this.logCache[i].pk == pk)
                this.logCache.splice(i, 1);
            else i++;    
       
                
        this.onBuildHTML();
    }
    
    
    // works with a copy of this.logs and creates the HTML states
    onBuildHTML() {
      let logCacheCopy = this.logCache.slice();
      this.setState('logCache', JSON.stringify(logCacheCopy) );
      this.setState('logCount', logCacheCopy.length);
      this.setState('logPK', this.logPK);
    
      for (let i=0; i<=this.MAX_LOG_FOLDER && i<10; i++) {
          let log = {};
          log.filter = '';
          log.ts = 0;
          log.idState = 'log'+i;
          if (this.existState(log.idState+'.filter')) log.filter = this.getState(log.idState+'.filter').val;
          if (this.existState(log.idState+'.lastClear')) log.ts = this.getState(log.idState+'.lastClear').val;
          this.convertJSON2HTML(logCacheCopy, log);
      }
    }
    
    //
    convertJSON2HTML(json, log) {
    const tmpTable = {
    header : 
    `<tr>
    <th style='text-align:left;'>Art</th>
    <th style='text-align:left;'>Zeit</th>
    <th style='text-align:left;'>Quelle</th>
    <th style='text-align:left;'>Meldung</th>
    <th style='text-align:left;'></th>
    </tr>`,
    row : 
    `<tr class="mdui-swipe-left?dist:64;background:red;icon:delete;action:setValue(`+this.STATE_PATH+`removePK,{pk})">
    <td><i class='material-icons mdui-center {icon_color}' style='font-size:1.5em;'>{icon}</i></td>
    <td>{datetime}</td>
    <td>{from}</td>
    <td>{message}</td>
    <td><div class="mdui-navitem mdui-show-notouch mdui-tooltip?text:Eintrag+entfernen mdui-click?action:setValue(`+this.STATE_PATH+`removePK,{pk})"><i class="material-icons" style="font-size:1.5em;">delete</i></div></td>
    </tr>`
    }
    
    const tmpList = {
    row : 
    `<div class="mdui-listitem mdui-swipe-left?dist:64;background:red;icon:delete;action:setValue(`+this.STATE_PATH+`removePK,{pk})" style="width:100%; display:flex;">
      <div style="flex:0 0 2.5em;">
        <div class="material-icons {icon_color}" style="font-size:1.5em;">{icon}</div>
      </div>  
      <div style="flex:1 1 auto; display:flex; flex-wrap:wrap;">
        <div class="mdui-value" style="width:calc(100% - 40px);">{datetime} - {from}
          <div class="mdui-subtitle">{message}</div>
        </div>
      </div>
      <div class="mdui-navitem mdui-show-notouch mdui-tooltip?text:Eintrag+entfernen mdui-click?action:setValue(`+this.STATE_PATH+`removePK,{pk})"><i class="material-icons" style="font-size:1.5em;">delete</i></div>
    </div>`}
    
        // build htmlTable and htmlList
        let htmlTable  = "<table><thead>"+tmpTable.header+"</thead><tbody>";
        let htmlList  = "";
        let entry, tr;
        let count = 0;
        log.ts = log.ts || 0;
        // filter as regex?
        if ( log.filter!==undefined && typeof log.filter == 'string' && log.filter.startsWith('/') && log.filter.endsWith('/') && (log.filter.length>=2) )  {
    //        filter = new RegExp(this.escapeRegExp(filter.substr(1,filter.length-2)),'i');
            log.filter = new RegExp(log.filter.substr(1,log.filter.length-2), 'i');
        }
    
        for (var i = 0; i < json.length && count<this.MAX_TABLE_ROWS; i++) { 
            entry = json[i];
            if (entry.ts > log.ts) {
                entry.datetime = formatDate(entry.ts, "TT.MM SS:mm:ss");
                if (this.fitsFilter(':'+entry.severity + ':' + entry.ts + ':' + entry.from + ':' + entry.message + ':',log.filter)) {
                    switch (entry.severity) {
                        case 'warn'  : entry.icon = 'warning'; entry.icon_color='mdui-amber'; break;
                        case 'error' : entry.icon = 'error'; entry.icon_color='mdui-red'; break;
                        case 'debug' : entry.icon = 'bug-report'; entry.icon_color='mdui-black'; break;
                        default : entry.icon = 'info'; entry.icon_color='mdui-blue'; break;
                    }
                    tr = tmpTable.row;    
                    for (let [key, value] of Object.entries(entry)) tr = tr.replace(new RegExp('{'+key+'}','g'),value);
                    htmlTable+=tr;
                    tr = tmpList.row;    
                    for (let [key, value] of Object.entries(entry)) tr = tr.replace(new RegExp('{'+key+'}','g'),value);
                    htmlList+=tr;
                    count++;
                }
            }
        }
        htmlTable+="</body></table>";    
        this.setState(log.idState+'.table', htmlTable);  
        this.setState(log.idState+'.list', htmlList);  
        this.setState(log.idState+'.count', count);  
        this.setState(log.idState+'.lastUpdate', +new Date());  
     
    }
    
    }
    
    
    // create instance and start
    var mduiLogIOBroker = new MduiLogIOBroker( );
    mduiLogIOBroker.start();
    
    // on script stop, stop instance too
    onStop(function () { 
        mduiLogIOBroker.stop(); 
    }, 1000 );
    
    