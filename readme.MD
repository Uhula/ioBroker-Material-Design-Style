### Material Design CSS v2 für ioBroker

### ! In Überarbeitung zur Version v2 !

**Inhaltsverzeichnis**

1. [Funktionsumfang](#1-funktionsumfang)
2. [Systemanforderungen](#2-systemanforderungen)
3. [Installation](#3-installation)
4. [Anleitung](#4-anleitung)
5. [MD CSS V1.x -> MD CSS V2.0](#5-)
6. [Vorlagen, Wiki](#6-templates)
7. [Changelog](#7-changelog)
8. [Sonstiges](#8-sonstiges)


![Beispiel 1280x0720 Main](docs/MD_1280x0720_Main.png?raw=true "Beispiel 1280x0720 Main")


### 1. Funktionsumfang
In ioBroker.vis gestaltete Views können mit diesen CCS Anweisungen so dargestellt werden, dass sie ähnlich dem  Look & Feel des Material Design Styles von Google funktionieren. Dazu gehören:
* Application bar
* Top-Navigation (Tabs), Bottom-Navigation, Left- und Right-Navigation (Sidepanels)
* Content, Cards, flex-box
* Responsive Design (Grid, 80er Raster)
* Tables, inputs, labels, states, lists, ...

Siehe auch Video: [Demo-Film](video/MD4ioBrokerV2.mp4) (zum Ansehen herunterladen)


Beispiele: 1280 x 0720
* [Beispiel 1280x0720 Main](docs/MD_1280x0720_Main.png?raw=true "Beispiel 1280x0720 Main")
* [Beispiel 1280x0720 Demo Cards](docs/MD_1280x0720_Cards.png?raw=true "Beispiel 1280x0720 Demo Cards")
* [Beispiel 1280x0720 Demo Inputs](docs/MD_1280x0720_Inputs.png?raw=true "Beispiel 1280x0720 Demo Inputs")
* [Beispiel 1280x0720 Main dark](docs/MD_1280x0720_Main_dark.png?raw=true "Beispiel 1280x0720 Main dark")
* [Beispiel 1280x0720 Demo Cards dark](docs/MD_1280x0720_Cards_dark.png?raw=true "Beispiel 1280x0720 Demo Cards dark")
* [Beispiel 1280x0720 Demo Inputs dark](docs/MD_1280x0720_Inputs_dark.png?raw=true "Beispiel 1280x0720 Demo Inputs dark")

Beispiele: 0360 x 0640
* [Beispiel 0360x0640 Main](docs/MD_0360x0640_Main.png?raw=true "Beispiel 0360x0640 Main")
* [Beispiel 0360x0640 Demo Inputs](docs/MD_0360x0640_Inputs.png?raw=true "Beispiel 0360x0640 Demo Inputs")
* [Beispiel 0360x0640 Main dark](docs/MD_0360x0640_Main_dark.png?raw=true "Beispiel 0360x0640 Main dark")
* [Beispiel 0360x0640 Demo Inputs dark](docs/MD_0360x0640_Inputs_dark.png?raw=true "Beispiel 0360x0640 Demo Inputs dark")


### 2. Systemanforderungen
* ioBroker.vis


### 3. Installation
Keine. Die CSS Anweisungen müssen lediglich in einem ioBroker.vis Projekt unter "CSS / Projekt" eingefügt werden, die paar Zeilen Script unter "Skript". Beides steht im Ordner [source](source) zur Verfügung. Heisst das eigene Projekt nicht MD_Demo, muss anschließend eine Anpassung in der CSS Datei vorgenommen werden:  
* Der Pfad zum WebFont muss unter @font-face angepasst werden. Dort steht "MD-Demo" drin, hier muss der wirkliche Projektname eingetragen werden.
Weitere Einstellungen sind optional:
* Das vis Design ist per Vorgabe auf "light"-Theme, also schwarze Schrift auf weißem Grund eingestellt, wer in der vis im "dark"-Theme arbeiten möchte, muss Einstellungen unter ":root / Design time" vornehmen
* Wenn einzelne CSS Anweisungen geändert werden sollen, dann nicht im MDUI CSS direkt ändern, sondern die CSS-Anweisung am Ende erneut angepasst einfügen


### 4. Anleitung

Hat noch Stand v1!
Siehe Dokument [Anleitung](docs/anleitung.pdf)

Beispiel-Projekte befinden sich im Ordner "ioBroker projects", einmal ein [Demo-Projekt](ioBroker projects/MD_Demo.zip), welches den Umfang zeigt und einmal ein [Simple-Projekt](ioBroker projects/MD_Simple.zip), welches als Basis für eigene vis-Projekte verwendet werden kann. Beide Projekte (ZIP-Dateien) lassen sich in ioBroker.vis importieren.

### 5. MD CSS v1.x -> MD CSS v2
Hier eine Kurzanleitung, wie man sein v1 Projekt nach v2 übernehmen kann. Bitte immer in einer Kopie arbeiten.

* in den cardXXX
* *  mdui-Classes anpassen, welche umbenannt wurden (Bsp: mdui-raisedbutton -> mdui-button-raised, mdui-flatbutton -> mdui-button). Die Umbenennungen sind im [ChangeLog](./changelog.MD) aufgeführt
* *  die Position der Widgets so anpassen, dass sie links und oben mind. 16 Px frei lassen
* in den contXXX
* * mdui-Classes anpassen, welche umbenannt wurden (Bsp: mdui-card -> mdui-card-raised, mdui-tile -> mdui-card; oder mdui-card-outlined nutzen). Die Umbenennungen habe ich in den Änderungen zur V2.0 im Post genannt
* * [optional] haben die view-in-view cardXXX mit mdui-cols-<n> u/o mdui-rows-<n> Angaben, dann bezogen sich diese bisher auf ein 156er Raster, jetzt ist es ein 80er Raster. D.h. die <n> müssen angepasst werden, i.d.R. verdoppelt
* * [optional] die view-in-view cardXXX mit mdui-order-<n> versehen, wenn man die Reihenfolge selbst festlegen möchte
* * [optional] view-in-view cardXXX mit mdui-cols-<n>-toc-<m> versehen, wenn man mit einer automatischen Breitenanpassung der cardXXX arbeiten möchten
* * [optional] contXXX die view-in-view cardXXX mit mdui-rows-<n>-tor-<m> versehen, wenn man mit einer automatischen Höhenanpassung der cardXXX arbeiten möchten
* abar
** ein HTML-Widget einfügen und mdui-config zuweisen. Inhalt wie unter den Änderungen zur V2.0 im Post beschrieben setzen (für die Farben)
* tnav, bnav
Widgets als mdui-navitem kennzeichnen
* * [optional] mit mdui-order-<n> für die Sortierung versehen
* * [optional] wenn die navitems versteckt werden sollen, wenn die lnav fixiert angezeigt wird, dann die Widgets im tnav um mdui-lnav-fixed-open-hide ergänzen
* lnav, rnav
* * Widgets als mdui-navitem kennzeichnen
* * [optional] mit mdui-order-<n> für die Sortierung versehen
* * width auf 100% setzen
* in den pageXXX
* * [optional] Anpassung an 80er Grid: abar.Height auf 40 setzen; tnav.Top auf 40 setzen, tnav.Height auf 40 setzen; content.Top auf 80 setzen, content.Height auf calc(100% - 80px) setzen
* * tnav, lnav und rnav um mdui-flex ergänzen
* * content um mdui-flex ergänzen
* * [optional] wenn eine automatische Höhenanpassung der cardXXX mit mdui-rows-<n>-tor-<m> im contXXX zugewiesen wurde, dann im pageXXX den content um mdui-flex-stretch erweitern

### 6. Vorlagen, Wiki
Im [Wiki](https://github.com/Uhula/ioBroker-Material-Design-Style/wiki) (siehe Schaltfläche oben) sind mehrere Vorlagen, bestehend aus serverseitigem Script und vis-Views, vorhanden, welche z.B. als Beispiel für die Anzeige von Log-Daten im MDCSS Design erlauben.


### 7. Changelog
v2.1.2 23.02.2020
Siehe [ChangeLog](./changelog.MD).


### 8. Sonstiges

:copyright:2017ff Uhula, see [MIT license](./license.md).
