
const state = {
    grades: [],
    filtered: [],
    sortCol: 'subject',
    sortDir: 'asc',
    filterSubject: 'all',
    filterSemester: 'all',
    searchQuery: ''
};

const $ = id => document.getElementById(id);

const authOverlay = $('auth-overlay');
const appEl = $('app');

const loginForm = $('login-form');
const registerForm = $('register-form');
const loginError = $('login-error');
const registerError = $('register-error');
const tabs = document.querySelectorAll('.auth-tab');

const addGradeForm = $('add-grade-form');
const addError = $('add-error');

const gradesTbody = $('grades-tbody');
const emptyState = $('empty-state');
const searchInput = $('search-input');
const sortHeaders = document.querySelectorAll('th.sortable');

const subjectCards = $('subject-cards');
const subjectFilters = $('subject-filters');

const gpaValue = $('gpa-value');
const gpaLetter = $('gpa-letter');
const gpaCount = $('gpa-count');

const semSelect = $('sem-select');
const editModal = $('edit-modal');
const editForm = $('edit-grade-form');
const cancelEdit = $('cancel-edit');
const editError = $('edit-error');

const userGreeting = $('user-greeting');
const logoutBtn = $('logout-btn');

const pct = (mark, total) => Math.round((mark / total) * 1000) / 10; // 1 decimal

function gradeInfo(percentage) {
    if (percentage >= 90) return { letter: 'A+', cls: 'grade-pass', rowCls: 'row-pass' };
    if (percentage >= 80) return { letter: 'A', cls: 'grade-pass', rowCls: 'row-pass' };
    if (percentage >= 70) return { letter: 'B', cls: 'grade-pass', rowCls: 'row-pass' };
    if (percentage >= 60) return { letter: 'C', cls: 'grade-warn', rowCls: 'row-warn' };
    if (percentage >= 50) return { letter: 'D', cls: 'grade-warn', rowCls: 'row-warn' };
    return { letter: 'F', cls: 'grade-fail', rowCls: 'row-fail' };
}

function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
}
function clearError(el) {
    el.classList.add('hidden');
    el.textContent = '';
}
function setLoading(form, loading) {
    const btn = form.querySelector('.btn-text');
    const spin = form.querySelector('.btn-loader');
    if (!btn || !spin) return;
    btn.classList.toggle('hidden', loading);
    spin.classList.toggle('hidden', !loading);
}

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        clearError(loginError);
        clearError(registerError);
        if (tab.dataset.tab === 'login') loginForm.classList.remove('hidden');
        else registerForm.classList.remove('hidden');
    });
});

loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearError(loginError);
    setLoading(loginForm, true);
    const data = new FormData(loginForm);
    try {
        const res = await fetch('auth.php', { method: 'POST', body: data });
        const json = await res.json();
        if (json.success) {
            userGreeting.textContent = 'Hello, ' + json.fullname;
            authOverlay.classList.add('hidden');
            appEl.classList.remove('hidden');
            loadGrades();
        } else {
            showError(loginError, json.message || 'Login failed.');
        }
    } catch {
        showError(loginError, 'Server error. Please try again.');
    } finally {
        setLoading(loginForm, false);
    }
});

registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearError(registerError);
    setLoading(registerForm, true);
    const data = new FormData(registerForm);
    data.append('action', 'register');
    try {
        const res = await fetch('auth.php', { method: 'POST', body: data });
        const json = await res.json();
        if (json.success) {
            userGreeting.textContent = 'Hello, ' + json.fullname;
            authOverlay.classList.add('hidden');
            appEl.classList.remove('hidden');
            loadGrades();
        } else {
            showError(registerError, json.message || 'Registration failed.');
        }
    } catch {
        showError(registerError, 'Server error. Please try again.');
    } finally {
        setLoading(registerForm, false);
    }
});

logoutBtn.addEventListener('click', async () => {
    await fetch('auth.php?action=logout');
    appEl.classList.add('hidden');
    authOverlay.classList.remove('hidden');
    state.grades = [];
    state.filtered = [];
    loginForm.reset();
    registerForm.reset();
});

(async () => {
    try {
        const res = await fetch('auth.php?action=check');
        const json = await res.json();
        if (json.loggedIn) {
            userGreeting.textContent = 'Hello, ' + json.fullname;
            authOverlay.classList.add('hidden');
            appEl.classList.remove('hidden');
            loadGrades();
        }
    } catch { }
})();

async function loadGrades() {
    try {
        const res = await fetch('grades.php?action=list');
        const json = await res.json();
        if (json.success) {
            state.grades = json.data.map(g => ({
                ...g,
                percentage: pct(Number(g.mark), Number(g.total))
            }));
            applyFiltersAndRender();
        }
    } catch {
        console.error('Failed to load grades');
    }
}

addGradeForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearError(addError);
    const data = new FormData(addGradeForm);
    data.append('action', 'add');

    const mark = Number(data.get('mark'));
    const total = Number(data.get('total'));
    if (isNaN(mark) || isNaN(total) || total <= 0) {
        showError(addError, 'Mark and Total must be valid numbers (Total > 0).');
        return;
    }
    if (mark > total) {
        showError(addError, 'Mark cannot exceed Total.');
        return;
    }

    setLoading(addGradeForm, true);
    try {
        const res = await fetch('grades.php', { method: 'POST', body: data });
        const json = await res.json();
        if (json.success) {
            addGradeForm.reset();
            loadGrades();
        } else {
            showError(addError, json.message || 'Failed to add grade.');
        }
    } catch {
        showError(addError, 'Server error.');
    } finally {
        setLoading(addGradeForm, false);
    }
});

sortHeaders.forEach(th => {
    th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (state.sortCol === col) {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortCol = col;
            state.sortDir = 'asc';
        }
        // Update header classes
        sortHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
        applyFiltersAndRender();
    });
});

function sortGrades(arr) {
    const { sortCol, sortDir } = state;
    return [...arr].sort((a, b) => {
        let va = a[sortCol], vb = b[sortCol];
        if (sortCol === 'percentage' || sortCol === 'mark' || sortCol === 'semester') {
            va = Number(va); vb = Number(vb);
        } else {
            va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
}

function applyFiltersAndRender() {
    let data = [...state.grades];

    if (state.filterSubject !== 'all') {
        data = data.filter(g => g.subject === state.filterSubject);
    }
    if (state.filterSemester !== 'all') {
        data = data.filter(g => String(g.semester) === String(state.filterSemester));
    }
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        data = data.filter(g =>
            g.subject.toLowerCase().includes(q) ||
            g.assessment_name.toLowerCase().includes(q)
        );
    }

    state.filtered = sortGrades(data);
    renderTable(state.filtered);
    renderSubjectCards();
    renderSubjectFilters();
    renderGPA();
}

searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value.trim();
    applyFiltersAndRender();
});

semSelect.addEventListener('change', e => {
    state.filterSemester = e.target.value;
    applyFiltersAndRender();
});

function renderTable(rows) {
    gradesTbody.innerHTML = '';
    if (rows.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    rows.forEach(g => {
        const p = g.percentage;
        const { letter, cls, rowCls } = gradeInfo(p);
        const tr = document.createElement('tr');
        tr.className = rowCls;
        tr.innerHTML = `
    <td class="td-subject">${esc(g.subject)}</td>
    <td class="td-assessment">${esc(g.assessment_name)}</td>
    <td><span class="td-sem">S${esc(g.semester)}</span></td>
    <td class="td-pct">${p.toFixed(1)}%</td>
    <td class="td-mark">${esc(g.mark)} / ${esc(g.total)}</td>
    <td><span class="grade-badge ${cls}">${letter}</span></td>
    <td class="td-actions">
        <button class="btn-edit"  data-id="${g.id}">Edit</button>
        <button class="btn-delete" data-id="${g.id}">Delete</button>
    </td>
    `;
        gradesTbody.appendChild(tr);
    });

    gradesTbody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => openEdit(btn.dataset.id));
    });
    gradesTbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteGrade(btn.dataset.id));
    });
}

function esc(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function renderSubjectCards() {
    const subjectMap = {};
    state.grades.forEach(g => {
        if (!subjectMap[g.subject]) subjectMap[g.subject] = [];
        subjectMap[g.subject].push(g.percentage);
    });

    subjectCards.innerHTML = '';
    if (Object.keys(subjectMap).length === 0) {
        subjectCards.innerHTML = '<p style="color:var(--text-dim);font-size:.85rem;">No subjects yet.</p>';
        return;
    }

    Object.entries(subjectMap).forEach(([subject, pctsArr]) => {
        const avg = pctsArr.reduce((a, b) => a + b, 0) / pctsArr.length;
        const { letter, cls } = gradeInfo(avg);
        const isActive = state.filterSubject === subject;
        const card = document.createElement('div');
        card.className = 'subject-card' + (isActive ? ' active-subject' : '');
        card.innerHTML = `
    <div>
        <span class="card-name">${esc(subject)}</span>
        <span class="card-count">${pctsArr.length} assessment${pctsArr.length !== 1 ? 's' : ''}</span>
    </div>
    <span class="card-avg ${cls === 'grade-pass' ? 'grade-pass' : cls === 'grade-warn' ? 'grade-warn' : 'grade-fail'}"
            style="color: ${cls === 'grade-pass' ? 'var(--pass)' : cls === 'grade-warn' ? 'var(--warn)' : 'var(--fail)'}">
        ${avg.toFixed(1)}%
    </span>
    <span class="card-letter grade-badge ${cls}">${letter}</span>
    `;
        card.addEventListener('click', () => {
            state.filterSubject = isActive ? 'all' : subject;
            applyFiltersAndRender();
        });
        subjectCards.appendChild(card);
    });
}

function renderSubjectFilters() {
    subjectFilters.innerHTML = '';
    const subjects = [...new Set(state.grades.map(g => g.subject))];
    subjects.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'nav-filter' + (state.filterSubject === s ? ' active' : '');
        btn.textContent = s;
        btn.addEventListener('click', () => {
            state.filterSubject = state.filterSubject === s ? 'all' : s;
            // Sync "All Subjects" button
            document.querySelectorAll('.nav-filter').forEach(b => b.classList.remove('active'));
            applyFiltersAndRender();
            if (state.filterSubject === 'all') document.querySelector('.nav-filter').classList.add('active');
        });
        subjectFilters.appendChild(btn);
    });
}
document.querySelector('.nav-filter').addEventListener('click', function () {
    state.filterSubject = 'all';
    applyFiltersAndRender();
    document.querySelectorAll('.nav-filter').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
});

function renderGPA() {
    const source = state.grades;
    if (source.length === 0) {
        gpaValue.textContent = '—';
        gpaLetter.textContent = '—';
        gpaCount.textContent = '0 assessments';
        return;
    }
    const avg = source.reduce((s, g) => s + g.percentage, 0) / source.length;
    const { letter } = gradeInfo(avg);
    gpaValue.textContent = avg.toFixed(1) + '%';
    gpaLetter.textContent = letter;
    gpaCount.textContent = source.length + ' assessment' + (source.length !== 1 ? 's' : '');
}

async function deleteGrade(id) {
    if (!confirm('Delete this grade entry?')) return;
    try {
        const data = new FormData();
        data.append('action', 'delete');
        data.append('id', id);
        const res = await fetch('grades.php', { method: 'POST', body: data });
        const json = await res.json();
        if (json.success) loadGrades();
        else alert(json.message || 'Delete failed.');
    } catch {
        alert('Server error.');
    }
}

function openEdit(id) {
    const g = state.grades.find(x => String(x.id) === String(id));
    if (!g) return;
    $('edit-id').value = g.id;
    $('edit-subject').value = g.subject;
    $('edit-assessment').value = g.assessment_name;
    $('edit-mark').value = g.mark;
    $('edit-total').value = g.total;
    $('edit-semester').value = g.semester;
    clearError(editError);
    editModal.classList.remove('hidden');
}

cancelEdit.addEventListener('click', () => editModal.classList.add('hidden'));
editModal.querySelector('.modal-backdrop').addEventListener('click', () =>
    editModal.classList.add('hidden')
);

editForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearError(editError);
    const data = new FormData(editForm);
    data.append('action', 'edit');

    const mark = Number(data.get('mark'));
    const total = Number(data.get('total'));
    if (isNaN(mark) || isNaN(total) || total <= 0) {
        showError(editError, 'Mark and Total must be valid numbers.');
        return;
    }
    if (mark > total) {
        showError(editError, 'Mark cannot exceed Total.');
        return;
    }

    try {
        const res = await fetch('grades.php', { method: 'POST', body: data });
        const json = await res.json();
        if (json.success) {
            editModal.classList.add('hidden');
            loadGrades();
        } else {
            showError(editError, json.message || 'Update failed.');
        }
    } catch {
        showError(editError, 'Server error.');
    }
});