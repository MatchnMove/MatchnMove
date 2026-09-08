import type { AppLocale } from "@/lib/i18n/config";

export const publicShellEnglishMessages = {
  "publicShell.home": "Match 'n Move home",
  "publicShell.mainNavigation": "Main navigation",
  "publicShell.openMenu": "Open navigation menu",
  "publicShell.closeMenu": "Close navigation menu",
  "publicShell.closeOverlay": "Close navigation overlay",
  "publicShell.getMoving": "Get moving",
  "publicShell.findMovers": "Find movers",
  "publicShell.resources": "Resources",
  "publicShell.about": "About",
  "publicShell.moversDirectory": "Movers directory",
  "publicShell.movingFaqs": "Moving FAQs",
  "publicShell.allResources": "All moving resources",
  "publicShell.howItWorks": "How it works",
  "publicShell.moverReviews": "Mover reviews",
  "publicShell.aboutUs": "About Match 'n Move",
  "publicShell.contactUs": "Contact us",
  "publicShell.moverPricing": "Mover pricing",
  "publicShell.customers": "Customers",
  "publicShell.guidesTools": "Guides & Tools",
  "publicShell.movingCompanies": "Moving Companies",
  "publicShell.cleaningCompanies": "Cleaning Companies",
  "publicShell.legal": "Legal & Compliance",
  "publicShell.contact": "Contact",
  "publicShell.heroTitle": "Plan the move. Book with confidence.",
  "publicShell.heroCopy": "Compare moving quotes faster, connect with verified movers, and keep every step of the move feeling simple.",
  "publicShell.freeCustomers": "100% free for customers",
  "publicShell.freeCustomersCopy": "Request quotes, compare options, and choose when you're ready.",
  "publicShell.transparentMovers": "Transparent for movers",
  "publicShell.transparentMoversCopy": "Simple lead pricing with instant access and one month-end invoice.",
  "publicShell.commitment": "Our Commitment",
  "publicShell.commitmentCopy": "A cleaner quote experience for customers and a higher-intent pipeline for moving companies.",
  "publicShell.getQuotesNow": "Get quotes now",
  "publicShell.copyright": "© 2026 Match 'n Move. Built to make moving simpler.",
  "publicShell.terms": "Terms",
  "publicShell.privacy": "Privacy",
} as const;

type PublicShellKey = keyof typeof publicShellEnglishMessages;

export const publicShellTranslations: Record<
  Exclude<AppLocale, "en-NZ">,
  Partial<Record<PublicShellKey, string>>
> = {
  "mi-NZ": {
    "publicShell.getMoving": "Tīmata te neke", "publicShell.findMovers": "Kimihia ngā kaiwhakaneke", "publicShell.resources": "Ngā rauemi", "publicShell.about": "Mō mātou", "publicShell.moversDirectory": "Rārangi kaiwhakaneke", "publicShell.movingFaqs": "Ngā pātai neke", "publicShell.howItWorks": "Te āhua o te mahi", "publicShell.customers": "Ngā kiritaki", "publicShell.movingCompanies": "Ngā kamupene neke", "publicShell.cleaningCompanies": "Ngā kamupene horoi", "publicShell.contact": "Whakapā", "publicShell.getQuotesNow": "Tikina ngā utu ināianei", "publicShell.terms": "Ngā tikanga", "publicShell.privacy": "Tūmataiti",
  },
  sm: {
    "publicShell.getMoving": "Amata le siitia", "publicShell.findMovers": "Saili kamupani siitia", "publicShell.resources": "Punaoa", "publicShell.about": "E uiga ia matou", "publicShell.moversDirectory": "Lisi o kamupani siitia", "publicShell.movingFaqs": "Fesili i le siitia", "publicShell.howItWorks": "Auala e galue ai", "publicShell.customers": "Tagata faatau", "publicShell.movingCompanies": "Kamupani siitia", "publicShell.cleaningCompanies": "Kamupani fa'amamā", "publicShell.contact": "Fa'afeso'ota'i", "publicShell.getQuotesNow": "Maua tau o galuega", "publicShell.terms": "Tuutuuga", "publicShell.privacy": "Faalilolilo",
  },
  to: {
    "publicShell.getMoving": "Kamata e hiki", "publicShell.findMovers": "Kumi kau hiki", "publicShell.resources": "Ngaahi maʻuʻanga tokoni", "publicShell.about": "Fekauʻaki mo kimautolu", "publicShell.moversDirectory": "Lisi ʻo e kau hiki", "publicShell.movingFaqs": "Ngaahi fehuʻi hiki", "publicShell.howItWorks": "Founga ngāue", "publicShell.customers": "Kau kasitomā", "publicShell.movingCompanies": "Ngaahi kautaha hiki", "publicShell.cleaningCompanies": "Ngaahi kautaha fakamaʻa", "publicShell.contact": "Fetuʻutaki", "publicShell.getQuotesNow": "Maʻu ha ngaahi mahuʻinga", "publicShell.terms": "Ngaahi tuʻutuʻuni", "publicShell.privacy": "Fakapulipuli",
  },
  "zh-CN": {
    "publicShell.getMoving": "开始搬家", "publicShell.findMovers": "寻找搬家公司", "publicShell.resources": "资源", "publicShell.about": "关于我们", "publicShell.moversDirectory": "搬家公司名录", "publicShell.movingFaqs": "搬家常见问题", "publicShell.howItWorks": "服务流程", "publicShell.customers": "客户", "publicShell.guidesTools": "指南与工具", "publicShell.movingCompanies": "搬家公司", "publicShell.cleaningCompanies": "清洁公司", "publicShell.legal": "法律与合规", "publicShell.contact": "联系我们", "publicShell.getQuotesNow": "立即获取报价", "publicShell.terms": "条款", "publicShell.privacy": "隐私",
  },
  "zh-TW": {
    "publicShell.getMoving": "開始搬家", "publicShell.findMovers": "尋找搬家公司", "publicShell.resources": "資源", "publicShell.about": "關於我們", "publicShell.moversDirectory": "搬家公司名錄", "publicShell.movingFaqs": "搬家常見問題", "publicShell.howItWorks": "服務流程", "publicShell.customers": "客戶", "publicShell.guidesTools": "指南與工具", "publicShell.movingCompanies": "搬家公司", "publicShell.cleaningCompanies": "清潔公司", "publicShell.legal": "法律與合規", "publicShell.contact": "聯絡我們", "publicShell.getQuotesNow": "立即取得報價", "publicShell.terms": "條款", "publicShell.privacy": "隱私",
  },
  hi: {
    "publicShell.getMoving": "मूव शुरू करें", "publicShell.findMovers": "मूवर्स खोजें", "publicShell.resources": "संसाधन", "publicShell.about": "हमारे बारे में", "publicShell.moversDirectory": "मूवर्स निर्देशिका", "publicShell.movingFaqs": "मूविंग से जुड़े सवाल", "publicShell.howItWorks": "यह कैसे काम करता है", "publicShell.customers": "ग्राहक", "publicShell.guidesTools": "गाइड और टूल", "publicShell.movingCompanies": "मूविंग कंपनियाँ", "publicShell.cleaningCompanies": "सफ़ाई कंपनियाँ", "publicShell.legal": "कानूनी और अनुपालन", "publicShell.contact": "संपर्क", "publicShell.getQuotesNow": "अभी कोट पाएँ", "publicShell.terms": "शर्तें", "publicShell.privacy": "गोपनीयता",
  },
  pa: {
    "publicShell.getMoving": "ਮੂਵ ਸ਼ੁਰੂ ਕਰੋ", "publicShell.findMovers": "ਮੂਵਰ ਲੱਭੋ", "publicShell.resources": "ਸਰੋਤ", "publicShell.about": "ਸਾਡੇ ਬਾਰੇ", "publicShell.moversDirectory": "ਮੂਵਰ ਡਾਇਰੈਕਟਰੀ", "publicShell.movingFaqs": "ਮੂਵਿੰਗ ਸਵਾਲ", "publicShell.howItWorks": "ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ", "publicShell.customers": "ਗਾਹਕ", "publicShell.movingCompanies": "ਮੂਵਿੰਗ ਕੰਪਨੀਆਂ", "publicShell.cleaningCompanies": "ਸਫ਼ਾਈ ਕੰਪਨੀਆਂ", "publicShell.contact": "ਸੰਪਰਕ", "publicShell.getQuotesNow": "ਹੁਣੇ ਕੋਟ ਲਵੋ", "publicShell.terms": "ਸ਼ਰਤਾਂ", "publicShell.privacy": "ਪਰਦੇਦਾਰੀ",
  },
  gu: {
    "publicShell.getMoving": "મૂવ શરૂ કરો", "publicShell.findMovers": "મૂવર્સ શોધો", "publicShell.resources": "સંસાધનો", "publicShell.about": "અમારા વિશે", "publicShell.moversDirectory": "મૂવર્સ ડિરેક્ટરી", "publicShell.movingFaqs": "મૂવિંગ પ્રશ્નો", "publicShell.howItWorks": "આ કેવી રીતે કામ કરે છે", "publicShell.customers": "ગ્રાહકો", "publicShell.movingCompanies": "મૂવિંગ કંપનીઓ", "publicShell.cleaningCompanies": "સફાઈ કંપનીઓ", "publicShell.contact": "સંપર્ક", "publicShell.getQuotesNow": "હમણાં ક્વોટ મેળવો", "publicShell.terms": "શરતો", "publicShell.privacy": "ગોપનીયતા",
  },
  ta: {
    "publicShell.getMoving": "நகர்வைத் தொடங்குங்கள்", "publicShell.findMovers": "மூவர்களைக் கண்டறியுங்கள்", "publicShell.resources": "வளங்கள்", "publicShell.about": "எங்களைப் பற்றி", "publicShell.moversDirectory": "மூவர் பட்டியல்", "publicShell.movingFaqs": "குடிபெயர்வு கேள்விகள்", "publicShell.howItWorks": "இது எவ்வாறு செயல்படுகிறது", "publicShell.customers": "வாடிக்கையாளர்கள்", "publicShell.movingCompanies": "மூவிங் நிறுவனங்கள்", "publicShell.cleaningCompanies": "சுத்தம் செய்யும் நிறுவனங்கள்", "publicShell.contact": "தொடர்பு", "publicShell.getQuotesNow": "இப்போது மதிப்பீடுகளைப் பெறுங்கள்", "publicShell.terms": "விதிமுறைகள்", "publicShell.privacy": "தனியுரிமை",
  },
  ko: {
    "publicShell.getMoving": "이사 시작하기", "publicShell.findMovers": "이사업체 찾기", "publicShell.resources": "자료", "publicShell.about": "회사 소개", "publicShell.moversDirectory": "이사업체 목록", "publicShell.movingFaqs": "이사 자주 묻는 질문", "publicShell.howItWorks": "이용 방법", "publicShell.customers": "고객", "publicShell.guidesTools": "가이드 및 도구", "publicShell.movingCompanies": "이사업체", "publicShell.cleaningCompanies": "청소업체", "publicShell.legal": "법률 및 규정 준수", "publicShell.contact": "문의", "publicShell.getQuotesNow": "지금 견적 받기", "publicShell.terms": "이용약관", "publicShell.privacy": "개인정보 보호",
  },
  vi: {
    "publicShell.getMoving": "Bắt đầu chuyển nhà", "publicShell.findMovers": "Tìm đơn vị chuyển nhà", "publicShell.resources": "Tài nguyên", "publicShell.about": "Giới thiệu", "publicShell.moversDirectory": "Danh bạ đơn vị chuyển nhà", "publicShell.movingFaqs": "Câu hỏi về chuyển nhà", "publicShell.howItWorks": "Cách hoạt động", "publicShell.customers": "Khách hàng", "publicShell.guidesTools": "Hướng dẫn và công cụ", "publicShell.movingCompanies": "Công ty chuyển nhà", "publicShell.cleaningCompanies": "Công ty vệ sinh", "publicShell.legal": "Pháp lý và tuân thủ", "publicShell.contact": "Liên hệ", "publicShell.getQuotesNow": "Nhận báo giá ngay", "publicShell.terms": "Điều khoản", "publicShell.privacy": "Quyền riêng tư",
  },
  fil: {
    "publicShell.getMoving": "Simulan ang paglipat", "publicShell.findMovers": "Maghanap ng mover", "publicShell.resources": "Mga resource", "publicShell.about": "Tungkol sa amin", "publicShell.moversDirectory": "Direktoryo ng mover", "publicShell.movingFaqs": "Mga tanong sa paglipat", "publicShell.howItWorks": "Paano ito gumagana", "publicShell.customers": "Mga customer", "publicShell.guidesTools": "Mga gabay at tool", "publicShell.movingCompanies": "Mga kumpanyang paglilipat", "publicShell.cleaningCompanies": "Mga kumpanyang panlinis", "publicShell.legal": "Legal at pagsunod", "publicShell.contact": "Makipag-ugnayan", "publicShell.getQuotesNow": "Kumuha ng quote ngayon", "publicShell.terms": "Mga tuntunin", "publicShell.privacy": "Privacy",
  },
  ja: {
    "publicShell.getMoving": "引っ越しを始める", "publicShell.findMovers": "引っ越し業者を探す", "publicShell.resources": "お役立ち情報", "publicShell.about": "私たちについて", "publicShell.moversDirectory": "引っ越し業者一覧", "publicShell.movingFaqs": "引っ越しFAQ", "publicShell.howItWorks": "ご利用の流れ", "publicShell.customers": "お客様", "publicShell.guidesTools": "ガイドとツール", "publicShell.movingCompanies": "引っ越し会社", "publicShell.cleaningCompanies": "清掃会社", "publicShell.legal": "法務とコンプライアンス", "publicShell.contact": "お問い合わせ", "publicShell.getQuotesNow": "今すぐ見積もり", "publicShell.terms": "利用規約", "publicShell.privacy": "プライバシー",
  },
  af: {
    "publicShell.getMoving": "Begin trek", "publicShell.findMovers": "Vind verhuisers", "publicShell.resources": "Hulpbronne", "publicShell.about": "Oor ons", "publicShell.moversDirectory": "Verhuisergids", "publicShell.movingFaqs": "Verhuis-vrae", "publicShell.howItWorks": "Hoe dit werk", "publicShell.customers": "Kliënte", "publicShell.guidesTools": "Gidse en gereedskap", "publicShell.movingCompanies": "Verhuisingsmaatskappye", "publicShell.cleaningCompanies": "Skoonmaakmaatskappye", "publicShell.legal": "Regte en nakoming", "publicShell.contact": "Kontak", "publicShell.getQuotesNow": "Kry nou kwotasies", "publicShell.terms": "Bepalings", "publicShell.privacy": "Privaatheid",
  },
};
