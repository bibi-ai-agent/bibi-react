// OCEAN modeli — çocuklara uyarlanmış 50 soru
// Her boyuttan 10 soru, yaşa göre 3 versiyon

export const PERSONALITY_QUESTIONS = [
  // OPENNESS (Açıklık) — merak, yaratıcılık, hayal gücü
  { id:1, dimension:'openness', young:"Hiç görmediğin bir ülkeye gidebilseydin ne yapardın?", middle:"Yeni bir şey keşfetmek seni heyecanlandırır mı?", teen:"Farklı kültürleri ve fikirleri keşfetmek sana ilgi çekici geliyor mu?" },
  { id:2, dimension:'openness', young:"Resim yapmayı veya bir şeyler üretmeyi sever misin?", middle:"Hayal kurmaktan hoşlanır mısın?", teen:"Sanat, müzik veya yazı yazmak seni etkiler mi?" },
  { id:3, dimension:'openness', young:"Biliyor musun oyunlarda kendi kurallarını yapar mısın?", middle:"Farklı şekillerde düşünmekten zevk alır mısın?", teen:"Sıra dışı fikirleri dinlemekten hoşlanır mısın?" },
  { id:4, dimension:'openness', young:"Kitap okumayı veya hikaye dinlemeyi sever misin?", middle:"Yeni hobiler denemek ister misin?", teen:"Çok farklı konular hakkında bilgi edinmek ister misin?" },
  { id:5, dimension:'openness', young:"Sence dünyada hâlâ keşfedilmemiş yerler var mı?", middle:"Doğayı ve evreni merak eder misin?", teen:"Bilim, felsefe veya sanat gibi derin konular ilgini çeker mi?" },
  { id:6, dimension:'openness', young:"Oynarken farklı karakterlere girmekten hoşlanır mısın?", middle:"Farklı müzik türleri dinlemeyi sever misin?", teen:"Alışılmışın dışında çözümler üretmekten zevk alır mısın?" },
  { id:7, dimension:'openness', young:"Rüyalarını hatırlar mısın, anlat bakalım?", middle:"Yaratıcı projeler yapmak seni mutlu eder mi?", teen:"Değişimi tehdit mi fırsat mı olarak görürsün?" },
  { id:8, dimension:'openness', young:"En sevdiğin oyun hangisi ve neden?", middle:"Bir şeyi farklı yapmanın yollarını arar mısın?", teen:"Monoton rutinler mi yoksa sürekli yenilik mi tercih edersin?" },
  { id:9, dimension:'openness', young:"Hiç kendi hikayeni yazdın mı?", middle:"Sence hayal gücü zeka kadar önemli mi?", teen:"Belirsiz durumlarla rahat başa çıkabilir misin?" },
  { id:10, dimension:'openness', young:"Karanlıkta neler olduğunu merak eder misin?", middle:"Yeni arkadaşlar edinmek heyecan verici gelir mi?", teen:"Kendi özgün tarzın veya bakış açın var mı?" },

  // CONSCIENTIOUSNESS (Sorumluluk) — düzen, disiplin, hedef
  { id:11, dimension:'conscientiousness', young:"Oyuncaklarını oynadıktan sonra toplar mısın?", middle:"Ödevlerini zamanında yapar mısın?", teen:"Hedeflerine ulaşmak için plan yapar mısın?" },
  { id:12, dimension:'conscientiousness', young:"Bir şeyi yaparken yarıda bırakmaktan hoşlanır mısın?", middle:"Başladığın işleri bitirmeye önem verir misin?", teen:"Sorumluluklarını yerine getirmek seni iyi hissettiriyor mu?" },
  { id:13, dimension:'conscientiousness', young:"Eşyalarının kaybolmaması için dikkat eder misin?", middle:"Çantanı ve odanı düzenli tutar mısın?", teen:"Uzun vadeli hedefler için kısa vadeli hazlardan vazgeçebilir misin?" },
  { id:14, dimension:'conscientiousness', young:"Bir oyunun kurallarına uymak sence önemli mi?", middle:"Başkalarına söz verdiğinde tutmaya çalışır mısın?", teen:"Öz disiplin sence öğrenilebilir bir şey mi?" },
  { id:15, dimension:'conscientiousness', young:"Uyku saatine dikkat eder misin?", middle:"Sınav öncesi nasıl hazırlanırsın?", teen:"Ertelemek (procrastination) sende yaygın bir alışkanlık mı?" },
  { id:16, dimension:'conscientiousness', young:"Yemekten önce elini yıkar mısın?", middle:"Bir işi en iyi şekilde yapmak için ekstra çaba gösterir misin?", teen:"Mükemmeliyetçi biri misin?" },
  { id:17, dimension:'conscientiousness', young:"Arkadaşlarınla söz verdiğinde unutur musun?", middle:"Okul çantanı akşamdan hazırlar mısın?", teen:"Başarısızlık seni motive mi eder yoksa durdurur mu?" },
  { id:18, dimension:'conscientiousness', young:"Bir şeyi yaparken dikkatli misin?", middle:"Hata yaptığında nasıl hissedersin?", teen:"Çalışma ortamının düzenli olması verimliliğini etkiler mi?" },
  { id:19, dimension:'conscientiousness', young:"Ev işlerine yardım eder misin?", middle:"Planladığın bir şeyi değiştirmek zorunda kalsan nasıl hissedersin?", teen:"Küçük detaylara dikkat etmek sence önemli mi?" },
  { id:20, dimension:'conscientiousness', young:"Bir oyunu kazanmak için ne kadar çalışırsın?", middle:"Başarılı olmak için ne kadar emek verirsin?", teen:"Önceliklerini belirleyebiliyor musun?" },

  // EXTRAVERSION (Dışadönüklük) — sosyallik, enerji, girişkenlik
  { id:21, dimension:'extraversion', young:"Yeni arkadaşlarla tanışmaktan hoşlanır mısın?", middle:"Kalabalık ortamlarda kendin gibi hisseder misin?", teen:"Sosyal ortamlar sana enerji mi verir yoksa yorar mı?" },
  { id:22, dimension:'extraversion', young:"Sınıfta el kaldırmaktan korkar mısın?", middle:"Grup çalışmalarını seviyoor musun?", teen:"Liderlik rolü üstlenmekten hoşlanır mısın?" },
  { id:23, dimension:'extraversion', young:"Parti ve şenlik gibi yerlerde eğlenir misin?", middle:"Yabancılarla kolayca sohbet edebilir misin?", teen:"Tanımadığın biriyle konuşmaya başlamak sana zor gelir mi?" },
  { id:24, dimension:'extraversion', young:"Tek başına mı grup hâlinde mi oynamayı seversin?", middle:"Sessiz bir gün mü kalabalık bir gün mü tercih edersin?", teen:"Yalnız kalmak seni yeniler mi yoksa sıkar mı?" },
  { id:25, dimension:'extraversion', young:"Sahneye çıkmak veya sunum yapmak ister misin?", middle:"Dikkat merkezi olmak seni mutlu eder mi?", teen:"Fikirlerini grup önünde paylaşmaktan çekinir misin?" },
  { id:26, dimension:'extraversion', young:"Çok arkadaşın mı var yoksa az ama yakın mı?", middle:"Arkadaşlarınla buluşmak seni heyecanlandırır mı?", teen:"Geniş sosyal çevren mi var yoksa küçük ama derin ilişkilerin mi?" },
  { id:27, dimension:'extraversion', young:"Bir şey anlatmayı çok sever misin?", middle:"Konuşurken mi dinlerken mi daha iyi hissedersin?", teen:"Sessiz bir ortamda uzun süre çalışabilir misin?" },
  { id:28, dimension:'extraversion', young:"Arkadaşlarına sürpriz yapmaktan hoşlanır mısın?", middle:"Sosyal medyada aktif olmak ister misin?", teen:"Tanışma etkinliklerine gitmek seni heyecanlandırır mı?" },
  { id:29, dimension:'extraversion', young:"Oyunlarda lider olmak ister misin?", middle:"Fikirlerini paylaşmaktan çekinir misin?", teen:"İnsanlardan enerji alan biri misin yoksa yalnızlıktan mı?" },
  { id:30, dimension:'extraversion', young:"Yeni bir yere gittiğinde çabuk alışır mısın?", middle:"Değişikliklerle kolay baş eder misin?", teen:"Spontane (plansız) sosyal aktivitelere katılmaktan hoşlanır mısın?" },

  // AGREEABLENESS (Uyumluluk) — empati, işbirliği, yardımseverlik
  { id:31, dimension:'agreeableness', young:"Arkadaşın üzgün olduğunda ne yaparsın?", middle:"Başkalarına yardım etmek seni mutlu eder mi?", teen:"Empati kurman kolay mı?" },
  { id:32, dimension:'agreeableness', young:"Oyuncaklarını paylaşmaktan hoşlanır mısın?", middle:"Grup kararlarına uymak sana zor gelir mi?", teen:"Çatışmadan kaçınır mısın yoksa yüzleşir misin?" },
  { id:33, dimension:'agreeableness', young:"Birine kötü davranıldığında nasıl hissedersin?", middle:"Adaletsizliğe karşı sesini yükseltir misin?", teen:"Başkalarının duygularını anlamak sana doğal gelir mi?" },
  { id:34, dimension:'agreeableness', young:"Arkadaşınla tartışırsan ne yaparsın?", middle:"Özür dilemek sana kolay gelir mi?", teen:"Uzlaşı mı yoksa haklılığı savunmak mı tercih edersin?" },
  { id:35, dimension:'agreeableness', young:"Hayvanları sever misin?", middle:"Başkalarının ihtiyaçlarını kendi ihtiyaçlarının önüne koyar mısın?", teen:"İnsanlara güvenmek sana kolay gelir mi?" },
  { id:36, dimension:'agreeableness', young:"Yabancılara yardım eder misin?", middle:"Eleştiri aldığında nasıl tepki verirsin?", teen:"Başkalarını memnun etmek için kendi isteklerinden vazgeçer misin?" },
  { id:37, dimension:'agreeableness', young:"Sınıfta yeni gelen çocuğa yardım eder misin?", middle:"Takım çalışması sence önemli mi?", teen:"İnsanların çoğunun iyi niyetli olduğunu düşünür müsün?" },
  { id:38, dimension:'agreeableness', young:"Kavga etmekten hoşlanır mısın?", middle:"Başkasının bakış açısını anlamaya çalışır mısın?", teen:"Sert geribildirim vermek sana zor gelir mi?" },
  { id:39, dimension:'agreeableness', young:"Arkadaşın hata yaparsa ne dersin?", middle:"Başkalarının sorunlarıyla ilgilenir misin?", teen:"Manipülatif insanları fark edebilir misin?" },
  { id:40, dimension:'agreeableness', young:"Hediye vermekten mi almaktan mı daha çok hoşlanırsın?", middle:"Gönüllü işlere katılmak ister misin?", teen:"Toplumsal sorunlar seni derinden etkiler mi?" },

  // NEUROTICISM (Duygusal Denge) — kaygı, stres, duygu yönetimi
  { id:41, dimension:'neuroticism', young:"Karanlıktan korkar mısın?", middle:"Sınav öncesi çok sinirlenir misin?", teen:"Stresli durumlarla başa çıkmak sana zor gelir mi?" },
  { id:42, dimension:'neuroticism', young:"Kötü bir şey olacak diye düşünür müsün?", middle:"Endişeli biri misin?", teen:"Olumsuz düşünceler aklını meşgul eder mi?" },
  { id:43, dimension:'neuroticism', young:"Bir şeyler ters gidince çabuk üzülür müsün?", middle:"Duygularını kontrol etmek sana zor gelir mi?", teen:"Eleştiri aldığında uzun süre üzülür müsün?" },
  { id:44, dimension:'neuroticism', young:"Arkadaşların seni terk edecek diye düşünür müsün?", middle:"Yalnız kaldığında kötü hisseder misin?", teen:"Reddedilme korkun var mı?" },
  { id:45, dimension:'neuroticism', young:"Bazen çok sinirlenip ağlar mısın?", middle:"Duygusal iniş çıkışlar yaşar mısın?", teen:"Ruh halin günlük olarak çok değişir mi?" },
  { id:46, dimension:'neuroticism', young:"Hata yaptığında kendini çok kötü hisseder misin?", middle:"Kendinle ilgili olumsuz düşünceler aklına gelir mi?", teen:"Kendin hakkında eleştirel biri misin?" },
  { id:47, dimension:'neuroticism', young:"Hasta olmaktan çok korkar mısın?", middle:"Gelecekle ilgili çok endişelenir misin?", teen:"Belirsizlik seni rahatsız eder mi?" },
  { id:48, dimension:'neuroticism', young:"Bir şey seni üzerse uzun süre üzgün kalır mısın?", middle:"Rahatsız edici duygulardan kaçınır mısın?", teen:"Duygusal yüklerini başkalarıyla paylaşır mısın?" },
  { id:49, dimension:'neuroticism', young:"Bazen neden üzgün olduğunu bilmez misin?", middle:"Aniden kötü hissettiğin oluyor mu?", teen:"Kaygı günlük hayatını etkiler mi?" },
  { id:50, dimension:'neuroticism', young:"Kendini diğer çocuklardan farklı hisseder misin?", middle:"Kendini yeterli hissediyor musun?", teen:"Özgüvenin genel olarak nasıl?" },
]

export function getQuestionForAge(question, age) {
  if (age <= 8) return question.young
  if (age <= 12) return question.middle
  return question.teen
}

export function getNextQuestion(progress) {
  if (progress >= PERSONALITY_QUESTIONS.length) return null
  return PERSONALITY_QUESTIONS[progress]
}

export function shouldAskPersonality(messageCount, progress) {
  if (progress >= 50) return false
  // Her 8 mesajda bir sor
  return messageCount > 0 && messageCount % 8 === 0
}

export function calculatePersonalityScores(answers) {
  const dimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']
  const scores = {}
  for (const dim of dimensions) {
    const dimAnswers = answers.filter(a => a.dimension === dim)
    if (dimAnswers.length === 0) { scores[dim] = null; continue }
    const avg = dimAnswers.reduce((s, a) => s + a.score, 0) / dimAnswers.length
    scores[dim] = Math.round(avg * 20) // 0-100 arası
  }
  return scores
}

export function getPersonalityProfile(scores) {
  const labels = {
    openness: scores.openness >= 60 ? 'Meraklı ve Yaratıcı' : 'Pratik ve Gerçekçi',
    conscientiousness: scores.conscientiousness >= 60 ? 'Düzenli ve Sorumlu' : 'Esnek ve Spontane',
    extraversion: scores.extraversion >= 60 ? 'Sosyal ve Enerjik' : 'İçedönük ve Düşünceli',
    agreeableness: scores.agreeableness >= 60 ? 'Empatik ve Yardımsever' : 'Bağımsız ve Doğrudan',
    neuroticism: scores.neuroticism >= 60 ? 'Duygusal ve Hassas' : 'Sakin ve Dengeli',
  }
  return labels
}

export const DIMENSION_NAMES = {
  openness: 'Merak & Yaratıcılık',
  conscientiousness: 'Sorumluluk & Düzen',
  extraversion: 'Sosyallik & Enerji',
  agreeableness: 'Empati & Uyum',
  neuroticism: 'Duygusal Hassasiyet',
}

export const DIMENSION_ICONS = {
  openness: '🔭',
  conscientiousness: '📋',
  extraversion: '🌟',
  agreeableness: '💝',
  neuroticism: '🌊',
}
