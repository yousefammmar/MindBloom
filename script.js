/**
 * MindBloom - Dashboard Logic (Forest Edition)
 */

// --- State Management ---
const EVENTS_KEY = "mindbloom_events";
const TASKS_KEY = "mindbloom_tasks";
const FOCUS_TIME_KEY = "mindbloom_focus_time";
const HOUR_HEIGHT = 100;

const state = {
    events: [
        { id: 1, title: "Calculus Lecture", date: "2025-09-15", startHour: 9, duration: 1.5, type: "lecture", completed: false },
    ],
    tasks: [],
    focusTime: 0, // in minutes
    currentDate: new Date(),
    miniCalDate: new Date(),
    bgView: "week", // 'day', 'week', 'month'
    filters: new Set(["lecture", "lab", "study", "assignment", "default"]),
    sentNotifications: new Set(),
    categories: [
        { id: 'lecture', name: 'Lecture', color: 'bg-blue' },
        { id: 'lab', name: 'Lab', color: 'bg-green' },
        { id: 'study', name: 'Study', color: 'bg-purple' },
        { id: 'assignment', name: 'Assignment', color: 'bg-red' },
        { id: 'default', name: 'Other', color: 'bg-yellow' }
    ]
};

// --- DOM Elements ---
const dom = {
    miniMonthTitle: document.getElementById("mini-cal-month-year"),
    miniGrid: document.getElementById("mini-cal-grid"),
    miniPrev: document.getElementById("mini-prev"),
    miniNext: document.getElementById("mini-next"),

    mainHeaderTitle: document.getElementById("main-header-title"),
    weekHeaderRow: document.getElementById("week-header-row"),
    scheduleBody: document.getElementById("schedule-grid-body"),
    addBtn: document.getElementById("add-schedule-btn"),

    // View Containers
    scheduleView: document.getElementById("schedule-view"),
    monthViewContainer: document.getElementById("month-view-container"),
    boardViewContainer: document.getElementById("board-view-container"),
    analyticsViewContainer: document.getElementById("analytics-view-container"),
    fullMonthGrid: document.getElementById("full-month-grid"),

    // View Buttons
    viewBtns: document.querySelectorAll(".view-btn"),

    // Filters
    filterItems: document.querySelectorAll(".filter-item"),

    // Modal Refs
    modalOverlay: document.getElementById("event-modal"),
    closeModalBtn: document.getElementById("close-modal-btn"),
    cancelModalBtn: document.getElementById("cancel-modal-btn"),
    addEventForm: document.getElementById("add-event-form"),

    // About Refs
    aboutBtn: document.getElementById("about-us-btn"),
    aboutModal: document.getElementById("about-modal"),
    closeAboutBtn: document.getElementById("close-about-btn"),

    // Stats Refs
    todayTasksStat: document.getElementById("stats-today-tasks"),
    completionStat: document.getElementById("stats-completion"),
    focusTimeStat: document.getElementById("stats-focus-time"),

    // Todo Refs
    todoList: document.getElementById("todo-list"),
    todoInput: document.getElementById("todo-input"),
    addTodoBtn: document.getElementById("add-todo-btn"),

    // Timer Refs
    timerDisplay: document.getElementById("timer-display"),
    timerToggleBtn: document.getElementById("timer-toggle-btn"),
    eventIdHidden: document.getElementById("event-id-hidden"),
    modalTitle: document.querySelector("#event-modal h3")
};

/**
 * Splits an event that spans past midnight into multiple daily blocks
 * @param {Object} event - The original event
 * @param {Date} viewStart - Start of view range
 * @param {Date} viewEnd - End of view range
 * @returns {Array} Array of event blocks for each day
 */
function splitEventIntoDailyBlocks(event, viewStart, viewEnd) {
    const blocks = [];
    let currentStartHour = event.startHour;
    let remainingDuration = event.duration;
    let currentDate = new Date(event.date);
    currentDate.setHours(0, 0, 0, 0);

    // Limit lookahead/loop to prevent infinite loops on bad data
    let safetyCounter = 0;
    while (remainingDuration > 0 && safetyCounter < 40) {
        safetyCounter++;
        const hoursInDay = 24 - currentStartHour;
        const durationThisDay = Math.min(remainingDuration, hoursInDay);

        // Only add if this day is within the requested view range
        if (currentDate >= viewStart && currentDate <= viewEnd) {
            const dateKey = formatDateKey(currentDate);
            blocks.push({
                ...event,
                date: dateKey,
                startHour: currentStartHour,
                duration: durationThisDay,
                isOverflowPart: currentStartHour === 0 && event.startHour !== 0
            });
        }

        remainingDuration -= durationThisDay;
        if (remainingDuration <= 0) break;

        currentStartHour = 0; // Starts at midnight on next day
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return blocks;
}

// --- Constants ---
const COLORS = {
    // Dynamic colors will be handled by state.categories
    // Keeping this for backward compatibility if needed, or mapping base colors
    bgBlue: "bg-blue",
    bgGreen: "bg-green",
    bgPurple: "bg-purple",
    bgRed: "bg-red",
    bgYellow: "bg-yellow",
    bgOrange: "bg-orange",
    bgPink: "bg-pink",
    bgCyan: "bg-cyan"
};

const COLOR_OPTIONS = [
    { value: 'bg-blue', label: 'Blue' },
    { value: 'bg-green', label: 'Green' },
    { value: 'bg-purple', label: 'Purple' },
    { value: 'bg-red', label: 'Red' },
    { value: 'bg-yellow', label: 'Yellow' },
    { value: 'bg-orange', label: 'Orange' },
    { value: 'bg-pink', label: 'Pink' },
    { value: 'bg-cyan', label: 'Cyan' }
];

const HEX_COLORS = {
    'bg-blue': '#40c4ff',
    'bg-green': '#69f0ae',
    'bg-purple': '#7c4dff',
    'bg-red': '#ff5252',
    'bg-yellow': '#ffd740',
    'bg-orange': '#ffab40',
    'bg-pink': '#ff4081',
    'bg-cyan': '#18ffff',
    'bg-gray': '#9e9e9e'
};

const STUDY_DUAS = [
    "اللهمّ يا مسهّل الشديد، و يا مُليِّن الحديد، و يا منجز الوعيد، سهّل عليّ دراستي، اللهمّ بك أدفع ما لا أطيق.",
    "يا رب قوِّني على الحفظ والفهم، أنت الأعلم سبحانك بسرّي و جهري، و القادر بقدرتك على تيسير عُسري.",
    "لا إله إلّا الله الحليم الكريم، ربّ العرش العظيم، سهّل عليّ دراستي، وهوِّن عليّ عِبئها، وبارك لي في وقتي وجهدي.",
    "اللهمّ نسألك أن تفتح علينا فتوح العارفين، يا من يجيب المضطرّ إذا دعاه، يا من يقول للشيء كن فيكون.",
    "اللهمّ أعِنّي على الدراسة، ولا تجعل قلبي يملّ منها، وكن معي في كل لحظة، ووفقني لما تحب وترضى.",
    "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي يَفْقَهُوا قَوْلِي.",
    "اللهمَّ لا سهلَ إلا ما جعلتَه سهلًا، و أنت تجعلُ الحَزْنَ إذا شئتَ سهلًا.",
    "اللهمّ أخرجنا من ظلمات الوَهم، وأكرمنا بنور الفهم، وافتح علينا بمعرفة العلم، وحسّن أخلاقنا بالحلم.",
    "اللهم افتح عليّ فتوح العارفين بحكمتك، وانشر عليّ رحمتك، وذكّرني ما نسيت عند الحاجة إليه.",
    "اللهم افتح لي أبواب حكمتك، وانشر عليّ رحمتك، وامنن عليّ بالحفظ والفهم، سبحانك لا علم لنا إلا ما علمتنا.",
    "ربِّ أسألك فهم النبيين، وأسألك حفظ المرسلين، وأن تملأ قلبي بخشيتك، وتسرّني بطاعتك.",
    "اللهم أكرمني بجودة الحفظ وسرعة الفهم، وثبات العقل، والذهن، والذاكرة.",
    "اللهمّ ارزقني التوفيق والنجاح في دراستي وأكرمني بالدرجات العالية.",
    "اللهمّ إني استودعك كلّ ما قرأته وكلّ ما حفظته وتعلمته، فأسألك أن تردّه إلَيَّ عند الحاجة له.",
    "اللهم يا رب العالمين، إنِّي توكلت عليك وسلمت أمري كلَّه إليك، اللهم اجعل الصَّعب لي سهلًا."
];


// --- Initialization ---
function init() {
    loadState();
    setupListeners();
    renderMiniCalendar();
    renderFilterList(); // Initial render of filters
    renderMainView();
    renderTodoItems();
    updateStats();
    Pomodoro.init();
    autoScroll();
    requestNotificationPermission();
    createGlowBlobs(); // Start background animation
    setInterval(() => {
        checkTaskStarts();
        renderMainView(); // Refresh grid to update statuses in real-time
    }, 30000); // Check every 30 seconds
}

function requestNotificationPermission() {
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }
}

function checkTaskStarts() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const now = new Date();
    const today = formatDateKey(now);
    const currentHour = now.getHours() + (now.getMinutes() / 60);

    state.events.forEach(evt => {
        if (evt.date === today) {
            // Check if current time is within 1 minute of start time
            const diff = Math.abs(currentHour - evt.startHour) * 60; // difference in minutes
            if (diff <= 1 && !state.sentNotifications.has(evt.id)) {
                new Notification("Task Starting Now!", {
                    body: `${evt.title} is scheduled to start.`,
                    icon: 'logo.png'
                });
                state.sentNotifications.add(evt.id);
            }
        }
    });
}

function createGlowBlobs() {
    const container = document.getElementById("glow-container");
    if (!container) return;

    const colors = ["#D4AF37", "#7B2FBE", "#FFD700", "#4B0082", "#C9A84C", "#6A0DAD"];

    for (let i = 0; i < 12; i++) {
        const blob = document.createElement("div");
        blob.className = "glow-blob";

        const size = Math.random() * 150 + 100;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const duration = Math.random() * 10 + 20; // 20-30s
        const delay = Math.random() * 20;
        const color = colors[Math.floor(Math.random() * colors.length)];

        blob.style.width = `${size}px`;
        blob.style.height = `${size}px`;
        blob.style.left = `${left}%`;
        blob.style.top = `${top}%`;
        blob.style.backgroundColor = color;
        blob.style.animationDuration = `${duration}s`;
        blob.style.animationDelay = `-${delay}s`;

        container.appendChild(blob);
    }
}

function autoScroll() {
    // Scroll to 8 AM (8 * HOUR_HEIGHT)
    if (dom.scheduleBody) {
        dom.scheduleBody.scrollTop = 7 * HOUR_HEIGHT; // Slightly above 8 AM
    }
}

function loadState() {
    const storedEvents = localStorage.getItem(EVENTS_KEY);
    const storedTasks = localStorage.getItem(TASKS_KEY);
    const storedFocus = localStorage.getItem(FOCUS_TIME_KEY);

    if (storedEvents) state.events = JSON.parse(storedEvents);

    const savedFilters = localStorage.getItem("mindbloom_filters");
    if (savedFilters) {
        state.filters = new Set(JSON.parse(savedFilters));
    }

    const savedCategories = localStorage.getItem("mindbloom_categories");
    if (savedCategories) {
        state.categories = JSON.parse(savedCategories);
    }

    if (storedTasks) state.tasks = JSON.parse(storedTasks);
    if (storedFocus) state.focusTime = parseFloat(storedFocus);

    // Always reset view dates to today on refresh for better UX
    state.currentDate = new Date();
    state.miniCalDate = new Date();
}

function saveCategories() {
    localStorage.setItem("mindbloom_categories", JSON.stringify(state.categories));
}

// --- Category Management ---
function renderCategoryManager() {
    const list = document.getElementById("category-list-container");
    list.innerHTML = "";

    state.categories.forEach(cat => {
        const item = document.createElement("div");
        item.className = "cat-manage-item";
        item.innerHTML = `
            <div class="cat-preview">
                <span class="cat-dot ${cat.color}"></span>
                <span>${cat.name}</span>
            </div>
            ${cat.id !== 'default' ? `<button class="delete-cat-btn" data-id="${cat.id}">&times;</button>` : ''}
        `;

        if (cat.id !== 'default') {
            item.querySelector(".delete-cat-btn").addEventListener("click", () => {
                removeCategory(cat.id);
            });
        }

        list.appendChild(item);
    });

    // Populate Color Select - REMOVED
}

function addCategory(name, color) {
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (state.categories.find(c => c.id === id)) {
        showToast("Category already exists", "error");
        return;
    }

    state.categories.push({ id, name, color });
    state.filters.add(id); // Auto-show new category
    saveCategories();
    renderCategoryManager();
    renderCategoryOptions(); // Update Add Event modal
    renderFilterList(); // Update sidebar
    showToast("Category added", "success");
}

function removeCategory(id) {
    state.categories = state.categories.filter(c => c.id !== id);
    // Remap events with this category to default
    state.events.forEach(e => {
        if (e.type === id) e.type = 'default';
    });
    saveState();
    saveCategories();
    renderCategoryManager();
    renderCategoryOptions();
    renderFilterList();
    renderMainView();
    showToast("Category removed", "success");
}

function renderCategoryOptions() {
    const select = document.getElementById("event-type");
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = "";

    state.categories.forEach(cat => {
        const op = document.createElement("option");
        op.value = cat.id;
        op.textContent = cat.name;
        select.appendChild(op);
    });

    if (currentVal && state.categories.find(c => c.id === currentVal)) {
        select.value = currentVal;
    }
}



function saveState() {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(state.events));
    localStorage.setItem(TASKS_KEY, JSON.stringify(state.tasks));
    localStorage.setItem(FOCUS_TIME_KEY, state.focusTime.toString());
}

function setupListeners() {
    dom.miniPrev.addEventListener("click", () => {
        state.miniCalDate.setMonth(state.miniCalDate.getMonth() - 1);
        renderMiniCalendar();
    });

    // Dashboard Date Picker
    const dashboardDateInput = document.getElementById("dashboard-date-input");
    const dashboardDateBtn = document.getElementById("dashboard-date-btn");

    if (dashboardDateInput && dashboardDateBtn) {
        // Open on button click
        dashboardDateBtn.addEventListener("click", () => {
            try {
                dashboardDateInput.showPicker();
            } catch (err) {
                // Fallback for browsers not supporting showPicker
                dashboardDateInput.focus();
                dashboardDateInput.click();
            }
        });

        // Update state on change
        dashboardDateInput.addEventListener("change", (e) => {
            if (e.target.value) {
                // Fix timezone issue by treating input as YYYY-MM-DD local
                const [y, m, d] = e.target.value.split('-').map(Number);
                state.currentDate = new Date(y, m - 1, d);
                // Also update mini cal logic
                state.miniCalDate = new Date(state.currentDate);
                renderMainView();
                renderMiniCalendar();
            }
        });
    }

    dom.miniNext.addEventListener("click", () => {
        state.miniCalDate.setMonth(state.miniCalDate.getMonth() + 1);
        renderMiniCalendar();
    });

    dom.addBtn.addEventListener("click", openModal);

    dom.closeModalBtn.addEventListener("click", closeModal);
    dom.cancelModalBtn.addEventListener("click", closeModal);




    dom.modalOverlay.addEventListener("click", (e) => {
        if (e.target === dom.modalOverlay) closeModal();
    });

    dom.addEventForm.addEventListener("submit", saveEvent);

    // About Modal Listeners
    if (dom.aboutBtn) {
        dom.aboutBtn.addEventListener("click", () => {
            dom.aboutModal.classList.remove("hidden");
        });
        dom.closeAboutBtn.addEventListener("click", () => {
            dom.aboutModal.classList.add("hidden");
        });
        dom.aboutModal.addEventListener("click", (e) => {
            if (e.target === dom.aboutModal) dom.aboutModal.classList.add("hidden");
        });
    }

    // Sidebar Toggle (Mobile)
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    const sidebar = document.querySelector(".app-sidebar");

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener("click", (e) => {
            if (window.innerWidth <= 768 &&
                !sidebar.contains(e.target) &&
                !mobileMenuBtn.contains(e.target) &&
                sidebar.classList.contains("open")) {
                sidebar.classList.remove("open");
            }
        });
    }

    // View Switchers
    dom.viewBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            // Update active state
            dom.viewBtns.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");

            // Update View State
            const view = e.target.getAttribute("data-view");
            state.bgView = view;
            renderMainView();
        });
    });

    // Calendar Filters
    // Calendar Filters - Handled in renderFilterList or Delegation?
    // Let's use Delegation for robustness
    const filterList = document.getElementById("filter-list-ul");
    if (filterList) {
        filterList.addEventListener("click", (e) => {
            const item = e.target.closest(".filter-item");
            if (!item) return;

            const filterType = item.getAttribute("data-filter");
            if (state.filters.has(filterType)) {
                state.filters.delete(filterType);
                item.classList.remove("active");
            } else {
                state.filters.add(filterType);
                item.classList.add("active");
            }
            renderMainView();
        });
    }

    // Todo Listeners
    dom.addTodoBtn.addEventListener("click", addTodo);
    dom.todoInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") addTodo();
    });

    // Recurrence Listeners
    const recurrenceSelect = document.getElementById('event-recurrence');
    const weeklyDaysGroup = document.getElementById('weekly-days-group');
    const recurrenceEndGroup = document.getElementById('recurrence-end-group');
    const recurrenceEndTypeSelect = document.getElementById('event-recurrence-end-type');
    const recurrenceEndDateGroup = document.getElementById('recurrence-end-date-group');

    if (recurrenceSelect) {
        recurrenceSelect.addEventListener('change', (e) => {
            const type = e.target.value;

            // Show/hide weekly days selector
            if (type === 'weekly') {
                weeklyDaysGroup.classList.remove('hidden');
            } else {
                weeklyDaysGroup.classList.add('hidden');
            }

            // Show/hide end date options
            if (type !== 'none') {
                recurrenceEndGroup.classList.remove('hidden');
            } else {
                recurrenceEndGroup.classList.add('hidden');
                recurrenceEndDateGroup.classList.add('hidden');
            }
        });
    }

    if (recurrenceEndTypeSelect) {
        recurrenceEndTypeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'on') {
                recurrenceEndDateGroup.classList.remove('hidden');
            } else {
                recurrenceEndDateGroup.classList.add('hidden');
            }
        });
    }

    // Weekday button toggles
    if (weeklyDaysGroup) {
        const weekdayBtns = weeklyDaysGroup.querySelectorAll('.weekday-btn');
        weekdayBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                btn.classList.toggle('active');
            });
        });
    }
}

// --- Render Router ---
function renderMainView() {
    // Sync Date Picker Input
    const dateInput = document.getElementById("dashboard-date-input");
    if (dateInput) {
        dateInput.value = formatDateKey(state.currentDate);
    }

    // 1. Hide ALL views first
    [dom.scheduleView, dom.monthViewContainer, dom.boardViewContainer, dom.analyticsViewContainer].forEach(el => {
        if (el) {
            el.classList.add("hidden");
            el.style.display = "none"; // Ensure display:none is applied
            el.style.opacity = "0";
        }
    });

    // 2. Show Active View
    if (state.bgView === "month") {
        dom.monthViewContainer.classList.remove("hidden");
        dom.monthViewContainer.style.display = "block";
        setTimeout(() => dom.monthViewContainer.style.opacity = "1", 10);
        renderFullMonthGrid();
    } else if (state.bgView === "board") {
        dom.boardViewContainer.classList.remove("hidden");
        dom.boardViewContainer.style.display = "flex"; // Kanban needs flex
        setTimeout(() => dom.boardViewContainer.style.opacity = "1", 10);
        renderKanbanBoard();
    } else if (state.bgView === "analytics") {
        dom.analyticsViewContainer.classList.remove("hidden");
        dom.analyticsViewContainer.style.display = "block";
        setTimeout(() => dom.analyticsViewContainer.style.opacity = "1", 10);
        renderAnalytics();
    } else {
        // Default: Week or Day
        dom.scheduleView.classList.remove("hidden");
        dom.scheduleView.style.display = "block";
        setTimeout(() => dom.scheduleView.style.opacity = "1", 10);

        // Pass 'days' count logic
        const isDay = state.bgView === "day";
        renderWeeklyGrid(isDay ? 1 : 7);
    }

    // Smooth fade-in
    const containers = [dom.scheduleView, dom.monthViewContainer, dom.boardViewContainer, dom.analyticsViewContainer];
    containers.forEach(c => {
        if (!c.classList.contains("hidden")) {
            c.style.opacity = "0";
            setTimeout(() => {
                c.style.transition = "opacity 0.3s ease";
                c.style.opacity = "1";
            }, 10);
        }
    });

    renderCategoryOptions(); // Ensure modal is up to date
}


// --- Ramadan Prayer Helpers ---
let cachedPrayerTimings = null;
let lastPrayerFetchDate = null;
let prayerInterval = null;

async function getDailyPrayerTimes() {
    const today = new Date().toDateString();
    if (cachedPrayerTimings && lastPrayerFetchDate === today) {
        return cachedPrayerTimings;
    }
    try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        const city = ipData.city || 'Amman';
        const country = ipData.country_name || 'Jordan';

        const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`);
        const data = await res.json();
        cachedPrayerTimings = data.data.timings;
        lastPrayerFetchDate = today;
        return cachedPrayerTimings;
    } catch (e) {
        console.error('Error fetching prayer times', e);
        return { Fajr: "05:00", Maghrib: "18:00" };
    }
}

async function updatePrayerRemaining() {
    const el = document.getElementById('prayer-time-remaining');
    if (!el) return;

    // Clear any existing interval to prevent multiple timers
    if (prayerInterval) clearInterval(prayerInterval);

    const timings = await getDailyPrayerTimes();
    if (!timings) {
        el.innerText = "Prayer times unavailable.";
        return;
    }

    const updateText = () => {
        const now = new Date();
        const getNextTime = (str) => {
            const timeStr = str.substring(0, 5);
            const [h, m] = timeStr.split(':').map(Number);
            const dt = new Date();
            dt.setHours(h, m, 0, 0);
            if (dt < now) dt.setDate(dt.getDate() + 1);
            return dt;
        };

        const fajr = getNextTime(timings.Fajr);
        const maghrib = getNextTime(timings.Maghrib);

        let target = fajr < maghrib ? fajr : maghrib;
        let name = fajr < maghrib ? "Fajr" : "Maghrib";

        const diffMs = target - now;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

        const activeEl = document.getElementById('prayer-time-remaining');
        if (activeEl) {
            const hStr = hours.toString().padStart(2, '0');
            const mStr = mins.toString().padStart(2, '0');
            const sStr = secs.toString().padStart(2, '0');
            activeEl.innerHTML = `⏱️ Countdown to <b>${name}</b>: <span style="font-family: monospace; letter-spacing: 1px;">${hStr}:${mStr}:${sStr}</span>`;
        } else {
            // If the element is gone (view changed), stop the interval
            if (prayerInterval) {
                clearInterval(prayerInterval);
                prayerInterval = null;
            }
        }
    };

    updateText();
    prayerInterval = setInterval(updateText, 1000); // update every second for high precision
}

// --- Analytics ---
function renderAnalytics() {
    // Use the correct DOM reference defined in 'dom' object
    const container = dom.analyticsViewContainer;
    if (!container) return;

    container.innerHTML = '';

    // 1. Calculate Stats
    let totalHours = 0;
    let totalEvents = 0;
    let completedEvents = 0;
    const statusCounts = { 'waiting': 0, 'progress': 0, 'done': 0 };

    state.events.forEach(evt => {
        if (!state.filters.has(evt.type)) return;

        const duration = evt.duration || 1;
        totalHours += duration;
        totalEvents++;

        if (evt.completed) completedEvents++;

        const status = getEventStatus(evt);
        if (statusCounts[status] !== undefined) {
            statusCounts[status]++;
        }
    });

    const completionRate = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

    // 2. Render Header
    const title = document.createElement("h3");
    title.className = "analytics-title";
    title.innerHTML = `Running Analytics`;
    container.appendChild(title);

    if (totalEvents === 0) {
        container.innerHTML += `<div class="empty-chart">No schedules found.</div>`;
        return;
    }

    // 3. Render Stats Grid
    const grid = document.createElement("div");
    grid.className = "stats-grid";

    // Helper to create card
    const createCard = (label, value, subtext, icon, colorClass) => {
        return `
            <div class="stat-card ${colorClass}">
                <div class="stat-icon">${icon}</div>
                <div class="stat-content">
                    <div class="stat-value">${value}</div>
                    <div class="stat-label">${label}</div>
                    ${subtext ? `<div class="stat-subtext">${subtext}</div>` : ''}
                </div>
            </div>
        `;
    };

    grid.innerHTML = `
        ${createCard('Total Focus', `${totalHours}h`, 'Scheduled Time', '⏱️', 'stat-blue')}
        ${createCard('Completion', `${completionRate}%`, `${completedEvents}/${totalEvents} Tasks`, '✅', 'stat-green')}
        ${createCard('To Do', statusCounts.waiting, 'Pending Tasks', '⏳', 'stat-gray')}
        ${createCard('In Progress', statusCounts.progress, 'Active Now', '⚡', 'stat-yellow')}
    `;

    container.appendChild(grid);

    // Append Ramadan Status
    const randomDua = STUDY_DUAS[Math.floor(Math.random() * STUDY_DUAS.length)];
    const ramadanBox = document.createElement("div");
    ramadanBox.className = "ramadan-status-box";
    ramadanBox.innerHTML = `
        <h3 style="margin-top: 2rem; margin-bottom: 1rem; color: #D4AF37; text-align: center; text-shadow: 0 0 10px rgba(212,175,55,0.4);">🌙 Ramadan Status</h3>
        <div class="ramadan-content" style="background: rgba(10, 10, 30, 0.4); padding: 25px; border-radius: 12px; border: 1px solid rgba(123, 47, 190, 0.5); box-shadow: 0 4px 15px rgba(0,0,0,0.3); backdrop-filter: blur(5px);">
            <div style="font-size: 1.3rem; margin-bottom: 20px; text-align: center; color: #EAEAEA; font-family: 'Outfit', sans-serif; line-height: 1.8; min-height: 80px; display: flex; align-items: center; justify-content: center;">
                "${randomDua}"
            </div>
            <div id="prayer-time-remaining" style="text-align: center; font-size: 1.4rem; color: #D4AF37; font-weight: 600; text-shadow: 0 0 10px rgba(212,175,55,0.3);">
                Calculating prayer times...
            </div>
        </div>
    `;
    container.appendChild(ramadanBox);

    updatePrayerRemaining();
}

// --- Modal Logic ---
function openModal() {
    // Reset modal for "Add" mode
    if (dom.eventIdHidden) dom.eventIdHidden.value = "";
    if (dom.modalTitle) dom.modalTitle.textContent = "Add New Schedule";

    // Set default date to currently selected date (or today)
    const dateInput = document.getElementById("event-date");
    dateInput.value = formatDateKey(state.currentDate);

    dom.modalOverlay.classList.remove("hidden");
}

function closeModal() {
    dom.modalOverlay.classList.add("hidden");
    dom.addEventForm.reset();
    // Reset recurrence UI
    document.getElementById('weekly-days-group').classList.add('hidden');
    document.getElementById('recurrence-end-group').classList.add('hidden');
    document.getElementById('recurrence-end-date-group').classList.add('hidden');
    const weekdayBtns = document.querySelectorAll('.weekday-btn');
    weekdayBtns.forEach(btn => btn.classList.remove('active'));
}

// --- Recurring Event Helpers ---
/**
 * Generates recurring event instances for a date range
 * @param {Object} event - The parent recurring event
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Array} Array of generated event instances
 */
function generateRecurringInstances(event, startDate, endDate) {
    if (!event.isRecurring || !event.recurrence || event.recurrence.type === 'none') {
        return [];
    }

    const instances = [];
    const eventDate = new Date(event.date);
    const recurrence = event.recurrence;
    const recurrenceEndDate = recurrence.endDate ? new Date(recurrence.endDate) : null;

    // Set time to start of day for comparison
    eventDate.setHours(0, 0, 0, 0);
    const viewStart = new Date(startDate);
    viewStart.setHours(0, 0, 0, 0);
    const viewEnd = new Date(endDate);
    viewEnd.setHours(0, 0, 0, 0);

    if (recurrenceEndDate) recurrenceEndDate.setHours(0, 0, 0, 0);

    // Look back 1 day to catch events that started late yesterday and overflow into today
    const generateFrom = new Date(viewStart);
    generateFrom.setDate(generateFrom.getDate() - 1);
    // But don't go before the original event date
    const finalStart = generateFrom > eventDate ? generateFrom : eventDate;

    let currentDate = new Date(finalStart);

    // Safety limit: max 730 days (2 years) of  recurrence generation
    const maxIterations = 730;
    let iterations = 0;

    while (currentDate <= viewEnd && iterations < maxIterations) {
        iterations++;

        // Check if we've passed the recurrence end date
        if (recurrenceEndDate && currentDate > recurrenceEndDate) {
            break;
        }

        let shouldGenerate = false;

        if (recurrence.type === 'daily') {
            shouldGenerate = true;
        } else if (recurrence.type === 'weekly') {
            const dayOfWeek = currentDate.getDay();
            shouldGenerate = recurrence.weekdays && recurrence.weekdays.includes(dayOfWeek);
        } else if (recurrence.type === 'monthly') {
            shouldGenerate = currentDate.getDate() === eventDate.getDate();
        }

        if (shouldGenerate) {
            // Create instance
            const instanceDateKey = formatDateKey(currentDate);
            const instanceId = `${event.id}-${instanceDateKey}`;

            // Check for exceptions (status overrides)
            let status = event.manualStatus;
            let isCompleted = event.completed;

            if (event.recurrenceExceptions && event.recurrenceExceptions[instanceDateKey]) {
                const exception = event.recurrenceExceptions[instanceDateKey];
                status = exception.manualStatus;
                isCompleted = exception.completed;
            }

            const instance = {
                ...event,
                id: instanceId, // Unique ID for instance
                date: instanceDateKey,
                isRecurringInstance: true,
                recurringParentId: event.id,
                manualStatus: status,
                completed: isCompleted
            };

            // Split into daily blocks in case it spans midnight
            const blocks = splitEventIntoDailyBlocks(instance, viewStart, viewEnd);
            instances.push(...blocks);
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return instances;
}

/**
 * Filters and merges recurring events with one-time events
 * @param {Array} events - All events from state
 * @param {Date} viewStartDate - Start of current view
 * @param {Date} viewEndDate - End of current view
 * @returns {Array} Merged event list with recurring instances
 */
function getAllEventsForView(events, viewStartDate, viewEndDate) {
    const allEvents = [];
    const viewStart = new Date(viewStartDate);
    viewStart.setHours(0, 0, 0, 0);
    const viewEnd = new Date(viewEndDate);
    viewEnd.setHours(23, 59, 59, 999);

    events.forEach(event => {
        if (event.isRecurring) {
            // Generate instances for this recurring event
            const instances = generateRecurringInstances(event, viewStart, viewEnd);
            allEvents.push(...instances);
        } else {
            // Split non-recurring event into daily blocks in case it spans midnight
            const blocks = splitEventIntoDailyBlocks(event, viewStart, viewEnd);
            allEvents.push(...blocks);
        }
    });

    return allEvents;
}

function saveEvent(e) {
    e.preventDefault();

    const title = document.getElementById("event-title").value;
    const date = document.getElementById("event-date").value;
    const timeStr = document.getElementById("event-start").value; // "HH:MM"
    const duration = parseFloat(document.getElementById("event-duration").value);
    const type = document.getElementById("event-type").value;
    const manualStatus = document.getElementById("event-status-input").value;
    const priority = document.getElementById("event-priority").value;
    const description = document.getElementById("event-description").value;

    if (!timeStr) {
        showToast("Please select a valid start time.", 'error');
        return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        showToast("Cannot add events for past dates. Please select today or a future date.", 'error');
        closeModal();
        return;
    }

    // Parse Time (HH:MM -> Decimal)
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
        showToast("Invalid time entered.", 'error');
        return;
    }
    const startHour = h + (m / 60);

    // Capture Recurrence data
    const recurrenceType = document.getElementById('event-recurrence').value;
    const recurrence = {
        type: recurrenceType,
        weekdays: [],
        endDate: null
    };

    // Get selected weekdays for weekly recurrence
    if (recurrenceType === 'weekly') {
        const selectedDays = Array.from(document.querySelectorAll('.weekday-btn.active'));
        recurrence.weekdays = selectedDays.map(btn => parseInt(btn.getAttribute('data-day')));

        // Validate at least one day is selected for weekly
        if (recurrence.weekdays.length === 0) {
            showToast('Please select at least one day for weekly recurrence', 'error');
            return;
        }
    }

    // Get end date if specified
    const recurrenceEndType = document.getElementById('event-recurrence-end-type').value;
    if (recurrenceEndType === 'on') {
        const endDateValue = document.getElementById('event-recurrence-end-date').value;
        if (!endDateValue) {
            showToast("Please select an end date for the recurring event.", 'error');
            return;
        }
        recurrence.endDate = endDateValue;
    }

    const eventId = dom.eventIdHidden.value;
    if (eventId) {
        // Edit mode
        const evtIndex = state.events.findIndex(e => e.id == eventId);
        if (evtIndex !== -1) {
            state.events[evtIndex] = {
                ...state.events[evtIndex],
                title,
                date,
                startHour,
                duration,
                type,
                manualStatus: manualStatus,
                completed: manualStatus === 'done',
                priority,
                description,
                recurrence,
                isRecurring: recurrenceType !== 'none'
            };
            showToast("Schedule updated!", "success");
        }
    } else {
        // Add mode
        const newEvent = {
            id: Date.now(),
            title,
            date,
            startHour,
            duration,
            type,
            manualStatus: manualStatus,
            completed: manualStatus === 'done',
            priority,
            description,
            recurrence,
            isRecurring: recurrenceType !== 'none'
        };
        state.events.push(newEvent);
        showToast("Schedule saved!", "success");
    }

    saveState();
    renderMainView();
    closeModal();
}

function openEditModal(id) {
    // Handle recurring instance composite IDs (e.g. "170000-2026-02-20")
    // If it's a composite ID, the prefix is the parent Event ID.
    let searchId = id;
    if (typeof id === 'string' && id.includes('-')) {
        const parts = id.split('-');
        // Verify first part is numeric (timestamp)
        if (parts[0].match(/^\d+$/)) {
            searchId = parts[0];
        }
    }

    // Use loose equality to match string vs number ID
    const evt = state.events.find(e => e.id == searchId);
    if (!evt) return;

    openModal();
    if (dom.modalTitle) dom.modalTitle.textContent = "Edit Schedule";
    dom.eventIdHidden.value = evt.id;

    document.getElementById("event-title").value = evt.title;
    document.getElementById("event-date").value = evt.date;

    // Convert decimal hour back to HH:MM for input
    const h = Math.floor(evt.startHour);
    const m = Math.round((evt.startHour - h) * 60);
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    document.getElementById("event-start").value = timeStr;

    document.getElementById("event-duration").value = evt.duration;
    document.getElementById("event-type").value = evt.type;
    document.getElementById("event-status-input").value = evt.manualStatus || "auto";
    document.getElementById("event-priority").value = evt.priority || "normal";
    document.getElementById("event-description").value = evt.description || "";

    // Update pickers
    if (CustomPicker.date.instances['event-date']) {
        CustomPicker.date.instances['event-date'].selected = new Date(evt.date);
    }
    CustomPicker.time.selected = timeStr;

    // Trigger Recurrence UI updates
    const recurrenceSelect = document.getElementById('event-recurrence');
    recurrenceSelect.value = evt.recurrence ? evt.recurrence.type : 'none';
    recurrenceSelect.dispatchEvent(new Event('change'));

    // Trigger End Date Type UI updates
    if (evt.recurrence && evt.recurrence.type !== 'none') {
        const endTypeSelect = document.getElementById('event-recurrence-end-type');
        // Ensure the select handles the value correctly
        const hasEndDate = !!evt.recurrence.endDate;
        endTypeSelect.value = hasEndDate ? 'on' : 'never';
        endTypeSelect.dispatchEvent(new Event('change'));

        // Populate End Date Input
        if (hasEndDate) {
            const endDateInput = document.getElementById('event-recurrence-end-date');
            endDateInput.value = evt.recurrence.endDate;
            if (CustomPicker.date.instances['event-recurrence-end-date']) {
                CustomPicker.date.instances['event-recurrence-end-date'].selected = new Date(evt.recurrence.endDate);
            }
        }

        // Select Weekdays
        if (evt.recurrence.type === 'weekly') {
            const weekdayBtns = document.querySelectorAll('.weekday-btn');
            weekdayBtns.forEach(btn => {
                const day = parseInt(btn.getAttribute('data-day'));
                if (evt.recurrence.weekdays.includes(day)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }
}

// --- Logic Helpers ---
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diffSun = d.getDate() - day;
    return new Date(d.setDate(diffSun));
}

function renderFilterList() {
    const list = document.getElementById("filter-list-ul");
    if (!list) return;
    list.innerHTML = "";

    state.categories.forEach(cat => {
        const li = document.createElement("li");
        li.className = `filter-item ${state.filters.has(cat.id) ? 'active' : ''}`;
        li.setAttribute("data-filter", cat.id);

        // We need to match the CSS for checkbox-visual. 
        // Assuming it's a styled div. We can add inline style for the color.
        const colorHex = HEX_COLORS[cat.color] || '#ccc';

        li.innerHTML = `
            <div class="checkbox-visual" style="background-color: ${state.filters.has(cat.id) ? colorHex : 'transparent'}; border-color: ${colorHex}"></div>
            <span>${cat.name}</span>
        `;

        list.appendChild(li);
    });
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getTypeColorClass(type) {
    const cat = state.categories.find(c => c.id === type);
    return cat ? cat.color : 'bg-gray';
}

// --- Mini Calendar ---
function renderMiniCalendar() {
    const year = state.miniCalDate.getFullYear();
    const month = state.miniCalDate.getMonth();

    dom.miniMonthTitle.textContent = state.miniCalDate.toLocaleDateString("en-US", { month: 'long', year: 'numeric' });

    const headers = Array.from(dom.miniGrid.children).slice(0, 7);
    dom.miniGrid.innerHTML = "";
    headers.forEach(h => dom.miniGrid.appendChild(h));

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayIndex = firstDay.getDay(); // 0 Sun

    // Padding
    for (let i = 0; i < startDayIndex; i++) {
        const el = document.createElement("div");
        dom.miniGrid.appendChild(el);
    }

    // Days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const d = new Date(year, month, i);
        const el = document.createElement("div");
        el.className = "mini-cal-day";
        el.textContent = i;

        if (d.toDateString() === new Date().toDateString()) {
            el.classList.add("active");
        }

        el.addEventListener("click", () => {
            state.currentDate = d;
            renderMainView();
            document.querySelectorAll(".mini-cal-day").forEach(c => c.classList.remove("active"));
            el.classList.add("active");
        });

        dom.miniGrid.appendChild(el);
    }
}

// --- Weekly/Day Grid ---
function renderWeeklyGrid(dayCount) {
    let daysToRender = [];

    if (dayCount === 1) {
        // Day View: Just render selected day
        daysToRender.push(new Date(state.currentDate));
        dom.mainHeaderTitle.textContent = state.currentDate.toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' });
    } else {
        // Week View
        const startOfWeek = getStartOfWeek(state.currentDate);
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            daysToRender.push(d);
        }
        dom.mainHeaderTitle.textContent = startOfWeek.toLocaleDateString("en-US", { month: 'long', year: 'numeric' });
    }

    // Header
    dom.scheduleView.style.setProperty('--day-count', dayCount);
    dom.weekHeaderRow.innerHTML = `<div class="week-header-cell">Time</div>`;
    dom.weekHeaderRow.style.gridTemplateColumns = `60px repeat(${dayCount}, 1fr)`;

    daysToRender.forEach(d => {
        const isToday = d.toDateString() === new Date().toDateString();
        dom.weekHeaderRow.innerHTML += `
            <div class="week-header-cell ${isToday ? 'today' : ''}">
                <span class="wh-day-name">${d.toLocaleDateString("en-US", { weekday: 'short' })}</span>
                <span class="wh-day-num">${d.getDate()}</span>
            </div>
        `;
    });

    // Body
    dom.scheduleBody.innerHTML = "";
    dom.scheduleBody.style.gridTemplateColumns = `60px repeat(${dayCount}, 1fr)`;

    // Time Column (Extended to 24h)
    const startHour = 0; // Start at midnight
    const endHour = 24;  // End at midnight

    const timeCol = document.createElement("div");
    timeCol.className = "time-col";

    for (let h = startHour; h < endHour; h++) {
        const slot = document.createElement("div");
        slot.className = "time-slot-label";
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        slot.textContent = `${displayH}:00 ${ampm}`;
        timeCol.appendChild(slot);
    }
    dom.scheduleBody.appendChild(timeCol);

    // Day Columns & Events
    daysToRender.forEach(dayDate => {
        const dayCol = document.createElement("div");
        dayCol.className = "day-col";
        // Increase height to match 24h * HOUR_HEIGHT
        dayCol.style.height = `${(endHour - startHour) * HOUR_HEIGHT}px`;

        // Grid Lines
        for (let h = startHour; h < endHour; h++) {
            const line = document.createElement("div");
            line.className = "grid-line";
            dayCol.appendChild(line);
        }

        const dayKey = formatDateKey(dayDate);

        // Quick Add Listener
        dayCol.addEventListener("click", (e) => {
            if (e.target !== dayCol) return; // Only if clicking empty space
            const rect = dayCol.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const clickedHour = Math.floor(y / HOUR_HEIGHT);

            // Open modal with pre-filled time
            openModal();
            const timeInput = document.getElementById("event-start");
            const dateInput = document.getElementById("event-date");
            timeInput.value = `${String(clickedHour).padStart(2, '0')}:00`;
            dateInput.value = dayKey;

            // Highlight selected slot temporarily
            const highlight = document.createElement("div");
            highlight.className = "slot-highlight";
            highlight.style.top = `${clickedHour * HOUR_HEIGHT}px`;
            dayCol.appendChild(highlight);
            setTimeout(() => highlight.remove(), 1000);
        });

        // Use getAllEventsForView to include recurring events
        const dayStart = new Date(dayDate);
        const dayEnd = new Date(dayDate);
        const allEvents = getAllEventsForView(state.events, dayStart, dayEnd);
        const todaysEvents = allEvents.filter(e => e.date === dayKey && state.filters.has(e.type));

        todaysEvents.forEach(evt => {
            // Render logic...
            const top = evt.startHour * HOUR_HEIGHT;
            const height = evt.duration * HOUR_HEIGHT;

            const status = getEventStatus(evt);
            const statusLabels = {
                'done': 'Done',
                'progress': 'In Progress',
                'waiting': 'Waiting'
            };

            const el = document.createElement("div");
            el.className = `event-block ${getTypeColorClass(evt.type)} ${status === 'done' ? 'completed' : ''}`;
            el.style.top = `${top}px`;
            el.style.height = `${height}px`;
            const statusIcons = {
                'auto': '🔄',
                'waiting': '⏳',
                'progress': '⚡',
                'done': '✅'
            };

            // Add recurring indicator
            const recurringIndicator = (evt.isRecurring || evt.isRecurringInstance) ? '<span class="recurring-indicator">🔄</span>' : '';

            el.innerHTML = `
                 <div class="status-indicator-border ${status}"></div>
                 <div class="status-watermark">${status === 'done' ? '✓' : ''}</div>
                 ${recurringIndicator}
                 <span class="event-title">${evt.title}</span>
                 <span class="event-time">${formatTime(evt.startHour)} - ${formatTime(evt.startHour + evt.duration)}</span>
                 <button class="event-status-trigger" title="Change Status">${statusIcons[status]}</button>
                 <button class="edit-btn" title="Edit Task">✎</button>
                 <button class="delete-btn" title="Delete Task">&times;</button>
            `;

            // Event Interactions
            // Edit
            const editBtn = el.querySelector(".edit-btn");
            editBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openEditModal(evt.id);
            });

            // Status Picker (Version 2)
            const statusTrigger = el.querySelector(".event-status-trigger");
            statusTrigger.addEventListener("click", (e) => {
                e.stopPropagation();
                showStatusMenu(evt.id, statusTrigger);
            });

            // Event Interactions
            // Delete
            const delBtn = el.querySelector(".delete-btn");
            delBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm("Delete this task?")) {
                    deleteEvent(evt.id);
                }
            });


            dayCol.appendChild(el);
        });

        dom.scheduleBody.appendChild(dayCol);
    });
}

// --- Full Month Grid ---
function renderFullMonthGrid() {
    dom.fullMonthGrid.innerHTML = "";
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();

    dom.mainHeaderTitle.textContent = state.currentDate.toLocaleDateString("en-US", { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayIndex = firstDay.getDay();

    // Padding
    for (let i = 0; i < startDayIndex; i++) {
        dom.fullMonthGrid.appendChild(document.createElement("div"));
    }

    // Days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const d = new Date(year, month, i);
        const dateKey = formatDateKey(d);

        // Use getAllEventsForView to include recurring events
        const dayStart = new Date(d);
        const dayEnd = new Date(d);
        const allEvents = getAllEventsForView(state.events, dayStart, dayEnd);
        const dayEvents = allEvents.filter(e => e.date === dateKey && state.filters.has(e.type));

        const el = document.createElement("div");
        el.className = `month-cell ${d.toDateString() === new Date().toDateString() ? 'today' : ''}`;

        let eventsHtml = "";
        dayEvents.slice(0, 3).forEach(evt => {
            eventsHtml += `<div class="month-event-dot ${getTypeColorClass(evt.type)}">${evt.title}</div>`;
        });
        if (dayEvents.length > 3) eventsHtml += `<div style="font-size:10px; color:#666;">+${dayEvents.length - 3} more</div>`;

        el.innerHTML = `
                <span class="month-cell-num">${i}</span>
                    <div class="month-events">${eventsHtml}</div>
            `;

        el.addEventListener("click", () => {
            state.currentDate = d;
            state.bgView = "day"; // Switch to day view on click? Or just select? 
            // Let's switch to Day view for detail
            dom.viewBtns.forEach(b => b.classList.remove("active"));
            // Find day button?
            // Just update state
            renderMainView();
        });

        dom.fullMonthGrid.appendChild(el);
    }
}


// --- Kanban Board ---
// --- Kanban Board (Restored) ---
function renderKanbanBoard() {
    dom.boardViewContainer.innerHTML = "";
    dom.boardViewContainer.classList.remove("list-view-container");
    dom.boardViewContainer.classList.add("kanban-view-container");

    const statuses = [
        { id: 'waiting', title: 'To Do', color: '#C9B8A3' },
        { id: 'progress', title: 'In Progress', color: '#FFD93D' },
        { id: 'done', title: 'Done', color: '#69f0ae' }
    ];

    statuses.forEach(status => {
        const col = document.createElement("div");
        col.className = "kanban-column";

        // Filter events - use a 30-day window so recurring events don't explode
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        thirtyDaysFromNow.setHours(23, 59, 59, 999);
        const allEvents = getAllEventsForView(state.events, today, thirtyDaysFromNow);

        const events = allEvents.filter(evt => {
            const s = getEventStatus(evt);
            return s === status.id && state.filters.has(evt.type);
        });

        col.innerHTML = `
            <div class="kanban-header" style="border-top: 3px solid ${status.color}">
                <span>${status.title}</span>
                <span class="kanban-count">${events.length}</span>
            </div>
            <div class="kanban-body"></div>
        `;

        const body = col.querySelector(".kanban-body");

        // Drag Drop Zone Logic
        body.addEventListener("dragover", (e) => {
            e.preventDefault();
            body.classList.add("drag-over");
        });

        body.addEventListener("dragleave", (e) => {
            body.classList.remove("drag-over");
        });

        body.addEventListener("drop", (e) => {
            e.preventDefault();
            body.classList.remove("drag-over");
            const eventId = e.dataTransfer.getData("text/plain");

            // Only update if dropping into a different status
            if (eventId) {
                setEventStatus(parseInt(eventId), status.id);
            }
        });

        events.forEach(evt => {
            const card = document.createElement("div");
            card.className = "kanban-card";
            card.draggable = true; // Make draggable

            // Drag Start
            card.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("text/plain", evt.id);
                e.dataTransfer.effectAllowed = "move";
                setTimeout(() => card.classList.add("dragging"), 0);
            });

            // Drag End
            card.addEventListener("dragend", () => {
                card.classList.remove("dragging");
                document.querySelectorAll(".kanban-body").forEach(b => b.classList.remove("drag-over"));
            });

            // Map types to border colors
            const cat = state.categories.find(c => c.id === evt.type);
            const colorClass = cat ? cat.color : 'bg-gray';
            card.style.borderLeftColor = HEX_COLORS[colorClass] || '#ccc';

            const priorityClass = `priority-${evt.priority || 'normal'}`;

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${evt.title}</span>
                    <span class="card-priority ${priorityClass}">${(evt.priority || 'normal')}</span>
                </div>
                <div class="card-details">
                    <div class="card-detail-item">📅 ${evt.date.substring(5)}</div>
                    <div class="card-detail-item">⏱️ ${evt.duration}h</div>
                </div>
                ${evt.description ? `<p class="card-desc-preview">${evt.description}</p>` : ''}
            `;

            card.addEventListener("click", () => openEditModal(evt.id));
            body.appendChild(card);
        });

        dom.boardViewContainer.appendChild(col);
    });
}

// --- CRUD Actions ---
function deleteEvent(id) {
    state.events = state.events.filter(e => e.id !== id);
    saveState();
    renderMainView();
}

function toggleEventComplete(id) {
    const evt = state.events.find(e => e.id === id);
    if (evt) {
        evt.completed = !evt.completed;
        saveState();
        renderMainView();
    }
}

function formatTime(decimalTime) {
    const hrs = Math.floor(decimalTime);
    const mins = Math.round((decimalTime - hrs) * 60);
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const h = hrs > 12 ? hrs - 12 : (hrs === 0 ? 12 : hrs); // Fix 0h
    const m = mins === 0 ? '00' : (mins < 10 ? '0' + mins : mins);
    return `${h}:${m} ${ampm}`;
}

function getEventStatus(evt) {
    if (evt.manualStatus && evt.manualStatus !== 'auto') return evt.manualStatus;
    if (evt.completed) return 'done';

    const now = new Date();
    const today = formatDateKey(now);

    // If it's a past day, it's done
    if (evt.date < today) return 'done';

    // If it's a future day, it's waiting
    if (evt.date > today) return 'waiting';

    // Same day logic (today)
    const currentHour = now.getHours() + (now.getMinutes() / 60);
    const endHour = evt.startHour + evt.duration;

    // Auto status logic: waiting → progress → done
    if (currentHour >= endHour) return 'done';
    if (currentHour >= evt.startHour && currentHour < endHour) return 'progress';

    return 'waiting';
}

function showStatusMenu(id, trigger) {
    // Remove existing menus
    const existingMenu = document.querySelector('.status-menu-overlay');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'status-menu-overlay';

    const statuses = [
        { id: 'auto', name: 'Automatic', icon: '🔄' },
        { id: 'waiting', name: 'Waiting', icon: '⏳' },
        { id: 'progress', name: 'In Progress', icon: '⚡' },
        { id: 'done', name: 'Done', icon: '✅' }
    ];

    statuses.forEach(s => {
        const item = document.createElement('div');
        item.className = 'status-menu-item';
        item.innerHTML = `<span>${s.icon}</span> ${s.name}`;
        item.onclick = (e) => {
            e.stopPropagation();
            setEventStatus(id, s.id);
            menu.remove();
        };
        menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // Position menu relative to trigger
    const rect = trigger.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left}px`;

    // Click outside to close
    const closeMenu = (e) => {
        if (!menu.contains(e.target) && e.target !== trigger) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

function setEventStatus(id, newStatus) {
    // Check for composite ID from recurring instance (e.g. "123-2023-10-27")
    let eventId = id;
    let instanceDate = null;

    if (typeof id === 'string' && id.includes('-')) {
        const parts = id.split('-');
        // Verify first part is numeric (timestamp)
        if (parts[0].match(/^\d+$/)) {
            eventId = parseInt(parts[0]);
            // Reconstruct date part (could correspond to 'YYYY-MM-DD')
            instanceDate = parts.slice(1).join('-');
        }
    }

    const evt = state.events.find(e => e.id == eventId);
    if (!evt) return;

    if (instanceDate && evt.isRecurring) {
        // Handle Recurring Instance Exception
        if (!evt.recurrenceExceptions) {
            evt.recurrenceExceptions = {};
        }

        evt.recurrenceExceptions[instanceDate] = {
            manualStatus: newStatus,
            completed: (newStatus === 'done')
        };
    } else {
        // Handle Standard Event or Parent Recurring Event
        evt.manualStatus = newStatus;
        evt.completed = (newStatus === 'done');
    }

    saveState();
    renderMainView();
    updateStats();
    showToast(`Status updated to ${newStatus}`, 'success');
}

function cycleEventStatus(id) {
    // Deprecated in favor of setEventStatus/showStatusMenu
    const evt = state.events.find(e => e.id === id);
    if (!evt) return;

    const statuses = ['auto', 'waiting', 'progress', 'done'];
    const currentIndex = statuses.indexOf(evt.manualStatus || (evt.completed ? 'done' : 'auto'));
    const nextIndex = (currentIndex + 1) % statuses.length;

    setEventStatus(id, statuses[nextIndex]);
}

// --- Custom Picker Logic ---
const CustomPicker = {
    date: {
        // Shared State
        activeInputId: null, // 'event-date' or 'event-recurrence-end-date'

        // Instance Data
        instances: {
            'event-date': {
                currentView: new Date(),
                selected: null,
                el: document.getElementById("custom-date-popover"),
                input: document.getElementById("event-date")
            },
            'event-recurrence-end-date': {
                currentView: new Date(),
                selected: null,
                el: document.getElementById("custom-recurrence-end-date-popover"),
                input: document.getElementById("event-recurrence-end-date")
            }
        }
    },
    time: {
        selected: null, // "HH:MM"
        el: document.getElementById("custom-time-popover"),
        input: document.getElementById("event-start")
    },

    init() {
        // Initialize Date Pickers
        Object.keys(this.date.instances).forEach(id => {
            const instance = this.date.instances[id];
            if (!instance.input || !instance.el) return;

            instance.input.addEventListener("click", (e) => {
                e.stopPropagation();
                // Close others
                this.closeAll();
                this.date.activeInputId = id;
                this.toggle("date", id);
            });
        });

        // Time Listeners
        if (this.time.input) {
            this.time.input.addEventListener("click", (e) => {
                e.stopPropagation();
                this.closeAll();
                this.toggle("time");
            });
        }

        // Close on outside click
        document.addEventListener("click", (e) => {
            // Check Date Pickers
            Object.values(this.date.instances).forEach(instance => {
                if (instance.el && !instance.el.contains(e.target) && e.target !== instance.input) {
                    instance.el.classList.add("hidden");
                }
            });

            // Check Time Picker
            if (this.time.el && !this.time.el.contains(e.target) && e.target !== this.time.input) {
                this.time.el.classList.add("hidden");
            }
        });

        this.renderAllDates();
        this.renderTime();
    },

    closeAll() {
        Object.values(this.date.instances).forEach(i => i.el?.classList.add("hidden"));
        this.time.el?.classList.add("hidden");
    },

    toggle(type, id) {
        if (type === "date") {
            const instance = this.date.instances[id];
            if (instance) {
                instance.el.classList.toggle("hidden");
                if (!instance.el.classList.contains("hidden")) {
                    this.renderDate();
                }
            }
        } else {
            this.time.el.classList.toggle("hidden");
        }
    },

    renderAllDates() {
        Object.keys(this.date.instances).forEach(id => {
            // Temporarily set activeInputId to render initial state if needed
            // Actually renderDate relies on activeInputId usually for interaction
            // But for initial render we can just iterate.
            // Simplified: we only render when opening or navigating.
        });
    },

    renderDate() {
        const id = this.date.activeInputId;
        if (!id) return;

        const instance = this.date.instances[id];
        if (!instance) return;

        const year = instance.currentView.getFullYear();
        const month = instance.currentView.getMonth();

        // Update Header
        instance.el.innerHTML = `
            <div class="picker-header">
                <button type="button" class="picker-nav-btn" onclick="CustomPicker.navDate(-1)">&lt;</button>
                <span>${instance.currentView.toLocaleDateString("en-US", { month: 'long', year: 'numeric' })}</span>
                <button type="button" class="picker-nav-btn" onclick="CustomPicker.navDate(1)">&gt;</button>
            </div>
            <div class="picker-grid" id="pkg-grid-${id}">
                <!-- Days injected here -->
            </div>
        `;

        const grid = document.getElementById(`pkg-grid-${id}`);
        // ... (rest of logic same but using instance)

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay();

        // Day Names
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        dayNames.forEach(name => {
            const nameEl = document.createElement("div");
            nameEl.className = "picker-day-name";
            nameEl.textContent = name;
            grid.appendChild(nameEl);
        });

        // Empty slots
        for (let i = 0; i < firstDayIndex; i++) {
            const empty = document.createElement("div");
            grid.appendChild(empty);
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement("div");
            dayEl.className = "picker-day";
            dayEl.textContent = i;

            const cellDate = new Date(year, month, i);
            const cellDateStr = formatDateKey(cellDate);
            const todayStr = formatDateKey(new Date());

            if (cellDateStr === todayStr) dayEl.classList.add("today");

            // Check selection
            if (instance.selected && formatDateKey(instance.selected) === cellDateStr) {
                dayEl.classList.add("selected");
            }

            dayEl.onclick = (e) => {
                e.stopPropagation();
                instance.selected = cellDate;
                instance.input.value = cellDateStr; // Update Input
                this.renderDate(); // Re-render to show selection
                this.toggle("date", id); // Close

                // Trigger change event for validation/UI updates
                instance.input.dispatchEvent(new Event('change'));
            };

            grid.appendChild(dayEl);
        }
    },

    navDate(dir) {
        const id = this.date.activeInputId;
        if (!id) return;
        const instance = this.date.instances[id];
        instance.currentView.setMonth(instance.currentView.getMonth() + dir);
        this.renderDate();
    },

    renderTime() {
        const list = document.createElement("div");
        list.className = "time-picker-list";

        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 15) {
                const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const item = document.createElement("div");
                item.className = "time-item";
                if (this.time.selected === timeStr) item.classList.add("selected");
                item.textContent = formatTime(h + m / 60);

                item.onclick = (e) => {
                    e.stopPropagation();
                    this.time.selected = timeStr;
                    this.time.input.value = timeStr;
                    this.time.el.classList.add("hidden");
                    this.renderTime();
                };
                list.appendChild(item);
            }
        }
        this.time.el.innerHTML = "";
        this.time.el.appendChild(list);
    }
};

// Expose to global for onclick handlers
window.CustomPicker = CustomPicker;

// --- New Feature Logic ---

// Toast Notification System
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        error: '⚠️',
        success: '✅',
        info: 'ℹ️'
    };

    toast.innerHTML = `
                <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
            `;

    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

window.showToast = showToast;

function updateStats() {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Use getAllEventsForView to include overflow tasks from yesterday
    const allEvents = getAllEventsForView(state.events, todayStart, todayEnd);
    const todayKey = formatDateKey(today);
    const todayEvents = allEvents.filter(e => e.date === todayKey);

    // Include only TODAY'S events in completion rate
    const completedTodayEvents = todayEvents.filter(e => e.completed).length;
    const totalTodayEvents = todayEvents.length;

    const completionRate = totalTodayEvents > 0 ? Math.round((completedTodayEvents / totalTodayEvents) * 100) : 0;

    if (dom.todayTasksStat) dom.todayTasksStat.textContent = todayEvents.length;
    if (dom.completionStat) dom.completionStat.textContent = `${completionRate}%`;

    // Format focus time as "Xh Ym"
    const hrs = Math.floor(state.focusTime / 60);
    const mins = Math.floor(state.focusTime % 60);
    if (dom.focusTimeStat) dom.focusTimeStat.textContent = `${hrs}h ${mins}m`;
}

function renderTodoItems() {
    if (!dom.todoList) return;
    dom.todoList.innerHTML = "";
    state.tasks.forEach((task, index) => {
        const li = document.createElement("li");
        li.className = `todo-item ${task.completed ? 'completed' : ''}`;
        li.innerHTML = `
                <div class="todo-checkbox" onclick="toggleTodo(${index})"></div>
            <span>${task.text}</span>
            <button class="delete-btn" onclick="deleteTodo(${index})">&times;</button>
            `;
        dom.todoList.appendChild(li);
    });
}

function addTodo() {
    const text = dom.todoInput.value.trim();
    if (text) {
        state.tasks.push({ text, completed: false });
        dom.todoInput.value = "";
        saveState();
        renderTodoItems();
    }
}

function toggleTodo(index) {
    state.tasks[index].completed = !state.tasks[index].completed;
    saveState();
    renderTodoItems();
}

function deleteTodo(index) {
    state.tasks.splice(index, 1);
    saveState();
    renderTodoItems();
}

window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;

// --- Pomodoro Timer ---
const Pomodoro = {
    timeLeft: 25 * 60,
    timerId: null,
    isRunning: false,
    mode: 'work', // 'work' or 'break'
    startTime: null,
    durationAtStart: null,
    lastElapsedSeconds: 0,

    init() {
        if (!dom.timerDisplay) return;
        this.updateDisplay();
        dom.timerToggleBtn.addEventListener("click", () => this.toggle());
    },

    toggle() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    },

    start() {
        this.isRunning = true;
        this.startTime = Date.now();
        this.durationAtStart = this.timeLeft;
        this.lastElapsedSeconds = 0;
        dom.timerToggleBtn.textContent = "Pause";

        this.timerId = setInterval(() => {
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - this.startTime) / 1000);

            // Calculate new time left
            this.timeLeft = Math.max(0, this.durationAtStart - elapsedSeconds);

            if (this.mode === 'work') {
                // Focus time tracking: add minutes as they pass
                const deltaSeconds = elapsedSeconds - this.lastElapsedSeconds;
                if (deltaSeconds >= 1) {
                    // Check if we've crossed a minute boundary since start
                    const prevTotalSeconds = this.lastElapsedSeconds;
                    const currTotalSeconds = elapsedSeconds;

                    // How many minutes have we accumulated in this session?
                    const prevMins = Math.floor(prevTotalSeconds / 60);
                    const currMins = Math.floor(currTotalSeconds / 60);

                    if (currMins > prevMins) {
                        state.focusTime += (currMins - prevMins);
                        saveState();
                        updateStats();
                    }
                    this.lastElapsedSeconds = elapsedSeconds;
                }
            }

            this.updateDisplay();
            if (this.timeLeft <= 0) {
                this.completeCycle();
            }
        }, 1000);
    },

    stop() {
        this.isRunning = false;
        dom.timerToggleBtn.textContent = "Start";
        clearInterval(this.timerId);
        saveState();
        updateStats();
    },

    completeCycle() {
        this.stop();

        // Play completion sound using Web Audio API
        this.playCompletionSound();

        // Show browser notification
        this.showNotification();

        if (this.mode === 'work') {
            showToast("Work cycle complete! Time for a break. 🎉", 'success');
            this.mode = 'break';
            this.timeLeft = 5 * 60;
        } else {
            showToast("Break complete! Ready to work? 💪", 'success');
            this.mode = 'work';
            this.timeLeft = 25 * 60;
        }
        this.updateDisplay();
    },

    showNotification() {
        if ("Notification" in window && Notification.permission === "granted") {
            const title = this.mode === 'work'
                ? "🎉 Work Cycle Complete!"
                : "💪 Break Complete!";
            const body = this.mode === 'work'
                ? "Great job! Time for a well-deserved break."
                : "Break's over! Ready to get back to work?";

            const notification = new Notification(title, {
                body: body,
                icon: 'logo.png',
                badge: 'logo.png',
                tag: 'pomodoro-timer',
                requireInteraction: false,
                silent: false
            });

            // Auto-close notification after 10 seconds
            setTimeout(() => notification.close(), 10000);

            // Focus window when notification is clicked
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    },


    playCompletionSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create a pleasant three-tone chime
            const playTone = (frequency, startTime, duration) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';

                // Envelope for smooth sound
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };

            // Play three ascending tones (C5, E5, G5 - a pleasant C major chord)
            const now = audioContext.currentTime;
            playTone(523.25, now, 0.3);        // C5
            playTone(659.25, now + 0.15, 0.3); // E5
            playTone(783.99, now + 0.3, 0.5);  // G5

        } catch (err) {
            console.log('Audio playback failed:', err);
        }
    },


    updateDisplay() {
        const mins = Math.floor(this.timeLeft / 60);
        const secs = this.timeLeft % 60;
        dom.timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
};

// --- CRUD Actions Overrides (to update stats) ---
// Since renderMainView is the central rendering point, adding updateStats there is better
const originalRenderMainView = renderMainView;
renderMainView = function () {
    originalRenderMainView();
    updateStats();
};

const originalToggleEventComplete = toggleEventComplete;
toggleEventComplete = function (id) {
    originalToggleEventComplete(id);
    updateStats();
};

const originalDeleteEvent = deleteEvent;
deleteEvent = function (id) {
    originalDeleteEvent(id);
    updateStats();
};

// Run
init();
CustomPicker.init();
