## V2.1 20.02.2020
### CSS
* mdui-value: padding entfernt
* hover-Effekt: Einfärbung mit 5% statt 20% schwarz/weiß
* mdui-list, mdui-listitem: Erlaubt die Darstellung von List-Elementen. Je nach Anorderung können drei Listarten umgesezt werden: read only, clickable, complex. Beispiele im MD_Demo
* mdui-flex-justify-content_center, mdui-flex-justify-content_space-evenly: Der Vorgabewert bei der flex-Angabe für die innenliegenden Elemente ist mdui-flex-justify-content_flex-start, d.h. sie werden ab links oben angeordnet. Über die beiden neuen CSS-Klassen kann eine zentrierte Anordnung erreicht werden.
* mdui-shape-XXXX: Stellt verschiedene Shapes (Formen) zur Verfügung um einfache Grafiken darzustellen. XXXX=circle, semicircle, quadrant, arrow08, arrow16, triangle. Diese können dann z.B. mit mdui-flow/mdui-rotate versehen werden. Beispiele im MD_Demo
* mdui-card mdui-title kann nun mit einer Farbe für den Titelbereich versehen werden. Erlaubt sind die MD-Color-Konstanten COLOR="red, ...". Es kann die Hintergrundfarbe festgelegt werden. 
  mdui-title-COLOR-bg : Angabe der Hintergrundfarbe
* mdui-menuitem: Korrektur der font-Farbe im dark-Theme
* mdui-flow: Das "flow"-Symbol überarbeitet
* mdui-input-number: kann zusätzlich zu einem mdui-input gesetzt werden um den Eingabe-Typ von "text" auf "number" zur Laufzeit zu wechseln.
* mdui-input-date: kann zusätzlich zu einem mdui-input gesetzt werden um den Eingabe-Typ von "text" auf "date" zur Laufzeit zu wechseln.
* mdui-input-time: kann zusätzlich zu einem mdui-input gesetzt werden um den Eingabe-Typ von "text" auf "time" zur Laufzeit zu wechseln.
* mdui-input-color: kann zusätzlich zu einem mdui-input gesetzt werden um den Eingabe-Typ von "text" auf "color" zur Laufzeit zu wechseln.
* mdui-placeholder-XXXXX: kann zusätzlich zu einem mdui-input gesetzt werden um, wenn das Eingabefeld leer ist, den Platzhalter-Text "XXXXX" anzuzeigen.
* mdui-flex: So geändert, dass es im Bereich der tnav/bnav nun ein horizontales Scrollen erlaubt

### vis-Editor
* Nutzung von CSS-Variablen: Hier kann in der CSS am Anfang nun leicht ein dark-Theme zur vis-Bearbeitung gewählt werden.
* Korrektur des backgrounds des Editors, so dass nun die roten Hilfslinien beim Ausrichten der Widgets mit den Cursortasten wieder eingeblendet werden.

### script
*  Farbinterpretation überarbeitet, damit auch bei falschen oder nicht vorhandenen Farb-Konfiguration sinnvolle Farben verwendet werden. Greift auch im MD_Demo Projekt
* Auswertung der mdui-input-number hinzugefügt
* Secondary-color wird nun über CSS-var gesetzt

### MD_Demo
* Einstellungsdialog nun 2-seitig, 1x Farben, 1xcards. Separate Einstellung für lnav/rnav-Farben und card-Titel
* Ergänzung Beispiel für mdui-listitem (Bedienung>Listen)
* Ergänzung Beispiel für mdui-shape-NNN (Darstellung>Formen)


## V2.0.4 07.02.2020
### CSS Projekt
* Anpassungen vis Edit-Hintergrund
* beim CLick() in die "CSS Klasse" erscheint ein mdui-Hinweisfenster

###  Script
* Korrektur bei der Farbangabe für tnav

### Sonstiges
* MD_Simple Projekt an v2 angepasst

## V2.0.3 07.02.2020
### CSS Projekt
* mdui-state wieder bold Font
* mdui-center(-h|-v) wirkt sich nun auch auf Child Elemente aus, somit auch nutzbar für mdui-state
* mdui-select: Rendering des Drop-Down Buttons druch den Browser wrid unterdrückt 
* mdui-menu: Kann als Hintergrund für mdui-menuitems verwendet werden, Stellt einen "raised" Bereich dar
* mdui-dialog-fullheight: Wird in Verbindung mit einem "... view in Dialog" Widget verwendet und wird in der Titel-Eigenschaft hinter dem Titel angegeben. Führt dazu, dass der Dialog mit voller Höhe (abzgl. 16px Rand) angezeigt wird, was sonst via vis nicht erreichbar ist. Bsp: Titel: "Test Fullheight|class=mdui-dialog-fullheight"
* mdui-dialog-fullscreen: Wird in Verbindung mit einem "... view in Dialog" Widget verwendet und wird in der Titel-Eigenschaft hinter dem Titel angegeben. Führt dazu, dass der Dialog im Fullscreen (abzgl. 16px Rand) angezeigt wird, was sonst via vis nicht erreichbar ist. Bsp: Titel: "Test Fullscreen|class=mdui-dialog-fullscreen" 
* In der vis-Eigenschaftseingabe die linke (Label) Spalte auf 20% statt 40% verkleinert, damit mehr Platz für die Editfelder bleibt
* mdui-button(-outlined|raised): In der border-radius Angabe !important antfernt, so dass nmun die Widget-Border-Radius Eigenschaft greift und z.B. via "1em" auch gerundete Buttons dargestellt werden können
* mdui-button(-outlined|raised), mdui-navitem, mdui-menuitem: Um einen optischen Ripple-Effekt beim Click()/Tap erweitert
* mdui-favicon: Wird ein Widget mit einer Bildangabe (z.B. basic-Image) mit mdui-favicon versehen, so wird das dort angegebene Bild als favicon für die Browseranzeige gesetzt. Hier bieten sich kleine PNG-Dateien an.

###  Script
* mdui-fullscreen wechselt nun das angezeigte Item "fullscreen" auf "fullscreen_exit" im Fullscreen-Modus um kenntlich zu machen, dass man darüber wieder die normale Darstellung erreichen kann. Weiterhin wird nun ein Rand von 8px gelassen.
* die mdui-timespan-(min) Angaben für die Manipulation der flot Zeitbereiche funktioniert nun auch für grafana Zeitbereiche, wenn in der URL &from= und &to= Angaben vorhanden sind. Der &from-Wert wird dabei neu berechnet. Eine entsprechende URL kann in grafana mit Panel|Share|Link erzeugt werden, dabei müssen die from/to Angaben er Unixtime durch die now-Notation (Bsp:&from=now-1d&to=now) ersetzt werden.
* mdui-srcparam-(...): Hierüber können die Parameter einer src-Angabe in einem Widget, welches über mdui-target-(widget-id) angegeben ist, manipuliert werden. Beim WIdget wird es sich idR um ein iframe/img handeln.
     Bsp: mdui-srcparam-from=now-2d&to=now-1d ändert einen 
          src="...&from=now-1d&to=now..." zu src="...&from=now-2d&to=now-1d..."  
* mdui-onload: Hierüber kann festgelegt werden, dass die dem Widget zugewiesene Funktion bereits beim Laden der Page ausgeführt werden soll. Wirkt sich nur im Zusammenhang mit mdui-toggle, mdui-expand oder mdui-fullscreen aus.

### Sonstiges
* Change-Log aus dem CSS und Script entfernt, spart Ladezeit


## V2.0.2 29.01.2020
  * mdui-center/-h/-v mit !important versehen damit die widgeteigenen Style
    zuweisungen überschrieben werden
  * mdui-flex: funktioniert nun auch mit contXXX in Widget view-8
  * mdui-label, mdui-value, mdui-title, mdui-subtitle: es wurde die vertikale
    Zentrierung mit display:flex entfernt damit die direkten Wigdet font-
    zuweisungen funktionieren. Das Zentrieren kann mit mdui-center erreicht
    werden
  * Öffnen/Schließen der fixierten lnav ist nun animation-iteration-count
  * mdui-navitem: im display:flex das !important entfernt, damit die Media
    Query mit mdui-show480 funktioniert
  * mdui-dialog-fullheight und mdui-dialog-fullscreen zur Nutzung in Dialogen
    hinzugefügt  
   

## V2.0.1 24.01.2020
* Umstellung auf helles Thema
  Das komplette Design wurde auf das helle Thema (light) umgesetzt und passt sich
  flexibel an die jeweils gewählten Hintergrundfarben für abra, tnav, lnav, rnav
  und content an in dem es automatisch eine weiße bzw. schwarze Schrift- und
  Stiftfarbe wählt. Somit ist das dunkle Schema zur Laufzeit einstellbar.
  Siehe auch "Symbole, Icons"!

* Konfiguration
  Die Farben werden nicht mehr direkt den abra, tnav, lnav, rnav und content
  -Elementen zugeordnet, sondern es wird z.B. im abar ein HTML-Element mit der 
  CSS-Class mdui-config ausgewertet, in welchem alle Farbangaben zentral 
  verzeichnet sind.
  Das HTML-Element muss folgenden Aufbau haben:
       "primary_color":"<farbe>",
       "lnav_color":"<farbe>",
       "rnav_color":"<farbe>",
       "secondary_color":"<farbe>",
       "content_color":"<farbe>",
       "lnav_fixed_width":"0..9999",
       "lnav_fixed_open":"true"
  Für <farbe> können die Werte:
  red, pink, purple, deeppurple, indigo, blue, lightblue, cyan, teal, green, 
  lightgreen, lime, yellow, amber, orange, deeporange, brown, grey, 
  darkgrey, bluegrey, white, black
  sowie jede Farbangabe im Format #rrggbb (Bsp: #8050FF) verwendet werden.
  In "lnav_fixed_width" wird die Breite in Pixel angegeben, ab der die lnav 
  links permanent angezeigt werden soll.
  In "lnav_fixed_open" wird über true bzw. false festgelegt, ob die lnav beim
  Seitenwechsel geöffnet dargestellt werden soll (wenn die Breite ausreicht)

  Natürlich kann in allen Angaben auch von der binding-Fähigkeit von ioBroker
  Gebrauch gemacht werden um die Angaben über vis-States zu setzen und somit 
  z.B. tagsüber ein helles Design und nachts ein dunkles Design zu verwenden.
  Beispiel: "primary_color":"{vis.0.md.primary_color}" verwendet dann die akutell in 
     vis.0.md.primary_color eingestellte Farbe


* mdui-flex (Responsive Design)
  Die Handhabung des responsive design, also die Anpassung des Inhalts an
  die Breite der Darstellung, wurde komplett geändert. Statt bisher mit
  dem float-Attribut zu arbeiten, wird nun flex verwendet. Dieses ist
  deutlich mächtiger und bietet u.a. die Möglichkeit die Reihenfolge der
  Child-Elemente unabhängig von ihrem Auftreten im HTML über die CSS-Class
  mdui-order-<nn> (<nn>=1..99) zu setzen. Damit entfällt das unständliche 
  Kopieren/Einfügen von Elementen im Designer!
  Im Demo-Projekt wird flex für tnav, lnav, rnav und den content verwendet.
  Die mdui-flex CSS-Class wird dem Containerelement (z.B. mdui-content) zugeordnet, 
  nicht den Child-Elementen (z.B. den mdui-card).
  
* mdui-cols-<n>, mdui-rows-<n> 
  Die Größenangaben der Cards mit mdui-cols-<n> (Breite) und mdui-rows-<n> (Höhe)
  basiert nun auf einem 80 Pixel Raster mit <n>=1-24 (bisher 156 Pixel Raster). 
  Damit ist eine feinere Größenzuweisung möglich.
  Weiterhin kann nun jeweils auch eine maximale Größe mit angegeben werden. Dazu
  muss nur mdui-cols-<n> zu mdui-cols-<n>-toc-<m> ergänzt werden <m>=1-24, bzw. 
  mdui-rows-<n> zu mdui-rows-<n>-tor-<m>. 
  Beispiel: mdui-cols-4-toc-8 führt dazu, dass das Card-Element je nach Platz
            320 bis 640 Pixel breit dargestellt wird. 
            (wenn der Container "mdui-content" die CSS-Class mdui-flex besitzt) 
  Beispiel: mdui-rows-4-tor-8 führt dazu, dass das Card-Element je nach Platz
            320 bis 640 Pixel hoch dargestellt wird 
            (wenn der Container "mdui-content" die CSS-Class mdui-flex-stretch besitzt) 

* Cards
  Die Darstellung der Cards wurde verändert. Sie fügen nun keine margins mehr hinzu,
  sondern stellen die Vard-Views so dar, wie sie designt wurden. Es empfiehlt sich  
  in den Card-Views 16 Px linke und oben frei zu lassen.
  mdui-card : Darstellung als flache Card, mit 2px Außen-, 14px Innenabstand (früher: mdui-tile)
  mdui-card-raised : Darstellung mit Schatten, mit 8px Außen-, 8px Innenabstand (früher: mdui-card)
  mdui-card-outlined: Darstellung mit Rahmen, mit 8px Außen-, 8px Innenabstand

* Buttons
  Hier wurden die CSS-Class namentlich verändert und vereinheitlicht:
  mdui-flatbutton -> mdui-button
  mdui-raisedbutton -> mdui-button-raised
  mdui-button-outlined: NEU Stellt Buttons mit einer Rahmenlinie dar, über 
     mdui-<colorname>-ol kann die Rahmenfarbe gesetzt werden. Vorgabe: grau

* Symbole, Icons
  Wenn man mit der Umschaltung heller und dunkler Schema arbeiten möchte, muss
  man auch dafür sorgen, dass Symbole und Icons z.B. von schwar auf weiß wechseln.
  Da dieses mit diskreten Bilddateien (img) nicht per CSS lösbar ist, können nun die
  Material Design Icons genutzt werden.
  Link: https://material.io/resources/icons/?style=baseline 
  Hierzu werden alle Icons als Font in der CSS-Datei eingebunden und können dann in 
  jeder HTML Eingabe als Icon durch <i class="material-icons">iconname</i> genutzt werden.
  Bsp:<i class="material-icons">home</i>
  Dadruch werden die Icons wie normaler Text behandelt und passen sich sowohl in der
  Größe (font-size) als auch in der Farbe (color) an!
  Wichtig: Die font-Dateien (Material-Icons-...) liegen im Demo-Projektordner 
    (Bsp: /vis.0/MD_Demo/) im Images-Ordner. Wird ein eigenes Projekt verwendet, müssen 
    die font-Dateien kopiert werden und die Pfadangaben in der CSS-Datei müssen 
    für @font-face {} angepasst werden!!!

* Slider
  Die Dartellung der Slider wurde erweitert, so ist nun sowohl die segmentierte
  Darstellung als auch die Anzeige des aktuellen Wertes während des slidens möglich.
  mdui-segment-<n> : Anzeige mit entspr. vielen Segmenten <n>=5,10,20,25,33,50
  mdui-show-hint : Während des Bedienens wird der aktuelle Wert angezeigt (0-100)
  mdui-range-<from>-<to> : Da kein Zugriff auf den aktuellen Wert im vis möglich ist
    und nur die Info 0 bis 100% im Slider zur Verfügung steht, kann über die mdui-range
    Angabe ein Sliderbereich für mdui-show-hint festgelegt werden. 0%=<from> 100%=<to>
    Beispiel: mdui-range-0-255 für die Festlegung eines Rot-Wertes

* Tabellen
  Die Tabellen CSS-Classes haben sich ein wenig verändert, ebenso die Angabe der Optionen. 
  Weiterhin wurde die Darstellung an die flat/raised/outlined Darstellung der Cards 
  angepasst.
  mdui-table: Darstellung der Tabelle in normaler Tabellenform
  mdui-table-list : Darstellung in Zeilen (rows) Listenform
  mdui-table-raised : Darstellung der Zeilen (rows) als Cards, erhaben, mit Schatten
  mdui-table-outlined : Darstellung der Zeilen (rows) als Cards, mit Rahmen
  Die Optionen werden nun in einer seperaten CSS-Class angegeben:
  mdui-table-opt-[-r<responsewidth>][-w<colwidth>][-c<colcount>][-l]

* Diverses
  * box-sizing wird global auf box-model gesetzt damit die width und height
    Berechnungen besser passen. Hinweis: Größenangaben werden nun inklusive
    Border+Padding interpretiert.
  * Werden mdui-toggle 100% Buttons in der lnav bzw. rnav verwendet um strukturierte
    Menüs zu erzeugen, so zeigen sie nun bereits einen Pfeil nach unten bzw. 
    nach oben am rechten Rand automatisch an

* Neue bzw. geänderte CSS Classes
  * mdui-center: Zentriert die Ausgabe im Element horizontal und vertikal
  * mdui-center-h: Zentriert die Ausgabe im Element horizontal
  * mdui-center-v: Zentriert die Ausgabe im Element vertikal
  * mdui-cols-<n>-toc-<m>: Über "-toc-<m>" kann nun eine max. Breite angegeben
    werden, mit <m>=1 bis 24
  * mdui-divider : zeichnet eine dünne horizontale Linie, kann z.B. in lnav
    verwendet werden, passt sich dem light-dark-Thema an
  * mdui-expand[-<height>]: Kann einer Schaltfläche zugewiesen werden um ein Element
    zu kollabieren/expandieren. Normalerweise also innerhalb eines Views, der als
    Card verwendet werden soll. Sinnvoll für Phone-Screens.
    In [-<height>] kann optional eine Zielhöhe in px im collabierten Zustand
    angegeben werden, wenn nicht, werden 64px angenommen
  * mdui-flex : Wird einem Container (view-in-view) zugeordnet und führt dazu, 
    dass enthaltene Elemente automatisch angeordnet werden und je nach deren
    mdui-cols- Zuweisungen sich in der Breite anpassen
  * mdui-flex-stretch : Wird einem Container (view-in-view) zugeordnet und 
    führt dazu, dass enthaltene Elemente je nach mdui-rows- Zuweisungen
    sich in der Höhe anpassen
  * mdui-noflex : Das Element wird im mdui-flex nicht berücksichtigt  
  * mdui-h-flow bzw. mdui-v-flow: umbenannt zu mdui-flow, da man h/v flow durch 
    das Drehen mit mdui-rotate-<grad> erreichen kann
  * mdui-input mdui-center-horizontal umbenannt zu mdui-input mdui-center-h
  * mdui-order-N: Festlegung der Reihenfolge dwer Elemente in flex-Darstellung,
    wird zur Designzeit im ElElement mit angezeigt
  * mdui-rotate-<grad> : Dreht ein Element um <grad>°. 0° entspricht der horizontalen
    Darstellung. 15° Schritte sind möglich.
    <grad>=000,015,030,045,060,075,090,105,120,135,150,165,180,195,210,225,
    240,255,270,285,300,315,330,345
  * mdui-rotateX-cw, mdui-rotateX-ccw : Lässt ein Element um seine X-Achse 
    rotieren, die Rotationsgeschwindigkeit kann über mdui-slowest, mdui-slower, 
    mdui-slow, ..., mdui-fast, mdui-faster, mdui-fastest festgelegt werden. 
    cw=im Uhrzeigersinn, ccw=gegen den Uhrzeigersinn
  * mdui-rotateY-cw, mdui-rotateY-ccw : Lässt ein Element um seine Y-Achse 
    rotieren, die Rotationsgeschwindigkeit kann über mdui-slowest, mdui-slower, 
    mdui-slow, ..., mdui-fast, mdui-faster, mdui-fastest festgelegt werden. 
    cw=im Uhrzeigersinn, ccw=gegen den Uhrzeigersinn
  * mdui-rotateZ-cw, mdui-rotateZ-ccw : Lässt ein Element um seine Z-Achse 
    rotieren, die Rotationsgeschwindigkeit kann über mdui-slowest, mdui-slower, 
    mdui-slow, ..., mdui-fast, mdui-faster, mdui-fastest festgelegt werden. 
    cw=im Uhrzeigersinn, ccw=gegen den Uhrzeigersinn
  * mdui-rows-<n>-tor-<m>: Über "-tor-<m>" kann nun eine max. Höhe angegeben 
    werden, mit <m>=1 bis 24
  * .mdui-scale-<n> : Dient der Skalierung des Elements/Widgets. 
    Mit <n>=010,020,025,030,033,040,050,060,066,070,075,080,090


## 2018-01-10 V1.8
CSS:
mdui-state: Anzeige von Textstati mit Vorder-/Hintergrundfarbe (basic ValueList HTML)
dui-cols-X: Grid-System (152px) für responsive design, maximal 10 Spalten a 152 Pixel,
            Umbruch nach Screenbreite:ab 360px=2cols 480px=3cols 640px=4cols 960px=6cols 1280px=8cols 1560px=10cols
            mdui-tile bekommen dabei automatisch 4px margin
mdui-raisedbutton, mdui-flatbutton Texte werden nun horz/vert zentriert
der active-State der Buttons in tnav/bnav wird nun mit box-shadow statt border gezeichnet
Script: nix
ioBroker Projekte: MD_Demo, MD-Simple umgestellt auf 52er Raster
Anleitung: Ergänzt um mdui-state, mdui-cols-X

## 2018-01-05 V1.7
CSS: mdui-(color)-glow für red, yellow, blue und green hinzugefügt
Script: Korrektur mdui-lnav/rnav. Funktionierte mit mdui-toggle nicht korrekt
Anleitung: Ergänzt um mdui-(color)-glow

## 2017-10-11 V1.5
CSS: mdui-table Klassen
Script: Tabellenbehandlung
ioBroker Projekte: MD_Demo, MD-Simple ergänzt um Tabellenbeispiel
Anleitung: Ergänzt um Tabellenbeschreibung, optisch überarbeitet

## 2017-10-02 V1.4
CSS: FLOT-Diagramme, mdui-table (noch in Entwicklung)
Script: Zeitspanne für FLOT-Diagramme setzen
ioBroker Projekte: MD_Demo, MD-Simple ergänzt um "FLOT-Diagramme"
Anleitung: Ergänzt um "FLOT-Diagramme"

## 2017-09-24 V1.3
CSS: "Slider transparent" hinzu
ioBroker Projekte: MD_Demo, MD-Simple ergänzt um "Silder transparent"
Anleitung: Ergänzt um "Select" und "Silder transparent"

## 2017-09-20 V1.2
CSS: "Select" hinzu
ioBroker Projekte: MD_Demo, MD-Simple ergänzt um "Select"

## 2017-09-17 V1.1
Sidebar Menüs hinzu
MD_Demo aktualisiert

## 2017-08-20 V0.1
First Upload
