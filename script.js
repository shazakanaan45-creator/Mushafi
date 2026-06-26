let quranData = [];
let currentFontSize = 34;
let currentSurahIndex = null;

const surahList = document.getElementById("surahList");
const readerPage = document.getElementById("readerPage");
const surahTitle = document.getElementById("surahTitle");
const ayahContainer = document.getElementById("ayahContainer");
const lastRead = document.getElementById("lastRead");
const searchInput = document.getElementById("searchInput");

const simpleSurahNames = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
  "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
  "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
  "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
  "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
  "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
  "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
  "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
  "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
  "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
  "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
  "المسد","الإخلاص","الفلق","الناس"
];

surahList.innerHTML = "<p style='text-align:center;'>جاري تحميل السور...</p>";

fetch("https://api.alquran.cloud/v1/quran/quran-simple")
  .then(response => response.json())
  .then(result => {
    quranData = result.data.surahs.map(surah => ({
      id: surah.number,
      name: simpleSurahNames[surah.number - 1],
      type: surah.revelationType === "Meccan" ? "مكية" : "مدنية",
      ayahs: surah.ayahs.map(a => a.text)
    }));

    renderSurahs(quranData);
    loadLastRead();
  })
  .catch(error => {
    console.error("خطأ في تحميل القرآن:", error);
    surahList.innerHTML = `
      <p style="color:red;text-align:center;">
        لم يتم تحميل القرآن. تأكد من اتصال الإنترنت.
      </p>
    `;
  });

function renderSurahs(data) {
  surahList.innerHTML = "";

  data.forEach((surah) => {
    const card = document.createElement("div");
    card.className = "surah-card";

    card.innerHTML = `
      <div class="surah-number">${surah.id}</div>
      <div>
        <h3>سورة ${surah.name}</h3>
        <span>${surah.type} • ${surah.ayahs.length} آية</span>
      </div>
      <div class="surah-arrow">‹</div>
    `;

    card.onclick = () => openSurahById(surah.id);
    surahList.appendChild(card);
  });
}

function openSurahById(id) {
  const index = quranData.findIndex(surah => surah.id === id);

  if (index !== -1) {
    openSurah(index);
  }
}

function openSurah(index) {
  currentSurahIndex = index;
  const surah = quranData[index];

  document.querySelector(".home-card").classList.add("hidden");
  document.querySelector(".search-box").classList.add("hidden");
  document.querySelector(".section-title").classList.add("hidden");
  surahList.classList.add("hidden");
  readerPage.classList.remove("hidden");

  surahTitle.innerHTML = "﴿ سورة " + surah.name + " ﴾";

  const surahInfo = document.getElementById("surahInfo");
  if (surahInfo) {
    surahInfo.innerHTML = surah.type + " • " + surah.ayahs.length + " آية";
  }

  ayahContainer.innerHTML = "";

  if (surah.id !== 9) {
    ayahContainer.innerHTML += `
      <div class="basmala-box">
        <div class="basmala">
          ﴿ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ﴾
        </div>
      </div>
    `;
  }

  surah.ayahs.forEach((ayah, i) => {
    const div = document.createElement("div");
    div.className = "ayah";

    div.innerHTML = `
      ${ayah}
      <span class="ayahNumber">﴿${i + 1}﴾</span>
    `;

    ayahContainer.appendChild(div);
  });

  ayahContainer.style.fontSize = currentFontSize + "px";

  localStorage.setItem("lastSurahIndex", index);
  localStorage.setItem("lastSurahName", surah.name);

  lastRead.innerText = "آخر قراءة: سورة " + surah.name;

  window.scrollTo(0, 0);
}

function backToHome() {
  readerPage.classList.add("hidden");

  document.querySelector(".home-card").classList.remove("hidden");
  document.querySelector(".search-box").classList.remove("hidden");
  document.querySelector(".section-title").classList.remove("hidden");
  surahList.classList.remove("hidden");

  window.scrollTo(0, 0);
}

function searchSurah() {
  const value = searchInput.value.trim();

  if (value === "") {
    renderSurahs(quranData);
    return;
  }

  const filtered = quranData.filter(surah =>
    surah.name.includes(value) ||
    String(surah.id).includes(value)
  );

  renderSurahs(filtered);
}

function continueReading() {
  const savedIndex = localStorage.getItem("lastSurahIndex");

  if (savedIndex !== null && quranData[savedIndex]) {
    openSurah(Number(savedIndex));
  } else {
    alert("لا توجد قراءة محفوظة بعد");
  }
}

function loadLastRead() {
  const savedName = localStorage.getItem("lastSurahName");

  if (savedName) {
    lastRead.innerText = "آخر قراءة: سورة " + savedName;
  } else {
    lastRead.innerText = "لم يتم حفظ قراءة بعد";
  }
}

function increaseFont() {
  currentFontSize += 2;
  ayahContainer.style.fontSize = currentFontSize + "px";
  localStorage.setItem("fontSize", currentFontSize);
}

function decreaseFont() {
  if (currentFontSize > 22) {
    currentFontSize -= 2;
    ayahContainer.style.fontSize = currentFontSize + "px";
    localStorage.setItem("fontSize", currentFontSize);
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
}

window.addEventListener("load", () => {
  const savedDark = localStorage.getItem("darkMode");
  const savedFont = localStorage.getItem("fontSize");

  if (savedDark === "true") {
    document.body.classList.add("dark");
  }

  if (savedFont) {
    currentFontSize = Number(savedFont);
  }
});
