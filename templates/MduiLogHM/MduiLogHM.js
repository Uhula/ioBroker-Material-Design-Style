/*
*** MduiLogHMDevices
Dieses Script dient der Visualisierung des Zustände der Homematic-Komponenten in der vis im Material Design CSS Style als
table- bzw. list-Anzeige. Die HM-States werden nicht aktiv mit on-Handler überwacht, sondern es findet im Intervall BUILD_SCHEDULER 
eine Aktualiserung der bis zu MAX_LOG_FOLDER Log-Ordner statt. 
In jeder log-Zeile werden bis zu zwei Balken (bargraphs) dargestellt wenn es sich z.B. um RSSI, VOLT o.ä. Daten handelt.
Der Aufbau der table/list HTML arbeitet intensiv mit flex-Optionen um bei jeder Darstellungsbreite eine optimale Anzeige zu erstellen.
In jedem Log-Ordner 
* befindet sich ein table- und list-HTML State, welcher direkt in der vis angezeigt werden kann (jeweils im basic-string (unescaped) Widget). 
* kann ein filter als string (Bsp:':rssi:') oder als RegExp (Bsp:'/warn|error/') festgelegt werden, welcher beim Aufbau der table-/list-HTML States berücksichtigt wird. 
* kann die Sortierreihenfolge festgelgt werden.

**** Voraussetzungen
Nutzung der MDCSS v2.x (siehe: https://forum.iobroker.net/topic/30363/projekt-mdcss-v2-material-design-css-version-2), für die Sortierdarstellung im Header MDCSS v2.5

**** Installation
Einfach als serverseitiges Script installieren und starten. Beim 1.Start werden die notwendigen States 
unter STATE_PATH = '0_userdata.0.mdui.logHMDevices.' erzeugt und es findet automatisch ein erneuter Start nach 10 Sek statt. 
Erst nach diesem 2.Start instanziiert das Script die Event-Handler und läuft dann.

**** Konfiguration
Eigentlich ist keine notwendig.
Optional in der Funktion MduiLogHMDevices|doInit() eine Anpassung der KONFIGURATION vornehmen
Optional Anpassung der tmpTable und tmpList.
Bei Anpassung der tmpTable und tmpList auch ohne MD CSS Style nutzbar.
  
**** Dokumentation
https://github.com/Uhula/ioBroker-Material-Design-Style/wiki/3.4-MduiLogHM

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
2020.04.30 UH 
* Anpassung an neues MduiBase (intern)
* Anpassung an MDCSS 2.5
* Verschieben der Filter/Sortiereingabe in das Popupmenü; dadurch mehr Anzeigeplatz 

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
        this.installed = false;
        this.states = [];
        this.state = this.STATE_UNKNOWN;
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
    
    // --------------------- virtual functions, overwrite it 
    
    doInit() { return true; }
    doStart() { return true; }
    doStop() { return true; }
    
    // --------------------- helper functions 
    
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
    // MduiLogHMDevices
    // ------------------------------------------------------------------------------------- 
    
    class MduiLogHMDevices extends MduiBase {
    
    constructor() {
        super();
    }
    
    doInit() {
      super.doInit();
    
      // const
      this.DEBUG = false;
      this.VERSION = '1.0/2020-03-17';
      this.NAME = 'mduiLogHMDevices';
      this.MSG_TYPE_OK    = 'ok';
      this.MSG_TYPE_ERROR = 'error';
      this.MSG_TYPE_WARN  = 'warn';
      this.MSG_TYPE_INFO  = 'info';
      this.BAR_DEFAULT    = {'display':false, 'min':0, 'max':5, 'val':0, 'text':'' };
    
      // -----------------------  
      // optional: KONFIGURATION
      // -----------------------  
                           // state-Pfad unter dem die States angelegt werden  
      this.STATE_PATH      = '0_userdata.0.mdui.logHMDevices.'; 
                           // Anzahl der Table/List Ordner mit eigenem Filter/View
      this.MAX_LOG_FOLDER  = 3;   
                           // max.Anzahl der Zeilen für die Table/List Ausgabe
      this.MAX_TABLE_ROWS  = 200; 
                           // Intervall-Angabe für das Updaten der Table/List Ausgaben
                           // Cron-Format: https://de.wikipedia.org/wiki/Cron
                           // Bsp: '*/1 * * * *'  = jede Minute
                           //      '*/15 * * * *'  = alle 15 Min
                           //      '0,30 * * * *' = jede 0. und 30. Minute einer Stunde
                           //      '0 * * * *' = jede volle Stunde
      this.BUILD_SCHEDULER = '0 * * * *'; 
                           // Aufzählung von string / RegExp Filtern um Log-Einträge komplett zu ignorieren
                           // Bsp: (wert1, wert2 ersetzen):
                           //      UND-Verknüpfung : /(?=.*wert1)(?=.*wert2)/i
                           //      ODER-Verknüpfung: /wert1|wert2/i
      this.IGNORE_LOG      = [];
                           // Geräte die nicht überwacht werden sollen, die IDs durch Komma getrennt erfassen
                           // Bsp: 'LEQ12345678,HMQ1741HM'
      this.IGNORE_DEVICES  = 'LEQ12345678,HMQ1741HM';     
                           // CUXD-Instanz N ausschließen. N=0..9
      this.IGNORE_CUXD     = '9'; 
                           // auch OK-Ergebnisse für nicht INFO-States States anzeigen?
      this.MSG_SHOW_OK     = false;
                           // auch INFO-Ergebnisse für nicht INFO-States anzeigen?
      this.MSG_SHOW_INFO   = false;
    
                           // Objektliste der zu untersuchenden HM-States
                           // Anpassungen sind hier nicht ganz simpel, u.U. müssen eigene build-Func hinzugefügt werden
      this.HTML_STATES = {
        'LOWBAT'  : { '_statetype':'lowbat', 
                      '_selectors':['channel[state.id=hm-rpc.*.0.LOWBAT_ALARM$]','channel[state.id=hm-rpc.*.0.LOW_BAT_ALARM$]'],
                      '_desc':'Batterie-Überwachung',
                      '_states' : {'0':{'msg':'Batterie ist ok',                 'msgtype':this.MSG_TYPE_OK,   'msgshow':this.MSG_SHOW_OK}, 
                                   '1':{'msg':'Batteriespannung ist zu niedrig', 'msgtype':this.MSG_TYPE_WARN, 'msgshow':true}, 
                                   '2':{'msg':'Batteriespannung war zu niedrig', 'msgtype':this.MSG_TYPE_INFO, 'msgshow':this.MSG_SHOW_INFO}
                                  },
                      '_buildFunc': this.buildLOWBAT.bind(this) },
        'UNREACH' : { '_statetype':'unreach', 
                      '_selectors': ['channel[state.id=hm-rpc.*.0.UNREACH_ALARM$]','channel[state.id=hm-rpc.*.0.STICKY_UNREACH_ALARM$]'],
                      '_desc':'Erreichbarkeit',
                      '_states' : {'0':{'msg':'Kommunikation ok',          'msgtype':this.MSG_TYPE_OK,    'msgshow':this.MSG_SHOW_OK}, 
                                   '1':{'msg':'Kommunikation ist gestört', 'msgtype':this.MSG_TYPE_ERROR, 'msgshow':true}, 
                                   '2':{'msg':'Kommunikation war gestört', 'msgtype':this.MSG_TYPE_INFO,  'msgshow':this.MSG_SHOW_INFO}
                                  },
                      '_buildFunc': this.buildUNREACH.bind(this) },
        'SABOTAGE': { '_statetype':'sabotage', 
                      '_selectors': ['channel[state.id=hm-rpc.*.0.SABOTAGE_ALARM$]'],
                      '_desc':'Sabotage',
                      '_states' : {'0':{'msg':'Keine Sabotage erkannt',    'msgtype':this.MSG_TYPE_OK, 'msgshow':this.MSG_SHOW_OK}, 
                                   '1':{'msg':'Sabotage erkannt!',         'msgtype':this.MSG_TYPE_ERROR, 'msgshow':true}, 
                                   '2':{'msg':'Sabotage war erkannt',      'msgtype':this.MSG_TYPE_INFO, 'msgshow':this.MSG_SHOW_INFO}
                                  },
                      '_buildFunc': this.buildSABOTAGE.bind(this) },
        'PENDING' : { '_statetype':'pending', 
                      '_selectors': ['channel[state.id=hm-rpc.*.0.CONFIG_PENDING_ALARM$]','channel[state.id=hm-rpc.*.0.UPDATE_PENDING_ALARM$]'],
                      '_desc':'Update-/Konfigurations-Übertragung ',
                      '_states' : {'0':{'msg':'Es stehen keine Übertragungen an',          'msgtype':this.MSG_TYPE_OK, 'msgshow':this.MSG_SHOW_OK}, 
                                   '1':{'msg':'Es steht eine Update-/Konfigurationsübertragung an', 'msgtype':this.MSG_TYPE_WARN, 'msgshow':true}, 
                                   '2':{'msg':'Es stand eine Update-/Konfigurationsübertragung an', 'msgtype':this.MSG_TYPE_INFO, 'msgshow':this.MSG_SHOW_INFO}
                                 },
                      '_buildFunc': this.buildPENDING.bind(this) },
        'RSSI'    : { '_statetype':'rssi', 
                      '_selectors': ['channel[state.id=hm-rpc.*.0.RSSI_DEVICE$]'],
                      '_desc':'Funksignalstärke',
                      '_buildFunc': this.buildRSSI.bind(this),
                      '_bar1'     : {'display':true, 'min':-200, 'max':0, 'val':0, 'text':'zum G.[dBm]' },
                      '_bar2'     : {'display':true, 'min':-200, 'max':0, 'val':0, 'text':'vom G.[dBm]' }
                    },
        'VOLTAGE' : { '_statetype':'voltage', 
                      '_selectors': ['channel[state.id=hm-rpc.*.0.OPERATING_VOLTAGE$]'],
                      '_desc':'Versorungsspannung',
                      '_buildFunc': this.buildVOLTAGE.bind(this),
                      '_bar1'     : {'display':true, 'min':0, 'max':5, 'val':0, 'text':'[V]' }
                    }
      // -----------------------  
      // ENDE KONFIGURATION
      // -----------------------  
    
    /*
    const SelectorDEVICE_IN_BOOTLOADER  = $('channel[state.id=hm-rpc.*.0.DEVICE_IN_BOOTLOADER_ALARM$]');
    const SelectorERROR  = $('channel[state.id=hm-rpc.*.1.ERROR$]');
    const SelectorERROR_CODE  = $('channel[state.id=hm-rpc.*.ERROR_CODE$]');
    const SelectorFAULT_REPORTING  = $('channel[state.id=hm-rpc.*.4.FAULT_REPORTING$]');
    const SelectorERROR_NON_FLAT_POSITIONING = $('channel[state.id=hm-rpc.*.0.ERROR_NON_FLAT_POSITIONING_ALARM$]');
    */                  
      };
    
      // var
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
              case 2 : defFilter = ':lowbat:'; break;   
              case 3 : defFilter = ':unreach:'; break;   
              default: defFilter = undefined;
          }
          this.states.push( { id:'log'+i+'.table',      common:{name:'ioBroker-log as table', write:false, role:'html' }} );
          this.states.push( { id:'log'+i+'.list',       common:{name:'ioBroker-log as list', write:false, role:'html' }} );
          this.states.push( { id:'log'+i+'.count',      common:{name:'ioBroker-log count', write:false, type:'number', def:'0' }} );
          this.states.push( { id:'log'+i+'.filter',     common:{name:'ioBroker-log filter', write:true, def:defFilter}} );
          this.states.push( { id:'log'+i+'.lastUpdate', common:{name:'ioBroker-log last update', write:false, def:'0' }} );
          this.states.push( { id:'log'+i+'.sortBy',        common:{name:'sortieren nach', write:true, def:''}} );
          this.states.push( { id:'log'+i+'.sortAscending', common:{name:'aufsteigend sortieren', write:true, def:true}} );
      }
    
      return true;  
    }
    
    // start the script/class
    doStart() {
        super.doStart();
        
        // subscriber erzeugen
        this.subscribe( on( this.STATE_PATH+'updatePressed', obj => { this.onUpdate(obj) } ));
        this.subscribe( on( new RegExp( this.STATE_PATH+'*.filter' ), obj => { this.onFilter(obj) } ));
        this.subscribe( on( {id: new RegExp( this.STATE_PATH+'*.sortBy' ), change: "any"} , obj => { this.onChangeSortBy(obj) } ));
        this.subscribe( on( new RegExp( this.STATE_PATH+'*.sortAscending' ), obj => { this.onChangeSortAscending(obj) } ));
        // scheduler
        this.schedule( schedule( this.BUILD_SCHEDULER, () => { this.onBuildHTML() } ) );
    
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
    onChangeSortAscending (obj) {
      this.onBuildHTML();
    }
    
    
    // hm-rpc.1.HEQ0355447.0.LOWBAT_ALARM
    buildLOWBAT (stateDef) {
    
        function getBattery( native_type) {
            let BATTERIES = {        //nur Grossbuchstaben
            'CR2016'             : ['HM-RC-4', 'HM-RC-4-B', 'HM-RC-KEY3', 'HM-RC-KEY3-B', 'HM-RC-P1', 'HM-RC-SEC3', 'HM-RC-SEC3-B', 'ZEL STG RM HS 4'],
            'CR2032'             : ['HM-PB-2-WM', 'HM-PB-4-WM', 'HM-PBI-4-FM', 'HM-SCI-3-FM', 'HM-SEC-TIS', 'HM-SWI-3-FM', 'HMIP-FCI1'],
            '2 x LR14,C,Baby'    : ['HM-SEC-SIR-WM', 'HM-OU-CFM-TW', 'HM-OU-CFM-PL', 'HM-OU-CF-PL'],
            '3 x LR14,C,Baby'    : ['HMIP-MP3P'],
            '2 x LR44 (6V)'      : ['HM-SEC-SC', 'HM-SEC-SC2L', 'HM-SEC-SC-2', 'HM-SEC-RHS'],
            '2 x LR6,AA,Mignon'  : ['HM-CC-VD', 'HM-CC-RT-DN', 'HM-SEC-WDS', 'HM-SEC-WDS-2', 'HM-CC-TC', 'HM-DIS-TD-T', 'HB-UW-SEN-THPL-I', 'HM-WDS40-TH-I', 
                                    'HM-WDS40-TH-I-2', 'HM-WDS10-TH-O', 'HMIP-SMI', 'HMIP-ETRV', 'HM-WDS30-OT2-SM-2', 'HMIP-SMO', 'HMIP-SMO-A', 'HMIP-SPI', 
                                    'HMIP-ETRV-2', 'HMIP-SPDR', 'HMIP-SWD', 'HMIP-STHO-A', 'HMIP-ETRV-B', 'HMIP-PCBS-BAT','HMIP-STHO'],
            '3 x LR6,AA,Mignon'  : ['HMIP-SWO-PL', 'HM-SEC-MDIR', 'HM-SEC-MDIR-2', 'HM-SEC-SD', 'HM-SEC-KEY', 'HM-SEC-KEY-S', 'HM-SEC-KEY-O', 'HM-SEN-WA-OD', 
                                    'HM-SEN-MDIR', 'HM-SEN-MDIR-O', 'HM-SEN-MDIR-O-2', 'HM-WDS100-C6-O', 'HM-WDS100-C6-O-2', 'HM-WDS100-C6-O-2', 'HMIP-ASIR', 
                                    'HMIP-SWO-B', 'HM-SEN-MDIR-O-3', 'HM-SEC-MDIR-3'],
            '4 x LR6,AA,Mignon'  : ['HM-CCU-1', 'HM-ES-TX-WM', 'HM-WDC7000'],
            '1 x LR3,AAA,Micro'  : ['HM-RC-4-2', 'HM-RC-4-3', 'HM-RC-KEY4-2', 'HM-RC-KEY4-3', 'HM-RC-SEC4-2', 'HM-RC-SEC4-3', 'HM-SEC-RHS-2', 'HM-SEC-SCO', 
                                    'HMIP-KRC4', 'HMIP-KRCA', 'HMIP-SRH', 'HMIP-SWDO', 'HMIP-DBB', 'HMIP-RCB1'],
            '2 x LR3,AAA,Micro'  : ['HM-TC-IT-WM-W-EU', 'HM-Dis-WM55', 'HM-Dis-EP-WM55', 'HM-PB-2-WM55', 'HM-PB-2-WM55-2', 'HM-PB-6-WM55', 'HM-PBI-2-FM', 
                                    'HM-RC-8', 'HM-SEN-DB-PCB', 'HM-SEN-EP', 'HM-SEN-MDIR-SM', 'HM-SEN-MDIR-WM55', 'HM-WDS30-T-O', 'HM-WDS30-OT2-SM', 
                                    'HMIP-STH', 'HMIP-STHD', 'HMIP-WRC2', 'HMIP-WRC6', 'HMIP-WTH', 'HMIP-WTH-2', 'HMIP-SAM', 'HMIP-SLO', 'HMIP-SWDO-I', 
                                    'HMIP-FCI6', 'HMIP-SMI55', 'HM-PB-2-FM', 'HMIP-SWDM', 'HMIP-SCI', 'HMIP-SWDM-B2', 'HMIP-RC8', 'ALPHA-IP-RBG'],
            '3 x LR3,AAA,Micro'  : ['HM-PB-4Dis-WM', 'HM-PB-4Dis-WM-2', 'HM-RC-DIS-H-X-EU', 'HM-SEN-LI-O'],
            '3 x LR3a AAA Micro' : ['HM-RC-19', 'HM-RC-19-B', 'HM-RC-12', 'HM-RC-12-B', 'HM-RC-12-W'],
            '9V Block'           : ['HM-LC-SW1-BA-PCB', 'HM-LC-SW4-PCB', 'HM-MOD-EM-8', 'HM-MOD-RE-8', 'HM-SEN-RD-O', 'HM-OU-CM-PCB', 'HM-LC-SW4-WM'],
            'fest verbaut'       : ['HM-SEC-SD-2', 'HMIP-SWSD'],
            'ohne'               : ['HM-LC-SW1PBU-FM', 'HM-LC-SW1-Pl-DN-R1', 'HM-LC-SW1-DR', 'HM-LC-RGBW-WM', 'HM-LC-SW1-PL-CT-R1', 'HMIP-HEATING', 
                                    'HM-LC-SW1-FM', 'HM-LC-SW2-FM', 'HM-LC-SW4-DR', 'HM-LC-SW1-PL', 'HM-LC-SW1-PL-2', 'HM-LC-SW4-Ba-PCB', 'HM-LC-SW1-SM', 
                                    'HM-LC-SW4-SM', 'HM-SYS-SRP-PL', 'HM-LC-SW2PBU-FM', 'HM-LC-SW1-PCB', 'HM-LC-SW4-DR-2', 'HM-LC-SW1-PB-FM'],
            'Akku'               : ['HM-SEC-WIN', 'HM-SEC-SFA-SM',  'HM-RC-19-SW']
            };
            let native_type_upper =  native_type.toUpperCase();
            for (let [battery, native_types] of Object.entries(BATTERIES)) 
              for (let i=0; i<native_types.length; i++) 
                  if ( native_type_upper == native_types[i] ) return battery;
            return 'unbekannt';      
        }  
    
        if (stateDef.device!==undefined && stateDef.device.hasOwnProperty('native') && stateDef.device.native.hasOwnProperty('TYPE') ) {
            stateDef.native_type = stateDef.device.native.TYPE;
    
            let battery = getBattery(stateDef.native_type);    
            //wenn Batterie unbekannt dann hint bilden
            if (battery == 'unbekannt' && stateDef.native_type !=='' ){
                stateDef.hint +='Batterietyp für ('+stateDef.device_id+') '+stateDef.native_type +' fehlt im Script.';
            } else {
                stateDef.hint += 'Batterie: '+battery;
            }
        }
    
        stateDef.show = stateDef.show || stateDef.state == 1;
        return stateDef;            
    }
    
    //
    buildUNREACH(stateDef) {
        stateDef.show = stateDef.show || stateDef.state == 1;
        return stateDef;
    }
    
    //
    buildSABOTAGE(stateDef) {
        stateDef.show = stateDef.show || stateDef.state == 1;
        return stateDef;
    }
    
    //
    buildPENDING(stateDef) {
        stateDef.show = stateDef.show || stateDef.state == 1;
        return stateDef;
    }
    
    // für die RSSI Anzeige den PEER Wert dazu laden
    // nur anzeigen, wenn Werte <>0 und <>1 sind
    buildRSSI(stateDef) {
        stateDef.show = stateDef.show || (stateDef.state != 0 && stateDef.state != 1); 
    
        if ( stateDef.state > 0 ) stateDef.state = stateDef.state - 256;
        stateDef.bar1.val = (stateDef.state - stateDef.bar1.min) / (stateDef.bar1.max - stateDef.bar1.min) * 100;
        if ( stateDef.bar1.val < 0 || stateDef.bar1.val > 100) stateDef.bar1.val = 0;
    
        stateDef.msg = 'Device: ' + stateDef.state + ' dBm';
        // RSSI_PEER dazu laden
        let id = stateDef.id.substr(0,stateDef.id.lastIndexOf('.')+1)+'RSSI_PEER';
        if (existsState(id)) {
            let val = getState(id).val;
            stateDef.show = stateDef.show || ( val!=0 && val!=1); 
            if ( val > 0 ) val = val - 256;
            stateDef.bar2.val = (val - stateDef.bar2.min) / (stateDef.bar2.max - stateDef.bar2.min) * 100;
            if ( stateDef.bar2.val < 0 || stateDef.bar2.val > 100) stateDef.bar2.val = 0;
    
            stateDef.msg += ', Peer: ' + val + ' dBm';
        }
        
        return stateDef;
    }
    // den STATUS dazu laden
    // nur anzeigen, wenn Werte <>0 sind
    buildVOLTAGE(stateDef) {
        stateDef.show = stateDef.show || stateDef.state != 0; 
    
        stateDef.bar1.val = (stateDef.state - stateDef.bar1.min) / (stateDef.bar1.max - stateDef.bar1.min) * 100;
        if ( stateDef.bar1.val < 0 || stateDef.bar1.val > 100) stateDef.bar1.val = 0;
        
        stateDef.msg = stateDef.msg + ' V';
        // VOLTAGE_STATUS dazu laden
        let id = stateDef.id.substr(0,stateDef.id.lastIndexOf('.')+1)+'OPERATING_VOLTAGE_STATUS';
        if (existsState(id)) {
            let val = getState(id).val;
            stateDef.msg += ', Status: ' + val;
            stateDef.show = stateDef.show || val!=0; 
        }
        return stateDef;
    }
    
    // 
    buildState (stateDef, json) { try {
        let id,index;
        // für alle Selektoren durchlaufen
        stateDef._selectors.forEach( (selector) => {
            $(selector).each( (id, index) => {                         // Schleife für jedes gefundenen Element *.LOWBAT
            if (!existsObject(id)) {
            } else {
                // CUXD N bleibt unberücksichtigt (hm-rpc.0.CUX2801001)
                if ( (id.search('CUX') != -1) && (this.IGNORE_CUXD != id.split('.')[1]) ) {
                } else {            
                    // device ignorieren?
                    stateDef.id          = id;
                    stateDef.device_id   = id.split('.')[2];
                    if (this.IGNORE_DEVICES.search( stateDef.device_id ) == -1) {
                        stateDef.device = getObject(id.split('.')[0]+'.'+id.split('.')[1]+'.'+stateDef.device_id);
                        stateDef.name='';
                        stateDef.hint='';
                        stateDef.native_type = '';
                        stateDef.msgtype = this.MSG_TYPE_INFO;
                        stateDef.msg = '';
                        stateDef.bar1 = {};
                        if (stateDef.hasOwnProperty('_bar1')) Object.assign(stateDef.bar1,stateDef._bar1); 
                        else Object.assign(stateDef.bar1,this.BAR_DEFAULT); 
                        stateDef.bar1.display = stateDef.bar1.display ? 'block':'none'; 
                        stateDef.bar2 = {};
                        if (stateDef.hasOwnProperty('_bar2')) Object.assign(stateDef.bar2,stateDef._bar2); 
                        else Object.assign(stateDef.bar2,this.BAR_DEFAULT); 
                        stateDef.bar2.display = stateDef.bar2.display ? 'block':'none'; 
    
                        stateDef.show = false;
                        if (stateDef.device!==undefined && stateDef.device.hasOwnProperty('common') && stateDef.device.common.hasOwnProperty('name') ) 
                            stateDef.name = stateDef.device.common.name;
                   //this.log(id);    
                        if (existsState(id))     {
                            stateDef.state = getState(id).val;        
                            stateDef.ts = getState(id).ts;
                        }
                        else { 
                            stateDef.start = '';    
                            stateDef.ts = 0;
                        }
    
    
                        if ( stateDef.hasOwnProperty('_states') && stateDef._states.hasOwnProperty(stateDef.state) ) {
                            stateDef.msg = stateDef._states[stateDef.state].msg;
                            stateDef.msgtype = stateDef._states[stateDef.state].msgtype;
                            stateDef.show = stateDef._states[stateDef.state].msgshow;
                        } else {
                            stateDef.msg = stateDef.state;
                        }
                        if (stateDef._buildFunc !== undefined )  {
                            stateDef = stateDef._buildFunc(stateDef);
                        }
                        if (stateDef.show) { 
                            ++stateDef.count_msg;
                            json.push({'msgtype':stateDef.msgtype, 'statetype':stateDef._statetype,'name':stateDef.name, 'id':stateDef.device_id, 'msg':stateDef.msg, 
                                       'hint':stateDef.hint, 'ts':stateDef.ts, 'val':stateDef.state,
                                       'barDisplay':(stateDef.bar1.display=='block' || stateDef.bar2.display=='block')?'flex':'none',
                                       'bar1Display':stateDef.bar1.display, 'bar1Min':stateDef.bar1.min, 'bar1Max':stateDef.bar1.max, 'bar1Val':stateDef.bar1.val, 'bar1Text':stateDef.bar1.text,
                                       'bar2Display':stateDef.bar2.display, 'bar2Min':stateDef.bar2.min, 'bar2Max':stateDef.bar2.max, 'bar2Val':stateDef.bar2.val, 'bar2Text':stateDef.bar2.text
                                       });
                        }
                    }  
                    ++stateDef.count_devices; // Zählt die Anzahl der vorhandenen Geräte unabhängig vom Status
                }
            }
          });
      });
    } catch(err) { this.logError( 'buildState: '+err.message ); }  }
    
    // creates the HTML states for every log
    onBuildHTML() { try {
      // build JSON array as data-base 
      let json = [];  
      for (let [stateName, stateDef] of Object.entries(this.HTML_STATES)) {
        stateDef.count_devices = 0;
        stateDef.count_msg = 0;
        this.buildState(stateDef, json);
      }      
      // build table/list HTML
      for (let i=0; i<=this.MAX_LOG_FOLDER && i<10; i++) {
          let log = this.logs[i];
          log.filter = '';
          log.ts = 0;
          log.id = 'log'+i;
          log.statePath = this.STATE_PATH+log.id;
    
          if (this.existState(log.id+'.filter')) log.filter = this.getState(log.id+'.filter').val;
          if (this.existState(log.id+'.lastClear')) log.ts = this.getState(log.id+'.lastClear').val;
    
          log.sortBy = '';
          log.sortAscending = true;
          if (this.existState(log.id+'.sortBy')) log.sortBy = this.getState(log.id+'.sortBy').val;
          if (this.existState(log.id+'.sortAscending')) log.sortAscending = this.getState(log.id+'.sortAscending').val;
          log.sortbyname = 'mdui-sortable';
          log.sortbymsg = 'mdui-sortable';
          log.sortbyhint = 'mdui-sortable';
          log.sortbyid = 'mdui-sortable';
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
      }
    } catch(err) { this.logError( 'onBuildHTML: '+err.message ); }  }
    
    
    //
    convertJSON2HTML(json, log) {
    const tmpTable = {
    header : 
    `<tr>
    <th style="text-align:left;"> </th>
    <th class="{sortbyname}" style="text-align:left;" onclick="vis.setValue('`+log.statePath+`.sortBy','name');">Name</th>
    <th class="{sortbymsg}" style="text-align:left;" onclick="vis.setValue('`+log.statePath+`.sortBy','msg');">Meldung</th>
    <th class="{sortbyhint}" style="text-align:left;" onclick="vis.setValue('`+log.statePath+`.sortBy','hint');">Hinweis</th>
    <th class="{sortbyid}"  style="text-align:left;" onclick="vis.setValue('`+log.statePath+`.sortBy','id');">ID, Art</th>
    <th class="{sortbyts}"  style="text-align:left;" onclick="vis.setValue('`+log.statePath+`.sortBy','ts');">Zeit</th>
    </tr>`,
    row : 
    `<tr>
    <td><i class='material-icons mdui-center {iconColor}' style='font-size:1.5em;'>{icon}</i></td>
    <td>{name}</td>
    <td>{msg}
        <div style="flex:1 1 0; display:flex; flex-wrap:wrap;">
          <div style="min-width:6em; display:{bar1Display}; margin-right:1em; flex:1 0 0;">
            <div style="width:100%; height:4px; margin-top:4px; display:flex; border-radius:1em;
                        background-image: linear-gradient(90deg, #4caf50 0%, #4caf50 {bar1Val}%, rgba(0,0,0,.2) {bar1Val}%)" >
            </div>
            <div class="mdui-subtitle" style="width:100%; opacity:0.87; display:flex; justify-content:space-between; font-size:0.6em;">
              <div>{bar1Min}</div><div>{bar1Text}</div><div>{bar1Max}</div>
            </div>
          </div>
          
          <div style="min-width:6em; display:{bar2Display}; margin-right:1em; flex:1 0 0;">
            <div style="width:100%; height:4px; margin-top:4px; display:flex; border-radius:1em; 
                        background-image: linear-gradient(90deg, #2196f3 0%, #2196f3 {bar2Val}%, rgba(0,0,0,.2) {bar2Val}%)" >
            </div>
            <div class="mdui-subtitle" style="width:100%; opacity:0.87; display:flex; justify-content:space-between; font-size:0.6em;">
              <div>{bar2Min}</div><div>{bar2Text}</div><div>{bar2Max}</div>
            </div>
          </div>
        </div>
    </td>
    <td class="mdui-subtitle">{hint}</td>
    <td class="mdui-subtitle">{id} {statetype}</td>
    <td class="mdui-subtitle">{datetime}</td>
    </tr>`
    }
    
    const tmpList = {
    row : 
    `<div class="mdui-listitem mdui-center-v">
      <i class="material-icons {iconColor}" style="width:40px; font-size:1.5em;">&nbsp;{icon}&nbsp;</i>
      <div style="width:calc(100% - 40px); display:flex; flex-wrap:wrap;">
        <div style="min-width:15em; flex:1 1 0;">
          <div style="padding-bottom:4px;" class="mdui-value" >{name}: {msg}</div>
          <div class="mdui-subtitle">{datetime} | {statetype} | {id}</div>
          <div class="mdui-subtitle"><b>{hint}</b></div>
        </div> 
    
        <div style="flex:1 1 0; display:{barDisplay}; flex-wrap:wrap;">
          <div style="min-width:6em; display:{bar1Display}; margin-right:1em; flex:1 0 0;">
            <div style="width:100%; height:4px; margin-top:4px; display:flex; border-radius:1em;
                        background-image: linear-gradient(90deg, #4caf50 0%, #4caf50 {bar1Val}%, rgba(0,0,0,.2) {bar1Val}%)" >
            </div>
            <div class="mdui-subtitle" style="width:100%; opacity:0.87; display:flex; justify-content:space-between; font-size:0.66em;">
              <div>{bar1Min}</div><div>{bar1Text}</div><div>{bar1Max}</div>
            </div>
          </div>
          <div style="min-width:6em; display:{bar2Display}; margin-right:1em; flex:1 0 0;">
            <div style="width:100%; height:4px; margin-top:4px; display:flex; border-radius:1em; 
                        background-image: linear-gradient(90deg, #2196f3 0%, #2196f3 {bar2Val}%, rgba(0,0,0,.2) {bar2Val}%)" >
            </div>
            <div class="mdui-subtitle" style="width:100%; opacity:0.87; display:flex; justify-content:space-between; font-size:0.66em;">
              <div>{bar2Min}</div><div>{bar2Text}</div><div>{bar2Max}</div>
            </div>
          </div>
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
                entry.datetime = formatDate(entry.ts, "TT.MM.JJJJ SS:mm:ss");
                if (this.fitsFilter(':' + entry.msgtype + ':' + entry.statetype +':'+entry.name + ':' + entry.id + ':' + entry.msg + ':' + entry.hint + ':',log.filter)) {
                    switch (entry.msgtype) {
                        case this.MSG_TYPE_OK    : entry.icon = 'check_circle_outline'; entry.iconColor='mdui-green'; entry.borderColor='#4caf50'; break;
                        case this.MSG_TYPE_WARN  : entry.icon = 'warning'; entry.iconColor='mdui-amber'; entry.borderColor='#ffc107'; break;
                        case this.MSG_TYPE_ERROR : entry.icon = 'error'; entry.iconColor='mdui-red'; entry.borderColor='#f44336'; break;
                        default                  : entry.icon = 'info'; entry.iconColor='mdui-blue'; entry.borderColor='#2196f3'; 
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
    
    }
    
    
    // create instance and start
    var mduiLogHMDevices = new MduiLogHMDevices( );
    mduiLogHMDevices.start();
    
    // on script stop, stop instance too
    onStop(function () { 
        mduiLogHMDevices.stop(); 
    }, 1000 );
    
    
