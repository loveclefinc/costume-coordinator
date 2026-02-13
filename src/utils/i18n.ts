import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Multi-language Support (i18n)
 * Supports 8 languages: Japanese, English, Simplified Chinese, Traditional Chinese,
 * Korean, Spanish, French, German
 */

export type Language = "ja" | "en" | "zh-CN" | "zh-TW" | "ko" | "es" | "fr" | "de";

interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
}

interface Translation {
  [key: string]: string | Translation;
}

const LANGUAGE_KEY = "selected_language";
const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr" },
  { code: "en", name: "English", nativeName: "English", direction: "ltr" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", direction: "ltr" },
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文", direction: "ltr" },
  { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", direction: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr" },
];

// Translation dictionaries
const translations: { [key in Language]: Translation } = {
  ja: {
    app: {
      title: "衣装コーディネーター",
      subtitle: "音楽イベント用衣装最適化アプリ",
    },
    common: {
      save: "保存",
      cancel: "キャンセル",
      delete: "削除",
      edit: "編集",
      add: "追加",
      back: "戻る",
      next: "次へ",
      previous: "前へ",
      search: "検索",
      filter: "フィルター",
      sort: "ソート",
      settings: "設定",
      help: "ヘルプ",
      about: "について",
      logout: "ログアウト",
      loading: "読み込み中...",
      error: "エラー",
      success: "成功",
      warning: "警告",
      info: "情報",
    },
    tabs: {
      costumes: "衣装",
      events: "イベント",
      settings: "設定",
    },
    events: {
      title: "イベント",
      createNew: "新規イベント",
      eventName: "イベント名",
      eventDate: "イベント日時",
      participants: "参加者",
      costumes: "衣装",
      addParticipant: "参加者を追加",
      selectCostume: "衣装を選択",
      exportPDF: "PDF出力",
      history: "履歴",
    },
    costumes: {
      title: "衣装",
      createNew: "新規衣装",
      costumeName: "衣装名",
      color: "色",
      material: "素材",
      addImage: "画像を追加",
      recognizeImage: "画像認識",
      imageAnalysis: "画像分析",
    },
    settings: {
      title: "設定",
      language: "言語",
      theme: "テーマ",
      notifications: "通知",
      cloudSync: "クラウド同期",
      about: "このアプリについて",
      version: "バージョン",
      privacyPolicy: "プライバシーポリシー",
      termsOfService: "利用規約",
    },
    messages: {
      confirmDelete: "削除してもよろしいですか？",
      deleteSuccess: "削除しました",
      saveSuccess: "保存しました",
      syncSuccess: "同期しました",
      syncFailed: "同期に失敗しました",
      networkError: "ネットワークエラーが発生しました",
      offlineMode: "オフラインモード",
      onlineMode: "オンラインモード",
    },
  },
  en: {
    app: {
      title: "Costume Coordinator",
      subtitle: "Costume Optimization App for Music Events",
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      back: "Back",
      next: "Next",
      previous: "Previous",
      search: "Search",
      filter: "Filter",
      sort: "Sort",
      settings: "Settings",
      help: "Help",
      about: "About",
      logout: "Logout",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      warning: "Warning",
      info: "Information",
    },
    tabs: {
      costumes: "Costumes",
      events: "Events",
      settings: "Settings",
    },
    events: {
      title: "Events",
      createNew: "Create New Event",
      eventName: "Event Name",
      eventDate: "Event Date",
      participants: "Participants",
      costumes: "Costumes",
      addParticipant: "Add Participant",
      selectCostume: "Select Costume",
      exportPDF: "Export PDF",
      history: "History",
    },
    costumes: {
      title: "Costumes",
      createNew: "Create New Costume",
      costumeName: "Costume Name",
      color: "Color",
      material: "Material",
      addImage: "Add Image",
      recognizeImage: "Recognize Image",
      imageAnalysis: "Image Analysis",
    },
    settings: {
      title: "Settings",
      language: "Language",
      theme: "Theme",
      notifications: "Notifications",
      cloudSync: "Cloud Sync",
      about: "About This App",
      version: "Version",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
    },
    messages: {
      confirmDelete: "Are you sure you want to delete?",
      deleteSuccess: "Deleted successfully",
      saveSuccess: "Saved successfully",
      syncSuccess: "Synced successfully",
      syncFailed: "Sync failed",
      networkError: "Network error occurred",
      offlineMode: "Offline Mode",
      onlineMode: "Online Mode",
    },
  },
  "zh-CN": {
    app: {
      title: "服装协调器",
      subtitle: "音乐活动服装优化应用",
    },
    common: {
      save: "保存",
      cancel: "取消",
      delete: "删除",
      edit: "编辑",
      add: "添加",
      back: "返回",
      next: "下一步",
      previous: "上一步",
      search: "搜索",
      filter: "筛选",
      sort: "排序",
      settings: "设置",
      help: "帮助",
      about: "关于",
      logout: "登出",
      loading: "加载中...",
      error: "错误",
      success: "成功",
      warning: "警告",
      info: "信息",
    },
    tabs: {
      costumes: "服装",
      events: "活动",
      settings: "设置",
    },
    events: {
      title: "活动",
      createNew: "创建新活动",
      eventName: "活动名称",
      eventDate: "活动日期",
      participants: "参与者",
      costumes: "服装",
      addParticipant: "添加参与者",
      selectCostume: "选择服装",
      exportPDF: "导出PDF",
      history: "历史",
    },
    costumes: {
      title: "服装",
      createNew: "创建新服装",
      costumeName: "服装名称",
      color: "颜色",
      material: "材料",
      addImage: "添加图像",
      recognizeImage: "识别图像",
      imageAnalysis: "图像分析",
    },
    settings: {
      title: "设置",
      language: "语言",
      theme: "主题",
      notifications: "通知",
      cloudSync: "云同步",
      about: "关于此应用",
      version: "版本",
      privacyPolicy: "隐私政策",
      termsOfService: "服务条款",
    },
    messages: {
      confirmDelete: "您确定要删除吗？",
      deleteSuccess: "删除成功",
      saveSuccess: "保存成功",
      syncSuccess: "同步成功",
      syncFailed: "同步失败",
      networkError: "发生网络错误",
      offlineMode: "离线模式",
      onlineMode: "在线模式",
    },
  },
  "zh-TW": {
    app: {
      title: "服裝協調器",
      subtitle: "音樂活動服裝優化應用",
    },
    common: {
      save: "保存",
      cancel: "取消",
      delete: "刪除",
      edit: "編輯",
      add: "添加",
      back: "返回",
      next: "下一步",
      previous: "上一步",
      search: "搜尋",
      filter: "篩選",
      sort: "排序",
      settings: "設定",
      help: "幫助",
      about: "關於",
      logout: "登出",
      loading: "載入中...",
      error: "錯誤",
      success: "成功",
      warning: "警告",
      info: "資訊",
    },
    tabs: {
      costumes: "服裝",
      events: "活動",
      settings: "設定",
    },
    events: {
      title: "活動",
      createNew: "建立新活動",
      eventName: "活動名稱",
      eventDate: "活動日期",
      participants: "參與者",
      costumes: "服裝",
      addParticipant: "新增參與者",
      selectCostume: "選擇服裝",
      exportPDF: "匯出PDF",
      history: "歷史",
    },
    costumes: {
      title: "服裝",
      createNew: "建立新服裝",
      costumeName: "服裝名稱",
      color: "顏色",
      material: "材料",
      addImage: "新增圖像",
      recognizeImage: "辨識圖像",
      imageAnalysis: "圖像分析",
    },
    settings: {
      title: "設定",
      language: "語言",
      theme: "主題",
      notifications: "通知",
      cloudSync: "雲端同步",
      about: "關於此應用",
      version: "版本",
      privacyPolicy: "隱私政策",
      termsOfService: "服務條款",
    },
    messages: {
      confirmDelete: "您確定要刪除嗎？",
      deleteSuccess: "刪除成功",
      saveSuccess: "保存成功",
      syncSuccess: "同步成功",
      syncFailed: "同步失敗",
      networkError: "發生網路錯誤",
      offlineMode: "離線模式",
      onlineMode: "線上模式",
    },
  },
  ko: {
    app: {
      title: "의상 코디네이터",
      subtitle: "음악 이벤트 의상 최적화 앱",
    },
    common: {
      save: "저장",
      cancel: "취소",
      delete: "삭제",
      edit: "편집",
      add: "추가",
      back: "뒤로",
      next: "다음",
      previous: "이전",
      search: "검색",
      filter: "필터",
      sort: "정렬",
      settings: "설정",
      help: "도움말",
      about: "정보",
      logout: "로그아웃",
      loading: "로딩 중...",
      error: "오류",
      success: "성공",
      warning: "경고",
      info: "정보",
    },
    tabs: {
      costumes: "의상",
      events: "이벤트",
      settings: "설정",
    },
    events: {
      title: "이벤트",
      createNew: "새 이벤트 만들기",
      eventName: "이벤트 이름",
      eventDate: "이벤트 날짜",
      participants: "참가자",
      costumes: "의상",
      addParticipant: "참가자 추가",
      selectCostume: "의상 선택",
      exportPDF: "PDF 내보내기",
      history: "기록",
    },
    costumes: {
      title: "의상",
      createNew: "새 의상 만들기",
      costumeName: "의상 이름",
      color: "색상",
      material: "소재",
      addImage: "이미지 추가",
      recognizeImage: "이미지 인식",
      imageAnalysis: "이미지 분석",
    },
    settings: {
      title: "설정",
      language: "언어",
      theme: "테마",
      notifications: "알림",
      cloudSync: "클라우드 동기화",
      about: "이 앱 정보",
      version: "버전",
      privacyPolicy: "개인정보 보호정책",
      termsOfService: "서비스 약관",
    },
    messages: {
      confirmDelete: "삭제하시겠습니까?",
      deleteSuccess: "삭제되었습니다",
      saveSuccess: "저장되었습니다",
      syncSuccess: "동기화되었습니다",
      syncFailed: "동기화 실패",
      networkError: "네트워크 오류 발생",
      offlineMode: "오프라인 모드",
      onlineMode: "온라인 모드",
    },
  },
  es: {
    app: {
      title: "Coordinador de Vestuario",
      subtitle: "Aplicación de Optimización de Vestuario para Eventos Musicales",
    },
    common: {
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      add: "Añadir",
      back: "Atrás",
      next: "Siguiente",
      previous: "Anterior",
      search: "Buscar",
      filter: "Filtrar",
      sort: "Ordenar",
      settings: "Configuración",
      help: "Ayuda",
      about: "Acerca de",
      logout: "Cerrar sesión",
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
      warning: "Advertencia",
      info: "Información",
    },
    tabs: {
      costumes: "Vestuarios",
      events: "Eventos",
      settings: "Configuración",
    },
    events: {
      title: "Eventos",
      createNew: "Crear Nuevo Evento",
      eventName: "Nombre del Evento",
      eventDate: "Fecha del Evento",
      participants: "Participantes",
      costumes: "Vestuarios",
      addParticipant: "Añadir Participante",
      selectCostume: "Seleccionar Vestuario",
      exportPDF: "Exportar PDF",
      history: "Historial",
    },
    costumes: {
      title: "Vestuarios",
      createNew: "Crear Nuevo Vestuario",
      costumeName: "Nombre del Vestuario",
      color: "Color",
      material: "Material",
      addImage: "Añadir Imagen",
      recognizeImage: "Reconocer Imagen",
      imageAnalysis: "Análisis de Imagen",
    },
    settings: {
      title: "Configuración",
      language: "Idioma",
      theme: "Tema",
      notifications: "Notificaciones",
      cloudSync: "Sincronización en la Nube",
      about: "Acerca de Esta Aplicación",
      version: "Versión",
      privacyPolicy: "Política de Privacidad",
      termsOfService: "Términos de Servicio",
    },
    messages: {
      confirmDelete: "¿Está seguro de que desea eliminar?",
      deleteSuccess: "Eliminado correctamente",
      saveSuccess: "Guardado correctamente",
      syncSuccess: "Sincronizado correctamente",
      syncFailed: "Error en la sincronización",
      networkError: "Error de red",
      offlineMode: "Modo Sin Conexión",
      onlineMode: "Modo En Línea",
    },
  },
  fr: {
    app: {
      title: "Coordinateur de Costumes",
      subtitle: "Application d'Optimisation de Costumes pour Événements Musicaux",
    },
    common: {
      save: "Enregistrer",
      cancel: "Annuler",
      delete: "Supprimer",
      edit: "Modifier",
      add: "Ajouter",
      back: "Retour",
      next: "Suivant",
      previous: "Précédent",
      search: "Rechercher",
      filter: "Filtrer",
      sort: "Trier",
      settings: "Paramètres",
      help: "Aide",
      about: "À propos",
      logout: "Déconnexion",
      loading: "Chargement...",
      error: "Erreur",
      success: "Succès",
      warning: "Avertissement",
      info: "Information",
    },
    tabs: {
      costumes: "Costumes",
      events: "Événements",
      settings: "Paramètres",
    },
    events: {
      title: "Événements",
      createNew: "Créer un Nouvel Événement",
      eventName: "Nom de l'Événement",
      eventDate: "Date de l'Événement",
      participants: "Participants",
      costumes: "Costumes",
      addParticipant: "Ajouter un Participant",
      selectCostume: "Sélectionner un Costume",
      exportPDF: "Exporter en PDF",
      history: "Historique",
    },
    costumes: {
      title: "Costumes",
      createNew: "Créer un Nouveau Costume",
      costumeName: "Nom du Costume",
      color: "Couleur",
      material: "Matériau",
      addImage: "Ajouter une Image",
      recognizeImage: "Reconnaître une Image",
      imageAnalysis: "Analyse d'Image",
    },
    settings: {
      title: "Paramètres",
      language: "Langue",
      theme: "Thème",
      notifications: "Notifications",
      cloudSync: "Synchronisation Cloud",
      about: "À Propos de Cette Application",
      version: "Version",
      privacyPolicy: "Politique de Confidentialité",
      termsOfService: "Conditions d'Utilisation",
    },
    messages: {
      confirmDelete: "Êtes-vous sûr de vouloir supprimer?",
      deleteSuccess: "Supprimé avec succès",
      saveSuccess: "Enregistré avec succès",
      syncSuccess: "Synchronisé avec succès",
      syncFailed: "Échec de la synchronisation",
      networkError: "Erreur réseau",
      offlineMode: "Mode Hors Ligne",
      onlineMode: "Mode En Ligne",
    },
  },
  de: {
    app: {
      title: "Kostüm-Koordinator",
      subtitle: "Kostümoptimierungs-App für Musikveranstaltungen",
    },
    common: {
      save: "Speichern",
      cancel: "Abbrechen",
      delete: "Löschen",
      edit: "Bearbeiten",
      add: "Hinzufügen",
      back: "Zurück",
      next: "Weiter",
      previous: "Zurück",
      search: "Suchen",
      filter: "Filtern",
      sort: "Sortieren",
      settings: "Einstellungen",
      help: "Hilfe",
      about: "Über",
      logout: "Abmelden",
      loading: "Wird geladen...",
      error: "Fehler",
      success: "Erfolg",
      warning: "Warnung",
      info: "Information",
    },
    tabs: {
      costumes: "Kostüme",
      events: "Veranstaltungen",
      settings: "Einstellungen",
    },
    events: {
      title: "Veranstaltungen",
      createNew: "Neue Veranstaltung erstellen",
      eventName: "Name der Veranstaltung",
      eventDate: "Datum der Veranstaltung",
      participants: "Teilnehmer",
      costumes: "Kostüme",
      addParticipant: "Teilnehmer hinzufügen",
      selectCostume: "Kostüm auswählen",
      exportPDF: "Als PDF exportieren",
      history: "Verlauf",
    },
    costumes: {
      title: "Kostüme",
      createNew: "Neues Kostüm erstellen",
      costumeName: "Name des Kostüms",
      color: "Farbe",
      material: "Material",
      addImage: "Bild hinzufügen",
      recognizeImage: "Bild erkennen",
      imageAnalysis: "Bildanalyse",
    },
    settings: {
      title: "Einstellungen",
      language: "Sprache",
      theme: "Design",
      notifications: "Benachrichtigungen",
      cloudSync: "Cloud-Synchronisierung",
      about: "Über diese App",
      version: "Version",
      privacyPolicy: "Datenschutzrichtlinie",
      termsOfService: "Nutzungsbedingungen",
    },
    messages: {
      confirmDelete: "Sind Sie sicher, dass Sie löschen möchten?",
      deleteSuccess: "Erfolgreich gelöscht",
      saveSuccess: "Erfolgreich gespeichert",
      syncSuccess: "Erfolgreich synchronisiert",
      syncFailed: "Synchronisierung fehlgeschlagen",
      networkError: "Netzwerkfehler",
      offlineMode: "Offline-Modus",
      onlineMode: "Online-Modus",
    },
  },
};

/**
 * Set selected language
 */
export const setLanguage = async (language: Language): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    console.log("Language set to:", language);
  } catch (error) {
    console.error("Failed to set language:", error);
    throw error;
  }
};

/**
 * Get selected language
 */
export const getLanguage = async (): Promise<Language> => {
  try {
    const language = await AsyncStorage.getItem(LANGUAGE_KEY);
    return (language as Language) || "en";
  } catch (error) {
    console.error("Failed to get language:", error);
    return "en";
  }
};

/**
 * Get translation for key
 */
export const t = async (key: string): Promise<string> => {
  try {
    const language = await getLanguage();
    const keys = key.split(".");
    let value: any = translations[language];

    for (const k of keys) {
      value = value[k];
      if (!value) {
        // Fallback to English
        value = translations.en;
        for (const k2 of keys) {
          value = value[k2];
        }
        break;
      }
    }

    return typeof value === "string" ? value : key;
  } catch (error) {
    console.error("Failed to get translation:", error);
    return key;
  }
};

/**
 * Get all supported languages
 */
export const getSupportedLanguages = (): LanguageConfig[] => {
  return SUPPORTED_LANGUAGES;
};

/**
 * Get language config
 */
export const getLanguageConfig = (language: Language): LanguageConfig | undefined => {
  return SUPPORTED_LANGUAGES.find((l) => l.code === language);
};

/**
 * Get translation object for current language
 */
export const getTranslations = async (): Promise<Translation> => {
  try {
    const language = await getLanguage();
    return translations[language] || translations.en;
  } catch (error) {
    console.error("Failed to get translations:", error);
    return translations.en;
  }
};

/**
 * Detect system language
 */
export const detectSystemLanguage = (): Language => {
  // In a real app, this would use device locale
  // For now, default to English
  const supportedCodes = SUPPORTED_LANGUAGES.map((l) => l.code);
  const defaultLanguage: Language = "en";

  return supportedCodes.includes(defaultLanguage as Language)
    ? (defaultLanguage as Language)
    : "en";
};
