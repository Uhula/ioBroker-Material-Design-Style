/*
*** MduiLogPing

**** Installation
Einfach als serverseitiges Script installieren und starten-5 Sek warten-stoppen-starten. Beim 1.Start werden 
die notwendigen States unter STATE_PATH = '0_userdata.0.mdui.logPing.' erzeugt. Erst beim 2.Start
instanziiert das Script die Event-Handler und lÃ¤uft dann.

**** Konfiguration
Optional im MduiLogPing.doInit() die const anpassen.
Optional Anpassung der tmpTable und tmpList (z.B. fpr eigene Icons & Colors)
Bei Anpassung der tmpTable und tmpList auch ohne MD CSS Style nutzbar.
  
**** Dokumentation
Beispiel vis-view beschrieben in: 

***** States
Unter dem STATE_PATH werden die folgenden States erzeugt:
version        : Script-Version, wird verwendet um Script-Updates zu erkennen
table          : enthÃ¤lt die table-HTML fÃ¼r ein basic-string (unescaped) Widget
list           : enthÃ¤lt die list-HTML fÃ¼r ein basic-string (unescaped) Widget
count          : Anzahl der Log-Zeilen
countUnreached : Anzahl der Log-Zeilen, welche den Zustand FALSE haben
lastUpdate     : Timestamp des letzten Updates


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
    // MduiLogPing
    // ------------------------------------------------------------------------------------- 
    
    class MduiLogPing extends  MduiBase {
    
    constructor() {
      super();
    }
    
    doInit() {
      super.doInit();
      // const
      this.VERSION    = '1.0/2020-03-10';
      this.NAME       = 'mduiLogPing';
      this.STATE_PATH = '0_userdata.0.mdui.logPing.';
    
      this.PING_INSTANCE = 'ping.0.';
    
      // var
      this.onChangeReachableHandler = undefined;
    
      // states
      this.states.push( { id:'list',     common:{name:'HTML code for vis list', write:false, def:''} } );
      this.states.push( { id:'table',    common:{name:'HTML code for vis table', write:false, def:''} } );
      this.states.push( { id:'count',    common:{name:'lines in list/table', write:false, def:'0'} } );
      this.states.push( { id:'countUnreachable',    common:{name:'unreachable counter', write:false, def:'0'} } );
      this.states.push( { id:'lastUpdate',    common:{name:'datetime of last update', write:false, def:''} } );
      return true; 
    }  
    
    doStart() { 
      super.doStart();
      this.onChangeReachableHandler  = on( {id:new RegExp( '^'+this.PING_INSTANCE+'*.*' ), change:'ne'}, obj => { this.onChangeReachable(obj) } );
      this.onChangeReachable( undefined );
      return true; 
    }
    
    //
    doStop() { 
      super.doStop();
      if (this.onChangeReachableHandler!==undefined) onLogUnregister(this.onChangeReachableHandler);
      return true; 
    }
    
    // 
    onChangeReachable(obj) {
      let pings = $(this.PING_INSTANCE+'*.*');
      let json = [];
      for (let i=0; i<pings.length; i++) {
           let state = getState( pings[i] );
           let stateobj = getObject( pings[i] );
           if (state && stateobj)
               json.push( {ip:stateobj.native.ip, name:stateobj.common.name, val:state.val, lc:formatDate(state.lc, "TT.MM SS:mm:ss")} );
      }
      this.convertJSON2HTML(json);
    }
    
    //
    convertJSON2HTML(json) {
    const tmpTable = {
    header : 
    `<tr>
    <th style='text-align:left;'>Verb.?</th>
    <th style='text-align:left;'>Name</th>
    <th style='text-align:left;'>IP</th>
    <th style='text-align:left;'>geÃ¤ndert am</th>
    </tr>`,
    row : 
    `<tr>
    <td><i class='material-icons mdui-center {icon_color}' style='font-size:1.5em;'>{icon}</i></td>
    <td>{name}</td>
    <td>{ip}</td>
    <td>{lc}</td>
    </tr>`
    }
    
    const tmpList = {
    row : 
    `<div class="mdui-listitem mdui-center-v">
      <i class="material-icons {icon_color}" style="width:40px;font-size:1.5em;">&nbsp;{icon}&nbsp;</i>
      <div class="mdui-label" style="width:calc(100% - 40px);">{name}
        <div class="mdui-subtitle">{ip}, GeÃ¤ndert am:{lc}</div>
      </div>
    </div>`}
    
        // build htmlTable and htmlList
        let htmlTable  = "<table><thead>"+tmpTable.header+"</thead><tbody>";
        let htmlList  = "";
        let entry, tr;
        let unreachable = 0;
    
        for (var i = 0; i < json.length; i++) { 
            entry = json[i];
            switch (entry.val) {
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
    
    
    }  // end of MduiLogPing
    
    
    // ------------------------------------------------------------------------------------- 
    // Create and start
    // ------------------------------------------------------------------------------------- 
    
    // create instance and start
    var mduiLogPing = new MduiLogPing( );
    mduiLogPing.start();
    
    // on script stop, stop instance too
    onStop(function () { 
        mduiLogPing.stop(); 
    }, 1000 );
    