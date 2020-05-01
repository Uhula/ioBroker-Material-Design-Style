/*
*** MduiShowIcal
Dieses Script überwacht den ical-Adapter und erzeugt bei Änderungen an dessen States HTML-List States für die Anzeige als 
Kalender in Listform mit
* Tagesauflösung von "von/bis"-Terminen, inkl. Berücksichtigung der Uhrzeiten
* Tagesdatum, Kalendarfarben aus ical oder optional aus dem Script
* Termintext und -ort
* optionalem Icon je Kalendar
* optionalem "ignore", wenn ein Kalendar unberücksichtigt bleiben soll

Es werden States für n-Logs erzeugt, jedem, Log kann ein Standardfilter mitgegeben werden. In jedem Log-Ordner 
befindet sich ein list-HTML State, welcher direkt in der vis angezeigt werden kann (jeweils im basic-string (unescaped) Widget). 
Über optionale Filter als string (Bsp:':Abfall:') oder als RegExp (Bsp:'/Feiertag|Geburtstag/') kann festgelegt werden, 
welche Einträge beim Aufbau der list-HTML States berücksichtigt werden. 
Bsp.: 
log0 Filter: "abfall" oder ":Abfall:" (=Kalendarname) -> Zeigt nur Abfalltermine
log0 Filter: "ferien" oder ":Ferien:" (=Kalendarname) -> Zeigt nur Ferientermine


**** Installation
Einfach als serverseitiges Script installieren und starten-5 Sek warten-stoppen-starten. Beim 1.Start werden 
die notwendigen States unter STATE_PATH = '0_userdata.0.mdui.showIcal.' erzeugt. Erst beim 2.Start
instanziiert das Script die Event-Handler und läuft dann.

**** Konfiguration
Eigentlich ist keine notwendig.
Optional in der Funktion MduiShowIcal|doInit() eine Anpassung der KONFIGURATION vornehmen
Optional Anpassung der tmpList.
  
**** Dokumentation
https://github.com/Uhula/ioBroker-Material-Design-Style/wiki/3.5-MduiShowIcal

###### Um ein Feedback zu erhalten wäre es schön, wenn jeder, der diese Vorlagen nutzt, den  1.Beitrag des Themas positiv bewertet (Pfeil nach oben oder unten ;-) ). Ich kann dann auch abschätzen, ob sich die weitere Pflege lohnt. Thx!

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


***** Filter
In den filter-States können sowohl strings (Bsp:'error') als auch RegExp-Strings (Bsp:'/warn|error/') 
hinterlegt werden. RegExp-Strings werden an den einschließenden  '/' erkannt. Über den ':' kann der Anfang
eines Feldes mit in den Filter einbezogen werden. 
Beispiele: 
'/Feiertag|Geburtstag/' (RegExp) zeigt alle Zeilen an, in denen 'Feiertag' oder 'Geburtstag' in irgendeinem Feld vorkommen
':Abfall:' (string) zeigt alle Zeilen an, welche derKalendar 'Abfall' lautet
'Arzt' (string) zeigt alle Zeilen an, in denen 'Arzt' in irgendeinem Feld vorkommt

**** Lizenz
(c) 2020 by UH, MIT License, no warranty, use on your own risc

*** Changelog
2020.05.01 UH 
* Anpassung an neues MduiBase (intern)
* Anpassung an MDCSS 2.5
* Serientermine vor dem aktuellem Datum werden nicht mehr angezeigt

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
    
    // wandelt eine Farbe im hex-Format (#000000) in ein RGB-Array[2] um
    hexToRGB(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result 
            ? [parseInt(result[1],16),parseInt(result[2],16),parseInt(result[3],16)]
            : [0,0,0];
    };
    
    // Helligkeit berechnen
    getLuminance(r, g, b) {
        var a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928
                ? v / 12.92
                : Math.pow( (v + 0.055) / 1.055, 2.4 );
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    
    // Kontrats berechnen
    getContrast(rgb1, rgb2) {
        var l1 = this.getLuminance(rgb1[0], rgb1[1], rgb1[2]) + 0.05;
        var l2 = this.getLuminance(rgb2[0], rgb2[1], rgb2[2]) + 0.05;
        if ( l1 > l2 ) return l1 / l2 
        else return l2 / l1;
    }
    
    // liefert die fontColor auf Basis der backgroundColor durch Berechnung
    // des Kontrasts
    getFontColor(backgroundColor) {
        if ( this.getContrast(this.hexToRGB(backgroundColor),this.hexToRGB("#000000")) < 6 ) 
            return "#ffffff";
        else
            return "#000000";
    }
    
    }
    
    // ------------------------------------------------------------------------------------- 
    // MduiLogHMDevices
    // ------------------------------------------------------------------------------------- 
    
    class MduiShowIcal extends MduiBase {
    
    constructor() {
        super();
    }
    
    doInit() {
      super.doInit();
    
      // const
      this.DEBUG = false;
      this.VERSION = '1.0/2020-03-22';
      this.NAME = 'mduiShowIcal';
      this.DAY_MILLISECONDS = 60 * 60 * 24 * 1000;
    
      // -----------------------  
      // optional: KONFIGURATION
      // -----------------------  
                           // state-Pfad unter dem die States angelegt werden  
      this.STATE_PATH      = '0_userdata.0.mdui.showIcal.'; 
                           // Anzahl der Table/List Ordner mit eigenem Filter/View
      this.MAX_LOG_FOLDER  = 3;   
                           // max.Anzahl der Zeilen für die Table/List Ausgabe
      this.MAX_TABLE_ROWS  = 200; 
                           // Objekt-Pfad zum ical.x.data.table
      this.ICAL_TABLE      = 'ical.0.data.table';
                           // siehe: https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#formatdate
      this.DATE_FORMAT     = 'W DD.MM.YYYY hh:mm';
                           // optional können dem Kalendar noch Icons und abweichende
                           // Farben angegeben werden (diese überschreiben jene aus iCal)
                           // 'icon'     : 'Icon-Name' (MDCSS/Google WebFont)
                           // 'calColor' : *#rrggbb' abweichende Kalendarfarbe 
                           // 'ignore'   : true|false Kalendar komplett ignorieren
      this.CALENDAR        = {'mdui-Abfall'      : {'icon':'delete_outline', 'calcolor':'orange' },
                              'mdui-Geburtstage' : {'icon':'cake'},
                              'Familie'          : {'ignore':true}
                               
                             };
    
      // -----------------------  
      // ENDE KONFIGURATION
      // -----------------------  
    
      // var
      this.logs = [];
      for (let i=0; i<=this.MAX_LOG_FOLDER && i<10; i++) 
          this.logs.push({filter:'' });
      
    
      // init der states
      this.states.push( { id:'version',     common:{name:'installed script-version', write:false, def:this.VERSION} } );
      this.states.push( { id:'updatePressed',common:{name:'update button pressed', write:true, type:'boolean', def:'false', role:'button' }} );
      
      let defFilter;
      for (let i=0; i<=this.MAX_LOG_FOLDER && i<10; i++) {
          switch (i) {
              case 1 : defFilter = ':Abfall:'; break;   
              case 2 : defFilter = 'Geburtstag'; break;   
              case 3 : defFilter = ''; break;   
              default: defFilter = undefined;
          }
          this.states.push( { id:'log'+i+'.table',      common:{name:'ioBroker-log as table', write:false, role:'html' }} );
          this.states.push( { id:'log'+i+'.list',       common:{name:'ioBroker-log as list', write:false, role:'html' }} );
          this.states.push( { id:'log'+i+'.count',      common:{name:'ioBroker-log count', write:false, type:'number', def:'0' }} );
          this.states.push( { id:'log'+i+'.filter',     common:{name:'ioBroker-log filter', write:true, def:defFilter}} );
          this.states.push( { id:'log'+i+'.lastUpdate', common:{name:'ioBroker-log last update', write:false, def:'0' }} );
      }
    
      return true;  
    }
    
    // start the script/class
    doStart() {
        super.doStart();
        
        // subscriber erzeugen
        this.subscribe( on( this.STATE_PATH+'updatePressed', obj => { this.onUpdate(obj) } ));
        this.subscribe( on( new RegExp( this.STATE_PATH+'*.filter' ), obj => { this.onFilter(obj) } ));
        this.subscribe( on( this.ICAL_TABLE, obj => { this.onIcalTable(obj) } ));
    
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
    
    // Ical table hat sich geändert
    onIcalTable(obj) {
      this.onBuildHTML();
    }
    
    
    
    // creates the HTML states for every log
    /*
    'date' => "→ 16.10.2017" 
    'event' => "9.30 - 16.30 Uhr Stopka " 
    '_class' => "ical_Kerstin ical_today" 
    '_date' => "2017-10-16T07:30:00.000Z" 
    '_end' => "2017-10-16T14:30:00.000Z" 
    '_section' => "" 
    '_IDID' => "040000008200E00074C5B7101A82E008000000007645DC55A6DFC44FB2EC6FEA9EFEA33C100000007688316058136F42AD128D91103543C9" 
    '_allDay' => "false" 
    '_rule' => " " 
    '_calName' => "Kerstin" 
    
    Optionen der ical-Instanz:
        'daysPreview' => "7"
        'colorize' => "false"
        'defColor' => "white"
        'fulltime' => " 00:00"
        'dataPaddingWithZeros' => "true"
        'replaceDates' => "false"
        'language' => "de"
        'everyCalOneColor' => "true"
        'calendars' (array) 
            '0' (array) 
                'name' => "Abfall"
                'url' => "https://calendar.google.com/calendar/ical/ruo0ddgalu03qq2ehpm8imqnk4%40group.calendar.google.com/private-a30aac0367f8b50cfd7373f6222d29b4/basic.ics"
                'user' => ""
                'pass' => ""
                'sslignore' => ""
                'color' => ""
    */
    
    isSameDay(d1,d2) {
        return (d1.getDate()==d2.getDate()) && (d1.getMonth()==d2.getMonth()) && (d1.getFullYear()==d2.getFullYear());
    }
    
    getWeekNumber( date ) {
        let d = new Date(date);
        d.setHours(0,0,0);
        d.setDate(d.getDate()+4-(d.getDay()||7));
        return Math.ceil((((d-new Date(d.getFullYear(),0,1))/8.64e7)+1)/7);
    };            
    
    //
    buildEntry( entry ) {
        const WEEKDAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
        const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    
        let beginDate = new Date( entry.beginDateISO );
        entry.beginTime = beginDate.getTime();
        entry.beginWeekDay = beginDate.getDay(); // 0=Sonntag 6=Samstag
        entry.beginWeekDayName = WEEKDAY_NAMES[entry.beginWeekDay]; 
        entry.beginDay = beginDate.getDate();
        entry.beginMonth = beginDate.getMonth();
        entry.beginMonthName = MONTH_NAMES[entry.beginMonth]; 
        entry.beginYear = beginDate.getFullYear();
        entry.beginHour = beginDate.getHours();
        entry.beginMinute = beginDate.getMinutes();
        entry.beginDate = formatDate(beginDate,  this.DATE_FORMAT);
    
        let currDate = new Date( entry.currDateISO );
        entry.currTime = currDate.getTime();
        entry.currWeekDay = currDate.getDay(); // 0=Sonntag 6=Samstag
        entry.currWeekDayName = WEEKDAY_NAMES[entry.currWeekDay]; 
        entry.currDay = currDate.getDate();
        entry.currMonth = currDate.getMonth();
        entry.currMonthName = MONTH_NAMES[entry.currMonth]; 
        entry.currYear = currDate.getFullYear();
        entry.currHour = currDate.getHours();
        entry.currMinute = currDate.getMinutes();
        entry.currDate = formatDate(currDate,  this.DATE_FORMAT);
        entry.currDateOnly = entry.currYear*10000+entry.currMonth*100+entry.currDay;
    
    
        let endDate = new Date( entry.endDateISO );
        //allDay Korrektur: liefert immer einen Tag zu viel
        if (entry.allDay && endDate.getHours()==0) endDate.setTime( endDate.getTime() - this.DAY_MILLISECONDS);
        entry.endTime = endDate.getTime();
        entry.endWeekDay = endDate.getDay(); // 0=Sonntag 6=Samstag
        entry.endDay = endDate.getDate();
        entry.endMonth = endDate.getMonth();
        entry.endYear = endDate.getFullYear();
        entry.endHour = endDate.getHours();
        entry.endMinute = endDate.getMinutes();
        entry.endDate = formatDate(endDate, this.DATE_FORMAT);
    
        // 
        if (entry.currWeekDay==0 || entry.currWeekDay==6) entry.dayColor = '#f44336'
        else entry.dayColor = 'inherited';
    
        // 
        if (entry.currWeekDay==1) entry.week = this.getWeekNumber(currDate)+'.W';
        else entry.week = '';
    
        // 
        if (entry.currTime < Date.now() ) entry.opacity = '.66'
        else entry.opacity = '1';
    
        // Zeitraumangabe berechnen
        entry.hint = '';
        if ( !this.isSameDay(beginDate, endDate) ) {
                // mehrtägig
                if (entry.allDay)
                    entry.timeSpan = 'ganztägig ';
                else if ( this.isSameDay(beginDate, currDate) ) 
                        entry.timeSpan = 'ab ' + formatDate(beginDate,'hh:mm');
                     else if ( this.isSameDay(endDate, currDate) ) 
                              entry.timeSpan = 'bis ' + formatDate(endDate,'hh:mm');
                          else 
                               entry.timeSpan = 'ganztägig ';
            } else {
                // an einem Tag
                if (entry.allDay)
                    entry.timeSpan = 'ganztägig';
                else if ( (entry.beginHour!=entry.endHour) || (entry.beginMinute!=entry.endMinute)  ) 
                         entry.timeSpan = formatDate(beginDate,'hh:mm') + '-' + formatDate(endDate,'hh:mm');
                     else   
                         entry.timeSpan = formatDate(beginDate,'hh:mm');
            }
        return entry;        
    };
    
    
    onBuildHTML() { try {
    
        let json = [];  
        let calTable = getState(this.ICAL_TABLE);
        let inst     = getObject("system.adapter."+this.ICAL_TABLE.substr(0,6));
        let instopt  = inst.native;
        let calendar = {};
        let cal      = {};
        let calOptions = {};
        let todayDate = new Date();
        let today = todayDate.getFullYear()*10000+todayDate.getMonth()*100+todayDate.getDate();
    
    
        for (var i = 0; i < calTable.val.length; i++) { 
          cal = calTable.val[i];
          let entry = {};
          if ( cal._calName != calendar.name ) {
                calendar = {};
                // color suchen
                for (let c = 0; c < instopt.calendars.length; c++ ) {
                    if (cal._calName == instopt.calendars[c].name ) {
                        calendar = instopt.calendars[c];
                        break;
                    }
                }
                // options suchen
                if (this.CALENDAR.hasOwnProperty(cal._calName)) calOptions = this.CALENDAR[cal._calName];
                else calOptions={};
            }    
            if (calOptions.hasOwnProperty('ignore') && calOptions.ignore ) continue;
    
            if (calOptions.hasOwnProperty('calcolor')) entry.calColor = calOptions.calcolor;
            else if (calendar.color !== "") entry.calColor = calendar.color;
                 else entry.calColor = '#000000';
            entry.color = this.getFontColor( entry.calColor ); 
            if (calOptions.hasOwnProperty('icon')) entry.icon = calOptions.icon;
            else entry.icon='';
    
            entry.date = cal.date;
            entry.event = cal.event;
            entry.calName = cal._calName;
            entry.beginDateISO = cal._date;
            entry.currDateISO = cal._date;
            entry.endDateISO  = cal._end;
            entry.allDay  = cal._allDay; 
            entry.location = cal.location;
    
            entry = this.buildEntry( entry);
    
            if (entry.currDateOnly >= today)
                json.push( entry );
    
            // Listenansicht
            // in calTable steht nur ein Eintrag für jeden Beginn, für die List-Darstellung
            // sind diese auch je Tag notwendig - hier jetzt bilden 
            if ( (entry.beginDay!=entry.endDay) || (entry.beginMonth!=entry.endMonth) || (entry.beginYear!=entry.endYear) ) {
                let currTime = new Date(entry.beginDateISO).getTime() + this.DAY_MILLISECONDS;
                let endTime = new Date(entry.endDateISO).getTime();
                if (entry.allDay) endTime -= + this.DAY_MILLISECONDS;
                let dayMax=Math.trunc( 2 + (endTime - currTime) /this. DAY_MILLISECONDS); 
                entry.hint += ' (Tag 1/'+dayMax+')';
                let dayCount=2; 
                while (currTime <= endTime && dayCount<100) {
                    let newEntry = {};
                    Object.assign(newEntry, entry);
                    newEntry.currDateISO = new Date(currTime).toISOString();
                    newEntry = this.buildEntry( newEntry );
                    newEntry.hint += ' (Tag '+dayCount+'/'+dayMax+')';
                    if (newEntry.currDateOnly >= today)
                        json.push( newEntry );
                    currTime = currTime + this.DAY_MILLISECONDS;
                    dayCount++;
                }
    
            }
        }
    
        // sortieren
        json.sort( (l,r) => {
                  let lv=l['currTime'],rv=r['currTime'];
                  return ((lv < rv) ? -1 : (lv > rv) ? 1 : 0);
              } );
            
      // build table/list HTML
      for (let i=0; i<=this.MAX_LOG_FOLDER && i<10; i++) {
          let log = this.logs[i];
          log.filter = '';
          log.ts = 0;
          log.idState = 'log'+i;
          if (this.existState(log.idState+'.filter')) log.filter = this.getState(log.idState+'.filter').val;
          if (this.existState(log.idState+'.lastClear')) log.ts = this.getState(log.idState+'.lastClear').val;
    
          this.convertJSON2HTML(json, log);
      }
    } catch(err) { this.logError( 'onBuildHTML: '+err.message ); }  }
    
    
    // color date event calName beginDate endDate allDay
    convertJSON2HTML(json, log) {
    const tmpTable = {
    header : 
    `<tr>
    <th style="text-align:right;"></th>
    <th style="text-align:left;"></th>
    <th style="text-align:left;"></th>
    <th style="text-align:left;"></th>
    <th style="text-align:left;"></th>
    <th style="text-align:left; min-width:12em;">Betreff</th>
    <th style="text-align:left;">Zeit</th>
    <th style="text-align:left;">Ort</th>
    <th style="text-align:left;">Kalendar</th>
    <th style="text-align:left;"></th>
    </tr>`,
    row : 
    `<tr>
    <td style="text-align:right;">
       <span style="display:{showDay}; color:{dayColor}; font-size:1.5em; opacity:1; font-weight:bold;">{currDay}</span>
    </td>
    <td>
       <span style="display:{showDay}; font-size:0.8em; margin-top:0.3em; margin-left:4px; opacity:.8;">{currMonthName}</span>
    </td>
    <td>
       <span style="display:{showDay}; font-size:0.8em; margin-top:0.3em; opacity:.8;">{currWeekDayName}</span>
    </td>
    <td>
      <span style="display:inline-block; width:.8em; height:.8em; margin-top:0.3em; background:{calColor}; border-radius:50%;">&nbsp;</span>
    </td>
    <td>
      <i class='material-icons mdui-center {color}' style='font-size:1.2em;'>{icon}</i>
    </td>
    <td>{event}</td>
    <td><span style="font-size:1.0em; opacity:.8;">{timeSpan} {hint}</span></td>
    <td>{location}</td>
    <td><span style="font-size:0.8em; opacity:.8;color:{calColor};">{calName}</span></td>
    <td></td>
    </tr>`
    }
    
    const tmpList = {
    row : 
    `<div class="mdui-listitem" style="font-size:1em; width:100%; display:flex; opacity:{opacity};">
      <div style="min-width:3.5em;">
        <div style="display:{showDay}; color:{dayColor};">
          <span style="font-size:1.5em; opacity:1; font-weight:bold;">{currDay}</span>
          <span style="font-size:0.8em; margin:4px; opacity:.8;">{currMonthName}<br/>
          {currWeekDayName}</span>
        </div>
        <div style="display:{showDay}; text-align:right; font-size:0.6em; opacity:.6;">{week}</div>
      </div>
      <div style="min-width:1.2em;">
        <div style="width:.8em; height:.8em;  margin:.1em; text-align:center; background:{calColor}; border-radius:50%;">&nbsp;</div>
        <div class="mdui-icon" style="font-size:1.1em; text-align:center; margin-top:0.33em;">{icon}</div>
      </div>
      <div style="width:100%; margin-left:.25em;">
        <div style="">
          <div style="font-size:1.1em;">{event}</div>
        </div>
        <div style="width:100%; display:flex; flex-wrap:wrap; align-items:baseline; justify-content:space-between;">
          <div style="font-size:1.0em; opacity:.8;">
            {timeSpan}
            <span style="font-size:0.8em;">{hint} {location}</span>
          </div>
          <div style="font-size:0.8em; opacity:.8;color:{calColor};">{calName}</div>
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
    
        let lastEntry = {};
        for (var i = 0; i < json.length && count<this.MAX_TABLE_ROWS; i++) { 
            entry = json[i];
            if (this.fitsFilter(':' + entry.currDate + ':' + entry.event +':'+entry.calName + ':' + entry.location + ':',log.filter)) {
                entry.showDay = (lastEntry=={}) || (entry.currDay!=lastEntry.currDay) || (entry.currMonth!=lastEntry.currMonth) || (entry.currYear!=lastEntry.currYear)?'flex':'none';
                lastEntry = entry;
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
        this.setState(log.idState+'.table', htmlTable);  
        this.setState(log.idState+'.list', htmlList);  
        this.setState(log.idState+'.count', count);  
        this.setState(log.idState+'.lastUpdate', +new Date());  
    }
    
    }
    
    
    // create instance and start
    var mduiShowIcal = new MduiShowIcal( );
    mduiShowIcal.start();
    
    // on script stop, stop instance too
    onStop(function () { 
        mduiShowIcal.stop(); 
    }, 1000 );
    
    