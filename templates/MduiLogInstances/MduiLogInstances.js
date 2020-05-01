/*
*** MduiLogInstances
Dieses Script dient der Visualisierung des Zustände der Adapter-Instanzen in der vis im Material Design CSS Style als
table- bzw. list-Anzeige. Die Instanzen werden aktiv mit on-Handler auf connected usw. überwacht. 
In jedem Log-Ordner 
* befindet sich ein table- und list-HTML State, welcher direkt in der vis angezeigt werden kann (jeweils im basic-string (unescaped) Widget). 
* kann ein filter als string (Bsp:':hasupdate:') oder als RegExp (Bsp:'/warn|error/') festgelegt werden, welcher beim Aufbau der table-/list-HTML States berücksichtigt wird. 
* kann die Sortierreihenfolge festgelegt werden, in der table-Ansicht auch via Klick auf die Header
* kann die Anzeige als "normal" oder "compact" geschaltet werden
* Instanzen können gestoppt/gestartet werden

**** Voraussetzungen
Nutzung der MDCSS v2.x (siehe: https://forum.iobroker.net/topic/30363/projekt-mdcss-v2-material-design-css-version-2), für die Sortierdarstellung im Header MDCSS v2.5

**** Installation
Einfach als serverseitiges Script installieren und starten. Beim 1.Start werden die notwendigen States unter STATE_PATH = 
'0_userdata.0.mdui.logInstances.' erzeugt und es erfolgt nach 10 Sek ein automatischer restart. 

**** Konfiguration
Eigentlich ist keine notwendig.
Optional in der Funktion MduiShowInstances|doInit() eine Anpassung der KONFIGURATION vornehmen
Optional Anpassung der tmpTable und tmpList.

  
**** Dokumentation
https://github.com/Uhula/ioBroker-Material-Design-Style/wiki/3.6-MduiLogInstances

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
* LogN.showAs       : "normal"=mit Details  "compact"=ohne Details


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
* Anpassung an neues MduiBase (intern)
* Anpassung an MDCSS 2.5
* Einbau swipeLeft für Start/Stop Adapter, keine Buttonanzeige mehr auf Touch-Geräten


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
            this.logWarn('first script start, creating states for version '+this.VERSION+', starting script again in 10 sec ...');
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
    
    // einen on-Handler registrieren
    subscribe( handler ) {
        this.subscribers.push( handler );
    }
    
    // einen timer registrieren
    schedule( handler ) {
        this.schedulers.push( handler );
    }
    
    //
    // helper functions 
    //
    logDebug(msg) { if (this.DEBUG) console.log('['+this.NAME+'] '+msg); }
    log(msg) { console.log('['+this.NAME+'] '+msg); }
    logWarn(msg) { console.warn('['+this.NAME+'] '+msg); }
    logError(msg) { console.error('['+this.NAME+'] '+msg); }
    
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
    // MduiLogInstances
    // ------------------------------------------------------------------------------------- 
    
    class MduiLogInstances extends MduiBase {
    
    constructor() {
        super();
    }
    
    doInit() {
      super.doInit();
    
      // const
      this.DEBUG             = false;
      this.VERSION           = '1.0/2020-04-04';
      this.NAME              = 'MduiLogInstances';
      this.LANGUAGE          = 'de';
      this.SHOW_NORMAL       = 'normal';
      this.SHOW_COMPACT      = 'compact';
      this.MSG_TYPE_OK       = 'ok';
      this.MSG_TYPE_ERROR    = 'error';
      this.MSG_TYPE_WARN     = 'warn';
      this.MSG_TYPE_INFO     = 'info';
      this.MSG_TYPE_DISABELD = 'disabled';
      this.MSG_TYPE_HASUPDATE= 'hasupdate';
      this.SELECT_ALIVE      = 'system.adapter.*.alive';
      this.SELECT_UPDATEJSON = 'admin.0.info.updatesJson';
        
      // -----------------------  
      // optional: KONFIGURATION
      // -----------------------  
                           // state-Pfad unter dem die States angelegt werden  
      this.STATE_PATH      = '0_userdata.0.mdui.logInstances.'; 
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
      this.states.push( { id:'toggleInstanceID',common:{name:'InstanzID zum Starten bzw. Anhalten', write:true, type:'string', def:'' }} );
      
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
        this.subscribe( on( this.STATE_PATH+'toggleInstanceID', obj => { this.onToggleInstanceID(obj) } ));
        this.subscribe( on( new RegExp( this.STATE_PATH+'*.showAs' ), obj => { this.onShowAs(obj) } ));
        this.subscribe( on( new RegExp( this.STATE_PATH+'*.filter' ), obj => { this.onFilter(obj) } ));
        this.subscribe( on( {id: new RegExp( this.STATE_PATH+'*.sortBy' ), change: "any"} , obj => { this.onChangeSortBy(obj) } ));
    
        this.subscribe( on( new RegExp( this.STATE_PATH+'*.sortAscending' ), obj => { this.onChangeSortAscending(obj) } ));
        this.subscribe( on( new RegExp( this.SELECT_ALIVE ), obj => { this.onBuildHTML(obj) } ));
        this.subscribe( on( new RegExp( this.SELECT_UPDATEJSON ), obj => { this.onBuildHTML(obj) } ));
        this.subscribe( on( new RegExp( 'system.adapter.*.connected' ), obj => { this.onBuildHTML(obj) } ));
    
        this.setStateDelayed ('toggleInstanceID', '', 2000);
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
    
    //
    onToggleInstanceID(obj) { try {
      let instanceID = obj.state.val.toString();
      if (instanceID=='') return;
      if (instanceID=='Instanzen') { this.onBuildHTML(obj); return };
      let instance = getObject(instanceID);
      if (instance && instance.common ) {
          if (instance.common.enabled) {
            instance.common.enabled = false;
          } else {
            instance.common.enabled = true;
          }
          setObject(instanceID, instance);
          this.log(instanceID.replace('system.adapter.', '')+' wird '+(instance.common.enabled?'gestartet.':'gestoppt.'));
      }
      this.setStateDelayed ('toggleInstanceID', 'Instanzen', 2000);
    } catch(err) { this.logError( 'onToggleInstanceID: '+err.message ); }  }
    
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
    // getVal(id, def)
    //
    getVal(id, def) {try {
        if ( !existsState(id) ) return def;
        else {
            let val = getState(id).val;
            if (!val) val=def; 
            return val;
        }
    } catch(err) { this.logError( 'getVal {id}: '+err.message ); }  }
    
    //
    // creates the HTML states for every log
    //
    onBuildHTML(obj) { try {
      // build JSON array as data-base 
      let json = [];  
      let updateJson = this.getVal(this.SELECT_UPDATEJSON,{});
      if (updateJson!='') updateJson = JSON.parse(updateJson);
    
    
      $('[id='+this.SELECT_ALIVE+']').each( (id, index) => {    
        if (!existsObject(id)) return true; //continue;
        let instance = {};
        id  = id.replace('.alive', '');
        instance.id  = id;
        instance.obj = getObject( id );
        instance.title = instance.obj.common['title'] || '';
        if ( instance.obj.common.hasOwnProperty('titleLang') && instance.obj.common.titleLang.hasOwnProperty(this.LANGUAGE) ) 
            instance.title = instance.obj.common.titleLang[this.LANGUAGE];
        instance.desc = instance.obj.common['desc'] || '';
        if ( instance.obj.common.hasOwnProperty('desc') && instance.obj.common.desc.hasOwnProperty(this.LANGUAGE) ) 
            instance.desc = instance.obj.common.desc[this.LANGUAGE];
             
        let entry = {'id':instance.id, 
                   'name':instance.id.replace('system.adapter.', ''),
                   'title':instance.title, 
                   'desc':instance.desc, 
                   'mode':instance.obj.common['mode'] || '',  // daemon, once, none, schedule, subscribe
                   'exticon':instance.obj.common['extIcon'] || '',
                   'version':instance.obj.common['version'] || '',
                   'enabled':instance.obj.common['enabled'] || false,
                   'alive':this.getVal(id+'.alive', false),
                   'connected':this.getVal(id+'.connected', false),
                   'memheaptotal':this.getVal(id+'.memHeapTotal', 0),
                   'memheapused':this.getVal(id+'.memHeapUsed', 0),
                   'memrss':this.getVal(id+'.memRss', 0),
                   'uptime':this.getVal(id+'.uptime', 0),
                   'cpu':this.getVal(id+'.cpu', 0),
                   'installedversion':instance.obj.common['installedVersion'] || 'unbekannt' ,
                   };
        entry.btntext = entry.enabled?'Stop':'Start';
        entry.btnicon = entry.enabled?'stop':'play_arrow';
        
        entry.image = entry.exticon!=''?'<img width="48px" height="auto" src="'+entry.exticon+'">':'';   
       
        // c:/home/iobroker2/iobroker-data/tmp/';
    
        // system.adapter.javascript.0
        let adapterID = instance.id.replace('system.adapter.', '').split(".");
        adapterID = adapterID[0];
        let hasUpdates = updateJson.hasOwnProperty(adapterID);
        if (hasUpdates) {
            entry.version = updateJson[adapterID]['availableVersion'];
            entry.versioncolor = 'mdui-purple';
        } else if (entry.version != entry.installedversion) entry.versioncolor = 'mdui-purple';
        let d=Math.trunc(entry.uptime/86400);
        let h=Math.trunc((entry.uptime-d*86400)/3600);
        let m=Math.trunc((entry.uptime-d*86400-h*3600)/60);
        entry.uptime = d+'d&nbsp;' +h+'h&nbsp;'+m+'m&nbsp;'+(entry.uptime-d*86400-h*3600-m*60)+'s',
        entry.msgtype = !entry.enabled?this.MSG_TYPE_DISABELD: 
                        !entry.connected&&entry.mode!='schedule'?this.MSG_TYPE_WARN: 
                        !entry.alive&&entry.mode!='schedule'?this.MSG_TYPE_WARN:
                        hasUpdates?this.MSG_TYPE_HASUPDATE: 
                        this.MSG_TYPE_OK;
        entry.connected = entry.connected?'ja':'nein';
        entry.alive = entry.alive?'ja':'nein';
        entry.enabled = entry.enabled?'ja':'nein';
        json.push(entry);
      });
      // Summenwerte bilden
      let entrySum = {};
      entrySum.id = 0;
      entrySum.title ='Gesamtwerte';
      entrySum.msgtype = this.MSG_TYPE_INFO;
      entrySum.name = 0;
      entrySum.desc = '';
      entrySum.mode = '';
      entrySum.version = 0;
      entrySum.installedversion = 0;
      entrySum.cpu = 0;
      entrySum.uptime = '';
      entrySum.memheaptotal = 0;
      entrySum.memheapused = 0;
      entrySum.memrss = 0;
      entrySum.enabled = 0;
      entrySum.connected = 0;
      entrySum.alive = 0;
      entrySum.btntext = 'Update';
      entrySum.btnicon = 'refresh';
      entrySum.image = '';
      for (let i = 0; i < json.length; i++) { 
          let entry = json[i];
          entrySum.id += 1;
          entrySum.memheaptotal += entry.memheaptotal;
          entrySum.memheapused += entry.memheapused;
          entrySum.memrss += entry.memrss;
          entrySum.cpu += entry.cpu;
          entrySum.enabled += entry.enabled=='ja'?1:0;
          entrySum.connected += entry.connected=='ja'?1:0;
          entrySum.alive += entry.alive=='ja'?1:0;
          if (entry.version==entry.installedversion) entrySum.installedversion++;
          else entrySum.version++;
      }
      entrySum.memheaptotal = Math.trunc(entrySum.memheaptotal);
      entrySum.memheapused = Math.trunc(entrySum.memheapused);
      entrySum.memrss = Math.trunc(entrySum.memrss);
      entrySum.cpu = Math.round(entrySum.cpu * 100) / 100;
      entrySum.name = entrySum.id + ' Instanzen';
      if (entrySum.version != 0) 
          entrySum.name += ', <span class="mdui-purple">' + entrySum.version + ' Update(s)</span>'; 
      json.unshift( entrySum );
      // build table/list HTML
      for (let i=0; i<=this.MAX_LOG_FOLDER && i<10; i++) {
          let log = this.logs[i];
          log.id = 'log'+i;
          log.statePath = this.STATE_PATH+log.id;
          log.filter = '';
          if (this.existState(log.id+'.filter')) log.filter = this.getState(log.id+'.filter').val;
          log.showAs = this.SHOW_NORMAL;
          if (this.existState(log.id+'.showAs')) log.showAs = this.getState(log.id+'.showAs').val;
          log.showcompact = log.showAs==this.SHOW_COMPACT?'none':'';
      
          for (let j = 0; j < json.length; j++) { 
              json[j].showcompact = log.showAs==this.SHOW_COMPACT?'none':'';
          }
    
    
          // beim gleichen sortBy -> Reihenfolge ändern
          log.sortBy = '';
          log.sortAscending = true;
          if (this.existState(log.id+'.sortAscending')) log.sortAscending = this.getState(log.id+'.sortAscending').val;
          if (this.existState(log.id+'.sortBy')) log.sortBy = this.getState(log.id+'.sortBy').val; 
          log.sortbytitle = 'mdui-sortable';
          log.sortbyname = 'mdui-sortable';
          log.sortbyuptime = 'mdui-sortable';
          log.sortbymemrss = 'mdui-sortable';
          log.sortbymemheapused = 'mdui-sortable';
          log.sortbymemheaptotal = 'mdui-sortable';
          log.sortbycpu = 'mdui-sortable';
    
    
          if ( log.sortBy!='') {
              if (log.sortAscending) log['sortby'+log.sortBy] = 'mdui-sort-ascending';
              else log['sortby'+log.sortBy] = 'mdui-sort-descending';
              // Summenwerte immer oben
              let entrySum = json.shift();
              json.sort( (l,r) => {
                    let lv=l['name'],rv=r['name'];
                    if (l.hasOwnProperty(log.sortBy)) lv=l[log.sortBy];
                    if (r.hasOwnProperty(log.sortBy)) rv=r[log.sortBy];
                    return ((lv < rv) ? -1 : (lv > rv) ? 1 : 0) * (log.sortAscending?1:-1);
              } );
              json.unshift( entrySum );
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
    <th style="text-align:left;"> </th>
    <th class="{sortbytitle}" style="text-align:left;" onclick="vis.setValue('`+log.statePath+`.sortBy','title');">Titel</th>
    <th class="{sortbyname}" style="text-align:left;" onclick="vis.setValue('`+log.statePath+`.sortBy','name');">Name</th>
    <th style="display:{showcompact}; text-align:left;">Version</th>
    <th style="display:{showcompact}; text-align:left;">akt.Vers.</th>
    <th style="display:{showcompact}; text-align:left;">Aktiv</th>
    <th style="display:{showcompact}; text-align:left;">Verb.</th>
    <th style="display:{showcompact}; text-align:left;">Alive</th>
    <th class="{sortbyuptime}" style="display:{showcompact}; text-align:left;" onclick="vis.setValue('`+log.statePath+`.sortBy','uptime');">Laufzeit</th>
    <th class="{sortbymemrss}" style="display:{showcompact}; text-align:right;" onclick="vis.setValue('`+log.statePath+`.sortBy','memrss');">Rss</th>
    <th class="{sortbymemheapused}" style="display:{showcompact}; text-align:right;" onclick="vis.setValue('`+log.statePath+`.sortBy','memheapused');">HeapUsed</th>
    <th class="{sortbymemheaptotal}" style="display:{showcompact}; text-align:right;" onclick="vis.setValue('`+log.statePath+`.sortBy','memheaptotal');">HeapTotal</th>
    <th class="{sortbycpu}" style="display:{showcompact}; text-align:right;" onclick="vis.setValue('`+log.statePath+`.sortBy','cpu');">CPU</th>
    <th style="display:{showcompact}; text-align:left;">Beschreibung</th>
    <th style="display:{showcompact}; text-align:left;">Modus</th>
    <th style="display:{showcompact}; text-align:left;">Bild</th>
    <th style="text-align:left;">Start</th>
    </tr>`,
    row : 
    `<tr style="font-size:1em;" class="mdui-swipe-left?dist:64;background:blue;icon:{btnicon};action:setValue(`+this.STATE_PATH+`toggleInstanceID,{id}) mdui-tooltip?text:Swipeleft={btntext}">
    
    <td style="vertical-align:top;"><i class='material-icons mdui-center {iconColor}' style='font-size:1.5em;'>{icon}</i></td>
    <td style="vertical-align:top;">{title}</td>
    <td style="vertical-align:top;">{name}</td>
    <td style="display:{showcompact}; vertical-align:top;">{installedversion}</td>
    <td class="{versioncolor}" style="display:{showcompact}; vertical-align:top;">{version}</td>
    <td style="display:{showcompact}; vertical-align:top;">{enabled}</td>
    <td style="display:{showcompact}; vertical-align:top;">{connected}</td>
    <td style="display:{showcompact}; vertical-align:top;">{alive}</td>
    <td style="display:{showcompact}; vertical-align:top;">{uptime}</td>
    <td style="display:{showcompact}; vertical-align:top; text-align:right;">{memrss}&nbsp;MB</td>
    <td style="display:{showcompact}; vertical-align:top; text-align:right;">{memheapused}&nbsp;MB</td>
    <td style="display:{showcompact}; vertical-align:top; text-align:right;">{memheaptotal}&nbsp;MB</td>
    <td style="display:{showcompact}; vertical-align:top; text-align:right;">{cpu}%</td>
    <td style="display:{showcompact}; vertical-align:top; min-width:15em;">{desc}</td>
    <td style="display:{showcompact}; vertical-align:top;">{mode}</td>
    <td style="display:{showcompact}; vertical-align:top;">{image}</td>
    <td style="vertical-align:top;">
      <div class="mdui-show-notouch mdui-button mdui-center mdui-tooltip?text:{btntext}">
        <button onclick="vis.setValue('`+this.STATE_PATH+`toggleInstanceID','{id}');"><i class="mdui-icon">{btnicon}</i></button> 
      </div>
    </td>
    </tr>`
    }
    
    const tmpList = {
    row : 
    `<div class="mdui-listitem mdui-swipe-left?dist:64;background:blue;icon:{btnicon};action:setValue(`+this.STATE_PATH+`toggleInstanceID,{id})  mdui-tooltip?text:Swipeleft={btntext}" style="width:100%; display:flex;">
      <div style="flex:0 0 2.5em;">
        <i class="material-icons mdui-center {iconColor}" style="font-size:1.5em;">{icon}</i>
      </div>  
      <div style="flex:1 1 auto; display:flex; flex-wrap:wrap;">
        <div class="mdui-title" style="flex:0 0 100%;">{title}</div>
        <div class="mdui-subtitle" style="flex:0 0 100%; margin-bottom:0.5em;">{name}</div>
        <div class="mdui-label" style="font-size:0.8em; flex:1 1 15em; display:flex; display:{showcompact}; flex-wrap:wrap; align-content:flex-start; padding-right:0.5em;">
          <div style="flex:1 0 15em; ">Version: <span class="mdui-value">{installedversion}</span> <span class="mdui-value {versioncolor}">&nbsp;&nbsp;{version}</span></div>
          <div style="flex:1 0 15em; ">Aktiv/verb./alive: <span class="mdui-value">{enabled}</span>/<span class="mdui-value">{connected}</span>/<span class="mdui-value">{alive}</span></div>
          <div style="flex:1 0 15em; ">Laufzeit: <span class="mdui-value">{uptime}</span></div>
        </div> 
        <div class="mdui-label" style="font-size:0.8em; flex:1 1 15em; display:flex; display:{showcompact}; flex-wrap:wrap; align-content:flex-start; padding-right:0.5em;">
          <div style="flex:1 0 15em; ">Speicher: <span class="mdui-value">{memrss}</span> MB</div>
          <div style="flex:1 0 15em; ">Daten: <span class="mdui-value">{memheapused}</span>/<span class="mdui-value">{memheaptotal}</span> MB</div>
          <div style="flex:1 0 15em; ">CPU: <span class="mdui-value">{cpu}%</span></div>
        </div> 
        <div class="mdui-label" style="font-size:0.8em; flex:1 1 15em; display:flex; display:{showcompact};">
          {desc}
        </div> 
      </div>
      <div style="flex:0 0 3em; display:flex; flex-wrap:wrap; justify-content:center; align-items:center; ">
        <div class="mdui-subtitle">{mode}</div>
        <div style="display:{showcompact};">{image}</div>
        <div class="mdui-show-notouch mdui-button  mdui-tooltip?text:{btntext}">
          <button onclick="vis.setValue('`+this.STATE_PATH+`toggleInstanceID','{id}');"><i class="mdui-icon">{btnicon}</i></button> 
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
              if (this.fitsFilter(':' + entry.msgtype + ':' + entry.title +':'+entry.name + ':' + entry.id + ':' + entry.uptime + ':' + entry.memrss + ':' + entry.desc + ':' ,log.filter)) {
                  switch (entry.msgtype) {
                      case this.MSG_TYPE_OK       : entry.icon = 'check_circle_outline'; entry.iconColor='mdui-green'; break;
                      case this.MSG_TYPE_WARN     : entry.icon = 'warning'; entry.iconColor='mdui-amber'; break;
                      case this.MSG_TYPE_ERROR    : entry.icon = 'error'; entry.iconColor='mdui-red'; break;
                      case this.MSG_TYPE_DISABELD : entry.icon = 'highlight_off'; entry.iconColor='mdui-grey'; break;
                      case this.MSG_TYPE_HASUPDATE: entry.icon = 'update'; entry.iconColor='mdui-purple'; break;
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
    var mduiLogInstances = new MduiLogInstances( );
    mduiLogInstances.start();
    
    // on script stop, stop instance too
    onStop(function () { 
        mduiLogInstances.stop(); 
    }, 1000 );
    
    