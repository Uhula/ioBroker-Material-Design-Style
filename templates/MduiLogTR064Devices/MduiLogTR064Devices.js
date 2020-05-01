/*
*** MduiLogTR064
Dieses Script dient der Visualisierung der TR-064/devices in der vis im Material Design CSS Style als
table- bzw. list-Anzeige. Dazu wird ein onChange()-Handler instanziiert, welcher alle active-States 
aller TR-064/devices überwacht und bei Änderungen die list/table-HTML neu aufbaut. Diese können direkt
in der vis verwendet werden (jeweils im basic-string (unescaped) Widget). 
Weiterhin gibt es die Möglichkeit die Ausgabe nach den einzelnen Columns (ip, name, mac, ts, active)
zu sortieren, auf- und absteigend.

**** Installation
Einfach als serverseitiges Script installieren und starten-5 Sek warten-stoppen-starten. Beim 1.Start werden 
die notwendigen States unter STATE_PATH = '0_userdata.0.mdui.logTR064Devices.' erzeugt. Erst beim 2.Start
instanziiert das Script die Event-Handler und läuft dann.

**** Konfiguration
Optional im MduiLogTR064.doInit() die const anpassen.
Optional Anpassung der tmpTable und tmpList (z.B. fpr eigene Icons & Colors)
Bei Anpassung der tmpTable und tmpList auch ohne MD CSS Style nutzbar.
  
**** Dokumentation
Beispiel vis-view beschrieben in: 

***** States
Unter dem STATE_PATH werden die folgenden States erzeugt:
version        : Script-Version, wird verwendet um Script-Updates zu erkennen
table          : enthält die table-HTML für ein basic-string (unescaped) Widget
list           : enthält die list-HTML für ein basic-string (unescaped) Widget
count          : Anzahl der Log-Zeilen
countUnreached : Anzahl der Log-Zeilen, welche den Zustand FALSE haben
lastUpdate     : Timestamp des letzten Updates
sortBy         : Name des Feldes/Column, nach der sortiert werden soll (ip, name, mac, ts, active)
sortAscending  : true -> aufsteigend sortieren, sonst absteigend


**** Lizenz
(c) 2020 by UH, MIT License, no warranty, use on your own risc

*** Changelog
2020.05.01 UH 
* Anpassung an neues MduiBase (intern)
* Anpassung an MDCSS 2.5
* Einbau Sortieren der Table über Header-Click


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
    
    // einen on-Handler registrieren
    subscribe( handler ) {
        this.subscribers.push( handler );
    }
    
    // einen timer registrieren
    schedule( handler ) {
        this.schedulers.push( handler );
    }
    
    //
    // tool functions 
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
    
    //
    escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
    }
    
    }
    
    // ------------------------------------------------------------------------------------- 
    // MduiLogTR064
    // ------------------------------------------------------------------------------------- 
    
    class MduiLogTR064 extends  MduiBase {
    
    constructor() {
      super();
    }
    
    doInit() {
      super.doInit();
      // const
      this.VERSION    = '0.9/2020-03-10';
      this.NAME       = 'mduiLogTR064Devices';
      this.STATE_PATH = '0_userdata.0.mdui.logTR064Devices.';
    
      this.TR064_INSTANCE = 'tr-064.0.';
    
      // var
      this.logs = [];
      this.logs.push( {sortByOld : '', sortAscending : true});
    
      // states
      this.states.push( { id:'list',     common:{name:'HTML code for vis list', write:false, def:''} } );
      this.states.push( { id:'table',    common:{name:'HTML code for vis table', write:false, def:''} } );
      this.states.push( { id:'count',    common:{name:'lines in list/table', write:false, def:'0'} } );
      this.states.push( { id:'countUnreachable',    common:{name:'unreachable counter', write:false, def:'0'} } );
      this.states.push( { id:'lastUpdate',    common:{name:'datetime of last update', write:false, def:''} } );
      this.states.push( { id:'sortBy',        common:{name:'sortieren nach', write:true, def:''}} );
      this.states.push( { id:'sortAscending', common:{name:'aufsteigend sortieren', write:true, def:true}} );
      
      return true; 
    }  
    
    doStart() { 
      super.doStart();
      // on-Handler
      this.subscribe( on( {id:new RegExp( '^'+this.TR064_INSTANCE+'devices.*.active' ), change:'ne'}, obj => { this.onChangeReachable(obj) } ) );
      this.subscribe( on( {id: this.STATE_PATH+'sortBy', change: "any"} , obj => { this.onChangeSortBy(obj) } ));
      this.subscribe( on( this.STATE_PATH+'sortAscending', obj => { this.onChangeSortAscending(obj) } ) );
    
      this.updateHTML();
      return true; 
    }
    
    //
    doStop() { 
      super.doStop();
      return true; 
    }
    //
    // beim gleichen sortBy Sortierreihenfolge umdrehen
    // 
    onChangeSortBy(obj) {
      if (this.logs[0].sortByOld == obj.state.val) {
          this.setState('sortAscending', !this.logs[0].sortAscending);
          return;
      }      
      this.logs[0].sortByOld = obj.state.val;
      this.updateHTML();
    }
    
    onChangeSortAscending (obj) {
      this.updateHTML();
    }
    
    // 
    onChangeReachable(obj) { 
        this.updateHTML();
    }
    
    // 
    updateHTML() { try {
      let devices = $(this.TR064_INSTANCE+'devices.*.active');
      let json = [];
      for (let i=0; i<devices.length; i++) try {
          let device = devices[i].substr(0,devices[i].lastIndexOf('.'));
          let active = getState( device+'.active' ).val;
          // IP für evtl. sort aufbereiten 000.000.000.000
          let ip = getState( device+'.lastIP' ).val.split('.');
          if (ip.length>=3)
              ip = ip[0].padStart(3, '0') + '.' +  ip[1].padStart(3, '0') + '.' +  ip[2].padStart(3, '0') + '.' + ip[3].padStart(3, '0');
          let mac = '';
          if (existsState(device+'.lastMAC-address') )  
              mac = getState( device+'.lastMAC-address').val;
          let lastActiveTS = getState( device+'.lastActive-ts' ).val;
          json.push( {'ip':ip, 'name':device.substr(device.lastIndexOf('.')+1,255), 'active':active, 'mac':mac, 'ts':formatDate(lastActiveTS, "TT.MM SS:mm:ss")} );
      } catch(err) { this.logError( 'updateHTML: '+err.message ); }
    
      let log = this.logs[0];
      log.sortBy = '';
      log.sortAscending = true;
      log.statePath = this.STATE_PATH;
    
      if (this.existState('sortBy')) log.sortBy = this.getState('sortBy').val;
      if (this.existState('sortAscending')) log.sortAscending = this.getState('sortAscending').val;
      log.sortbyactive = 'mdui-sortable';
      log.sortbyname = 'mdui-sortable';
      log.sortbyip = 'mdui-sortable';
      log.sortbymac = 'mdui-sortable';
      log.sortbyts = 'mdui-sortable';
    
      if ( log.sortBy!='')
          if (log.sortAscending) log['sortby'+log.sortBy] = 'mdui-sort-ascending';
          else log['sortby'+log.sortBy] = 'mdui-sort-descending';
      
          json.sort(  (l,r) => {
                let lv=l['name'],rv=r['name'];
                if (l.hasOwnProperty(log.sortBy)) lv=l[log.sortBy];
                if (r.hasOwnProperty(log.sortBy)) rv=r[log.sortBy];
                return ((lv < rv) ? -1 : (lv > rv) ? 1 : 0) * (log.sortAscending?1:-1);
          }  );
      
      this.convertJSON2HTML(json, log);
    } catch(err) { this.logError( 'updateHTML: '+err.message ); }  }
    
    
    //
    convertJSON2HTML(json, log) {
    const tmpTable = {
    header : 
    `<tr>
    <th class="{sortbyactive}" style="text-align:left;" onclick="vis.setValue('`+log.statePath+`sortBy','active');">Verb.?</th>
    <th class="{sortbyname}" style="text-align:left;" onclick="vis.setValue('`+log.statePath+`sortBy','name');">Name</th>
    <th class="{sortbyip}" style="text-align:left;" onclick="vis.setValue('`+log.statePath+`sortBy','ip');">IP</th>
    <th class="{sortbymac}"  style="text-align:left;" onclick="vis.setValue('`+log.statePath+`sortBy','mac');">MAC</th>
    <th class="{sortbyts}"  style="text-align:left;" onclick="vis.setValue('`+log.statePath+`sortBy','ts');">geändert am</th>
    </tr>`,
    row : 
    `<tr>
    <td><i class='material-icons mdui-center {icon_color}' style='font-size:1.5em;'>{icon}</i></td>
    <td>{name}</td>
    <td>{ip}</td>
    <td>{mac}</td>
    <td>{ts}</td>
    </tr>`
    }
    
    const tmpList = {
    row : 
    `<div class="mdui-listitem mdui-center-v">
      <i class="material-icons {icon_color}" style="width:40px;font-size:1.5em;">&nbsp;{icon}&nbsp;</i>
      <div class="mdui-value" style="width:calc(100% - 40px);">{name}
        <div class="mdui-label">{ip} <span class="mdui-subtitle">{mac} / {ts}</span></div>
      </div>
    </div>`}
    
        // build htmlTable and htmlList
        let htmlTable  = "<table><thead>"+tmpTable.header+"</thead><tbody>";
        let htmlList  = "";
        let entry, tr;
        let unreachable = 0;
        for (let [key, value] of Object.entries(log)) htmlTable = htmlTable.replace(new RegExp('{'+key+'}','g'),value);
    
        for (var i = 0; i < json.length; i++) { 
            entry = json[i];
            switch (entry.active) {
                case false  : entry.icon = 'remove_circle_outline'; entry.icon_color='mdui-amber'; unreachable++; break;
                default     : entry.icon = 'check_circle_outline'; entry.icon_color='mdui-green'; break;
            }
            tr = tmpTable.row;    
            for (let [key, value] of Object.entries(entry)) tr = tr.replace(new RegExp('{'+key+'}','g'),value);
            htmlTable+=tr;
            tr = tmpList.row;    
            for (let [key, value] of Object.entries(entry)) tr = tr.replace(new RegExp('{'+key+'}','g'),value);
            htmlList+=tr;
        }
        htmlTable+="</body></table>";    
        this.setState('table', htmlTable);  
        this.setState('list', htmlList);  
        this.setState('count', json.length);  
        this.setState('countUnreachable', unreachable);  
        this.setState('lastUpdate', +new Date());  
    }
    
    
    }  // end of MduiLogTR064
    
    
    // ------------------------------------------------------------------------------------- 
    // Create and start
    // ------------------------------------------------------------------------------------- 
    
    // create instance and start
    var mduiLogTR064 = new MduiLogTR064( );
    mduiLogTR064.start();
    
    // on script stop, stop instance too
    onStop(function () { 
        mduiLogTR064.stop(); 
    }, 1000 );
    
    