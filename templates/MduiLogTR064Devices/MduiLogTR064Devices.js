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
*/


// ------------------------------------------------------------------------------------- 
// MduiBase
// ------------------------------------------------------------------------------------- 

class MduiBase {

    constructor() {
      this.init();
      // beim 1.Start nur die States erzeugen
      if ( !this.existState("version") || (this.getState('version').val!=this.VERSION) ) {
          for (let s=0; s<this.states.length; s++) { this.createState( this.states[s].id ); }
          this.logWarn('first script start, create states for version '+this.VERSION+', please wait 5 seconds and start script again');
          setTimeout( setState, 3000, this.STATE_PATH + 'version', this.VERSION );
      }
      else this.installed = true; 
    }
    
    //
    init() {
        // const
        this.DEBUG      = false;
        this.VERSION    = '1.0/2020-01-01';
        this.NAME       = 'mduiBase';
        this.STATE_PATH = '0_userdata.0.mdui.base.';
    
        // var
        this.installed = false;
        this.states = [];
    
        this.doInit();
    
        // init der states
        this.states.push( { id:'version',     common:{name:'installed script-version', write:false, def:this.VERSION} } );
    }
    
    // start the script/class
    start() {
        if (!this.installed) {
            this.logWarn('cant start, states for version '+this.VERSION+' missed, please start script again');
            return;
        } 
        if (this.doStart())
            this.log('script started');
    }
    
    // stop the script/class
    stop() {
        if (this.doStop())
            this.log('script stopped');
    }
    
    // --------------------- virtual functions, overwrite it 
    
    doInit() { return true; }
    doStart() { return true; }
    doStop() { return true; }
    
    // --------------------- helper functions 
    
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
      this.onChangeReachableHandler = undefined;
      this.onChangeSortByHandler  = undefined;
      this.onChangeSortAscendingHandler  = undefined;
      this.sortBy = '';
      this.sortAscending = true;
    
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
      this.onChangeReachableHandler  = on( {id:new RegExp( '^'+this.TR064_INSTANCE+'devices.*.active' ), change:'ne'}, obj => { this.onChangeReachable(obj) } );
      this.onChangeSortByHandler = on( this.STATE_PATH+'sortBy', obj => { this.onChangeSortBy(obj) } );
      this.onChangeSortAscendingHandler = on( this.STATE_PATH+'sortAscending', obj => { this.onChangeSortAscending(obj) } );
      // vars
      this.sortBy = this.getState('sortBy').val;
      this.sortAscending = this.getState('sortAscending').val;
    
      this.updateHTML();
      return true; 
    }
    
    //
    doStop() { 
      super.doStop();
      if (this.onChangeReachableHandler!==undefined) onLogUnregister(this.onChangeReachableHandler);
      if (this.onChangeSortByHandler!==undefined) unsubscribe(this.onChangeSortByHandler);
      if (this.onChangeSortAscendingHandler!==undefined) unsubscribe(this.onChangeSortAscendingHandler);
    
      return true; 
    }
    
    onChangeSortBy(obj) {
      this.sortBy = this.getState('sortBy').val;
      this.updateHTML();
    }
    onChangeSortAscending (obj) {
      this.sortAscending = this.getState('sortAscending').val;
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
          ip = ip[0].padStart(3, '0') + '.' +  ip[1].padStart(3, '0') + '.' +  ip[2].padStart(3, '0') + '.' + ip[3].padStart(3, '0');
          let mac = getState( device+'.lastMAC-address').val;
          let lastActiveTS = getState( device+'.lastActive-ts' ).val;
          json.push( {'ip':ip, 'name':device.substr(device.lastIndexOf('.')+1,255), 'active':active, 'mac':mac, 'ts':formatDate(lastActiveTS, "TT.MM SS:mm:ss")} );
      } catch(err) { this.logError( 'updateHTML: '+err.message ); }
      json.sort( this.compareNodes.bind(this) );
      this.convertJSON2HTML(json);
    } catch(err) { this.logError( 'onChangeReachable: '+err.message ); }  }
    
    //
    compareNodes(l,r) {
      let lv=l['name'],rv=r['name'];
      if (l.hasOwnProperty(this.sortBy)) lv=l[this.sortBy]+lv;
      if (r.hasOwnProperty(this.sortBy)) rv=r[this.sortBy]+rv;
      return ((lv < rv) ? -1 : (lv > rv) ? 1 : 0) * (this.sortAscending?1:-1);
    }
    
    //
    convertJSON2HTML(json) {
    const tmpTable = {
    header : 
    `<tr>
    <th style='text-align:left;'>Verb.?</th>
    <th style='text-align:left;'>Name</th>
    <th style='text-align:left;'>IP</th>
    <th style='text-align:left;'>MAC</th>
    <th style='text-align:left;'>geändert am</th>
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
    
        for (var i = 0; i < json.length; i++) { 
            entry = json[i];
            switch (entry.active) {
                case false  : entry.icon = 'remove_circle_outline'; entry.icon_color='mdui-amber'; unreachable++; break;
                default     : entry.icon = 'check_circle_outline'; entry.icon_color='mdui-green'; break;
            }
            tr = tmpTable.row;    
            for (let [key, value] of Object.entries(entry)) tr = tr.replace('{'+key+'}',value);
            htmlTable+=tr;
            tr = tmpList.row;    
            for (let [key, value] of Object.entries(entry)) tr = tr.replace('{'+key+'}',value);
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
    
    