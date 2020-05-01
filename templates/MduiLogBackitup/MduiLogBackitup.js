
/*
*** MduiLogBackitup
Dieses Script dient der Visualisierung des Logs des BackitUp-Adapters in der vis im Material Design CSS Style als
table- bzw. list-Anzeige. 
In jedem Log-Ordner 
* befindet sich ein table- und list-HTML State, welcher direkt in der vis angezeigt werden kann (jeweils im basic-string (unescaped) Widget). 
* kann ein filter als string (Bsp:':hasupdate:') oder als RegExp (Bsp:'/warn|error/') festgelegt werden, welcher beim Aufbau der table-/list-HTML States berücksichtigt wird. 
* kann die Sortierreihenfolge festgelegt werden, in der table-Ansicht auch via Klick auf die Header

**** Voraussetzungen
Nutzung der MDCSS v2.x (siehe: https://forum.iobroker.net/topic/30363/projekt-mdcss-v2-material-design-css-version-2), für die Sortierdarstellung im Header MDCSS v2.5

**** Installation
Einfach als serverseitiges Script installieren und starten. Beim 1.Start werden die notwendigen States 
unter STATE_PATH = '0_userdata.0.mdui.logIOBroker.' erzeugt und es findet automatisch ein erneuter Start nach 10 Sek statt. 
Erst nach diesem 2.Start instanziiert das Script die Event-Handler und läuft dann.

**** Konfiguration
Eigentlich ist keine notwendig.
Optional in der Funktion MduiLogBackitup.doInit() eine Anpassung der KONFIGURATION vornehmen, zB wenn eine andere backitup 
Instanz überwacht werden soll (Vorgabe: backitup.0.history.json).
Optional Anpassung der tmpTable und tmpList.

  
**** Dokumentation
https://github.com/Uhula/ioBroker-Material-Design-Style/wiki/3.7-MduiLogBackitUp

***** States
Unter dem STATE_PATH werden die folgenden States erzeugt:
version : Script-Version, wird verwendet um Script-Updates zu erkennen
updatePressed : auf true setzen, wenn ein table/list update außerhalb des Intervals erfolgen soll

Weiterhin werden MAX_LOG_FOLDER Unterordner im STATE_PATH erzeugt (N=0-9):

* LogN.table        : enthält die table-HTML für ein basic-string (unescaped) Widget
* LogN.list         : enthält die list-HTML für ein basic-string (unescaped) Widget
* LogN.count        : Anzahl der Log-Zeilen (wenn das Log mit '/:error:|:warn:/' gefiltert ist, dann ist es die Anzahl der Fehler/Warnungen)
* LogN.filter       : Filter, der auch die logCache angewendet wurde im .table/.list zu erzeugen (siehe Filter)
* LogN.lastUpdate   : Timestamp des letzten Updates
* LogN.sortBy       : Sortierung nach welchem Feld
* LogN.sortAscending: true=aufsteigend sortieren


***** Filter
In den filter-States können sowohl strings (Bsp:'error') als auch RegExp-Strings (Bsp:'/warn|error/') 
hinterlegt werden. RegExp-Strings werden an den einschließenden  '/' erkannt. Über den ':' kann der Anfang
eines Feldes mit in den Filter einbezogen werden. 
Beispiele: 
'/error|warn/' (RegExp) zeigt alle Zeilen an, in denen 'error' oder 'warn' in irgendeinem Feld vorkommen
'/:error:|:warn:/' (RegExp) zeigt alle Zeilen an, welche dem Typ 'error' oder 'warn' entsprechen
'rssi' (string) zeigt alle Zeilen an, in denen 'rssi' in irgendeinem Feld vorkommt
':rssi:' (string) zeigt alle Zeilen an, in welchen ein Feld den Inhalt 'rssi' hat

**** Lizenz
(c) 2020 by UH, MIT License, no warranty, use on your own risc

*** Changelog
2020.05.01 UH 
* Geburt

*/

// ------------------------------------------------------------------------------------- 
// MduiBase
// ------------------------------------------------------------------------------------- 

class MduiBase {

    //
    //
    //
    constructor() {
      this.init();
    }
    
    //
    //
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
    // like setStateDelayed(), but adds statepath to state_ID and checks if state exists, when not, creates it
    setStateDelayed(id,value,delay) {
        if ( !this.existState(id) ) this.createState(id,value,undefined);
        else setState( this.STATE_PATH + id, value, delay);
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
    // MduiLogBackitup
    // ------------------------------------------------------------------------------------- 
    
    class MduiLogBackitup extends MduiBase {
    
    constructor() {
        super();
    }
    
    doInit() {
      super.doInit();
    
      // const
      this.DEBUG             = false;
      this.VERSION           = '1.0/2020-04-07';
      this.NAME              = 'MduiLogBackitup';
      this.MSG_TYPE_OK       = 'ok';
      this.MSG_TYPE_ERROR    = 'error';
      this.MSG_TYPE_WARN     = 'warn';
      this.MSG_TYPE_INFO     = 'info';
      this.SELECT_HISTORY    = 'backitup.0.history.json';
        
      // -----------------------  
      // optional: KONFIGURATION
      // -----------------------  
                           // state-Pfad unter dem die States angelegt werden  
      this.STATE_PATH      = '0_userdata.0.mdui.logBackitup.'; 
                           // Anzahl der Table/List Ordner mit eigenem Filter/View
      this.MAX_LOG_FOLDER  = 2;   
                           // max.Anzahl der Zeilen für die Table/List Ausgabe
      this.MAX_TABLE_ROWS  = 200; 
    
      // -----------------------  
      // ENDE KONFIGURATION
      // -----------------------  
    
    
      // logs-Pbject initialisieren
      this.logs = [];
      for (let i=0; i<=this.MAX_LOG_FOLDER && i<10; i++) 
          this.logs.push({sortBy:'', sortAscending:'', sortByOld:'', filter:'' });
    
      // init der states
      this.states.push( { id:'version',     common:{name:'installed script-version', write:false, def:this.VERSION} } );
      this.states.push( { id:'updatePressed',common:{name:'update button pressed', write:true, type:'boolean', def:'false', role:'button' }} );
      
      let defFilter;
      for (let i=0; i<=this.MAX_LOG_FOLDER && i<10; i++) {
          switch (i) {
              case 1 : defFilter = '/:error:|:warn:/'; break;   
              case 2 : defFilter = ':hasupdate:'; break;   
              default: defFilter = undefined;
          }
          this.states.push( { id:'log'+i+'.table',      common:{name:'Instances as table', write:false, role:'html' }} );
          this.states.push( { id:'log'+i+'.list',       common:{name:'Instances as list', write:false, role:'html' }} );
          this.states.push( { id:'log'+i+'.count',      common:{name:'Instances count', write:false, type:'number', def:'0' }} );
          this.states.push( { id:'log'+i+'.filter',     common:{name:'Instances filter', write:true, def:defFilter}} );
          this.states.push( { id:'log'+i+'.lastUpdate', common:{name:'Instances last update', write:false, def:'0' }} );
          this.states.push( { id:'log'+i+'.sortBy',        common:{name:'sortieren nach', write:true, def:''}} );
          this.states.push( { id:'log'+i+'.sortAscending', common:{name:'aufsteigend sortieren', write:true, def:true}} );
          this.states.push( { id:'log'+i+'.showAs', common:{name:'kompakte Anzeige', write:true, def:this.SHOW_NORMAL}} );
      }
    
      return true;  
    }
    
    // start the script/class
    doStart() {
        super.doStart();
        
        // subscriber erzeugen
        this.subscribe( on( this.STATE_PATH+'updatePressed', obj => { this.onUpdate(obj) } ));
        this.subscribe( on( new RegExp( this.STATE_PATH+'*.showAs' ), obj => { this.onShowAs(obj) } ));
        this.subscribe( on( new RegExp( this.STATE_PATH+'*.filter' ), obj => { this.onFilter(obj) } ));
        this.subscribe( on( {id: new RegExp( this.STATE_PATH+'*.sortBy' ), change: "any"} , obj => { this.onChangeSortBy(obj) } ));
    
        this.subscribe( on( new RegExp( this.STATE_PATH+'*.sortAscending' ), obj => { this.onChangeSortAscending(obj) } ));
        this.subscribe( on( new RegExp( this.SELECT_HISTORY ), obj => { this.onBuildHTML(obj) } ));
    
        this.onBuildHTML();
        return true;
    }
    
    // stop the script/class
    doStop() {
      super.doStop();
      return true;
    }
    
    // 
    onUpdate(obj) {
      if (obj.state.val===true) {
          this.onBuildHTML();
      }
      this.setState('updatePressed', false);
    }
    // 
    onShowAs(obj) {
      this.onBuildHTML();
    }
    
    // filter, sort events
    onFilter(obj) {
      this.onBuildHTML();
    }
    
    //
    // beim gleichen sortBy Sortierreihenfolge umdrehen
    // 
    onChangeSortBy(obj) {
      let i = parseInt( obj.id.substr(this.STATE_PATH.length + 3, 1) );
      if (i>=0 && i<this.logs.length) {
         if (this.logs[i].sortByOld == obj.state.val) {
             if (this.existState(this.logs[i].id+'.sortAscending')) {
               this.setState(this.logs[i].id+'.sortAscending', !this.logs[i].sortAscending);
               return;
             }
         }      
      }
      this.logs[i].sortByOld = obj.state.val;
      this.onBuildHTML();
    }
    //
    //
    //
    onChangeSortAscending (obj) {
      this.onBuildHTML();
    }
    
    //
    // creates the HTML states for every log
    //
    onBuildHTML(obj) { try {
      // build JSON array as data-base 
      let json = [];  
      let jsonHist = JSON.parse( getState(this.SELECT_HISTORY).val);
    
      // [{"date":"07. April 2020 um 02:00 Uhr",
      // "name":"iobroker_2020_04_07-02_00_10_UHULA_backupiobroker.tar.gz",
      // "type":"iobroker",
      // "storage":"FTP-Backup: Ja",
      // "filesize":"10MB",
      // "error":"none"},
      for (let i=0; i<jsonHist.length; i++)  {   
        let entry = jsonHist[i];   
        // ts berechnen
        let d = entry.name.split('-');
        let t = d[1].split('_');
        d = d[0].split('_');
        // Date(year, month, day, hours, minutes, seconds, milliseconds);
        let date = new Date(d[1],d[2]-1,d[3],t[0],t[1],t[2],0);
        entry.ts = date.getTime();
    
        if (entry.error == 'none') entry.msgtype = this.MSG_TYPE_OK;
        else entry.msgtype = this.MSG_TYPE_ERROR;
        json.push(entry);
      };
      // build table/list HTML
      for (let i=0; i<=this.MAX_LOG_FOLDER && i<10; i++) {
          let log = this.logs[i];
          log.id = 'log'+i;
          log.statePath = this.STATE_PATH+log.id;
          log.filter = '';
          if (this.existState(log.id+'.filter')) log.filter = this.getState(log.id+'.filter').val;
    
          // beim gleichen sortBy -> Reihenfolge ändern
          log.sortBy = '';
          log.sortAscending = true;
          if (this.existState(log.id+'.sortAscending')) log.sortAscending = this.getState(log.id+'.sortAscending').val;
          if (this.existState(log.id+'.sortBy')) log.sortBy = this.getState(log.id+'.sortBy').val; 
          log.sortbyts = 'mdui-sortable';
          log.sortbyname = 'mdui-sortable';
          log.sortbytype = 'mdui-sortable';
          log.sortbystorage = 'mdui-sortable';
          log.sortbyfilesize = 'mdui-sortable';
          log.sortbymsgtype = 'mdui-sortable';
    
          if ( log.sortBy!='') {
              if (log.sortAscending) log['sortby'+log.sortBy] = 'mdui-sort-ascending';
              else log['sortby'+log.sortBy] = 'mdui-sort-descending';
              // Summenwerte immer oben
              json.sort( (l,r) => {
                    let lv=l['name'],rv=r['name'];
                    if (l.hasOwnProperty(log.sortBy)) lv=l[log.sortBy];
                    if (r.hasOwnProperty(log.sortBy)) rv=r[log.sortBy];
                    return ((lv < rv) ? -1 : (lv > rv) ? 1 : 0) * (log.sortAscending?1:-1);
              } );
          }
    
          this.convertJSON2HTML(json, log);
      }
    } catch(err) { this.logError( 'onBuildHTML: '+err.message ); }  }
    
    
    //
    // JSON -> HTML
    //
    convertJSON2HTML(json, log) {
    const tmpTable = {
    header : 
    `<tr>
    <th class="{sortbymsgtype}" style="text-align:left;" onclick="vis.setValue('`+log.statePath+`.sortBy','msgtype');"></th>
    <th class="{sortbyts}" style="text-align:left;" onclick="vis.setValue('`+log.statePath+`.sortBy','ts');">Zeit</th>
    <th class="{sortbyname}" style="text-align:left;" onclick="vis.setValue('`+log.statePath+`.sortBy','name');">Name</th>
    <th class="{sortbytype}" style="text-align:left;" onclick="vis.setValue('`+log.statePath+`.sortBy','type');">Typ</th>
    <th class="{sortbystorage}" style="text-align:right;" onclick="vis.setValue('`+log.statePath+`.sortBy','storage');">Optionen</th>
    <th class="{sortbyfilesize}" style="text-align:right;" onclick="vis.setValue('`+log.statePath+`.sortBy','filesize');">Größe</th>
    </tr>`,
    row : 
    `<tr style="font-size:1em;">
    <td style="vertical-align:top;"><i class='material-icons mdui-center {iconColor}' style='font-size:1.5em;'>{icon}</i></td>
    <td style="vertical-align:top;">{date}</td>
    <td style="vertical-align:top;">{name}</td>
    <td style="vertical-align:top;">{type}</td>
    <td style="vertical-align:top;">{storage}</td>
    <td style="vertical-align:top;">{filesize}</td>
    </tr>`
    }
    
    const tmpList = {
    row : 
    `<div class="mdui-listitem" style="width:100%; display:flex;">
      <div style="flex:0 0 2.5em;">
        <i class="material-icons mdui-center {iconColor}" style="font-size:1.5em;">{icon}</i>
      </div>  
      <div style="flex:1 1 auto; display:flex; flex-wrap:wrap;">
        <div class="mdui-value" style="flex:0 0 100%;">{date}</div>
        <div class="mdui-subtitle" style="flex:0 0 100%; margin-bottom:0.25em;">{name}</div>
        <div class="mdui-label" style="font-size:0.8em; flex:1 1 15em; display:flex; flex-wrap:wrap; align-content:flex-start; padding-right:0.5em;">
          <div style="flex:1 0 5em; ">Typ: <span class="mdui-value">{type}</span></div>
          <div style="flex:1 0 5em; ">Größe: <span class="mdui-value">{filesize}</span></div>
          <div style="flex:1 0 10em; ">Optionen: <span class="mdui-value">{storage}</span></div>
        </div> 
      </div>
    </div>`}
    
      // build htmlTable and htmlList
      let htmlTable  = "<table><thead>"+tmpTable.header+"</thead><tbody>";
      for (let [key, value] of Object.entries(log)) htmlTable = htmlTable.replace(new RegExp('{'+key+'}','g'),value);
    
      let htmlList  = "";
      let entry, tr;
      let count = 0;
      // filter as regex?
      if ( log.filter!==undefined && typeof log.filter == 'string' && log.filter.startsWith('/') && log.filter.endsWith('/') && (log.filter.length>=2) )  {
          log.filter = new RegExp(log.filter.substr(1,log.filter.length-2), 'i');
      }
      for (var i = 0; i < json.length && count<this.MAX_TABLE_ROWS; i++) { 
          entry = json[i];
              if (this.fitsFilter(':' + entry.msgtype +':'+ entry.name +':'+ entry.type +':'+ entry.storage +':' ,log.filter)) {
                  switch (entry.msgtype) {
                      case this.MSG_TYPE_OK       : entry.icon = 'check_circle_outline'; entry.iconColor='mdui-green'; break;
                      case this.MSG_TYPE_WARN     : entry.icon = 'warning'; entry.iconColor='mdui-amber'; break;
                      case this.MSG_TYPE_ERROR    : entry.icon = 'error'; entry.iconColor='mdui-red'; break;
                      default                     : entry.icon = 'info'; entry.iconColor='mdui-blue';  
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
      htmlTable+="</body></table>";    
      this.setState(log.id+'.table', htmlTable);  
      this.setState(log.id+'.list', htmlList);  
      this.setState(log.id+'.count', count);  
      this.setState(log.id+'.lastUpdate', +new Date());  
    }
    
    } // class
    
    
    // create instance and start
    var mduiLogBackitup = new MduiLogBackitup( );
    mduiLogBackitup.start();
    
    // on script stop, stop instance too
    onStop(function () { 
        mduiLogBackitup.stop(); 
    }, 1000 );
    
    