-- 003_content.sql — tabela treści (poradniki + artykuły) z seed data

CREATE TABLE IF NOT EXISTS content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('guide', 'article')),
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(type, slug)
);

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_public_read" ON content_items
  FOR SELECT TO public USING (true);

CREATE POLICY "content_admin_write" ON content_items
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── SEED: Poradniki zakupowe ─────────────────────────────────────────────────

INSERT INTO content_items (type, slug, title, excerpt, content, sort_order) VALUES

('guide', 'gitary-vintage-reissue',
 'Gitary typu Vintage Reissue – dla kogo są?',
 'Rynek gitarowy to ewenement: podczas gdy w technologii dążymy do nowoczesności, w świecie gitar najbardziej pożądane jest to, co powstało w latach 50. i 60.',
 $$Rynek gitarowy to ewenement: podczas gdy w technologii dążymy do nowoczesności, w świecie gitar najbardziej pożądane jest to, co powstało w latach 50. i 60. Gitary typu Vintage Reissue (reedycje) to fabrycznie nowe instrumenty, zbudowane według ścisłej, historycznej specyfikacji sprzed dekad. Czy to tylko nostalgia, czy realna wartość brzmieniowa?

**Czym właściwie jest Vintage Reissue?**

To nie są „gitary w stylu retro". To instrumenty, w których każdy detal – od składu chemicznego lakieru, przez stop metalu w mostku, aż po sposób nawijania przetworników – ma wiernie kopiować konkretny rocznik (np. '59 Les Paul czy '62 Stratocaster).

Kluczowe cechy reedycji:
- **Lakier nitrocelulozowy:** Cienki, pozwalający drewnu rezonować i starzeć się (w przeciwieństwie do współczesnych lakierów poliuretanowych).
- **Profile gryfów:** Często grubsze („baseball bat") lub o profilu V, charakterystyczne dla dawnych lat.
- **Elektronika o niskim sygnale (Low-output):** Przetworniki vintage nie są „mocne", ale oferują niesamowitą dynamikę i klarowność.
- **Radius podstrunnicy:** Często mniejszy (np. 7,25"), co jest wygodne przy akordach, ale wymaga przyzwyczajenia przy podciągnięciach.

**Dla kogo jest taka gitara?**

1. **Dla „poszukiwaczy Świętego Graala" brzmienia** — Jeśli Twoimi idolami są Jimi Hendrix, Eric Clapton czy Jimmy Page, reedycja pozwala zbliżyć się do legendarnego brzmienia bez wydawania setek tysięcy dolarów na oryginał z epoki.

2. **Dla purystów i tradycjonalistów** — To instrumenty z duszą, które wymagają od gitarzysty nieco więcej walki, ale odwdzięczają się unikalnym charakterem.

3. **Dla kolekcjonerów i estetów** — Szczególnie wersje „Relic" – fabrycznie postarzane – to małe dzieła sztuki.

**Czy to gitara dla Ciebie? (Szybki test)**

Wybierz Vintage Reissue, jeśli kochasz klasycznego rocka, bluesa lub jazz, cenisz naturalne starzenie się instrumentu i lubisz czuć „kawał drewna" w dłoni. Omijaj reedycje, jeśli grasz nowoczesny metal lub djent, albo denerwuje Cię delikatny lakier nitrocelulozowy.$$,
 1),

('guide', 'inwestycja-w-brzmienie',
 'Inwestycja w brzmienie: Kiedy warto dopłacić do instrumentu z półki Custom Shop?',
 'Dla wielu gitarzystów napis „Custom Shop" to ostateczny cel wędrówki sprzętowej. Jednak przy cenach dwu- lub trzykrotnie wyższych pojawia się pytanie: za co właściwie płacisz?',
 $$Dla wielu gitarzystów napis „Custom Shop" na główce to ostateczny cel wędrówki sprzętowej. Jednak przy cenach często dwu- lub trzykrotnie wyższych niż za standardowe modele, pojawia się zasadnicze pytanie: za co właściwie płacisz i czy realnie to odczujesz?

**Czym właściwie jest Custom Shop?**

To wydzielone działy w fabrykach takich gigantów jak Fender, Gibson, Ibanez czy ESP. Pracują tam najbardziej doświadczeni budowniczowie (Master Builders), a proces produkcji drastycznie różni się od linii seryjnej.

**1. Selekcja drewna (Tone Wood)**

W modelach seryjnych drewno dobierane jest tak, by spełniało normy wizualne i techniczne. W Custom Shopie wybiera się je pod kątem rezonansu i wagi. Dostajesz instrument, który „gra z deski" – wibracje są wyczuwalne w całym korpusie jeszcze przed podłączeniem do prądu.

**2. Detale, których nie widać na zdjęciach**

- Ręcznie szlifowane progi: Perfekcyjne wykończenie krawędzi sprawia, że gryf wydaje się „maślany" pod palcami.
- Ręcznie nawijane przetworniki: Oferują nieporównywalnie większą dynamikę i separację dźwięków w akordzie.
- Lakier nitrocelulozowy: Bardzo cienka warstwa pozwala drewnu „oddychać" i starzeć się wraz z muzykiem.

**Kiedy warto dopłacić?**

Gdy gitara jest Twoim głównym narzędziem pracy. Gdy szukasz konkretnej specyfikacji niedostępnej w katalogu. Gdy myślisz o lokacie kapitału — instrumenty Custom Shop tracą na wartości znacznie wolniej niż modele masowe.

**Pułapka „Malejących Korzyści"**

Gitara za 15 000 zł nie będzie grała „trzy razy lepiej" niż ta za 5 000 zł. Będzie grała lepiej o te ostatnie 5-10%, które dla profesjonalisty stanowią o magii brzmienia. Dopłacasz za emocje, inspirację i brak kompromisów.$$,
 2),

('guide', 'lampowe-combo-vs-modeler',
 'Lampowe combo czy nowoczesny modeler? Wybieramy wzmacniacz do domu i na próby',
 'Przez dekady wybór był prosty: chcesz brzmieć profesjonalnie – kupujesz lampę. Dziś technologia cyfrowa dotarła do punktu, w którym nawet zawodowcy rezygnują z ciężkich pieców.',
 $$Przez dekady wybór był prosty: chcesz brzmieć profesjonalnie – kupujesz „lampę". Dziś technologia cyfrowa (modelowanie) dotarła do punktu, w którym nawet zawodowcy rezygnują z ciężkich pieców na rzecz procesorów. Co jednak sprawdzi się lepiej w Twoim przypadku?

**1. Lampowe Combo: Klasyka, która „oddycha"**

Wzmacniacz lampowy to urządzenie analogowe. Dźwięk powstaje dzięki przepływowi prądu przez szklane lampy, co generuje naturalną kompresję i ciepłe harmoniczne.

**Dlaczego warto?**
- **Dynamika:** Lampa reaguje na to, jak mocno uderzasz w struny. Możesz przejść od czystego brzmienia do drapieżnego przesteru samym ruchem nadgarstka.
- **Presencja w miksie:** Na próbie z perkusją 15-watowa lampa często „przebija się" lepiej niż 50-watowa tranzystorówka.
- **Inwestycja:** Dobre konstrukcje lampowe starzeją się z klasą i trzymają cenę.

**Wyzwania:** Głośność — lampa brzmi najlepiej głośno. W bloku mieszkalnym uzyskanie nasyconego brzmienia jest prawie niemożliwe. Są też ciężkie i wymagają serwisu (wymiana lamp co rok-dwa).

**2. Nowoczesny Modeler: Cyfrowy kameleon**

Modelery (np. Line 6 Catalyst, Fender Mustang GTX, Boss Katana) używają procesorów, by matematycznie odwzorować zachowanie legendarnych wzmacniaczy.

**Dlaczego warto?**
- **Wszechstronność:** W jednym urządzeniu masz 50 wzmacniaczy i setki efektów.
- **Brzmienie przy każdej głośności:** Brzmi niemal identycznie, gdy grasz szeptem w nocy i na próbie.
- **Funkcje dodatkowe:** Bluetooth do podkładów, interfejs USB do nagrywania, aplikacje na telefon.

**Werdykt:** Wybierz lampowe combo jeśli szukasz „tego jednego" brzmienia i masz dom wolnostojący. Wybierz modelera jeśli mieszkasz w bloku, dużo nagrywasz i lubisz eksperymentować z gatunkami.$$,
 3),

('guide', 'multiefekt-vs-kostki',
 'Multiefekt czy kostki analogowe? Jak zbudować swój pierwszy pedalboard',
 'Każdy gitarzysta dochodzi do momentu, w którym wbudowany przester w piecu przestaje wystarczać. Pojawia się pytanie: pójść w stronę multiefektu, czy budować klasyczny pedalboard?',
 $$Każdy gitarzysta dochodzi do momentu, w którym wbudowany przester w piecu przestaje wystarczać. Pojawia się pytanie: pójść w stronę nowoczesnego multiefektu, czy budować klasyczny pedalboard z pojedynczych kostek?

**1. Multiefekt: Cyfrowe centrum dowodzenia**

Współczesne multiefekty (np. Line 6 Helix, Boss GT, Headrush) to potężne procesory, które symulują nie tylko efekty, ale też całe wzmacniacze i kolumny.

**Zalety:**
- Wszystko w jednym: setki efektów, od klasycznych overdrive'ów po kosmiczne pogłosy.
- Presety: jednym kliknięciem zmieniasz brzmienie.
- Waga i mobilność: wrzucasz do plecaka.

**Wady:**
- „Paraliż decyzyjny": zbyt duża ilość opcji sprawia, że więcej kręcisz gałkami, niż grasz.
- Menu-diving: edycja wymaga przekopywania się przez cyfrowe menu.

**2. Kostki analogowe: Brzmienie z duszą**

**Zalety:**
- Intuicyjność: każdy efekt ma swoje fizyczne gałki.
- Unikalność: tworzysz brzmienie, którego nie ma nikt inny.
- Wartość: dobre kostki wolniej tracą na wartości.

**Wady:**
- Koszty: suma cen kostek, zasilacza, kabli i tablicy szybko przewyższa cenę multiefektu.

**Klasyczna kolejność sygnału:**
1. Tuner
2. Wah-wah i Kompresory
3. Przestery (Overdrive, Distortion, Fuzz)
4. Modulacje (Chorus, Flanger, Phaser)
5. Time-based (Delay, Reverb)

**Pro-tip:** Rozważ system hybrydowy — multiefekt do modulacji i opóźnień + ulubiona analogowa kostka do przesteru. To łączy najlepsze cechy obu światów.$$,
 4),

('guide', 'upgrade-gitary-za-300-zl',
 'Upgrade gitary za 300 zł: Jak tanio poprawić brzmienie i wygodę?',
 'Masz budżetową gitarę, która brzmi poprawnie, ale „to jeszcze nie to"? Zanim zaczniesz odkładać tysiące na nowy instrument, zainwestuj ułamek tej kwoty w mądre modyfikacje.',
 $$Masz budżetową gitarę, która brzmi poprawnie, ale „to jeszcze nie to"? Zanim zaczniesz odkładać tysiące na nowy instrument, zainwestuj ułamek tej kwoty w mądre modyfikacje. Oto 4 ulepszenia, które realnie odmienią Twój sprzęt.

**1. Siodełko z kości lub materiału Graph Tech (Koszt: 40–80 zł)**

Fabryczne gitary do 1500 zł mają zazwyczaj siodełka z miękkiego plastiku. Struny „wgryzają się" w nie, co powoduje rozstrajanie się gitary przy podciągnięciach i stłumiony dźwięk pustych strun.

- **Efekt:** Wymiana na siodełko z naturalnej kości lub samosmarującego grafitu (np. Graph Tech TUSQ) drastycznie poprawia stabilność stroju i dodaje instrumentowi szlachetnej góry pasma.
- **Wskazówka:** To najtańszy sposób na to, by tania gitara zaczęła „śpiewać".

**2. Profesjonalne ekranowanie elektroniki (Koszt: 30–50 zł)**

Jeśli Twój instrument buczy i szumi (szczególnie na przesterze), prawdopodobnie brakuje mu ekranowania. Za kilkadziesiąt złotych kupisz samoprzylepną taśmę miedzianą.

- **Efekt:** Wyklejenie komór przetworników i potencjometrów taśmą tworzy tzw. „puszkę Faradaya", która odcina zakłócenia z otoczenia (np. od monitora czy świetlówek).
- **Wygoda:** Cisza między dźwiękami sprawia, że Twoje granie brzmi bardziej profesjonalnie.

**3. Blokowane klucze (używane) lub wymiana sprężyn (Koszt: 120–180 zł)**

Jeśli masz gitarę z ruchomym mostkiem (tremolo), winowajcą rozstrajania są często słabej jakości klucze lub miękkie sprężyny z tyłu korpusu.

- **Opcja A:** Szukaj na portalach aukcyjnych używanych kluczy blokowanych (np. marki Guyker lub podstawowych modeli Gotoh). Wymiana strun zajmie Ci wtedy 2 minuty, a strój „stanie jak wryty".
- **Opcja B:** Wymień standardowe sprężyny mostka na zestaw typu High Tension. Mostek będzie stabilniejszy, a sustain (wybrzmiewanie) nieco się wydłuży.

**4. „Domowe SPA" i nowe struny premium (Koszt: 60–90 zł)**

Często to, co bierzemy za „słabe brzmienie", to po prostu brud i stare struny.

- **Zestaw:** Kup olejek cytrynowy do podstrunnicy, drobnoziarnistą wełnę stalową (0000) do wypolerowania progów i zestaw strun powlekanych (np. Elixir lub D'Addario XS).
- **Efekt:** Po wypolerowaniu progów podciągnięcia (bendy) będą gładkie jak po maśle, a podstrunnica odzyska głęboki kolor i szybkość.

**Podsumowanie wydatków:**

- Siodełko Graph Tech: 60 zł
- Taśma miedziana: 30 zł
- Używane klucze blokowane: 150 zł
- Struny i konserwacja: 60 zł
- SUMA: 300 zł

Taki zestaw modyfikacji sprawi, że gitara z niższej półki pod względem wygody gry zbliży się do instrumentów profesjonalnych.$$,
 5),

('guide', 'sygnowane-modele',
 'Sygnowane modele (Artist Series) – czy warto dopłacać za nazwisko idola?',
 'Modele sygnowane są zazwyczaj o 20–40% droższe od standardowych odpowiedników. Sprawdź, kiedy dopłata ma sens, a kiedy płacisz tylko za logo na główce.',
 $$Dla fana Johna Mayera, Slasha czy Jamesa Hetfielda, widok autografu ulubionego artysty na główce gitary wywołuje szybsze bicie serca. Jednak modele sygnowane (tzw. Signatures) są zazwyczaj o 20–40% droższe od swoich standardowych odpowiedników. Sprawdźmy, co tak naprawdę kupujesz wraz z tym nazwiskiem.

**1. Co dostajesz ekstra (poza logotypem)?**
Wbrew pozorom, dopłata nie zawsze idzie tylko do kieszeni artysty. Modele Artist Series często posiadają unikalne modyfikacje, których nie znajdziesz w seryjnych modelach.
- **Niestandardowe przetworniki:** Artyści często montują pickupy niedostępne w wolnej sprzedaży lub specjalnie nawijane pod ich ucho (np. przetworniki Big Dipper w Stratocasterach Mayera).
- **Unikalna ergonomia:** Nietypowy profil gryfu (np. bardzo cienki u Satrianiego lub niesymetryczny u Van Halena), specyficzny radius podstrunnicy czy przesunięte gniazdo jack.
- **Materiały i hardware:** Lepsze klucze blokowane, progi ze stali nierdzewnej czy unikalne mostki w standardzie.

**2. Pułapka płacenia za markę**
Musisz wiedzieć, że rynek sygnowany dzieli się na dwie grupy.
- **Modele Copy-Paste:** To standardowa gitara (np. Fender Player), która dostała tylko nowy kolor i podpis. Tutaj dopłata 1000 zł za nazwisko jest czystym marketingiem.
- **Modele Spec:** To instrumenty projektowane od zera z artystą. Mają inne drewno, inny osprzęt i oferują brzmienie, którego nie uzyskasz na seryjnym modelu bez kosztownych modyfikacji.

**3. Kiedy warto dopłacić?**
Warto, gdy szukasz specyficznego brzmienia: jeśli chcesz brzmieć jak Stevie Ray Vaughan, jego sygnatura ma konkretny zestaw progów jumbo i przetworników, których konfiguracja w zwykłym Stracie kosztowałaby więcej niż różnica w cenie. Modele Artist Series trzymają też cenę znacznie lepiej niż seryjne – w razie sprzedaży szybciej znajdziesz kupca-fana.

**Kiedy odpuścić?**
Jeśli szukasz własnego, unikalnego wizerunku, granie na gitarze z wielkim logo innego gitarzysty może być ograniczające artystycznie. Jeśli budżet jest napięty – za cenę modelu Signature z niższej linii (np. Squier czy Epiphone) często możesz kupić używany instrument z wyższej, profesjonalnej serii bez nazwiska na główce.

**Podsumowanie**
Gitara sygnowana to skrót do konkretnego brzmienia i estetyki. Jeśli modyfikacje wprowadzone przez artystę pokrywają się z Twoimi potrzebami technicznymi – warto. Kupuj instrument ze względu na jego specyfikację, a nie ze względu na plakat, który go reklamuje.$$,
 6);

-- ─── SEED: Artykuły i ciekawostki ────────────────────────────────────────────

INSERT INTO content_items (type, slug, title, excerpt, content, sort_order) VALUES

('article', 'domowa-regulacja-gitary',
 'Domowa regulacja gitary (setup) – co możesz zrobić sam, a z czym iść do lutnika?',
 'Gitara to instrument wykonany z drewna, które nieustannie pracuje pod wpływem temperatury i wilgoci. Większość podstawowych ustawień możesz wykonać samodzielnie.',
 $$Gitara to instrument wykonany z drewna, które nieustannie pracuje pod wpływem temperatury i wilgoci. Nawet najdroższy model po kilku miesiącach może zacząć „brzęczeć" lub stać się twardy w graniu. Dobra wiadomość? Większość podstawowych ustawień, czyli tzw. setupu, możesz wykonać samodzielnie przy pomocy kilku kluczy imbusowych.

**Co możesz (i powinieneś) robić sam?**

**1. Regulacja krzywizny gryfu (Pręt napinający)**

Wewnątrz gryfu znajduje się metalowy pręt (truss rod), który równoważy naciąg strun. Jeśli gryf wygiął się w „łódkę" lub wygiął się w drugą stronę, wystarczy lekki obrót kluczem imbusowym. Zasada: robimy małe kroki (max. 1/4 obrotu) i dajemy drewnu czas na „odpowiedź".

**2. Ustawienie akcji strun**

Akcja strun to ich wysokość nad progami (mierzona zazwyczaj na 12. progu). W większości mostków regulacja polega na podniesieniu lub obniżeniu całego mostka lub poszczególnych siodełek. Celem jest znalezienie balansu między wygodą (niska akcja) a czystością dźwięku (brak brzęczenia).

**3. Ustawienie menzury (Intonacja)**

Czy Twoja gitara stroi na pustych strunach, ale fałszuje po zagraniu akordu na 12. progu? To problem z menzurą, czyli czynną długością struny. Reguluje się ją, przesuwając siodełka w mostku do przodu lub do tyłu. Narzędzie: dobry tuner elektroniczny i śrubokręt.

**Kiedy czas na wizytę u lutnika?**

**1. Szlifowanie, koronowanie i polerowanie progów**

Z czasem pod strunami na progach pojawiają się wgłębienia. Szlifowanie progów (fret leveling) polega na wyrównaniu ich wysokości specjalnym pilnikiem. Dlaczego lutnik? Jeden fałszywy ruch i progi będą zbyt niskie, co zmusi Cię do ich całkowitej wymiany (refretting).

**2. Korekta siodełka (Nut work)**

Pogłębianie rowków w siodełku wymaga precyzyjnych pilników o konkretnych grubościach. Jeśli spiłujesz o ułamek milimetra za dużo, struna będzie leżeć na pierwszym progu.

**3. Elektronika i poważne uszkodzenia**

Trzeszczący potencjometr możesz przeczyścić sprayem typu „Contact", ale wymiana przetworników czy naprawa pęknięć drewna — to robota dla fachowca.

**Podsumowanie:** Domowy setup (gryf, akcja, menzura) to podstawa higieny każdego gitarzysty. Jeśli jednak problemem jest „fizyka" progów lub twarde elementy konstrukcyjne, oddaj instrument w ręce fachowca. Twoja gitara to inwestycja — dbaj o nią mądrze!$$,
 1),

('article', 'jak-dbac-o-instrument',
 'Jak dbać o instrument w polskim klimacie? Walka z wilgotnością i temperaturą',
 'Polska to kraj pięknych pór roku, ale dla drewna Twojej gitary nasz klimat to prawdziwy tor przeszkód – od wilgotnych jesieni po suche powietrze w sezonie grzewczym.',
 $$Polska to kraj pięknych pór roku, ale dla drewna, z którego wykonana jest Twoja gitara, nasz klimat to prawdziwy tor przeszkód. Od wilgotnych, jesiennych wieczorów po suche jak pieprz powietrze w sezonie grzewczym – Twój instrument pracuje przez cały rok.

**Dlaczego wilgotność ma znaczenie?**

Drewno jest higroskopijne – oznacza to, że pije wodę z otoczenia, gdy jest wilgotno, i oddaje ją, gdy powietrze jest suche.

- **Zbyt wysoka wilgotność (>60%):** Drewno pęcznieje. Gryf może się wygiąć, akcja strun drastycznie wzrośnie, a metalowe elementy zaczną szybciej korodować.
- **Zbyt niska wilgotność (<40%):** To najczęstszy problem w Polsce zimą. Drewno kurczy się, co prowadzi do pęknięć płyty wierzchniej, „wychodzenia" ostrych końcówek progów poza krawędź podstrunnicy oraz zapadania się topu.

**Sezon grzewczy – największy wróg gitarzysty**

Kaloryfery wysuszają powietrze w mieszkaniach często do poziomu 20-30% wilgotności. To wyrok dla instrumentów litych (solid wood). Złota zasada: nigdy nie trzymaj gitary na stojaku bezpośrednio przy kaloryferze ani na ścianie zewnętrznej.

**Jak chronić gitarę krok po kroku?**

**1. Zainwestuj w higrometr**

Małe, cyfrowe urządzenie za kilkadziesiąt złotych powie Ci prawdę o warunkach w Twoim pokoju. Celuj w przedział 45% – 55%.

**2. Futerał to Twój najlepszy przyjaciel**

Choć gitara na ścianie wygląda świetnie, w trudnych miesiącach bezpieczniej jej w twardym futerale (hardcase). Tworzy on mikroklimat, który znacznie wolniej reaguje na zmiany zewnętrzne.

**3. Nawilżacze gitarowe**

Jeśli wilgotność spada poniżej 40%, użyj nawilżacza. Może to być proste urządzenie z gąbką wkładane do otworu rezonansowego lub specjalne saszetki dwukierunkowe (np. Boveda).

**4. Aklimatyzacja (Zasada 30 minut)**

Przynosisz gitarę z mrozu do ciepłego domu? Nie otwieraj futerału od razu! Nagła zmiana temperatury może doprowadzić do siatki spękań na lakierze (tzw. finish cracks). Odczekaj minimum pół godziny.

**Konserwacja podstrunnicy**

Przynajmniej dwa razy w roku zafunduj podstrunnicy (palisandrowej, hebanowej lub z pau ferro) „spa". Specjalny olejek cytrynowy nie tylko wyczyści brud, ale stworzy barierę ochronną.

**Podsumowanie:** Pamiętaj: taniej jest kupić nawilżacz za 50 zł niż oddawać gitarę do lutnika na klejenie pękniętego topu za 500 zł.$$,
 2),

('article', 'mity-o-mostkach',
 'Mity o mostkach stałych i ruchomych – czy Floyd Rose to faktycznie „zło wcielone"?',
 'Wokół mostków narosło tyle legend, że początkujący gracze często omijają niektóre instrumenty szerokim łukiem. Czas oddzielić fakty od internetowych mitów.',
 $$Wybór między mostkiem stałym a ruchomym to jedna z najważniejszych decyzji przy zakupie gitary elektrycznej. Wokół tego tematu narosło tyle legend, że początkujący gracze często omijają niektóre instrumenty szerokim łukiem. Czas oddzielić fakty od internetowych mitów.

**Mostek stały (Hardtail): Prostota, którą kochamy**

Konstrukcje takie jak Tune-O-Matic (w Les Paulach) czy klasyczny Hardtail to synonim stabilności.

Mit: Mostek stały sprawia, że gitara nigdy się nie rozstraja.
Prawda: Jest znacznie stabilniejszy, ale za strój odpowiadają też klucze i siodełko. Jego główną zaletą jest szybkość wymiany strun oraz możliwość błyskawicznej zmiany stroju (np. z E-standard na Drop D).

**Floyd Rose i spółka: Dlaczego budzą lęk?**

Mostki typu tremolo (ruchome) pozwalają na zmianę wysokości dźwięku za pomocą wajchy. Floyd Rose to system „double-locking", gdzie struny są blokowane na mostku i na siodełku.

**Największe mity o Floyd Rose:**

- **„Wymiana strun trwa wieki"** — Za pierwszym razem – tak. Ale z odrobiną wprawy trwa to tylko kilka minut dłużej niż w zwykłej gitarze.

- **„Gdy pęknie jedna struna, cała gitara traci strój"** — To prawda. Ponieważ system opiera się na równowadze napięcia strun i sprężyn, pęknięcie jednej struny niszczy ten balans.

- **„Ustawienie menzury to koszmar"** — Jest to trudniejsze niż w mostku stałym, ale wymaga po prostu cierpliwości i odpowiedniego klucza imbusowego.

**Czy Floyd Rose to „zło wcielone"?**

Absolutnie nie! To genialne narzędzie, które oferuje możliwości niedostępne dla mostków stałych:
- Ekstrakrobacje: Dive-bombs i „piski" harmoniczne to domena Floyda.
- Pancerny strój: Dobrze ustawiony Floyd Rose trzyma strój lepiej niż jakikolwiek mostek stały, nawet przy najbardziej agresywnej grze.

**Werdykt:**

Wybierz mostek stały jeśli często zmieniasz stroje i cenisz sobie szybkość serwisu. Wybierz Floyd Rose jeśli Twoimi idolami są Eddie Van Halen czy Steve Vai i nie boisz się poświęcić godziny raz na kilka miesięcy na precyzyjną regulację.

Pamiętaj: Największym wrogiem mostka ruchomego nie jest jego konstrukcja, ale brak wiedzy użytkownika.$$,
 3),

('article', 'radius-podstrunnicy',
 'Radius podstrunnicy i geometria gryfu – o co w tym chodzi?',
 'Większość gitarzystów przy zakupie kieruje się wyglądem, marką lub brzmieniem. Jednak to, czy gitara leży w dłoni, zależy od parametrów, których na pierwszy rzut oka nie widać.',
 $$Większość gitarzystów przy zakupie instrumentu kieruje się wyglądem, marką lub brzmieniem przetworników. Jednak to, czy gitara „leży w dłoni", zależy od parametrów, których na pierwszy rzut oka nie widać: geometrii gryfu oraz radiusa.

**Czym jest radius podstrunnicy?**

Radius to stopień zakrzywienia powierzchni podstrunnicy. Choć wydaje się ona płaska, w rzeczywistości większość gryfów stanowi wycinek łuku okręgu. Wartość tę podaje się w calach. Im mniejsza liczba (np. 7,25"), tym podstrunnica jest bardziej wypukła. Im większa liczba (np. 16"), tym bardziej płaska.

**Jak radius wpływa na Twoją grę?**

- **Mały radius (7,25" – 9,5"):** Charakterystyczny dla gitar typu Vintage (np. stare Telecastery). Jest niezwykle wygodny przy chwytaniu akordów barowych. Wadą jest ryzyko „gaśnięcia" dźwięku podczas podciągania strun (bends).

- **Duży radius (12" – 16"):** Standard w gitarach nowoczesnych i wyścigowych (np. Ibanez). Płaska powierzchnia pozwala na bardzo niską akcję strun i ekstremalne podciągnięcia bez obawy o brzęczenie o progi.

**Co to jest Radius Zmienny (Compound Radius)?**

To rozwiązanie hybrydowe. Przy siodełku podstrunnica jest bardziej okrągła (ułatwia akordy), a im bliżej korpusu, tym bardziej się wypłaszcza (ułatwia solówki). To „święty Graal" ergonomii dla wszechstronnych gitarzystów.

**Geometria gryfu: C, V czy U?**

Profil gryfu (backshape) to kształt jego tylnej części, o którą opierasz kciuk.

- **Profil C:** Najpopularniejszy, uniwersalny kształt. Pasuje do większości dłoni i stylów gry.
- **Profil V:** Często spotykany w modelach retro. Świetny dla osób, które trzymają kciuk wystawiony ponad gryf.
- **Profil U („Baseball Bat"):** Gruby, masywny gryf. Uwielbiany przez fanów dużych instrumentów.
- **Modern D/Wizard:** Bardzo cienkie profile stworzone do szybkiej gry technicznej (shreddingu).

**Podsumowanie:**

Jeśli jesteś początkującym lub grasz głównie rytmikę, szukaj radiusa w okolicach 9,5" i profilu C. Jeśli Twoim celem są szybkie solówki i techniczne popisy, celuj w radius 12" lub wyższy oraz cieńsze profile. Pamiętaj: najlepszy gryf to taki, o którym zapominasz w trakcie grania.$$,
 4),

('article', 'efekt-psychologiczny-czy-fizyka',
 'Efekt psychologiczny czy fizyka? Dlaczego stara gitara brzmi „lepiej" niż nowa',
 'W świecie technologii nowsze oznacza lepsze. Jednak w świecie gitar panuje odwrotna hierarchia: pożółkły lakier i drewno pamiętające czasy czarnych płyt to synonim brzmieniowego ideału.',
 $$W świecie technologii nowsze zazwyczaj oznacza lepsze. Jednak w świecie gitar panuje odwrotna hierarchia: pożółkły lakier, obite krawędzie i drewno, które pamięta czasy czarnych płyt, to dla wielu synonim brzmieniowego ideału. Czy to tylko nostalgia i uleganie marketingowi, czy za fenomenem „vintage" stoi twarda nauka?

**Fizyka: Drewno, które uczy się drgań**

Głównym argumentem zwolenników starych instrumentów jest proces starzenia się drewna. I tutaj fizyka przyznaje im rację.

- **Krystalizacja żywicy:** Świeże drewno zawiera soki i żywice. Z upływem dekad te substancje parują i krystalizują się wewnątrz komórek drewna. Wynik? Struktura staje się lżejsza, sztywniejsza i bardziej porowata. Taka „skamielina" znacznie lepiej przenosi drgania, co przekłada się na szybszą odpowiedź instrumentu (tzw. atak) i bogatsze pasmo przenoszenia.
- **Utrata wilgoci:** Stara gitara przeszła przez setki cykli zmian wilgotności. Drewno „ułożyło się", oddało resztki wilgoci i stało się niezwykle stabilne.
- **Wpływ drgań (Rozegranie):** Istnieje teoria, według której regularne poddawanie drewna wibracjom porządkuje strukturę jego włókien. Gitara, na której grano przez 40 lat, „nauczyła się" rezonować w konkretnych częstotliwościach muzycznych.

**Chemia: Magia cienkiego lakieru**

Większość starych gitar była malowana lakierem nitrocelulozowym. W przeciwieństwie do nowoczesnych lakierów poliuretanowych (które działają niemal jak plastikowy pancerz), „nitro" z czasem staje się coraz cieńsze i twardsze. Dzięki temu lakier nie tłumi drgań drewna, pozwalając mu na swobodną pracę.

**Psychologia: Oko słyszy więcej niż ucho**

Nie możemy jednak ignorować potęgi naszego mózgu. Efekt psychologiczny w świecie vintage jest potężny:

- **Aura historii:** Trzymając w rękach instrument, który przetrwał dekady, podświadomie gramy inaczej. Inspiracja płynąca z faktu, że dotykamy „kawałka historii", przekłada się na naszą ekspresję.
- **Selekcja naturalna:** Zapominamy o jednym – stare gitary, które dotrwały do dziś w dobrym stanie, to często te najlepsze egzemplarze. Słabe, głuche instrumenty z tamtych lat dawno wylądowały w śmieciach.

**Czy można oszukać czas? (Torrefikacja)**

Dzisiejsi producenci próbują replikować te procesy poprzez torrefikację (pieczenie drewna w specjalnych piecach bez dostępu tlenu). Pozwala to sztucznie postarzyć strukturę komórkową drewna w kilka dni.

**Podsumowanie**

Czy stara gitara brzmi lepiej? Fizycznie – tak, jest zazwyczaj bardziej responsywna i bogatsza w harmoniczne dzięki zmianom w strukturze drewna. Jednak psychologia dopełnia ten obraz, dodając do brzmienia pierwiastek magii i prestiżu. Ostatecznie najważniejsze jest to, czy instrument inspiruje Cię do ćwiczeń.$$,
 5),

('article', 'ikoniczne-bledy-realizatorow',
 'Piekło i niebo gitarzysty: Najbardziej ikoniczne błędy realizatorów, które stały się hitami',
 'W idealnym świecie studio nagraniowe to sterylne laboratorium. Ale rock''n''roll nie powstał w laboratorium – najbardziej kultowe brzmienia często rodziły się z awarii i pomyłek realizatorów.',
 $$W idealnym świecie studio nagraniowe to sterylne laboratorium, gdzie każdy kabel jest ekranowany, a sygnał czysty jak łza. Ale rock'n'roll nie powstał w laboratorium. Najbardziej kultowe brzmienia gitarowe w historii często rodziły się z awarii, pomyłek lub kompletnej ignorancji realizatorów. Oto historie o tym, jak „błąd" stał się „ikoną".

**1. Narodziny Fuzzu: Przecięta membrana w „You Really Got Me"**
W 1964 roku Dave Davies z The Kinks nie mógł uzyskać wystarczająco agresywnego brzmienia swojego wzmacniacza Elpico. Zamiast szukać lepszego sprzętu, wziął żyletkę i pociął membranę głośnika.
- **Błąd:** Uszkodzenie mechaniczne sprzętu (coś, co każdy realizator uznałby za koniec sesji).
- **Efekt:** Narodził się brudny, poszarpany przester, który zdefiniował hard rocka. Bez tego aktu wandalizmu prawdopodobnie nie mielibyśmy efektów typu fuzz.

**2. „(I Can't Get No) Satisfaction": Demo, które podbiło świat**
Keith Richards nagrał słynny riff do „Satisfaction" przy użyciu efektu Gibson Maestro FZ-1 Fuzz-Tone. Keith nienawidził tego brzmienia – traktował je tylko jako szkic (placeholder) dla sekcji dętej, która miała go zastąpić w finalnej wersji.
- **Błąd:** Zostawienie w miksie brzmienia „technicznego", które miało być usunięte.
- **Efekt:** Utwór stał się pierwszym numerem jeden w USA wykorzystującym fuzz, a firma Gibson wyprzedała cały zapas efektów w kilka tygodni.

**3. Led Zeppelin i „brudny" mikrofon w „Whole Lotta Love"**
Podczas miksowania słychać „ducha" – cichy, wyprzedzający wokal Roberta Planta. Był to tzw. bleeding (przesłuch) z innej ścieżki, którego realizator Eddie Kramer nie mógł usunąć.
- **Błąd:** Błąd techniczny taśmy, który spowodował nałożenie się ścieżek.
- **Efekt:** Zamiast walczyć z błędem, Kramer dodał potężny pogłos (reverb). Stało się to jednym z najbardziej kultowych momentów w psychodelicznym rocku.

**4. „Layla" Erica Claptona i pomyłka w nastrojeniu**
W słynnym finałowym duecie gitary Claptona i Duane'a Allmana nie są idealnie w stroju względem siebie. Allman grał techniką slide, a emocje w studio były tak wielkie, że nikt nie przejmował się strojeniem do pianina.
- **Błąd:** Niedostrojone instrumenty w finalnym miksie.
- **Efekt:** Ten mikro-fałsz stworzył niesamowite napięcie i „płaczliwy" charakter utworu, którego nie da się podrobić idealnie nastrojonymi cyfrowo instrumentami.

**5. Nirvana i „Radio Friendly Unit Shifter"**
Kurt Cobain i producent Steve Albini celowo ustawiali mikrofony tak, by zbierały niepożądane sprzężenia (feedback). Albini pozwalał, by wzmacniacze „krzyczały" w niekontrolowany sposób.
- **Błąd:** Sprzężenia zwrotne, które normalnie uznaje się za techniczny śmieć.
- **Efekt:** Surowość i ból płynący z tych „błędów" stały się fundamentem estetyki grunge'u.

**Wniosek dla gitarzysty**
Historia rocka uczy nas jednego: perfekcja bywa nudna. Czasami to, co realizator nazywa błędem, dla słuchacza jest nowym, świeżym kolorem. Jeśli Twój wzmacniacz dziwnie trzeszczy lub gitara wydaje niepokojące dźwięki – spróbuj to wykorzystać, zanim wezwiesz serwis.$$,
 6);
