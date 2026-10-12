# -*- coding: utf-8 -*-
"""Every word on the page, English and Thai side by side. research/facts.json holds the source of each claim."""

SITE = "https://nanobotco.github.io/gargoyles/"
TITLE = ("Gargoyles, Drawn", "การ์กอยล์ วาดด้วยคณิต")
SUB = ("and their cousins around the world", "และญาติ ๆ ของมันทั่วโลก")
DESC = ("Gargoyles, grotesques and their cousins around the world, drawn live: Notre-Dame under the sky over Paris right now, "
        "the physics of a spout, the dragon of Rouen, a thousand dragons in Beijing, the face that ate itself, Nepal's stone spouts, "
        "a block to carve and an astronaut to find.",
        "การ์กอยล์ ตัวประหลาด และญาติ ๆ ของมันทั่วโลก วาดสด: นอเทรอดามใต้ฟ้าปารีสตอนนี้ ฟิสิกส์ของรางพ่นน้ำ มังกรแห่งรูอ็อง "
        "มังกรพันตัวที่ปักกิ่ง หน้าที่กินตัวเอง ก๊อกหินของเนปาล ก้อนหินให้สกัด และนักบินอวกาศให้ตามหา")

NAV = [("sort", ("Which is which", "อะไรเป็นอะไร")), ("throw", ("Spout", "รางน้ำ")), ("rouen", ("Rouen", "รูอ็อง")),
       ("world", ("World", "ทั่วโลก")), ("dragons", ("Beijing", "ปักกิ่ง")), ("kirti", ("Kala", "หน้ากาล")),
       ("hiti", ("Nepal", "เนปาล")), ("carve", ("Carve", "สกัดหิน")), ("hunt", ("Find", "ตามหา")),
       ("stories", ("Stories", "เรื่องเล่า")), ("sources", ("Sources", "แหล่งข้อมูล"))]

# number, label, small
SLAB = [("1,142", ("dragon-head spouts on the Forbidden City's terraces", "หัวมังกรพ่นน้ำบนฐานพระราชวังต้องห้าม"), ("Beijing", "ปักกิ่ง")),
        ("570", ("Patan's Manga Hiti, the oldest working stone spout on record", "มังคะหิติ เมืองปาฏัน ก๊อกหินที่ยังใช้งานได้เก่าที่สุดที่มีบันทึก"), ("CE, still running", "ค.ศ. ยังมีน้ำไหล")),
        ("1724", ("London's Building Act requires downpipes on new houses", "กฎหมายอาคารลอนดอนกำหนดให้บ้านใหม่ใช้ท่อน้ำฝน"), ("the gargoyle retires", "การ์กอยล์เกษียณ")),
        ("102", ("lion-head spouts on the Temple of Zeus at Olympia", "หัวสิงโตพ่นน้ำบนวิหารซูส โอลิมเปีย"), ("39 survive", "เหลืออยู่ 39 หัว")),
        ("1992", ("an astronaut joins Salamanca's cathedral", "นักบินอวกาศเข้าไปอยู่ในมหาวิหารซาลามังกา"), ("Spain", "สเปน"))]

P = {
    "sections": ("Sections", "หัวข้อ"),
    "hero_label": ("Notre-Dame de Paris, drawn live", "นอเทรอดามแห่งปารีส วาดสด"),
    "hero_alt": ("A gargoyle and a chimera on the gallery of Notre-Dame de Paris, above the roofs of Paris, under the sky over Paris now",
                 "การ์กอยล์กับคิเมียร่าบนระเบียงมหาวิหารนอเทรอดาม เหนือหลังคาบ้านเรือนปารีส ใต้ท้องฟ้าปารีสตอนนี้"),
    "kicker": ("Paris · Beijing · Patan · Bangkok · Kabah", "ปารีส · ปักกิ่ง · ปาฏัน · กรุงเทพฯ · กาบาห์"),
    "lede": ("Stone beasts that spit the rain off the roof, and their cousins who only stand guard. Drawn by math, under the sky over Paris right now.",
             "สัตว์หินที่พ่นน้ำฝนออกจากหลังคา กับญาติ ๆ ที่ยืนเฝ้าอย่างเดียว วาดด้วยคณิต ใต้ท้องฟ้าปารีสตอนนี้"),
    "hint": ("Tap the gargoyle. Tap the sky for rain.", "แตะการ์กอยล์ แตะฟ้าให้ฝนตก"),
    "paris_time": ("Paris time", "เวลาปารีส"), "now": ("Now", "ตอนนี้"), "rain": ("Rain", "ฝน"), "sound": ("Sound", "เสียง"), "next": ("Next", "ตัวต่อไป"),
    "card_alt": ("A stone gargoyle spouting rain off Notre-Dame de Paris at dusk", "การ์กอยล์หินพ่นน้ำฝนจากมหาวิหารนอเทรอดามยามพลบค่ำ"),

    "sort_h": ("Gargoyle or grotesque?", "การ์กอยล์ หรือ ตัวประหลาด?"),
    "sort_lede": ("A gargoyle is a drain: water goes in at the roof and out of its mouth. A carved creature that carries no water is a grotesque, or on Notre-Dame, a chimera. Look, guess, then see.",
                  "การ์กอยล์คือรางน้ำ น้ำเข้าจากหลังคาแล้วออกทางปาก สัตว์แกะสลักที่ไม่ได้นำน้ำ เรียกว่า กรอเทสก์ (ตัวประหลาด) หรือที่นอเทรอดามเรียกว่า คิเมียร่า ดู เดา แล้วเฉลย"),
    "sort_alt": ("A carved creature to sort", "สัตว์แกะสลักให้ทาย"),
    "sort_spout": ("Spouts water", "พ่นน้ำ"), "sort_dry": ("Stays dry", "ไม่พ่นน้ำ"),
    "defs": [(("Gargoyle", "การ์กอยล์"), ("A spout carved as a creature. A groove or pipe runs through it and the water leaves by the mouth.", "รางน้ำที่แกะเป็นรูปสัตว์ มีร่องหรือท่อผ่านตัว น้ำออกทางปาก")),
             (("Grotesque", "กรอเทสก์ ตัวประหลาด"), ("Any odd carved figure, human or beast, that carries no water. The word comes from the Italian grotta.", "รูปแกะแปลก ๆ ทั้งคนและสัตว์ที่ไม่ได้นำน้ำ คำนี้มาจากคำอิตาลี grotta แปลว่าถ้ำ")),
             (("Chimera", "คิเมียร่า"), ("The name for the grotesques on Notre-Dame's upper gallery, after the many-part monster of Greek myth.", "ชื่อเรียกตัวประหลาดบนระเบียงชั้นบนของนอเทรอดาม ตั้งตามสัตว์ประหลาดหลายร่างในตำนานกรีก")),
             (("Cousins", "ญาติ"), ("Guardians at doors and on ridges elsewhere: Thai yaksha and singha, Chinese ridge beasts, Japanese ogre tiles, Kala faces.", "ผู้เฝ้าประตูและสันหลังคาที่อื่น: ยักษ์และสิงห์ของไทย สัตว์บนสันหลังคาจีน กระเบื้องหน้ายักษ์ญี่ปุ่น หน้ากาล"))],

    "throw_h": ("Throw it clear", "พ่นให้พ้นกำแพง"),
    "throw_lede": ("Water that runs down a wall washes out the mortar between the stones. A gargoyle sticks out so the water falls free. Make the spout longer or shorter, make it rain harder, and watch where the water lands.",
                   "น้ำที่ไหลลงตามกำแพงจะชะปูนระหว่างก้อนหินออกไป การ์กอยล์ยื่นออกมาให้น้ำตกลงไปไกลกำแพง ลองทำรางให้ยาวหรือสั้น ให้ฝนตกหนักขึ้น แล้วดูว่าน้ำตกที่ไหน"),
    "throw_alt": ("A wall in the rain with a gargoyle throwing water clear of it", "กำแพงกลางฝน การ์กอยล์พ่นน้ำออกพ้นกำแพง"),
    "throw_len": ("Spout length", "ความยาวราง"), "throw_rain": ("Rain", "ฝน"),
    "throw_eqs": [(("water in", "น้ำเข้า"), "Q = rain × 40 m²", ("The roof gathers the rain falling on 40 square metres and sends it down one spout.", "หลังคารับฝนที่ตกบนพื้นที่ 40 ตารางเมตร แล้วส่งลงรางเดียว")),
                  (("at the lip", "ที่ปากราง"), "v = √(g·d),  d = (q²/g)^⅓", ("Water leaving the end of an open channel flows at its critical depth d. Here q is the flow per metre of a 12 cm groove.", "น้ำที่ไหลออกจากปลายรางเปิดจะไหลที่ความลึกวิกฤต d ในที่นี้ q คือปริมาณน้ำต่อความกว้างหนึ่งเมตรของร่องกว้าง 12 ซม.")),
                  (("falling", "ตกลงมา"), "x = v × √(2h/g)", ("From 10 m up, the water falls for about 1.4 seconds. In that time it drifts out x metres more.", "จากความสูง 10 เมตร น้ำตกนานราว 1.4 วินาที ระหว่างนั้นลอยออกไปอีก x เมตร"))],
    "throw_after": ("Even in a downpour the water leaves the lip slowly, well under a metre a second, and falls nearly straight down. The spout's length does most of the work, so medieval gargoyles were long. Builders also used many of them: Viollet-le-Duc wrote that splitting the roof's water into many falls left each one a thin thread that could not harm the walls. The first gargoyles appeared around 1220 at Laon; Paris used them everywhere by about 1240. In 1724 London's Building Act required downpipes on new houses.",
                    "แม้ฝนตกหนัก น้ำก็ออกจากปากรางช้า ไม่ถึงเมตรต่อวินาที แล้วตกลงเกือบตรงดิ่ง ความยาวของรางจึงทำงานเกือบทั้งหมด การ์กอยล์ยุคกลางจึงยาว ช่างยังใช้หลายตัวด้วย วียอเลอดุกเขียนว่าการแบ่งน้ำจากหลังคาออกเป็นหลายสาย ทำให้แต่ละสายเหลือแค่เส้นบาง ๆ ที่ทำร้ายกำแพงไม่ได้ การ์กอยล์ตัวแรก ๆ ปรากฏราวปี 1220 ที่เมืองลาออง ปารีสใช้ทั่วไปราวปี 1240 ปี 1724 กฎหมายอาคารของลอนดอนกำหนดให้บ้านใหม่ใช้ท่อน้ำฝน"),

    "rouen_h": ("La Gargouille", "ลา การ์กุย"),
    "rouen_lede": ("Rouen, in Normandy, tells where the first gargoyle came from. Step through the story.", "เมืองรูอ็องในแคว้นนอร์มังดีเล่าว่าการ์กอยล์ตัวแรกมาจากไหน กดดูเรื่องทีละตอน"),
    "rouen_alt": ("The legend of the dragon of Rouen, drawn in five scenes", "ตำนานมังกรแห่งรูอ็อง วาดเป็นห้าฉาก"),
    "rouen_after": ("Romanus was bishop of Rouen in the 630s; the dragon first appears in writing in 1394. From about the 12th century until 1790, the chapter of Rouen freed one condemned prisoner every Ascension Day, the privilège de saint Romain, in memory of the man who went with him.",
                    "โรมานุสเป็นบิชอปแห่งรูอ็องในทศวรรษ 630 แต่มังกรเพิ่งปรากฏในบันทึกปี 1394 ตั้งแต่ราวศตวรรษที่ 12 จนถึงปี 1790 คณะนักบวชแห่งรูอ็องปล่อยนักโทษประหารหนึ่งคนทุกวันเสด็จขึ้นสวรรค์ เรียกว่า สิทธิพิเศษของนักบุญโรแม็ง เพื่อระลึกถึงชายที่ไปกับเขา"),

    "world_h": ("Around the world", "ทั่วโลก"),
    "world_lede": ("Wherever people built roofs that shed rain or doors worth guarding, carved creatures moved in. The pins show rain falling there right now. Tap a pin, then tap any drawing.",
                   "ที่ไหนที่ผู้คนสร้างหลังคาที่ต้องระบายน้ำฝน หรือประตูที่ต้องมีผู้เฝ้า สัตว์แกะสลักก็ย้ายเข้าไปอยู่ หมุดบอกว่าตอนนี้ฝนตกอยู่ที่ไหน แตะหมุด แล้วแตะรูปไหนก็ได้"),
    "map_alt": ("A world map with a pin for each gargoyle and guardian", "แผนที่โลก มีหมุดของการ์กอยล์และผู้เฝ้าแต่ละตัว"),
    "map_pick": ("Tap a pin.", "แตะหมุด"),
    "spouts": ("spouts water", "พ่นน้ำ"), "dry": ("stays dry", "ไม่พ่นน้ำ"),

    "forbidden_h": ("A thousand dragons", "มังกรพันตัว"),
    "forbidden_lede": ("The three great halls of the Forbidden City stand on a three-tier terrace of white marble, 8.13 metres high. Under the balustrades sit dragon heads with a hole through each mouth: 1,142 of them, by the Palace Museum's count. In a heavy storm all of them spout at once.",
                       "ท้องพระโรงใหญ่สามหลังของพระราชวังต้องห้ามตั้งอยู่บนฐานหินอ่อนขาวสามชั้น สูง 8.13 เมตร ใต้ราวหินมีหัวมังกรที่ปากเจาะเป็นรู 1,142 หัว ตามที่พิพิธภัณฑ์พระราชวังนับไว้ เมื่อพายุหนัก ทุกหัวพ่นน้ำพร้อมกัน"),
    "forbidden_alt": ("The marble terraces of the Hall of Supreme Harmony with dragon-head spouts pouring rain", "ฐานหินอ่อนของพระที่นั่งไท่เหอ หัวมังกรพ่นน้ำฝน"),
    "forbidden_wet_static": ("Rain on the terraces: the dragons are spitting.", "ฝนตกบนฐาน มังกรกำลังพ่นน้ำ"),
    "forbidden_after": ("People in Beijing call it 千龙吐水, a thousand dragons spitting water. Each head is a chi, a hornless dragon, one of the dragon's nine sons, said to hold great quantities of water in its belly. The terrace slopes outward a little so the rain finds the mouths. Across town, the Temple of Heaven's three tiers carry 99 spouts each: clouds on the lowest, phoenixes in the middle, dragons on top.",
                        "ชาวปักกิ่งเรียกภาพนี้ว่า 千龙吐水 (เชียนหลงถู่สุ่ย) มังกรพันตัวพ่นน้ำ แต่ละหัวคือ ชือ มังกรไร้เขา หนึ่งในโอรสเก้าองค์ของมังกร เชื่อว่าท้องของมันจุน้ำได้มหาศาล ลานลาดออกด้านนอกเล็กน้อยให้น้ำฝนไหลไปหาปาก ส่วนที่หอฟ้าเทียนถาน ฐานสามชั้นมีหัวพ่นน้ำชั้นละ 99 หัว ชั้นล่างเป็นเมฆ ชั้นกลางเป็นหงส์ ชั้นบนเป็นมังกร"),

    "kirti_h": ("The face that ate itself", "หน้าที่กินตัวเอง"),
    "kirti_lede": ("A Hindu story, as Heinrich Zimmer retold it: the demon Rahu came to make a demand of Shiva. Shiva opened his third eye and a lion-headed creature sprang out, starving. Rahu begged for mercy and was spared, which left the creature nothing to eat, so Shiva told it to eat itself. It ate from the tail up until only the face was left. Shiva named it Kirtimukha, face of glory, and set it over the doors of temples.",
                   "ตำนานฮินดูที่ไฮน์ริช ซิมเมอร์เล่าไว้: อสูรราหูมาเรียกร้องสิ่งหนึ่งจากพระศิวะ พระศิวะเปิดพระเนตรที่สาม สัตว์หัวสิงห์ตัวหนึ่งกระโจนออกมาด้วยความหิว ราหูขอชีวิตและได้รับการไว้ชีวิต สัตว์ตัวนั้นจึงไม่มีอะไรกิน พระศิวะบอกให้มันกินตัวเอง มันกินจากหางขึ้นมาจนเหลือแต่หน้า พระศิวะตั้งชื่อให้ว่า กีรติมุข แปลว่าหน้าแห่งเกียรติ แล้วให้อยู่เหนือประตูเทวาลัย"),
    "kirti_alt": ("A lion-like creature eating its own body until only its face remains", "สัตว์คล้ายสิงห์กินตัวเองจนเหลือแต่หน้า"),
    "kirti_eat": ("Eaten", "กินไปแล้ว"), "kirti_play": ("Let it eat", "ปล่อยให้กิน"),
    "kirti_after": ("The same face travelled east with Hindu and Buddhist builders. On Khmer lintels it is Kala, all-devouring time: a great upper jaw, no lower jaw, garlands and vines pouring from its mouth. In Thai it is หน้ากาล, na kan, the one who swallows everything, even itself. On Java the Kala head glares over temple doors with bulging eyes and curved fangs.",
                    "หน้าเดียวกันนี้เดินทางไปทางตะวันออกกับช่างฮินดูและพุทธ บนทับหลังขอมคือ กาล เวลาที่กลืนกินทุกสิ่ง ขากรรไกรบนใหญ่ ไม่มีขากรรไกรล่าง มีพวงมาลัยและเถาไม้ไหลออกจากปาก ภาษาไทยเรียกว่า หน้ากาล ผู้กลืนทุกอย่าง แม้กระทั่งตัวเอง ที่ชวา หัวกาละถลึงตาโปนและเขี้ยวโค้งอยู่เหนือประตูวิหาร"),

    "hiti_h": ("Water from a stone", "น้ำจากหิน"),
    "hiti_lede": ("In the Kathmandu Valley, carved stone spouts called hiti (in Newar) or dhunge dhara (in Nepali, stone faucet) sit at the bottom of stepped pits, fed from underground. Patan's Manga Hiti, built in 570, still runs; its water serves the Krishna Mandir every day. Press and hold to fill a pot.",
                  "ในหุบเขากาฐมาณฑุ ก๊อกหินแกะสลักที่เรียกว่า หิติ (ภาษาเนวาร์) หรือ ดุงเก ดารา (ภาษาเนปาล แปลว่าก๊อกหิน) อยู่ก้นบ่อขั้นบันได รับน้ำจากใต้ดิน มังคะหิติในเมืองปาฏัน สร้างปี 570 ยังมีน้ำไหล และใช้เป็นน้ำศักดิ์สิทธิ์ของวัดกฤษณะทุกวัน กดค้างไว้เพื่อรองน้ำใส่หม้อ"),
    "hiti_alt": ("A sunken stone water spout court in Patan with makara spouts and a brass pot", "ลานก๊อกหินในเมืองปาฏัน หัวมกรพ่นน้ำ มีหม้อทองเหลือง"),
    "hiti_start": ("Press and hold the picture.", "กดค้างที่ภาพ"),
    "hiti_after": ("Most spouts are a makara: a crocodile's snout, an elephant's trunk, a boar's tusks and ears, a peacock's tail, its body forming the open channel. In a 2019 survey, 224 of the valley's spouts on record still gave water. A European gargoyle throws water away from a building; a hiti brings it to people.",
                   "ก๊อกส่วนใหญ่เป็นมกร ปากจระเข้ งวงช้าง เขี้ยวและหูหมูป่า หางนกยูง ลำตัวเป็นรางเปิด การสำรวจปี 2019 พบว่าก๊อกที่มีบันทึกในหุบเขายังมีน้ำไหล 224 แห่ง การ์กอยล์ในยุโรปพ่นน้ำออกให้ห่างจากอาคาร แต่หิตินำน้ำมาให้คน"),

    "carve_h": ("Carve one", "สกัดสักตัว"),
    "carve_lede": ("Every gargoyle was a block of stone first. Pick one and chip it out. Sound on for the chisel.", "การ์กอยล์ทุกตัวเคยเป็นก้อนหินมาก่อน เลือกหนึ่งตัวแล้วสกัดออกมา เปิดเสียงเพื่อฟังเสียงสิ่ว"),
    "carve_alt": ("A block of limestone being chipped away to show a gargoyle inside", "ก้อนหินปูนกำลังถูกสกัดจนเห็นการ์กอยล์ข้างใน"),
    "carve_pick": [("notre", ("Notre-Dame", "นอเทรอดาม")), ("chishou", ("Beijing dragon", "มังกรปักกิ่ง")), ("makara", ("Makara", "มกร")), ("singha", ("Singha", "สิงห์")), ("greenman", ("Green Man", "กรีนแมน"))],
    "carve_after": ("At Gloucester Cathedral the master mason first models the figure full size in clay, and the masons copy it into the stone with a pointing machine, then by eye. A trough is cut along the back so the water leaves by the mouth. Each of Paisley Abbey's twelve new gargoyles took about four weeks; one grotesque at York Minster took fourteen.",
                    "ที่มหาวิหารกลอสเตอร์ ช่างหินใหญ่ปั้นรูปด้วยดินเหนียวขนาดเท่าจริงก่อน แล้วช่างคนอื่นถ่ายแบบลงหินด้วยเครื่องวัดจุด จากนั้นใช้สายตา ร่องน้ำสกัดไปตามหลังให้น้ำออกทางปาก การ์กอยล์ใหม่สิบสองตัวของเพสลีย์แอบบีย์ใช้เวลาตัวละราวสี่สัปดาห์ ส่วนตัวประหลาดตัวหนึ่งที่มหาวิหารยอร์กใช้สิบสี่สัปดาห์"),

    "hunt_h": ("Find the astronaut", "หานักบินอวกาศ"),
    "hunt_lede": ("In 1992 the Puerta de Ramos of Salamanca's New Cathedral was restored for the next year's Las Edades del Hombre exhibition, and the stonemason Miguel Romero carved a few things of his own time among the old ones: an astronaut, and nearby a smiling dragon with a three-scoop ice cream. Find both.",
                  "ปี 1992 ประตูปูเอร์ตาเดรามอสของมหาวิหารใหม่ซาลามังกาได้รับการบูรณะเพื่องานนิทรรศการลาสเอดาเดสเดลอมเบรในปีถัดมา ช่างหิน มิเกล โรเมโร แกะของจากยุคของเขาไว้ในงานเก่า: นักบินอวกาศ และใกล้ ๆ กันคือมังกรยิ้มถือไอศกรีมสามลูก หาให้เจอทั้งสองตัว"),
    "hunt_alt": ("The carved arches of a cathedral doorway, hiding an astronaut and a dragon with an ice cream", "ซุ้มโค้งแกะสลักของประตูมหาวิหาร ซ่อนนักบินอวกาศกับมังกรถือไอศกรีม"),
    "hunt_start": ("Tap the carving you think it is.", "แตะรูปแกะที่คิดว่าใช่"),

    "stories_h": ("Stories", "เรื่องเล่า"),
    "words_h": ("Its names", "ชื่อของมัน"),
    "words_lede": ("Most languages name it for the water. English and French name it for the throat.", "ภาษาส่วนใหญ่ตั้งชื่อตามน้ำ ภาษาอังกฤษกับฝรั่งเศสตั้งตามลำคอ"),
    "sources_h": ("Sources", "แหล่งข้อมูล"), "made_h": ("Made with", "ทำด้วย"),
    "licence": ("Text and drawings CC BY 4.0, credit NaNoBotCo. Code MIT. Photographs keep the licences listed with them.", "ข้อความและภาพวาด CC BY 4.0 ให้เครดิต NaNoBotCo โค้ด MIT ภาพถ่ายใช้สัญญาอนุญาตตามที่ระบุไว้กับแต่ละภาพ"),
    "footer": ("Gargoyles, Drawn · การ์กอยล์ วาดด้วยคณิต", "การ์กอยล์ วาดด้วยคณิต · Gargoyles, Drawn"),
}

# strings app.js needs
T_JS = {
    "now_dry": ("In Paris it is {time}, {temp} and dry. The gargoyles are resting. Tap the sky to make it rain.", "ที่ปารีสตอนนี้ {time} {temp} อากาศแห้ง การ์กอยล์กำลังพัก แตะฟ้าให้ฝนตก"),
    "now_rain": ("In Paris it is {time}, {temp} and raining. The gargoyles are spouting.", "ที่ปารีสตอนนี้ {time} {temp} ฝนกำลังตก การ์กอยล์กำลังพ่นน้ำ"),
    "now_dry_set": ("Paris at {time}.", "ปารีส เวลา {time}"),
    "now_rain_set": ("Paris at {time}, in the rain.", "ปารีส เวลา {time} กลางฝน"),
    "sort_ask": ("Does it carry water?", "มันนำน้ำไหม?"),
    "sort_right": ("Right.", "ถูก"), "sort_wrong": ("Not this one.", "ตัวนี้ไม่ใช่"),
    "sort_score": ("{n} right of {of}", "ถูก {n} จาก {of}"),
    "throw_dry": ("No rain, no water. Slide the rain up.", "ไม่มีฝน ก็ไม่มีน้ำ เลื่อนฝนขึ้น"),
    "throw_wet": ("{l} litres a second, and the spout is too short: the water clings to the stone and runs down the wall.", "{l} ลิตรต่อวินาที รางสั้นเกินไป น้ำเกาะหินแล้วไหลลงตามกำแพง"),
    "throw_out": ("{l} litres a second leave the lip at {v} m/s, {d} cm deep. Falling 10 m, the water drifts {x} m further out and lands {land} m from the wall.",
                  "น้ำ {l} ลิตรต่อวินาที ออกจากปากรางที่ {v} ม./วินาที ลึก {d} ซม. ตกลงมา 10 เมตร ลอยออกไปอีก {x} เมตร ลงพื้นห่างกำแพง {land} เมตร"),
    "rouen_0": ("1 · A dragon called La Gargouille lived in the marshes on the left bank of the Seine near Rouen, eating people and animals.", "1 · มังกรชื่อ ลา การ์กุย อาศัยในบึงริมฝั่งซ้ายของแม่น้ำแซนใกล้เมืองรูอ็อง กินทั้งคนและสัตว์"),
    "rouen_1": ("2 · Bishop Romanus went out to face it. The only one willing to go with him was a man condemned to death, who had nothing to lose.", "2 · บิชอปโรมานุสออกไปเผชิญหน้ากับมัน คนเดียวที่ยอมไปด้วยคือนักโทษประหาร ผู้ไม่มีอะไรจะเสีย"),
    "rouen_2": ("3 · Romanus made the sign of the cross. The dragon lay down, and he put his stole around its neck and led it into town like a dog on a leash.", "3 · โรมานุสทำสำคัญมหากางเขน มังกรหมอบลง เขาคล้องผ้าสโตลไว้ที่คอมัน แล้วจูงเข้าเมืองเหมือนจูงสุนัข"),
    "rouen_3": ("4 · It was burned in the square before the cathedral. The body burned; the head and neck, tempered by its own fiery breath, would not.", "4 · ชาวเมืองเผามันที่ลานหน้ามหาวิหาร ตัวไหม้ แต่หัวกับคอซึ่งผ่านลมหายใจไฟของมันเองมาแล้ว ไม่ยอมไหม้"),
    "rouen_4": ("5 · So the head was set on the cathedral wall to ward off evil spirits. In this telling, it was the first gargoyle.", "5 · ชาวเมืองจึงติดหัวไว้บนกำแพงมหาวิหาร เพื่อขับไล่วิญญาณร้าย ในตำนานฉบับนี้ นี่คือการ์กอยล์ตัวแรก"),
    "kirti_start": ("Slide it, or let it eat.", "เลื่อนดู หรือปล่อยให้มันกิน"),
    "kirti_mid": ("It eats from the tail up.", "มันกินจากหางขึ้นมา"),
    "kirti_done": ("Only the face is left: Kirtimukha, face of glory.", "เหลือแต่หน้า: กีรติมุข หน้าแห่งเกียรติ"),
    "forbidden_wet": ("Rain on the terraces: the dragons are spitting.", "ฝนตกบนฐาน มังกรกำลังพ่นน้ำ"),
    "forbidden_dry": ("Dry: 1,142 dragons waiting for a storm.", "แห้ง มังกร 1,142 ตัวรอพายุ"),
    "hiti_full": ("Full. {n} pots filled.", "เต็มแล้ว รองน้ำได้ {n} หม้อ"),
    "carve_start": ("Drag across the block to chip it away.", "ลากนิ้วบนก้อนหินเพื่อสกัด"),
    "carve_mid": ("{p}% cut away.", "สกัดออกไปแล้ว {p}%"),
    "carve_done": ("Out it comes. Tap it.", "ออกมาแล้ว แตะมันดู"),
    "hunt_astro": ("The astronaut, carved in 1992.", "นักบินอวกาศ แกะเมื่อปี 1992"),
    "hunt_ice": ("The dragon with an ice cream.", "มังกรกับไอศกรีม"),
    "hunt_both": ("Both found.", "เจอครบทั้งสอง"),
    "hunt_miss": ("Not that one. Found {n} of 2.", "ไม่ใช่ตัวนั้น เจอแล้ว {n} จาก 2"),
    "map_wet": ("Raining now at: {list}.", "ฝนกำลังตกที่: {list}"),
    "map_dry": ("No rain at any pin right now.", "ตอนนี้ไม่มีฝนที่หมุดไหนเลย"),
    "map_more": ("See the drawing", "ดูภาพวาด"),
    "raining": ("raining", "ฝนตก"),
    "photo": ("Photo", "ภาพถ่าย"), "drawn": ("Drawn", "ภาพวาด"),
}

# region, beasts. place = full line under the name; short = the map's label
BEASTS = [
    (("Europe", "ยุโรป"), [
        dict(id="notre", spout=True, lat=48.853, lon=2.3499,
             name=("Notre-Dame gargoyle", "การ์กอยล์นอเทรอดาม"), place=("Notre-Dame de Paris, France · about 1240", "นอเทรอดามแห่งปารีส ฝรั่งเศส · ราวปี 1240"), short=("Paris", "ปารีส"),
             line=("A drain with a body. Rain runs along a groove in its back and leaves by the mouth, clear of the wall.", "รางน้ำที่มีตัว น้ำฝนไหลไปตามร่องบนหลัง แล้วออกทางปาก พ้นกำแพง")),
        dict(id="stryge", spout=False,
             name=("Le Stryge", "เลอ สตริจ"), place=("Galerie des Chimères, Notre-Dame · 1850s", "ระเบียงคิเมียร่า นอเทรอดาม · ทศวรรษ 1850"), short=("Paris", "ปารีส"),
             line=("A chimera, not a gargoyle: it carries no water. Viollet-le-Duc designed it for the 19th-century restoration.", "คิเมียร่า ไม่ใช่การ์กอยล์ เพราะไม่ได้นำน้ำ วียอเลอดุกออกแบบไว้ตอนบูรณะในศตวรรษที่ 19")),
        dict(id="lionGreek", spout=True, lat=37.638, lon=21.630,
             name=("Greek lion-head spout", "หัวสิงโตพ่นน้ำแบบกรีก"), place=("Temple of Zeus, Olympia, Greece · about 470–456 BC", "วิหารซูส โอลิมเปีย กรีซ · ราว 470–456 ปีก่อน ค.ศ."), short=("Olympia", "โอลิมเปีย"),
             line=("102 lion heads lined the marble roof gutter, the sima; 39 survive. Vitruvius says only the heads over the columns were bored through.", "หัวสิงโต 102 หัวเรียงตามรางหินอ่อนบนขอบหลังคาที่เรียกว่า ซิมา เหลืออยู่ 39 หัว วิทรูเวียสบอกว่าเจาะรูเฉพาะหัวที่อยู่เหนือเสา")),
        dict(id="greenman", spout=False,
             name=("Green Man", "กรีนแมน"), place=("church roofs and capitals across Europe", "หลังคาและหัวเสาโบสถ์ทั่วยุโรป"), short=("Europe", "ยุโรป"),
             line=("A face made of leaves, vines growing from its mouth. It reached England from France in the 1100s; the name Green Man dates from 1939.", "หน้าที่ทำจากใบไม้ มีเถาไม้งอกออกจากปาก เข้ามาอังกฤษจากฝรั่งเศสในศตวรรษที่ 12 ส่วนชื่อ กรีนแมน เพิ่งตั้งในปี 1939")),
        dict(id="astronaut", spout=False, lat=40.9603, lon=-5.6668,
             name=("The Salamanca astronaut", "นักบินอวกาศแห่งซาลามังกา"), place=("New Cathedral, Salamanca, Spain · 1992", "มหาวิหารใหม่ ซาลามังกา สเปน · 1992"), short=("Salamanca", "ซาลามังกา"),
             line=("Carved by the stonemason Miguel Romero in 1992, when the north door was restored, among the old foliage.", "ช่างหิน มิเกล โรเมโร แกะไว้ในปี 1992 ตอนบูรณะประตูด้านเหนือ ซ่อนอยู่ในลายใบไม้เก่า")),
    ]),
    (("Africa", "แอฟริกา"), [
        dict(id="lionEgypt", spout=True, lat=26.1418, lon=32.6703,
             name=("Dendera lion spout", "สิงโตพ่นน้ำแห่งเดนเดรา"), place=("Temple of Hathor, Dendera, Egypt", "วิหารฮาธอร์ เดนเดรา อียิปต์"), short=("Dendera", "เดนเดรา"),
             line=("Rain is rare in Upper Egypt, but the temple roofs at Dendera and Edfu still shed it through lions' mouths.", "อียิปต์ตอนบนฝนตกน้อย แต่หลังคาวิหารที่เดนเดราและเอ็ดฟูก็ยังระบายน้ำฝนออกทางปากสิงโต")),
    ]),
    (("Asia", "เอเชีย"), [
        dict(id="chishou", spout=True, lat=39.9163, lon=116.3972,
             name=("Dragon-head spouts", "หัวมังกรพ่นน้ำ"), place=("Forbidden City, Beijing · 1400s", "พระราชวังต้องห้าม ปักกิ่ง · ศตวรรษที่ 15"), short=("Beijing", "ปักกิ่ง"),
             line=("A hornless dragon head under every marble baluster post, a hole through its mouth.", "หัวมังกรไร้เขาใต้เสาราวหินอ่อนทุกต้น ปากเจาะเป็นรู")),
        dict(id="chiwen", spout=False,
             name=("Chiwen ridge beast", "ชือเหวิ่น สัตว์ปลายสันหลังคา"), place=("palace and temple roofs, China", "หลังคาพระราชวังและวัด จีน"), short=("Beijing", "ปักกิ่ง"),
             line=("It bites the end of the roof ridge, a charm against fire. The one on the Hall of Supreme Harmony stands 3.4 m and weighs about 4.3 tonnes. Legend says the sword in its back pins it there.", "มันงับปลายสันหลังคา เป็นเครื่องรางกันไฟ ตัวบนพระที่นั่งไท่เหอสูง 3.4 เมตร หนักราว 4.3 ตัน ตำนานเล่าว่าดาบที่ปักหลังตรึงมันไว้ไม่ให้หนี")),
        dict(id="onigawara", spout=False, lat=34.689, lon=135.8398,
             name=("Onigawara", "โอนิงาวาระ"), place=("temple and castle roofs, Japan", "หลังคาวัดและปราสาท ญี่ปุ่น"), short=("Nara", "นาระ"),
             line=("An ogre's face on the tile at the end of a ridge, to keep misfortune off the roof.", "หน้ายักษ์บนกระเบื้องปลายสันหลังคา กันเคราะห์ร้ายไม่ให้ขึ้นหลังคา")),
        dict(id="shachi", spout=False, lat=35.1856, lon=136.8991,
             name=("Golden shachihoko", "ชาจิโฮโกะทองคำ"), place=("Nagoya Castle, Japan", "ปราสาทนาโงยะ ญี่ปุ่น"), short=("Nagoya", "นาโงยะ"),
             line=("A tiger's head on a carp's body, tail in the air; said to swallow great quantities of water and control the rain, so it guards against fire.", "หัวเสือบนตัวปลาคาร์ป หางชี้ฟ้า เชื่อกันว่ากลืนน้ำได้มหาศาลและควบคุมฝน จึงเป็นเครื่องรางกันไฟ")),
        dict(id="makara", spout=True, lat=27.6727, lon=85.3253,
             name=("Makara spout", "ก๊อกหินมกร"), place=("Manga Hiti, Patan, Nepal", "มังคะหิติ ปาฏัน เนปาล"), short=("Patan", "ปาฏัน"),
             line=("A stone spout at the bottom of a sunken court, running with water from the hills.", "ก๊อกหินที่ก้นลานลึก มีน้ำจากเนินเขาไหลออกมา")),
        dict(id="makara", variant="borobudur", spout=True, lat=-7.6079, lon=110.2038,
             name=("Borobudur spout", "ปากน้ำบุโรพุทโธ"), place=("Borobudur, Java, Indonesia · 800s", "บุโรพุทโธ ชวา อินโดนีเซีย · ศตวรรษที่ 9"), short=("Borobudur", "บุโรพุทโธ"),
             line=("100 spouts at the corners of the terraces, each a giant or a makara, carry off the tropical rain.", "ปากน้ำ 100 ปากที่มุมลานแต่ละชั้น แต่ละปากเป็นยักษ์หรือมกร ระบายฝนเมืองร้อนออกไป")),
        dict(id="kala", spout=False, lat=13.2130, lon=75.9940,
             name=("Kirtimukha", "กีรติมุข"), place=("over temple doors, India", "เหนือประตูเทวาลัย อินเดีย"), short=("Halebidu", "หเลพีฑุ"),
             line=("The face that ate itself, guarding the door with no body and no lower jaw.", "หน้าที่กินตัวเอง เฝ้าประตูโดยไม่มีตัวและไม่มีขากรรไกรล่าง")),
        dict(id="kala", variant="khmer", spout=False, lat=13.5990, lon=103.9629,
             name=("Kala", "หน้ากาล"), place=("Khmer lintels, Cambodia and Thailand", "ทับหลังขอม กัมพูชาและไทย"), short=("Angkor", "อังกอร์"),
             line=("The same face in Khmer sandstone, holding garlands that pour from its mouth.", "หน้าเดียวกันในหินทรายขอม ถือพวงมาลัยที่ไหลออกจากปาก")),
        dict(id="yaksha", spout=False, lat=13.7437, lon=100.4889,
             name=("Yaksha guardian", "ยักษ์ทวารบาล"), place=("Wat Arun and Wat Phra Kaew, Bangkok", "วัดอรุณฯ และวัดพระแก้ว กรุงเทพฯ"), short=("Bangkok", "กรุงเทพฯ"),
             line=("Twelve giants from the Ramakien, each about 5 m tall, guard Wat Phra Kaew's gates. At Wat Arun, green Thotsakan and white Sahatsadecha guard the ordination hall.", "ยักษ์สิบสองตนจากรามเกียรติ์ สูงตนละราว 5 เมตร เฝ้าประตูวัดพระแก้ว ที่วัดอรุณฯ ทศกัณฐ์ตัวเขียวกับสหัสเดชะตัวขาวเฝ้าพระอุโบสถ")),
        dict(id="singha", spout=False, lat=18.7887, lon=98.9817,
             name=("Lanna singha", "สิงห์ล้านนา"), place=("temple gates, Chiang Mai", "ประตูวัด เชียงใหม่"), short=("Chiang Mai", "เชียงใหม่"),
             line=("Lions in pairs at gates and stairways, white and gold, mouths open. The type came to Lanna by way of Burma.", "สิงห์คู่หน้าประตูและบันไดวัด ขาวและทอง อ้าปาก แบบนี้เข้ามาล้านนาผ่านทางพม่า")),
    ]),
    (("The Americas", "อเมริกา"), [
        dict(id="chaac", spout=False, lat=20.2475, lon=-89.6474,
             name=("Chaac masks", "หน้ากากชาก"), place=("Codz Poop, Kabah, Mexico", "โคดซ์ป็อป กาบาห์ เม็กซิโก"), short=("Kabah", "กาบาห์"),
             line=("The Maya rain god, hundreds of times over on one facade, his long nose curling up. The Puuc hills have no cenotes; rain was the only water.", "เทพแห่งฝนของมายา ซ้ำหลายร้อยหน้าบนผนังเดียว จมูกยาวม้วนขึ้น เนินเขาปูกไม่มีบ่อน้ำธรรมชาติ ฝนคือน้ำเพียงแหล่งเดียว")),
        dict(id="eagle", spout=False, lat=40.7516, lon=-73.9755,
             name=("Chrysler eagles", "นกอินทรีตึกไครสเลอร์"), place=("Chrysler Building, New York · 1930", "ตึกไครสเลอร์ นิวยอร์ก · 1930"), short=("New York", "นิวยอร์ก"),
             line=("Steel eagle heads at the corners of the 61st floor. People call them gargoyles; they carry no water.", "หัวนกอินทรีเหล็กที่มุมชั้น 61 คนเรียกว่าการ์กอยล์ แต่ไม่ได้นำน้ำ")),
    ]),
]

SORT_WHY = {
    "notre": ("Rain runs along its back and out of its mouth.", "น้ำฝนไหลตามหลังแล้วออกทางปาก"),
    "stryge": ("Le Stryge only watches Paris. No water goes through it.", "เลอ สตริจ แค่เฝ้ามองปารีส ไม่มีน้ำผ่านตัวมัน"),
    "lionGreek": ("The open mouth is the gutter's outlet. On some temples the heads between the columns were left solid.", "ปากที่อ้าคือทางออกของรางน้ำ บางวิหาร หัวที่อยู่ระหว่างเสาทำตัน"),
    "greenman": ("A Green Man is ornament, a face of leaves on a roof boss or a capital.", "กรีนแมนเป็นงานประดับ หน้าใบไม้บนปุ่มเพดานหรือหัวเสา"),
    "astronaut": ("A small carving in the foliage. No water.", "รูปแกะเล็ก ๆ ในลายใบไม้ ไม่มีน้ำ"),
    "lionEgypt": ("Its mouth drains the temple roof.", "ปากของมันระบายน้ำจากหลังคาวิหาร"),
    "chishou": ("Every one has a hole through its mouth for the terrace's rain.", "ทุกหัวเจาะรูทะลุปากให้น้ำฝนจากฐานออก"),
    "chiwen": ("It guards the ridge from fire; water does not pass through it.", "มันเฝ้าสันหลังคากันไฟ น้ำไม่ได้ไหลผ่านมัน"),
    "onigawara": ("A tile, not a drain.", "เป็นกระเบื้อง ไม่ใช่รางน้ำ"),
    "shachi": ("It was believed to control rain, but no water passes through it.", "เชื่อกันว่ามันควบคุมฝนได้ แต่ไม่มีน้ำผ่านตัวมัน"),
    "makara": ("A spout: water from the hills runs out of its mouth.", "เป็นก๊อก น้ำจากเนินเขาไหลออกทางปาก"),
    "makara-borobudur": ("It drains the stupa's terraces.", "มันระบายน้ำจากลานของสถูป"),
    "kala": ("A guardian face over the door.", "หน้าผู้เฝ้าเหนือประตู"),
    "kala-khmer": ("Carved on the lintel; the garlands are stone.", "แกะอยู่บนทับหลัง พวงมาลัยก็เป็นหิน"),
    "yaksha": ("A door guardian.", "ทวารบาล ผู้เฝ้าประตู"),
    "singha": ("A gate guardian.", "ผู้เฝ้าประตูวัด"),
    "chaac": ("A god's face on the wall. He sends the rain; he does not drain it.", "หน้าเทพบนผนัง เขาส่งฝนมา แต่ไม่ได้ระบายน้ำ"),
    "eagle": ("Called gargoyles, built as ornament. The water goes down pipes inside.", "ถูกเรียกว่าการ์กอยล์ แต่สร้างเป็นของประดับ น้ำลงท่อข้างใน"),
}

STORIES = [
    (("Washington, 1984–1986", "วอชิงตัน 1984–1986"), ("Darth Vader on the cathedral", "ดาร์ธ เวเดอร์ บนมหาวิหาร"),
     ("Washington National Cathedral asked children, through National Geographic World, to design a grotesque; about 1,400 entered from 16 countries. Christopher Rader, 13, drew Darth Vader and was one of three runners-up. Jay Hall Carpenter modelled it in clay and Patrick J. Plunkett carved it high on the northwest tower, where it takes binoculars to find.",
      "มหาวิหารแห่งชาติวอชิงตันชวนเด็ก ๆ ผ่านนิตยสาร National Geographic World ให้ออกแบบตัวประหลาด มีผู้ส่งราว 1,400 คนจาก 16 ประเทศ คริสโตเฟอร์ เรเดอร์ อายุ 13 ปี วาดดาร์ธ เวเดอร์ และเป็นหนึ่งในสามรองชนะเลิศ เจย์ ฮอลล์ คาร์เพนเตอร์ ปั้นแบบดินเหนียว แพทริก เจ. พลังเก็ต แกะไว้สูงบนหอด้านตะวันตกเฉียงเหนือ ต้องใช้กล้องส่องทางไกลจึงจะเห็น")),
    (("Washington, 1986", "วอชิงตัน 1986"), ("An umbrella", "ร่มหนึ่งคัน"),
     ("The grand prize went to Alison Garner, 12, for a toothy man holding an umbrella. She had read that rainwater drains out of the mouths of gargoyles, so she gave her grotesque an umbrella for protection.",
      "รางวัลใหญ่ตกเป็นของแอลิสัน การ์เนอร์ อายุ 12 ปี กับรูปชายฟันเยินถือร่ม เธออ่านมาว่าน้ำฝนไหลออกจากปากการ์กอยล์ จึงให้ตัวประหลาดของเธอถือร่มไว้กันน้ำ")),
    (("Paisley, 1990s", "เพสลีย์ ทศวรรษ 1990"), ("The alien of Paisley Abbey", "เอเลียนแห่งเพสลีย์แอบบีย์"),
     ("David Lindsay carved twelve new gargoyles for the abbey's roof, about four weeks each, every one with a channel for water and drawn from 20th-century culture. One looks like the creature from Alien. A photo of it went round the world in 2013.",
      "เดวิด ลินด์เซย์ แกะการ์กอยล์ใหม่สิบสองตัวให้หลังคาแอบบีย์ ตัวละราวสี่สัปดาห์ ทุกตัวมีร่องน้ำ และได้แรงบันดาลใจจากวัฒนธรรมศตวรรษที่ 20 ตัวหนึ่งหน้าเหมือนสัตว์ประหลาดในภาพยนตร์เรื่องเอเลียน ภาพถ่ายของมันแพร่ไปทั่วโลกในปี 2013")),
    (("Lincoln, 1250–1280", "ลินคอล์น 1250–1280"), ("The Lincoln Imp", "ภูตแห่งลินคอล์น"),
     ("A small grotesque sits high in the Angel Choir of Lincoln Cathedral. Its legend, put into verse in 1897: the devil and the wind came to the minster; the devil went in to chat with the Dean, and the wind has been waiting outside ever since.",
      "ตัวประหลาดตัวเล็กนั่งอยู่สูงในคณะนักร้องเทวดาของมหาวิหารลินคอล์น ตำนานที่แต่งเป็นกลอนในปี 1897 เล่าว่า ปีศาจกับสายลมมาที่มหาวิหาร ปีศาจเข้าไปคุยกับคณบดี ส่วนสายลมยังรออยู่ข้างนอกมาจนทุกวันนี้")),
    (("Paris, 1726", "ปารีส 1726"), ("Notre-Dame loses its gargoyles", "นอเทรอดามเสียการ์กอยล์"),
     ("Archbishop de Noailles had the roof altered and lead gutters fitted, and most of the medieval gargoyles came down. Those there today are mostly from the 19th-century restoration.",
      "อาร์ชบิชอปเดอโนอายส์ให้แก้หลังคาและติดรางตะกั่ว การ์กอยล์ยุคกลางส่วนใหญ่จึงถูกถอดลง ตัวที่เห็นทุกวันนี้ส่วนมากมาจากการบูรณะในศตวรรษที่ 19")),
    (("Paris, 1848–1856", "ปารีส 1848–1856"), ("The chimeras arrive", "คิเมียร่ามาถึง"),
     ("Viollet-le-Duc designed the chimeras of the upper gallery himself, and a team of sculptors, Victor Pyanet chief among them, carved them. They are Gothic Revival, not medieval.",
      "วียอเลอดุกออกแบบคิเมียร่าบนระเบียงชั้นบนด้วยตัวเอง แล้วทีมช่างแกะ ซึ่งมีวิกตอร์ ปียาเนต์ เป็นหัวหน้า แกะออกมา พวกมันเป็นงานฟื้นฟูกอทิก ไม่ใช่ของยุคกลาง")),
    (("New York, December 1929", "นิวยอร์ก ธันวาคม 1929"), ("On the scaffold", "บนนั่งร้าน"),
     ("Margaret Bourke-White photographed the Chrysler Building from its scaffolding and was taken with the steel eagle heads. Its ornaments are Nirosta, an 18-8 stainless steel, the first use of that steel in an American building.",
      "มาร์กาเร็ต เบิร์ก-ไวต์ ถ่ายภาพตึกไครสเลอร์จากนั่งร้าน และติดใจหัวนกอินทรีเหล็ก ของประดับบนตึกทำจากนิโรสตา เหล็กกล้าไร้สนิม 18-8 ซึ่งใช้ในอาคารอเมริกันเป็นครั้งแรก")),
    (("Bangkok, 1896", "กรุงเทพฯ 1896"), ("A spout from Borobudur", "ปากน้ำจากบุโรพุทโธ"),
     ("King Chulalongkorn of Siam took eight cartloads of sculpture from Borobudur, with the colonial government's consent: two lions, kala heads, a guardian and one waterspout among them. Some are on show in Bangkok.",
      "พระบาทสมเด็จพระจุลจอมเกล้าเจ้าอยู่หัวทรงนำประติมากรรมจากบุโรพุทโธกลับมาแปดเกวียน โดยได้รับความยินยอมจากรัฐบาลอาณานิคม ในนั้นมีสิงห์สองตัว หน้ากาล ทวารบาล และปากน้ำหนึ่งชิ้น บางชิ้นจัดแสดงอยู่ในกรุงเทพฯ")),
    (("Nagoya, 1937", "นาโงยะ 1937"), ("Missing scales", "เกล็ดหาย"),
     ("A survey on 6 January 1937 found 58 of the 110 gold scales gone from the male shachihoko. The originals burned in the air raid of 14 May 1945; the pair now on the keep went up when it was rebuilt in 1959. The male is 2.62 m tall and carries 44.69 kg of gold.",
      "การสำรวจวันที่ 6 มกราคม 1937 พบว่าเกล็ดทอง 58 จาก 110 เกล็ดหายไปจากชาจิโฮโกะตัวผู้ ตัวดั้งเดิมไหม้ในการโจมตีทางอากาศวันที่ 14 พฤษภาคม 1945 คู่ที่อยู่บนหอปราสาทตอนนี้ขึ้นไปตั้งเมื่อสร้างหอใหม่ในปี 1959 ตัวผู้สูง 2.62 เมตร มีทอง 44.69 กิโลกรัม")),
    (("Gloucester, 2020", "กลอสเตอร์ 2020"), ("A cheese roller", "นักกลิ้งชีส"),
     ("Gloucester Cathedral's six new working gargoyles show a rugby player, a jockey, a suffragette, a miner, a sheep shearer and a cheese roller.",
      "การ์กอยล์ใช้งานได้หกตัวใหม่ของมหาวิหารกลอสเตอร์ เป็นนักรักบี้ จ็อกกี้ นักเรียกร้องสิทธิสตรี คนงานเหมือง คนตัดขนแกะ และนักกลิ้งชีส")),
    (("London, 1240", "ลอนดอน 1240"), ("Downpipes, early", "ท่อน้ำฝนยุคแรก"),
     ("Lead downpipes were already in use on the Tower of London in 1240, to keep spray off its whitewashed walls.",
      "ปี 1240 หอคอยแห่งลอนดอนใช้ท่อตะกั่วระบายน้ำฝนแล้ว เพื่อไม่ให้น้ำกระเซ็นใส่กำแพงที่ทาปูนขาว")),
]

# word, lang code, language, gloss
WORDS = [
    ("gargouille", "fr", ("French", "ฝรั่งเศส"), ("from garg-, the sound of gurgling, and goule, a beast's mouth; written gargoule in 1294", "จาก garg- เสียงน้ำกลั้วคอ กับ goule ปากสัตว์ บันทึกว่า gargoule ในปี 1294")),
    ("babewyn", "enm", ("Middle English", "อังกฤษยุคกลาง"), ("from Italian babbuino, baboon: once used for gargoyles and chimeras alike", "จากคำอิตาลี babbuino แปลว่าลิงบาบูน เคยใช้เรียกทั้งการ์กอยล์และคิเมียร่า")),
    ("gárgola", "es", ("Spanish", "สเปน"), ("from the French; Spanish garganta, throat, shares the root", "มาจากภาษาฝรั่งเศส คำว่า garganta ที่แปลว่าลำคอ ก็มาจากรากเดียวกัน")),
    ("doccione", "it", ("Italian", "อิตาลี"), ("a protruding gutter", "รางน้ำที่ยื่นออกมา")),
    ("Wasserspeier", "de", ("German", "เยอรมัน"), ("water-spitter", "ผู้พ่นน้ำ")),
    ("waterspuwer", "nl", ("Dutch", "ดัตช์"), ("water-spitter", "ผู้พ่นน้ำ")),
    ("grottesca", "it", ("Italian", "อิตาลี"), ("of the cave: painting found in the buried rooms of Nero's Golden House", "แบบในถ้ำ: ภาพเขียนที่พบในห้องใต้ดินของพระราชวังทองคำของจักรพรรดิเนโร")),
    ("螭首", "zh", ("Chinese", "จีน"), ("chīshǒu, hornless-dragon head", "ชือโส่ว หัวมังกรไร้เขา")),
    ("鸱吻", "zh", ("Chinese", "จีน"), ("chīwěn, the ridge beast", "ชือเหวิ่น สัตว์บนสันหลังคา")),
    ("鬼瓦", "ja", ("Japanese", "ญี่ปุ่น"), ("onigawara, ogre tile", "โอนิงาวาระ กระเบื้องยักษ์")),
    ("鯱", "ja", ("Japanese", "ญี่ปุ่น"), ("shachi, the tiger-carp", "ชาจิ ปลาหัวเสือ")),
    ("ढुङ्गे धारा", "ne", ("Nepali", "เนปาล"), ("dhunge dhara, stone faucet", "ดุงเก ดารา ก๊อกหิน")),
    ("प्रणाल", "sa", ("Sanskrit", "สันสกฤต"), ("praṇāla, a temple's water outlet; the makara-praṇāla is India's gargoyle", "ปรณาล ทางระบายน้ำของเทวาลัย มกรปรณาลคือการ์กอยล์ของอินเดีย")),
    ("कीर्तिमुख", "sa", ("Sanskrit", "สันสกฤต"), ("kīrtimukha, face of glory", "กีรติมุข หน้าแห่งเกียรติ")),
    ("ปนาลี", "th", ("Thai", "ไทย"), ("panali, the Thai word for a gargoyle, from praṇāla", "คำไทยเรียกการ์กอยล์ มาจาก ปรณาล")),
    ("ตัวสำรอก", "th", ("Thai", "ไทย"), ("tua samrok, the one that spits out: a name for the makara", "สัตว์ที่คายของออกมา ชื่อเรียกมกร")),
    ("หน้ากาล", "th", ("Thai", "ไทย"), ("na kan, the face of Kala", "หน้าของกาล")),
]

# photographs: research/img/credits.json holds each one's author, licence and Commons page
# band key: file, kicker, head, line, class
BANDS = {
    "notre-dame": ("notre-dame-gargoyle-2.jpg", ("Notre-Dame de Paris", "นอเทรอดามแห่งปารีส"), ("A drain with teeth", "รางน้ำมีฟัน"),
                   ("Rain runs down channels on the flying buttresses, along a groove in the gargoyle's back, and out of its mouth, as far from the walls as it will go.",
                    "น้ำฝนไหลลงตามรางบนครีบค้ำยัน ไปตามร่องบนหลังการ์กอยล์ แล้วพุ่งออกทางปาก ให้ไกลจากกำแพงที่สุด"), ""),
    "stryge": ("le-stryge.jpg", ("Galerie des Chimères", "ระเบียงคิเมียร่า"), ("Le Stryge", "เลอ สตริจ"),
               ("Chin on its hands above Paris since the 1850s. It carries no water: a chimera, not a gargoyle.", "เท้าคางมองปารีสมาตั้งแต่ทศวรรษ 1850 ไม่ได้นำน้ำ จึงเป็นคิเมียร่า ไม่ใช่การ์กอยล์"), "right"),
    "forbidden": ("forbidden-chishou-row.jpg", ("Forbidden City, Beijing", "พระราชวังต้องห้าม ปักกิ่ง"), ("Waiting for a storm", "รอพายุ"),
                  ("Marble chi heads under the terrace of the Hall of Supreme Harmony.", "หัวมังกรชือหินอ่อนใต้ฐานพระที่นั่งไท่เหอ"), "right"),
    "hiti": ("patan-hiti-flowing.jpg", ("Manga Hiti, Patan", "มังคะหิติ ปาฏัน"), ("Still running", "น้ำยังไหล"),
             ("Built in 570. People still come to drink, wash and fill their pots.", "สร้างปี 570 ผู้คนยังมาดื่ม ล้าง และรองน้ำใส่หม้อ"), ""),
}

# the photograph behind each bestiary card (Drawn | Photo)
PHOTOS = {"notre": "notre-dame-gargoyle-1.jpg", "stryge": "le-stryge.jpg", "lionGreek": "greek-lion-sima.jpg", "greenman": "green-man-norwich.jpg",
          "astronaut": "salamanca-astronaut.jpg", "lionEgypt": "dendera-lion-spout.jpg", "chishou": "forbidden-chishou-closeup.jpg",
          "chiwen": "forbidden-chiwen.jpg", "onigawara": "onigawara.jpg", "shachi": "nagoya-shachihoko.jpg", "makara": "patan-hiti-makara.jpg",
          "makara-borobudur": "borobudur-jaladwara.jpg", "kala": "kala-panataran.jpg", "yaksha": "wat-arun-yaksha.jpg", "singha": "lanna-singha.jpg",
          "chaac": "kabah-chaac.jpg", "eagle": "chrysler-eagle.jpg"}
# a photograph beside a story, by the story's heading
STORY_PHOTOS = {"Darth Vader on the cathedral": "national-cathedral-grotesque.jpg", "The alien of Paisley Abbey": "paisley-xenomorph.jpg",
                "The Lincoln Imp": "lincoln-imp.jpg", "Notre-Dame loses its gargoyles": "notre-dame-gargoyle-1.jpg",
                "On the scaffold": "chrysler-eagle.jpg", "A spout from Borobudur": "borobudur-jaladwara.jpg", "Missing scales": "nagoya-shachihoko.jpg"}
# photographs that sit inside a section: section, file, caption
FIGS = {"throw": ("gargoyle-rain-kaaks.jpg", ("A home-made gargoyle on a rain gutter in Germany, in a downpour.", "การ์กอยล์ทำเองบนรางน้ำฝนในเยอรมนี กลางฝนหนัก")),
        "rouen": ("rouen-gargouille-procession.jpg", ("Clément Boulanger's painting of the procession of the Gargouille in Rouen.", "ภาพเขียนขบวนแห่การ์กุยในรูอ็องของเกลมองต์ บูลองเฌ")),
        "words": ("grottesche-loggia.jpg", ("Grottesche painted by Raphael's workshop in the Vatican Loggia.", "ลายกรอเทสก์ที่ทีมของราฟาเอลวาดในระเบียงวาติกัน")),
        "rain": ("dubrovnik-mascaron-rain.jpg", ("A stone face on the Church of St Blaise in Dubrovnik, with rain running from its mouth.", "หน้าหินบนโบสถ์นักบุญเบลส ดูบรอฟนิก น้ำฝนไหลออกจากปาก"))}

SOURCES = [
    ("Open-Meteo weather API", "https://open-meteo.com/"),
    ("Natural Earth", "https://www.naturalearthdata.com/"),
]

MADE = [
    ("Open-Meteo", "CC BY 4.0", ("the weather at every pin and over Paris", "สภาพอากาศที่หมุดทุกตัวและเหนือปารีส")),
    ("Natural Earth", "public domain", ("the land on the map", "แผ่นดินบนแผนที่")),
    ("Wikimedia Commons", "CC BY, CC BY-SA, public domain", ("the photographs", "ภาพถ่าย")),
]
