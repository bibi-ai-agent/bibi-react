import { sb } from './src/lib/supabase.js'

const stories = [
  {
    genre: 'masal',
    age_group: 'young',
    title: 'Uyuyan Ormanın Sırrı',
    paragraphs: [
      'Küçük Ela sabahları her zaman pencereden ormana bakardı. Orman onun için büyülü bir yerdi; içinde ne olduğunu merak ederdi. Bir gün annesi ona "Orman uyuyor, kimse onu uyandıramıyor" dedi.',
      'Ela o gün öğleden sonra cesaret edip ormanın kapısına yürüdü. Ağaçların arasından tatlı bir ses geliyordu, sanki biri fısıldıyordu. Ela daha da yaklaştı ve parlak altın bir ışık gördü.',
      'Işık bir ağacın arkasından süzülüyordu, çok güzeldi. Ela yavaş yavaş ilerleyerek ışığın kaynağına baktı. Orada minik, kanatlı, gözleri yıldız gibi parlayan bir peri duruyordu.',
      'Peri Ela\'ya gülümsedi ve "Hoş geldin, seni bekliyordum" dedi. Ela şaşırdı ama korkmadı, çünkü perinin yüzü çok içten görünüyordu. "Beni mi bekliyordun?" diye sordu Ela.',
      'Peri başını salladı ve "Evet, yüz yıldır cesur bir çocuk bekliyordum" dedi. "Bu orman çok eski bir büyüyle uyutuldu, onu sadece temiz kalpli bir çocuğun şarkısı uyandırabilir." Ela\'nın kalbi hızlı atmaya başladı.',
      'Ela içinden en güzel şarkısını düşündü. Annesinin her gece söylediği ninniyi hatırladı. O ninnide çiçekler, kuşlar ve yağmur vardı.',
      '"Şarkı söyleyebilir misin?" diye sordu peri. Ela derin bir nefes aldı ve gözlerini kapadı. Sesi ormanın içine doğru yayılmaya başladı.',
      'İlk notada bir çiçek topraktan fırladı. İkinci notada bir kuş gözlerini açıp şakımaya başladı. Ela\'nın sesi güçlendikçe orman canlanıyordu.',
      'Ağaçların yaprakları titredi ve yeşil bir ışımaya büründü. Küçük sincaplar yuvaların dan fırladı, tavşanlar çimlerin arasında zıplamaya başladı. Her yer hayatla dolup taşıyordu.',
      'Ela şarkısını bitirdiğinde gözlerini açtı ve ağzı bir karış açık kaldı. Orman artık bambaşkaydı; her yer renk renk çiçeklerle, ışıl ışıl ağaçlarla ve neşeli hayvanlarla doluydu.',
      'Peri Ela\'nın elini tuttu ve "Teşekkür ederim, küçük kahraman" dedi. "Senin sesin yüz yıllık uykuyu bitirdi." Ela\'nın gözleri sevinçle doldu.',
      'Ormanın tüm hayvanları Ela\'nın etrafında toplandı. Sincaplar ona meşe palamudu getirdi, kuşlar etrafında uçuştu, kelebekler omzuna kondu. Ela hiç bu kadar mutlu olmamıştı.',
      '"Bu orman artık senin arkadaşın" dedi peri. "Ne zaman gelirsen seni sevgiyle karşılayacak." Ela güldü ve etrafına döndü.',
      'Akşam eve dönerken Ela\'nın kalbinde sıcak bir his vardı. Annesine her şeyi anlattı, annesi önce şaşırdı sonra sarıldı. "Benim cesur kızım" dedi annesine.',
      'O günden sonra Ela her gün ormana gitti. Hayvanlar onu tanıdı, ağaçlar ona eğildi. Ela anladı ki en büyük sihir, kalpten gelen bir şarkıda saklıdır.'
    ],
    image_prompts: [
      'small girl looking at magical forest from window morning light cartoon',
      'tiny fairy with star eyes glowing golden light between trees illustration',
      'brave girl meeting fairy in enchanted forest colorful cartoon',
      'girl singing in forest flowers blooming birds waking up vibrant',
      'forest coming alive animals celebrating girl colorful children book illustration'
    ],
    moral: 'En büyük sihir, kalpten gelen bir şarkıda saklıdır.'
  },
  {
    genre: 'masal',
    age_group: 'young',
    title: 'Üç Renkli Ejderhanın Mucizesi',
    paragraphs: [
      'Dağların ardındaki küçük köyde herkes birbirini tanırdı. Köylüler tarla sürer, ekmek pişirir ve akşamları ateş başında hikaye anlatırlardı. Ama bu köyde garip bir şey vardı: dağın tepesinde üç renkli bir ejderha yaşıyordu.',
      'Ejderhanın adı Alev\'di. Alev küçük ve tatlı bir ejderhaydı ama insanlar onu görünce korkup kaçıyordu. Çünkü ejderha denince akıllarına hep kötü hikayeler geliyordu. Alev bunun için çok üzülürdü.',
      'Alev\'in en özel özelliği üç renkte ateş püskürtebilmesiydi. Kırmızı ateşi çok sıcaktı ve her şeyi ısıtırdı. Mavi ateşi soğuk ve tazeydi, buzları eritebilirdi. Sarı ateşi ise ışık gibiydi, karanlıkları aydınlatırdı.',
      'Bir kış günü köyün fırını bozuldu. Çocuklar ekmeksiz kalacaktı, soğuktan titriyorlardı. Köylüler ne yapacaklarını bilemediler ve çaresiz oturup düşündüler.',
      'Küçük bir kız olan Pembe, dağa doğru baktı. "Alev bize yardım edebilir" dedi. Ama köylüler korktular. "Ejderhaya gitme, tehlikeli!" dediler.',
      'Pembe cesaretini topladı ve tek başına dağa tırmandı. Alev\'i bulduğunda ejderha üzgün görünüyordu. "Senden yardım isteyeceğim" dedi Pembe doğrudan.',
      'Alev\'in gözleri büyüdü. Hiç kimse ondan yardım istememiş, hep kaçmıştı. "N-ne yapabilirim?" diye sordu kekeleyerek. Pembe ona fırının bozulduğunu anlattı.',
      'Alev hemen ayağa kalktı. "Kırmızı ateşim fırını ısıtabilir!" dedi sevinçle. İkisi birlikte köye indiler. Köylüler önce kaçmak istediler ama Pembe ellerini açtı. "Korkmayın, o arkadaşım!"',
      'Alev fırına yaklaştı ve dikkatli bir şekilde kırmızı ateşini üfledi. Fırın ısındı, ekmekler pişmeye başladı. Mis gibi ekmek kokusu köyün her yerine yayıldı.',
      'Köylüler şaşkınlıkla baktılar. Ejderha onlara zarar vermemişti, aksine yardım etmişti. Yaşlı bir nine öne çıktı ve Alev\'e teşekkür etti. Alev utanarak yüzünü çevirdi.',
      'O gece nehir dondu ve köyün su kaynağı kapandı. Herkes susuzluktan korktu. Ama bu sefer kendileri Alev\'e koştular. "Lütfen yardım et!"',
      'Alev mavi ateşiyle nehrin buzunu dikkatli dikkatli eritti. Su akmaya başladı, herkes rahat bir nefes aldı. Çocuklar sevinçten çığlık attı ve Alev\'in etrafında dans ettiler.',
      'Gece oldu ve yolu kaybeden bir kafile köye ulaşamıyordu. Alev sarı ateşiyle gökyüzünü aydınlattı. Kafile ışığı görüp yolu buldu ve köye güvenle ulaştı.',
      'Artık köylüler Alev\'i seviyordu. Ona her gün yiyecek getiriyorlar, şarkılar söylüyorlardı. Alev artık dağın tepesinde yalnız oturmuyordu, köyün bir parçasıydı.',
      'Pembe ve Alev en iyi arkadaş oldular. Alev ona uçmayı öğretti, Pembe ona şarkı söylemeyi. Köyde bir söz dolaşıyordu artık: "Farklı olmak, özel olmaktır."'
    ],
    image_prompts: [
      'small colorful dragon three color fire mountain village cartoon',
      'brave little girl climbing mountain to meet dragon illustration',
      'friendly dragon helping bake bread in village oven colorful cartoon',
      'dragon melting ice river with blue fire happy villagers',
      'dragon and girl best friends flying over colorful village illustration'
    ],
    moral: 'Farklı olmak, özel olmaktır.'
  },
  {
    genre: 'masal',
    age_group: 'young',
    title: 'Gökyüzünden Düşen Yıldız',
    paragraphs: [
      'Mira her gece yatağına girince pencereden yıldızlara bakardı. Onları saymaya çalışırdı ama hep uykusu gelirdi. Yıldızlar onun en sevdiği arkadaşlarıydı.',
      'Bir gece bahçede parlak bir ışık gördü. Fırlayıp pencereyi açtı ve baktı. Bahçesinin ortasında küçük, altın renkli bir şey yatıyordu.',
      'Mira heyecanla aşağı koştu. Bahçeye girdiğinde gördüğü şey onu şaşkına çevirdi. Küçük bir yıldız toprağa düşmüş, etrafı ışıl ışıl parlıyordu.',
      'Yıldız ağlıyordu. Minicik gözyaşları altın damlalar gibi düşüyordu yere. Mira yavaşça eğildi ve "Neden ağlıyorsun?" diye sordu.',
      '"Kayboldum" dedi yıldız titrek bir sesle. "Ailemi kaybettim, gökyüzüne dönemiyorum. Tek başımayım ve çok korkuyorum." Mira\'nın yüreği sıkıştı.',
      'Mira hemen yanına oturdu. "Ağlama, ben buradayım" dedi. "Birlikte buluruz, söz." Yıldız ona baktı ve ağlaması yavaşladı.',
      'İkisi birlikte düşündüler. "Gökyüzüne en yakın yer neresi?" diye sordu yıldız. Mira hemen bildi: "Mahallenin en yüksek tepesi! Oradan gökyüzü çok yakın görünür."',
      'Mira yıldızı avuçlarının içine aldı, çok hafifti. Yavaş yavaş tepeye doğru yürümeye başladılar. Karanlık sokaklar boyunca yıldızın ışığı onları aydınlatıyordu.',
      'Tepe uzun sürdü ama Mira hiç şikayet etmedi. Yıldız ona gökyüzündeki hikayelerini anlattı, o büyük yer olan Samanyolu\'nu, yıldız arkadaşlarını. Mira büyülenerek dinledi.',
      'En sonunda tepeye ulaştılar. Mira yıldızı dikkatli bir şekilde ellerine aldı ve yukarı kaldırdı. "Annenle baban orada bir yerde seni bekliyor" dedi.',
      'Yıldız titredi ve parlamaya başladı. "Onları görebiliyorum!" diye bağırdı sevinçle. "Oradan ışık veriyorlar, beni çağırıyorlar!" Mira\'nın gözlerinde yaş belirdi.',
      '"Git o zaman" dedi Mira gülümseyerek. "Aileni özlediler." Yıldız ona sarılmak istercesine ışık saçtı. "Sen de beni özlersen yukarı bak" dedi.',
      'Yıldız yavaş yavaş yükselmeye başladı. Mira aşağıdan elini salladı. Gökyüzüne karıştı ve en parlak yıldız oldu.',
      'Mira o gece eve dönerken gökyüzüne baktı. Yıldızlar her zamankinden daha parlak görünüyordu. Sanki hepsi ona teşekkür ediyordu.',
      'O günden sonra Mira her gece en parlak yıldıza bakıp selam verdi. Ve o yıldız her seferinde daha da parlak ışıldı. Arkadaşlık bazen milyonlarca kilometre ötede de yaşar.'
    ],
    image_prompts: [
      'girl watching stars from window at night warm illustration cartoon',
      'small golden star fallen in garden glowing cute illustration',
      'girl comforting crying little star in garden sweet cartoon',
      'girl carrying star walking through dark street illuminated path illustration',
      'star rising to sky girl waving goodbye touching illustration'
    ],
    moral: 'Arkadaşlık bazen milyonlarca kilometre ötede de yaşar.'
  },
  {
    genre: 'masal',
    age_group: 'young',
    title: 'Sihirli Tohumların Gizemi',
    paragraphs: [
      'Küçük Ali\'nin dedesi çok bilge bir adamdı. Bahçesinde yetiştiremediği bitki yoktu, çiçek yok, ağaç yoktu ki büyütmemiş olsun. Ali onu çok severdi ve her fırsatta yanına giderdi.',
      'Bir gün dede Ali\'ye küçük bir kutu verdi. Kutunun içinde üç tane tohum vardı; biri kırmızı, biri mavi, biri sarıydı. "Bunlar sihirli tohumlar" dedi dede gizemli bir sesle.',
      '"Her birinin gücü farklı" diye devam etti. "Ama nasıl kullanacağını bulmak sana kalmış." Ali kutuyu iki eliyle tuttu ve çok dikkatli bir şekilde sakladı.',
      'Ertesi sabah Ali bahçeye çıktı. Kırmızı tohumu eline aldı ve güneşin en iyi gördüğü yere dikti. Toprağı örttü, su verdi ve bekledi.',
      'Sabah uyandığında bahçeye koştu. Küçük bir filiz çıkmıştı. Ama filiz büyüdükçe büyüdü ve akşama kadar dev bir çiçek açtı. Çiçeğin kokusu tüm köye yayıldı.',
      'Komşular koştu ve hayran kaldılar. "Bu nasıl bir çiçek?" diye sordular. Ali omuzlarını silkti. "Bilmiyorum, sadece güneşli yere diktim" dedi.',
      'İkinci tohuma sıra geldi. Mavi tohumu ne yapacağını düşündü uzun uzun. Sonra aklına bir fikir geldi: suya attı. Tohum bataklık gibi bir yerde büyüyebilirdi belki.',
      'Mavi tohum suya düştü ve battı. Ali korktu ama beklemek dışında yapacak bir şey yoktu. Sabah olduğunda gölün ortasından garip bir bitki çıkmıştı.',
      'Bitki konuşuyordu! Balıklara sorular soruyordu, balıklar da cevap veriyordu. Ali şaşkın şaşkın izledi. Balıkların ne söylediğini merak etti.',
      '"Bu bitki balıkları konuşturuyor" dedi yanına gelen bir komşu. Ali güldü. "Dedem haklıymış, gerçekten sihirliler."',
      'Sıra sarı tohuma geldi. En zor karar buydu. Sarı tohumu ne yapacaktı? Toprağa mı dikecekti, suya mı atacaktı, bir yere mi saklayacaktı?',
      'Ali çok düşündü. Sonunda tohumu avucuna aldı ve kalbinin üstüne tuttu. Sonra pencereyi açtı ve rüzgara bıraktı. Tohum uçtu, döndü, tüm köye saçıldı.',
      'Ertesi sabah köyde yüzlerce çiçek açmıştı. Her kapının önünde, her pencerenin altında, her patikanın kenarında çiçekler vardı. Köy rengarenk olmuştu.',
      'Dede Ali\'yi buldu ve sarıldı. "Üçünü de doğru kullandın" dedi. Ali şaşırdı. "Nasıl biliyorsun?" "Çünkü son tohumla herkesi mutlu ettin, sadece kendini değil."',
      'Ali o gün çok önemli bir şey öğrendi. Gerçek sihir, güzellikleri kendin için değil herkesin için büyütmektir. Ve en iyi büyüyü sevgi ile yaparsın.'
    ],
    image_prompts: [
      'wise grandfather giving magic seeds to grandson warm garden illustration',
      'boy planting colorful seed in sunny garden with care cartoon',
      'giant magical flower blooming overnight village amazed cartoon',
      'magical talking plant in water fish speaking illustration colorful',
      'flowers blooming everywhere in colorful village happy people cartoon'
    ],
    moral: 'Gerçek sihir, güzellikleri herkes için büyütmektir.'
  },
  {
    genre: 'masal',
    age_group: 'young',
    title: 'Yavaş ile Tavşanın Yeni Hikayesi',
    paragraphs: [
      'Ormanda minik bir kaplumbağa yaşıyordu. Adı Yavaş\'tı ve arkadaşlarından çok daha yavaş hareket ederdi. Koşamaz, atlayamaz, hızlı dönemezdi. Ama gözlemlemeyi ve düşünmeyi çok severdi.',
      'Tavşan Fırtına en hızlı hayvanlardan biriydi. Her gün koşturur, oradan oraya atlardı. Yavaş\'ı görünce durur ve gülerdi. "Yavaş yavaş nereye gidiyorsun?" diye sorardı alay ederek.',
      'Yavaş hiç kızmazdı. "Gideceğim yere gidiyorum" derdi sakin bir şekilde. Bu cevap Fırtına\'yı daha çok güldürürdü. Diğer hayvanlar da bazen katılırdı gülüşmelere.',
      'Bir yaz günü ormanda büyük bir yangın çıktı. Kuru yapraklar alevlendi, dumanlar gökyüzüne yükseldi. Tüm hayvanlar panikle koşmaya başladı. Kimse kimseyi görmüyordu.',
      'Fırtına da koşuyordu ama yön tayin edemiyordu. Duman her yeri kaplamıştı, nereye gittiğini bilmiyordu. Çok korkmuştu ve ağlamaya başladı.',
      'Yavaş ise paniklemediydi. Yavaş yavaş ilerliyor ve etrafı dikkatle izliyordu. Rüzgarın yönünü hissetti, ağaçların kök seslerini duydu, toprağın nemini hissetti.',
      'Birden bir şey fark etti. Küçük bir tilki yavrusu korkudan taşın arkasına saklanmış, hareket edemiyordu. Yanından geçen tüm hayvanlar onu görmemişti.',
      'Yavaş durdu. Tilki yavrusuna yaklaştı. "Gel, sırtıma bin" dedi. Yavru titreyerek Yavaş\'ın sırtına çıktı. Yavaş dikkatli dikkatli yürümeye devam etti.',
      'Rüzgara göre yönünü belirledi, ağaçların arından güvenli yolu buldu. Yavaş ama sağlam adımlarla ormandan çıktı. Elindeki yavruyu güvenle dışarı çıkardı.',
      'Diğer hayvanlar dışarıda bekliyordu. Fırtına\'yı gördüklerinde sevinç çığlıkları attılar. Ama asıl hayranla baktıkları şey Yavaş\'tı; sırtında küçük tilki yavrusuyla gülümseyerek geliyordu.',
      '"Nasıl yaptın?" diye sordu Fırtına şaşkınlıkla. "Ben hızlıyım ama panikledim ve kayboldum." Yavaş gülümsedi. "Ben yavaşım, bu yüzden daha dikkatli bakmak zorundayım."',
      'Tilki yavrusunun annesi koşarak geldi. Yavrusunu kucakladı ve ağladı. Sonra Yavaş\'a döndü. "Teşekkür ederim" dedi boğuk bir sesle. Yavaş başını eğdi.',
      'Fırtına o gün çok önemli bir şey anladı. Hız her zaman en iyi olmak demek değildi. Bazen dikkat, sabır ve sakinlik hızdan daha kıymetliydi.',
      '"Özür dilerim Yavaş" dedi Fırtına samimi bir şekilde. "Seninle alay etmem yanlıştı. Aslında sen benden daha güçlüsün." Yavaş gülümsedi ve elini uzattı.',
      'O günden sonra Fırtına ve Yavaş en iyi arkadaş oldular. Fırtına hızını, Yavaş sabrını öğretti birbirine. Ve orman onları "Hız ile Sabır" diye andı.'
    ],
    image_prompts: [
      'small slow turtle and fast rabbit in colorful forest cartoon',
      'rabbit teasing slow turtle other animals watching cartoon illustration',
      'big forest fire animals running panic smoke illustration',
      'brave turtle carrying tiny fox through fire safely cartoon',
      'turtle and rabbit becoming best friends forest animals celebrating cartoon'
    ],
    moral: 'Hız her zaman kazandırmaz; sabır ve dikkat daha güçlüdür.'
  }
]

async function updateStories() {
  console.log('Hikayeler güncelleniyor...')
  
  // Önce mevcut masal/young hikayeleri sil
  const { error: delErr } = await sb.from('stories')
    .delete()
    .eq('genre', 'masal')
    .eq('age_group', 'young')
  
  if (delErr) { console.error('Silme hatası:', delErr); return }
  console.log('Eski hikayeler silindi.')
  
  // Yenilerini ekle
  const { error: insErr } = await sb.from('stories').insert(stories)
  if (insErr) { console.error('Ekleme hatası:', insErr); return }
  
  console.log(`✅ ${stories.length} hikaye yüklendi!`)
}

updateStories()
