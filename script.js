let quranData = [];
let currentFontSize = 34;
let currentSurahIndex = null;
let currentAyahIndex = null;
let selectedAyah = null;
let currentFilter = "all";
let quranAudio = new Audio();

let currentAudioUrls = [];

let currentAudioAyahIndex = 0;

let loadedAudioSurahId = null;

let isAudioLoading = false;

let selectedReciter =
  localStorage.getItem("selectedReciter")
  || "ar.alafasy";

const surahList = document.getElementById("surahList");
const readerPage = document.getElementById("readerPage");
const surahTitle = document.getElementById("surahTitle");
const ayahContainer = document.getElementById("ayahContainer");
const lastRead = document.getElementById("lastRead");
const searchInput = document.getElementById("searchInput");
const bottomNav = document.getElementById("bottomNav");

const simpleSurahNames = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام",
  "الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد",
  "إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
  "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء",
  "النمل","القصص","العنكبوت","الروم","لقمان","السجدة",
  "الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
  "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف",
  "محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم",
  "القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر",
  "الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق",
  "التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن",
  "المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ",
  "النازعات","عبس","التكوير","الانفطار","المطففين",
  "الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر",
  "البلد","الشمس","الليل","الضحى","الشرح","التين","العلق",
  "القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر",
  "العصر","الهمزة","الفيل","قريش","الماعون","الكوثر",
  "الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"
];

const BASMALA_PATTERNS = [
  "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
  "بسم الله الرحمن الرحيم"
];

surahList.innerHTML =
  "<p style='text-align:center;'>جاري تحميل السور...</p>";

fetch("https://api.alquran.cloud/v1/quran/quran-simple")
  .then(response => {

    if (!response.ok) {
      throw new Error("فشل تحميل القرآن");
    }

    return response.json();

  })
  .then(result => {

    quranData = result.data.surahs.map(surah => ({

      id: surah.number,

      name: simpleSurahNames[surah.number - 1],

      type:
        surah.revelationType === "Meccan"
          ? "مكية"
          : "مدنية",

      ayahs: surah.ayahs.map(a => a.text)

    }));

    renderSurahs(quranData);
    loadLastRead();
    loadDailyVerse();
    updateDailyProgress();
    updateStreakUI();
    renderBookmarks();
    loadTasbih();

  })
  .catch(error => {

    console.error(
      "خطأ في تحميل القرآن:",
      error
    );

    surahList.innerHTML = `
      <p style="color:red;text-align:center;">
        لم يتم تحميل القرآن.
        تأكد من اتصال الإنترنت.
      </p>
    `;

  });


function renderSurahs(data) {

  surahList.innerHTML = "";

  if (!data.length) {

    surahList.innerHTML = `
      <div class="empty-state">
        لم يتم العثور على سورة مطابقة.
      </div>
    `;

    return;

  }

  data.forEach(surah => {

    const card =
      document.createElement("div");

    card.className = "surah-card";

    card.innerHTML = `
      <div class="surah-number">
        ${surah.id}
      </div>

      <div>

        <h3>
          سورة ${surah.name}
        </h3>

        <span>
          ${surah.type}
          •
          ${surah.ayahs.length}
          آية
        </span>

      </div>

      <div class="surah-arrow">
        ‹
      </div>
    `;

    card.onclick = () =>
      openSurahById(surah.id);

    surahList.appendChild(card);

  });

}


function applySurahFilters() {

  const value =
    searchInput.value.trim();

  const filtered =
    quranData.filter(surah => {

      const matchesSearch =
        value === "" ||
        surah.name.includes(value) ||
        String(surah.id).includes(value);

      const matchesType =
        currentFilter === "all" ||
        surah.type === currentFilter;

      return (
        matchesSearch &&
        matchesType
      );

    });

  renderSurahs(filtered);

}


function filterSurahs(type, button) {

  currentFilter = type;

  document
    .querySelectorAll(".filter-btn")
    .forEach(btn => {

      btn.classList.remove("active");

    });

  if (button) {

    button.classList.add("active");

  }

  applySurahFilters();

}


function searchSurah() {

  applySurahFilters();

}


function openSurahById(
  id,
  ayahIndex = null
) {

  const index =
    quranData.findIndex(
      surah => surah.id === id
    );

  if (index !== -1) {

    openSurah(
      index,
      ayahIndex
    );

  }

}


function normalizeAyahText(
  text,
  surahId,
  ayahIndex
) {

  if (
    surahId === 1 ||
    surahId === 9 ||
    ayahIndex !== 0
  ) {

    return text;

  }

  let cleanText = text.trim();

  BASMALA_PATTERNS.forEach(pattern => {

    if (
      cleanText.startsWith(pattern)
    ) {

      cleanText =
        cleanText
          .slice(pattern.length)
          .trim();

    }

  });

  return cleanText;

}


function openSurah(
  index,
  ayahIndex = null
) {

  currentSurahIndex = index;
  currentAyahIndex = ayahIndex;

  const surah =
    quranData[index];
  stopSurahAudio();

currentAudioUrls = [];

loadedAudioSurahId = null;

currentAudioAyahIndex =
  ayahIndex !== null
    ? ayahIndex
    : 0;

const reciterSelect =
  document.getElementById(
    "reciterSelect"
  );

if (reciterSelect) {

  reciterSelect.value =
    selectedReciter;

}

  document
    .querySelectorAll(".page-section")
    .forEach(page => {

      page.classList.add("hidden");

    });

  readerPage.classList.remove("hidden");

  bottomNav.classList.add("hidden");

  surahTitle.innerHTML =
    "﴿ سورة " +
    surah.name +
    " ﴾";

  const surahInfo =
    document.getElementById(
      "surahInfo"
    );

  if (surahInfo) {

    surahInfo.innerHTML =
      surah.type +
      " • " +
      surah.ayahs.length +
      " آية";

  }

  ayahContainer.innerHTML = "";

  if (
    surah.id !== 1 &&
    surah.id !== 9
  ) {

    const basmalaBox =
      document.createElement("div");

    basmalaBox.className =
      "basmala-box";

    basmalaBox.innerHTML = `
      <div class="basmala">
        ﴿ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ﴾
      </div>
    `;

    ayahContainer.appendChild(
      basmalaBox
    );

  }

  const quranText =
    document.createElement("div");

  quranText.className = "quran-text";

  surah.ayahs.forEach(
    (originalAyah, i) => {

      const ayah =
        normalizeAyahText(
          originalAyah,
          surah.id,
          i
        );

      if (!ayah) {

        return;

      }

      const ayahSpan =
        document.createElement("span");

      ayahSpan.className = "ayah";

      ayahSpan.dataset.ayahIndex = i;

      const ayahText =
        document.createElement("span");

      ayahText.className =
        "ayah-text";

      ayahText.textContent = ayah;

      const ayahNumber =
        document.createElement("span");

      ayahNumber.className =
        "ayahNumber";

      ayahNumber.textContent =
        i + 1;

      ayahSpan.appendChild(
        ayahText
      );

      ayahSpan.appendChild(
        document.createTextNode(" ")
      );

      ayahSpan.appendChild(
        ayahNumber
      );

      ayahSpan.onclick = () => {

        openAyahActions(
          index,
          i
        );

      };

      quranText.appendChild(
        ayahSpan
      );

      quranText.appendChild(
        document.createTextNode(" ")
      );

    }
  );

  ayahContainer.appendChild(
    quranText
  );

  ayahContainer.style.fontSize =
    currentFontSize + "px";

  localStorage.setItem(
    "lastSurahIndex",
    index
  );

  localStorage.setItem(
    "lastSurahName",
    surah.name
  );

  if (ayahIndex !== null) {

    localStorage.setItem(
      "lastAyahIndex",
      ayahIndex
    );

  }

  lastRead.innerText =
    "آخر قراءة: سورة " +
    surah.name;

  registerReadingDay();

  setTimeout(() => {

    if (ayahIndex !== null) {

      const target =
        ayahContainer.querySelector(
          `[data-ayah-index="${ayahIndex}"]`
        );

      if (target) {

        target.scrollIntoView({

          behavior:"smooth",

          block:"center"

        });

      }

    } else {

      readerPage.scrollIntoView({

        behavior:"smooth",

        block:"start"

      });

    }

  },100);

}


function backToHome() {

  readerPage.classList.add("hidden");

  bottomNav.classList.remove("hidden");

  showPage(

    "homePage",

    document.querySelector(
      '[data-page="homePage"]'
    )

  );

}


function continueReading() {

  const savedIndex =
    localStorage.getItem(
      "lastSurahIndex"
    );

  const savedAyah =
    localStorage.getItem(
      "lastAyahIndex"
    );

  if (
    savedIndex !== null &&
    quranData[savedIndex]
  ) {

    openSurah(

      Number(savedIndex),

      savedAyah !== null
        ? Number(savedAyah)
        : null

    );

  } else {

    showToast(
      "لا توجد قراءة محفوظة بعد"
    );

  }

}


function loadLastRead() {

  const savedName =
    localStorage.getItem(
      "lastSurahName"
    );

  const savedAyah =
    localStorage.getItem(
      "lastAyahIndex"
    );

  if (savedName) {

    lastRead.innerText =
      "آخر قراءة: سورة " +
      savedName +
      (
        savedAyah !== null
          ? " • الآية " +
            (
              Number(savedAyah) + 1
            )
          : ""
      );

  } else {

    lastRead.innerText =
      "لم يتم حفظ قراءة بعد";

  }

}


function increaseFont() {

  if (currentFontSize >= 52) {

    return;

  }

  currentFontSize += 2;

  ayahContainer.style.fontSize =
    currentFontSize + "px";

  localStorage.setItem(
    "fontSize",
    currentFontSize
  );

}


function decreaseFont() {

  if (currentFontSize > 22) {

    currentFontSize -= 2;

    ayahContainer.style.fontSize =
      currentFontSize + "px";

    localStorage.setItem(
      "fontSize",
      currentFontSize
    );

  }

}


function toggleDarkMode() {

  document.body.classList.toggle(
    "dark"
  );

  localStorage.setItem(

    "darkMode",

    document.body.classList.contains(
      "dark"
    )

  );

}


function showPage(
  pageId,
  button
) {

  readerPage.classList.add("hidden");

  bottomNav.classList.remove("hidden");

  document
    .querySelectorAll(".page-section")
    .forEach(page => {

      page.classList.add("hidden");

    });

  document
    .getElementById(pageId)
    .classList.remove("hidden");

  document
    .querySelectorAll(".nav-btn")
    .forEach(btn => {

      btn.classList.remove("active");

    });

  if (button) {

    button.classList.add("active");

  }

  if (
    pageId === "bookmarksPage"
  ) {

    renderBookmarks();

  }

  if (
    pageId === "tasbihPage"
  ) {

    loadTasbih();

  }

  window.scrollTo({

    top:0,

    behavior:"smooth"

  });

}


function openAyahActions(
  surahIndex,
  ayahIndex
) {

  const surah =
    quranData[surahIndex];

  const cleanText =
    normalizeAyahText(

      surah.ayahs[ayahIndex],

      surah.id,

      ayahIndex

    );

  selectedAyah = {

    surahId:surah.id,

    surahName:surah.name,

    ayahIndex:ayahIndex,

    ayahNumber:ayahIndex + 1,

    text:cleanText

  };

  currentAyahIndex = ayahIndex;

  localStorage.setItem(
    "lastAyahIndex",
    ayahIndex
  );

  localStorage.setItem(
    "lastSurahIndex",
    surahIndex
  );

  localStorage.setItem(
    "lastSurahName",
    surah.name
  );

  loadLastRead();

  incrementDailyProgress();

  document
    .getElementById(
      "selectedAyahTitle"
    )
    .innerText =
      `سورة ${surah.name} • الآية ${ayahIndex + 1}`;

  document
    .getElementById(
      "selectedAyahPreview"
    )
    .innerText =
      selectedAyah.text;

  document
    .getElementById(
      "ayahActionSheet"
    )
    .classList.remove("hidden");

}


function closeAyahActions(event) {

  if (
    event &&
    event.target !== event.currentTarget
  ) {

    return;

  }

  document
    .getElementById(
      "ayahActionSheet"
    )
    .classList.add("hidden");

}


function saveSelectedAyah() {

  if (!selectedAyah) {

    return;

  }

  const bookmarks =
    getBookmarks();

  const exists =
    bookmarks.some(item =>

      item.surahId ===
        selectedAyah.surahId &&

      item.ayahNumber ===
        selectedAyah.ayahNumber

    );

  if (exists) {

    showToast(
      "الآية محفوظة مسبقاً"
    );

    return;

  }

  bookmarks.unshift(
    selectedAyah
  );

  localStorage.setItem(

    "bookmarks",

    JSON.stringify(bookmarks)

  );

  showToast(
    "تم حفظ الآية"
  );

  closeAyahActions();

}


function copySelectedAyah() {

  if (!selectedAyah) {

    return;

  }

  copyText(

    formatAyahText(
      selectedAyah
    )

  )
    .then(() => {

      showToast(
        "تم نسخ الآية"
      );

      closeAyahActions();

    })
    .catch(() => {

      showToast(
        "تعذر النسخ"
      );

    });

}


function shareSelectedAyah() {

  if (!selectedAyah) {

    return;

  }

  shareText(

    formatAyahText(
      selectedAyah
    )

  );

  closeAyahActions();

}


function getBookmarks() {

  try {

    return JSON.parse(

      localStorage.getItem(
        "bookmarks"
      )

    ) || [];

  } catch {

    return [];

  }

}


function renderBookmarks() {

  const container =
    document.getElementById(
      "bookmarksList"
    );

  if (!container) {

    return;

  }

  const bookmarks =
    getBookmarks();

  container.innerHTML = "";

  if (!bookmarks.length) {

    container.innerHTML = `
      <div class="empty-state">

        لا توجد آيات محفوظة بعد.

        <br>

        اضغطي على أي آية داخل القارئ
        ثم اختاري حفظ.

      </div>
    `;

    return;

  }

  bookmarks.forEach(
    (item,index) => {

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "bookmark-card";

      card.innerHTML = `
        <p>

          ${item.text}

          <span class="ayahNumber">
            ${item.ayahNumber}
          </span>

        </p>

        <div class="bookmark-meta">

          <span>
            سورة ${item.surahName}
          </span>

          <button
            onclick="removeBookmark(${index})"
          >
            حذف
          </button>

        </div>
      `;

      card.onclick = event => {

        if (
          event.target.tagName
            .toLowerCase() ===
          "button"
        ) {

          return;

        }

        openSurahById(

          item.surahId,

          item.ayahIndex

        );

      };

      container.appendChild(
        card
      );

    }
  );

}


function removeBookmark(index) {

  const bookmarks =
    getBookmarks();

  bookmarks.splice(
    index,
    1
  );

  localStorage.setItem(

    "bookmarks",

    JSON.stringify(bookmarks)

  );

  renderBookmarks();

  showToast(
    "تم حذف الآية من المحفوظات"
  );

}


function getTodayKey() {

  const now = new Date();

  return (

    now.getFullYear() +

    "-" +

    String(
      now.getMonth() + 1
    ).padStart(2,"0") +

    "-" +

    String(
      now.getDate()
    ).padStart(2,"0")

  );

}


function getDailyGoal() {

  return (

    Number(

      localStorage.getItem(
        "dailyGoal"
      )

    ) || 10

  );

}


function openDailyGoalModal() {

  document
    .getElementById(
      "dailyGoalModal"
    )
    .classList.remove("hidden");

}


function closeDailyGoalModal(event) {

  if (
    event &&
    event.target !== event.currentTarget
  ) {

    return;

  }

  document
    .getElementById(
      "dailyGoalModal"
    )
    .classList.add("hidden");

}


function setDailyGoal(goal) {

  localStorage.setItem(
    "dailyGoal",
    goal
  );

  updateDailyProgress();

  closeDailyGoalModal();

  showToast(
    `تم تحديد الورد: ${goal} آية يومياً`
  );

}


function getDailyProgressData() {

  try {

    return JSON.parse(

      localStorage.getItem(
        "dailyProgress"
      )

    ) || {};

  } catch {

    return {};

  }

}


function incrementDailyProgress() {

  const today =
    getTodayKey();

  const data =
    getDailyProgressData();

  if (!data[today]) {

    data[today] = [];

  }

  if (selectedAyah) {

    const key =
      `${selectedAyah.surahId}:${selectedAyah.ayahNumber}`;

    if (
      !data[today].includes(key)
    ) {

      data[today].push(key);

      localStorage.setItem(

        "dailyProgress",

        JSON.stringify(data)

      );

      updateDailyProgress();

    }

  }

}


function updateDailyProgress() {

  const goal =
    getDailyGoal();

  const today =
    getTodayKey();

  const data =
    getDailyProgressData();

  const count =
    data[today]
      ? data[today].length
      : 0;

  const percent =
    Math.min(

      100,

      Math.round(
        (count / goal) * 100
      )

    );

  document
    .getElementById(
      "dailyGoalTitle"
    )
    .innerText =
      `${goal} آيات يومياً`;

  document
    .getElementById(
      "dailyProgressText"
    )
    .innerText =
      `${count} / ${goal}`;

  document
    .getElementById(
      "dailyProgressBar"
    )
    .style.width =
      percent + "%";

  document
    .getElementById(
      "dailyGoalText"
    )
    .innerText =

      count >= goal

        ? "ما شاء الله، أتممتِ ورد اليوم ✨"

        : `تبقى لك ${Math.max(
            0,
            goal - count
          )} آية لإتمام ورد اليوم`;

}


function startDailyWird() {

  const savedIndex =
    localStorage.getItem(
      "lastSurahIndex"
    );

  const savedAyah =
    localStorage.getItem(
      "lastAyahIndex"
    );

  if (
    savedIndex !== null &&
    quranData[savedIndex]
  ) {

    openSurah(

      Number(savedIndex),

      savedAyah !== null
        ? Number(savedAyah)
        : null

    );

  } else {

    openSurah(0);

  }

}


function loadDailyVerse() {

  if (!quranData.length) {

    return;

  }

  const today =
    getTodayKey();

  const numericSeed =
    [...today].reduce(

      (sum,char) =>
        sum + char.charCodeAt(0),

      0

    );

  const surahIndex =
    numericSeed %
    quranData.length;

  const surah =
    quranData[surahIndex];

  const ayahIndex =
    numericSeed %
    surah.ayahs.length;

  const dailyVerse = {

    surahId:surah.id,

    surahName:surah.name,

    ayahNumber:ayahIndex + 1,

    ayahIndex:ayahIndex,

    text:normalizeAyahText(

      surah.ayahs[ayahIndex],

      surah.id,

      ayahIndex

    )

  };

  localStorage.setItem(

    "dailyVerse",

    JSON.stringify(dailyVerse)

  );

  document
    .getElementById(
      "dailyVerseText"
    )
    .innerText =
      dailyVerse.text;

  document
    .getElementById(
      "dailyVerseSource"
    )
    .innerText =
      `سورة ${dailyVerse.surahName} • الآية ${dailyVerse.ayahNumber}`;

}


function getDailyVerse() {

  try {

    return JSON.parse(

      localStorage.getItem(
        "dailyVerse"
      )

    );

  } catch {

    return null;

  }

}


function copyDailyVerse() {

  const verse =
    getDailyVerse();

  if (!verse) {

    return;

  }

  copyText(

    formatAyahText(verse)

  )
    .then(() => {

      showToast(
        "تم نسخ آية اليوم"
      );

    })
    .catch(() => {

      showToast(
        "تعذر النسخ"
      );

    });

}


function shareDailyVerse() {

  const verse =
    getDailyVerse();

  if (!verse) {

    return;

  }

  shareText(

    formatAyahText(verse)

  );

}


function formatAyahText(item) {

  return (

    item.text +

    " ﴿" +

    item.ayahNumber +

    "﴾\nسورة " +

    item.surahName

  );

}


function copyText(text) {

  if (
    navigator.clipboard &&
    navigator.clipboard.writeText
  ) {

    return navigator.clipboard
      .writeText(text);

  }

  return new Promise(
    (resolve,reject) => {

      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value = text;

      document.body.appendChild(
        textarea
      );

      textarea.select();

      try {

        document.execCommand(
          "copy"
        );

        resolve();

      } catch (error) {

        reject(error);

      } finally {

        textarea.remove();

      }

    }
  );

}


function shareText(text) {

  if (navigator.share) {

    navigator.share({

      title:"مصحفي",

      text:text

    }).catch(() => {});

  } else {

    copyText(text)

      .then(() => {

        showToast(
          "تم نسخ الآية للمشاركة"
        );

      })

      .catch(() => {

        showToast(
          "تعذر المشاركة"
        );

      });

  }

}


function registerReadingDay() {

  const today =
    getTodayKey();

  let days = [];

  try {

    days = JSON.parse(

      localStorage.getItem(
        "readingDays"
      )

    ) || [];

  } catch {

    days = [];

  }

  if (
    !days.includes(today)
  ) {

    days.push(today);

    localStorage.setItem(

      "readingDays",

      JSON.stringify(days)

    );

  }

  updateStreakUI();

}


function updateStreakUI() {

  let days = [];

  try {

    days = JSON.parse(

      localStorage.getItem(
        "readingDays"
      )

    ) || [];

  } catch {

    days = [];

  }

  const daySet =
    new Set(days);

  let streak = 0;

  let date =
    new Date();

  while (true) {

    const key =

      date.getFullYear() +

      "-" +

      String(
        date.getMonth() + 1
      ).padStart(2,"0") +

      "-" +

      String(
        date.getDate()
      ).padStart(2,"0");

    if (
      daySet.has(key)
    ) {

      streak++;

      date.setDate(
        date.getDate() - 1
      );

    } else {

      break;

    }

  }

  document
    .getElementById(
      "streakDays"
    )
    .innerText =
      streak;

}


function getTasbihState() {

  try {

    return JSON.parse(

      localStorage.getItem(
        "tasbihState"
      )

    ) || {

      phrase:"سبحان الله",

      count:0,

      target:33

    };

  } catch {

    return {

      phrase:"سبحان الله",

      count:0,

      target:33

    };

  }

}


function saveTasbihState(state) {

  localStorage.setItem(

    "tasbihState",

    JSON.stringify(state)

  );

}


function loadTasbih() {

  const state =
    getTasbihState();

  document
    .getElementById(
      "tasbihPhrase"
    )
    .value =
      state.phrase;

  document
    .getElementById(
      "tasbihCount"
    )
    .innerText =
      state.count;

  document
    .getElementById(
      "tasbihTargetText"
    )
    .innerText =
      `${state.count} / ${state.target}`;

  const percent =
    Math.min(

      100,

      Math.round(

        (
          state.count /
          state.target
        ) * 100

      )

    );

  document
    .getElementById(
      "tasbihProgressBar"
    )
    .style.width =
      percent + "%";

}


function incrementTasbih() {

  const state =
    getTasbihState();

  state.count += 1;

  if (
    navigator.vibrate
  ) {

    navigator.vibrate(20);

  }

  if (
    state.count ===
    state.target
  ) {

    showToast(
      "ما شاء الله، تم إكمال الهدف ✨"
    );

    if (
      navigator.vibrate
    ) {

      navigator.vibrate([
        80,
        50,
        80
      ]);

    }

  }

  saveTasbihState(state);

  loadTasbih();

}


function changeTasbihPhrase() {

  const state =
    getTasbihState();

  state.phrase =
    document
      .getElementById(
        "tasbihPhrase"
      )
      .value;

  state.count = 0;

  saveTasbihState(state);

  loadTasbih();

}


function changeTasbihTarget() {

  const current =
    getTasbihState();

  const value =
    prompt(

      "أدخلي هدف التسبيح",

      current.target

    );

  if (
    value === null
  ) {

    return;

  }

  const target =
    Number(value);

  if (
    !Number.isInteger(target) ||
    target <= 0 ||
    target > 10000
  ) {

    showToast(
      "أدخلي رقماً صحيحاً أكبر من صفر"
    );

    return;

  }

  current.target =
    target;

  saveTasbihState(
    current
  );

  loadTasbih();

}


function resetTasbih() {

  const state =
    getTasbihState();

  state.count = 0;

  saveTasbihState(state);

  loadTasbih();

  showToast(
    "تم تصفير العداد"
  );

}


let toastTimer;


function showToast(message) {

  const toast =
    document.getElementById(
      "toast"
    );

  toast.innerText =
    message;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(() => {

      toast.classList.remove(
        "show"
      );

    },2200);

}
async function loadSurahAudio(
  surahId,
  forceReload = false
) {

  if (
    !forceReload &&
    loadedAudioSurahId === surahId &&
    currentAudioUrls.length
  ) {

    return true;

  }

  if (isAudioLoading) {

    return false;

  }

  isAudioLoading = true;

  updateAudioStatus(
    "جاري تحميل التلاوة..."
  );

  try {

    const response = await fetch(

      `https://api.alquran.cloud/v1/surah/${surahId}/${selectedReciter}`

    );

    if (!response.ok) {

      throw new Error(
        "Audio request failed"
      );

    }

    const result =
      await response.json();

    if (
      !result.data ||
      !result.data.ayahs
    ) {

      throw new Error(
        "Audio data unavailable"
      );

    }

    currentAudioUrls =
      result.data.ayahs.map(
        ayah => ayah.audio
      );

    loadedAudioSurahId =
      surahId;

    updateAudioStatus(
      "جاهز للتشغيل"
    );

    return true;

  } catch (error) {

    console.error(
      "Audio error:",
      error
    );

    currentAudioUrls = [];

    updateAudioStatus(
      "تعذر تحميل التلاوة"
    );

    showToast(
      "تعذر تحميل صوت القارئ"
    );

    return false;

  } finally {

    isAudioLoading = false;

  }

}


async function toggleSurahAudio() {

  if (
    currentSurahIndex === null
  ) {

    return;

  }

  if (
    !quranAudio.paused &&
    !quranAudio.ended
  ) {

    quranAudio.pause();

    updateAudioPlayButton(false);

    updateAudioStatus(
      "متوقف مؤقتاً"
    );

    return;

  }

  if (
    quranAudio.src &&
    quranAudio.currentTime > 0 &&
    !quranAudio.ended
  ) {

    try {

      await quranAudio.play();

      updateAudioPlayButton(true);

      updateAudioStatus(
        "جاري الاستماع"
      );

    } catch (error) {

      showToast(
        "تعذر تشغيل الصوت"
      );

    }

    return;

  }

  const surah =
    quranData[currentSurahIndex];

  const loaded =
    await loadSurahAudio(
      surah.id
    );

  if (!loaded) {

    return;

  }

  let startIndex = 0;

  const savedAyah =
    localStorage.getItem(
      "lastAyahIndex"
    );

  if (
    savedAyah !== null &&
    Number(savedAyah) <
      surah.ayahs.length
  ) {

    startIndex =
      Number(savedAyah);

  }

  playAudioAyah(
    startIndex
  );

}


async function playAudioAyah(index) {

  if (
    currentSurahIndex === null
  ) {

    return;

  }

  const surah =
    quranData[currentSurahIndex];

  if (
    index < 0 ||
    index >= surah.ayahs.length
  ) {

    stopSurahAudio();

    return;

  }

  if (
    loadedAudioSurahId !==
      surah.id ||
    !currentAudioUrls.length
  ) {

    const loaded =
      await loadSurahAudio(
        surah.id
      );

    if (!loaded) {

      return;

    }

  }

  const audioUrl =
    currentAudioUrls[index];

  if (!audioUrl) {

    showToast(
      "الصوت غير متوفر لهذه الآية"
    );

    return;

  }

  quranAudio.pause();

  quranAudio.src =
    audioUrl;

  currentAudioAyahIndex =
    index;

  quranAudio.currentTime = 0;

  localStorage.setItem(
    "lastAyahIndex",
    index
  );

  highlightAudioAyah(
    index
  );

  updateAudioAyahInfo();

  updateAudioStatus(
    "جاري الاستماع"
  );

  try {

    await quranAudio.play();

    updateAudioPlayButton(true);

  } catch (error) {

    console.error(
      "Playback error:",
      error
    );

    updateAudioPlayButton(false);

    updateAudioStatus(
      "تعذر تشغيل الصوت"
    );

    showToast(
      "تعذر تشغيل التلاوة"
    );

  }

}


function nextAudioAyah() {

  if (
    currentSurahIndex === null
  ) {

    return;

  }

  playAudioAyah(
    currentAudioAyahIndex + 1
  );

}


function previousAudioAyah() {

  if (
    currentSurahIndex === null
  ) {

    return;

  }

  playAudioAyah(
    currentAudioAyahIndex - 1
  );

}


function stopSurahAudio() {

  quranAudio.pause();

  quranAudio.currentTime = 0;

  quranAudio.removeAttribute(
    "src"
  );

  quranAudio.load();

  updateAudioPlayButton(false);

  updateAudioStatus(
    "جاهز للتشغيل"
  );

  const progressBar =
    document.getElementById(
      "audioProgressBar"
    );

  if (progressBar) {

    progressBar.style.width =
      "0%";

  }

  document
    .querySelectorAll(
      ".ayah.audio-active"
    )
    .forEach(ayah => {

      ayah.classList.remove(
        "audio-active"
      );

    });

}


function highlightAudioAyah(index) {

  document
    .querySelectorAll(
      ".ayah.audio-active"
    )
    .forEach(ayah => {

      ayah.classList.remove(
        "audio-active"
      );

    });

  const target =
    ayahContainer.querySelector(

      `[data-ayah-index="${index}"]`

    );

  if (!target) {

    return;

  }

  target.classList.add(
    "audio-active"
  );

  target.scrollIntoView({

    behavior:"smooth",

    block:"center"

  });

}


function updateAudioAyahInfo() {

  if (
    currentSurahIndex === null
  ) {

    return;

  }

  const surah =
    quranData[currentSurahIndex];

  const info =
    document.getElementById(
      "audioAyahInfo"
    );

  if (info) {

    info.innerText =

      `سورة ${surah.name} • الآية ${currentAudioAyahIndex + 1} من ${surah.ayahs.length}`;

  }

}


function updateAudioStatus(text) {

  const status =
    document.getElementById(
      "audioStatus"
    );

  if (status) {

    status.innerText =
      text;

  }

}


function updateAudioPlayButton(
  playing
) {

  const button =
    document.getElementById(
      "audioPlayButton"
    );

  if (!button) {

    return;

  }

  if (playing) {

    button.innerHTML = `
      ⏸
      <span>إيقاف مؤقت</span>
    `;

  } else {

    button.innerHTML = `
      ▶
      <span>تشغيل</span>
    `;

  }

}


async function changeReciter() {

  const select =
    document.getElementById(
      "reciterSelect"
    );

  selectedReciter =
    select.value;

  localStorage.setItem(

    "selectedReciter",

    selectedReciter

  );

  stopSurahAudio();

  currentAudioUrls = [];

  loadedAudioSurahId = null;

  if (
    currentSurahIndex !== null
  ) {

    const surah =
      quranData[currentSurahIndex];

    await loadSurahAudio(

      surah.id,

      true

    );

  }

  showToast(
    "تم تغيير القارئ"
  );

}


quranAudio.addEventListener(
  "ended",
  () => {

    if (
      currentSurahIndex === null
    ) {

      return;

    }

    const surah =
      quranData[currentSurahIndex];

    if (
      currentAudioAyahIndex <
      surah.ayahs.length - 1
    ) {

      playAudioAyah(

        currentAudioAyahIndex + 1

      );

    } else {

      updateAudioPlayButton(false);

      updateAudioStatus(
        "تمت السورة"
      );

      showToast(
        "تمت السورة ✨"
      );

    }

  }
);


quranAudio.addEventListener(
  "timeupdate",
  () => {

    if (
      !quranAudio.duration ||
      Number.isNaN(
        quranAudio.duration
      )
    ) {

      return;

    }

    const percent =

      (
        quranAudio.currentTime /
        quranAudio.duration
      ) * 100;

    const progressBar =
      document.getElementById(
        "audioProgressBar"
      );

    if (progressBar) {

      progressBar.style.width =

        Math.min(
          100,
          percent
        ) + "%";

    }

  }
);


quranAudio.addEventListener(
  "error",
  () => {

    updateAudioPlayButton(false);

    updateAudioStatus(
      "حدث خطأ في الصوت"
    );

  }
);

window.addEventListener(
  "load",
  () => {

    const savedDark =
      localStorage.getItem(
        "darkMode"
      );

    const savedFont =
      localStorage.getItem(
        "fontSize"
      );

    if (
      savedDark === "true"
    ) {

      document.body
        .classList.add(
          "dark"
        );

    }

    if (savedFont) {

      currentFontSize =
        Number(savedFont);

    }

  }
);
