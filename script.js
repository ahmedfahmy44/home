document.addEventListener('DOMContentLoaded', () => {

    // --- العناصر الأساسية ---
    const balanceDisplay = document.getElementById('balance-display');
    const totalIncomeDisplay = document.getElementById('total-income-display');
    const totalExpenseDisplay = document.getElementById('total-expense-display');
    const incomePercentageDisplay = document.getElementById('income-percentage');
    const expensePercentageDisplay = document.getElementById('expense-percentage');
    const transactionForm = document.getElementById('transaction-form');
    const typeSelect = document.getElementById('type');
    const categorySelect = document.getElementById('category');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const historyList = document.getElementById('history-list');
    const financeChartCanvas = document.getElementById('finance-chart');
    const categoryChartCanvas = document.getElementById('category-chart'); // <<< تأكد من وجود هذا العنصر
    const submitBtn = document.getElementById('submit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const filterControls = document.getElementById('filter-controls');
    const filterButtons = filterControls.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('search-input');

    // --- حالة التطبيق ---
    let transactions = JSON.parse(localStorage.getItem('transactionsData')) || [];
    let financeChartInstance = null;
    let categoryChartInstance = null; // <<< تأكد من وجود هذا المتغير
    let isEditing = false; let editId = null; let currentFilter = 'all'; let currentSearchTerm = '';
    const categories = { income: ['راتب', 'عمل حر', 'هدايا', 'أخرى (دخل)'], expense: ['طعام', 'مواصلات', 'فواتير', 'سكن', 'ترفيه', 'ملابس', 'صحة', 'تعليم', 'أخرى (مصروف)'] };

    // --- الدوال المساعدة ---
    const formatCurrency = (num) => (Math.abs(num) || 0).toFixed(2);
    const formatDateTime = (timestamp) => new Date(timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    const saveToLocalStorage = () => { localStorage.setItem('transactionsData', JSON.stringify(transactions)); /*console.log("Data saved.");*/ };
    function populateCategories() { const selectedType = typeSelect.value; const currentCategories = categories[selectedType] || []; categorySelect.innerHTML = '<option value="" disabled selected>اختر فئة...</option>'; currentCategories.forEach(category => { const option = document.createElement('option'); option.value = category; option.textContent = category; categorySelect.appendChild(option); }); categorySelect.required = currentCategories.length > 0; }

    // --- الدوال الرئيسية ---

    // تحديث الواجهة بالكامل
    function updateUI() {
        console.log("--- Starting updateUI ---"); // <<< تسجيل
        let income = 0, expense = 0;
        transactions.forEach(t => (t.amount > 0) ? income += t.amount : expense += t.amount);
        const balance = income + expense; const absExpense = Math.abs(expense); const totalFlow = income + absExpense;
        const incomePercent = totalFlow > 0 ? ((income / totalFlow) * 100).toFixed(1) : 0;
        const expensePercent = totalFlow > 0 ? ((absExpense / totalFlow) * 100).toFixed(1) : 0;
        balanceDisplay.textContent = balance.toFixed(2); totalIncomeDisplay.textContent = formatCurrency(income); totalExpenseDisplay.textContent = formatCurrency(expense);
        incomePercentageDisplay.textContent = `(${incomePercent}%)`; expensePercentageDisplay.textContent = `(${expensePercent}%)`;

        renderHistory();
        renderOrUpdateBalanceLineChart();

        // حساب وعرض الرسم البياني للفئات
        const categorySummary = calculateCategorySummary();
        console.log("Category Summary Calculated:", categorySummary); // <<< تسجيل بيانات الملخص
        renderOrUpdateCategoryChart(categorySummary);

        console.log("--- Finished updateUI ---"); // <<< تسجيل
    }

    // عرض السجل (يطبق الفلتر والبحث) - (كما هو)
    function renderHistory() { /* ... الكود السابق ... */
        historyList.innerHTML = ''; const searchTerm = currentSearchTerm.toLowerCase().trim(); const filteredTransactions = transactions.filter(t => { const typeMatch = (currentFilter === 'all') || (currentFilter === 'income' && t.amount > 0) || (currentFilter === 'expense' && t.amount < 0); const searchMatch = !searchTerm || (t.description && t.description.toLowerCase().includes(searchTerm)); return typeMatch && searchMatch; }); if (filteredTransactions.length === 0) { const message = searchTerm ? 'لا توجد نتائج تطابق بحثك.' : (currentFilter === 'all' ? 'لا توجد معاملات بعد.' : `لا توجد معاملات ${currentFilter === 'income' ? 'دخل' : 'مصروفات'} لعرضها.`); historyList.innerHTML = `<tr><td colspan="6" style="text-align: center;">${message}</td></tr>`; return; } [...filteredTransactions].reverse().forEach(t => { const row = document.createElement('tr'); const amountClass = t.amount > 0 ? 'income' : 'expense'; const sign = t.amount > 0 ? '+' : '-'; row.innerHTML = `<td>${t.type === 'income' ? 'دخل' : 'مصروف'}</td><td>${t.category || '-'}</td><td>${t.description || '-'}</td><td class="${amountClass}">${sign}${formatCurrency(t.amount)}</td><td>${formatDateTime(t.timestamp)}</td><td><button class="action-btn edit-btn" data-id="${t.id}">تعديل</button><button class="action-btn delete-btn" data-id="${t.id}">حذف</button></td>`; historyList.appendChild(row); });
     }

    // إنشاء أو تحديث الرسم البياني الخطي للرصيد (كما هو)
    function renderOrUpdateBalanceLineChart() { /* ... الكود السابق ... */
        if (!financeChartCanvas || typeof Chart === 'undefined' || typeof Chart._adapters === 'undefined') { /*console.warn("Finance chart canvas, Chart.js, or Time Adapter not ready.");*/ return; } const ctx = financeChartCanvas.getContext('2d'); if (!ctx) { /*console.error("Failed to get 2D context for finance chart.");*/ return; } const lineChartData = prepareLineChartData(); const data = { datasets: [{ label: 'الرصيد', data: lineChartData, borderColor: 'rgb(0, 123, 255)', backgroundColor: 'rgba(0, 123, 255, 0.1)', fill: true, tension: 0.1 }] }; const options = { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'day', tooltipFormat: 'PPpp', displayFormats: { day: 'd MMM', week: 'd MMM', month: 'MMM yyyy', quarter: 'qqq yyyy', year: 'yyyy' } }, title: { display: true, text: 'التاريخ' } }, y: { beginAtZero: false, title: { display: true, text: 'الرصيد' }, ticks: { callback: function(value) { return value.toFixed(0); } } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: function(tooltipItems) { return formatDateTime(tooltipItems[0].parsed.x); }, label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += context.parsed.y.toFixed(2); } return label; } } } } }; if (financeChartInstance) { financeChartInstance.data.datasets[0].data = lineChartData; financeChartInstance.options = options; financeChartInstance.update(); /*console.log("Balance line chart updated.");*/ } else { financeChartInstance = new Chart(ctx, { type: 'line', data, options }); console.log("Balance line chart created."); }
     }
     function prepareLineChartData() { const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp); let runningBalance = 0; const dataPoints = sortedTransactions.map(t => { runningBalance += t.amount; return { x: t.timestamp, y: runningBalance }; }); if (dataPoints.length > 0 && sortedTransactions[0]?.timestamp) { dataPoints.unshift({ x: sortedTransactions[0].timestamp - 3600000, y: 0 }); } else if (dataPoints.length === 0) { dataPoints.push({ x: Date.now(), y: 0 }); } return dataPoints; }


    // حساب ملخص المصروفات حسب الفئة (كما هو)
    function calculateCategorySummary() {
        const summary = {};
        transactions.forEach(t => { if (t.amount < 0 && t.category) { summary[t.category] = (summary[t.category] || 0) + Math.abs(t.amount); } });
        return summary;
    }

    // إنشاء أو تحديث الرسم البياني للفئات (مع تسجيل إضافي)
    function renderOrUpdateCategoryChart(summaryData) {
        console.log("Attempting to render category chart..."); // <<< تسجيل
        if (!categoryChartCanvas) { console.error("Category chart canvas element not found!"); return; } // <<< تحقق من وجود الكانفاس
        if (typeof Chart === 'undefined') { console.error("Chart.js library not found!"); return; } // <<< تحقق من وجود المكتبة

        const ctx = categoryChartCanvas.getContext('2d');
        if (!ctx) { console.error("Failed to get 2D context for category chart."); return; }
        console.log("Category chart context obtained."); // <<< تسجيل

        const labels = Object.keys(summaryData);
        const dataValues = Object.values(summaryData);
        const hasData = dataValues.some(value => value > 0);
        console.log("Category chart - Has Data:", hasData, "Labels:", labels, "Values:", dataValues); // <<< تسجيل البيانات

        // إظهار أو إخفاء الكانفاس والرسالة
        categoryChartCanvas.style.display = hasData ? 'block' : 'none';
        const parentBox = categoryChartCanvas.closest('.category-summary-box');
        let noDataMsg = parentBox.querySelector('.no-data-message');
        if (!hasData) {
            console.log("No category data to display, hiding chart."); // <<< تسجيل
            if (!noDataMsg) { noDataMsg = document.createElement('p'); noDataMsg.textContent = 'لا توجد بيانات مصروفات لعرض الرسم البياني للفئات.'; noDataMsg.className = 'no-data-message'; noDataMsg.style.textAlign = 'center'; noDataMsg.style.color = 'var(--text-muted)'; parentBox.appendChild(noDataMsg); }
            noDataMsg.style.display = 'block';
            if (categoryChartInstance) { categoryChartInstance.destroy(); categoryChartInstance = null; console.log("Destroyed existing category chart instance.");} // <<< تسجيل
            return;
        } else if (noDataMsg) {
            noDataMsg.style.display = 'none';
        }

        // توليد الألوان
        let backgroundColors = [];
        if (typeof randomColor === 'function') { backgroundColors = randomColor({ count: labels.length, luminosity: 'bright', format: 'rgba', alpha: 0.8, seed: 42 }); }
        else { /* ... الكود الافتراضي للألوان ... */ backgroundColors = ['rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)']; while(backgroundColors.length < labels.length){ backgroundColors = backgroundColors.concat(backgroundColors); } backgroundColors = backgroundColors.slice(0, labels.length); }

        const data = { labels: labels, datasets: [{ data: dataValues, backgroundColor: backgroundColors, borderWidth: 1 }] };
        const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 15 } }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}` } } } };

        // تحديث أو إنشاء الرسم
        if (categoryChartInstance) {
            console.log("Updating existing category chart instance."); // <<< تسجيل
            categoryChartInstance.data.labels = labels;
            categoryChartInstance.data.datasets[0].data = dataValues;
            categoryChartInstance.data.datasets[0].backgroundColor = backgroundColors;
            categoryChartInstance.update();
        } else {
            console.log("Creating new category chart instance."); // <<< تسجيل
            try {
                 categoryChartInstance = new Chart(ctx, { type: 'pie', data, options });
                 console.log("Category chart instance created successfully."); // <<< تسجيل
            } catch(error) {
                 console.error("Error creating category chart:", error); // <<< تسجيل خطأ الإنشاء
            }
        }
    }

    // إعادة النموذج (كما هو)
    function resetForm() { isEditing = false; editId = null; transactionForm.reset(); populateCategories(); submitBtn.textContent = 'إضافة المعاملة'; submitBtn.classList.remove('editing'); cancelEditBtn.style.display = 'none'; /*console.log("Form reset.");*/ }

    // بدء التعديل (كما هو)
    function startEdit(id) { const transaction = transactions.find(t => t.id === Number(id)); if (!transaction) return; isEditing = true; editId = transaction.id; typeSelect.value = transaction.type; populateCategories(); categorySelect.value = transaction.category; descriptionInput.value = transaction.description; amountInput.value = formatCurrency(transaction.amount); submitBtn.textContent = 'تحديث المعاملة'; submitBtn.classList.add('editing'); cancelEditBtn.style.display = 'block'; transactionForm.scrollIntoView({ behavior: 'smooth', block: 'start' }); /*console.log("Editing started for ID:", editId);*/ }

    // حذف معاملة (كما هو)
    function deleteTransaction(id) { const idToDelete = Number(id); if (confirm('هل أنت متأكد من حذف هذه المعاملة؟')) { transactions = transactions.filter(t => t.id !== idToDelete); saveToLocalStorage(); updateUI(); if (isEditing && editId === idToDelete) resetForm(); /*console.log("Transaction deleted:", idToDelete);*/ } }

    // --- معالجات الأحداث (كما هي) ---
    typeSelect.addEventListener('change', populateCategories);
    transactionForm.addEventListener('submit', (e) => { e.preventDefault(); const type = typeSelect.value; const category = categorySelect.value; const description = descriptionInput.value.trim(); const amount = parseFloat(amountInput.value); if (!category) { alert('الرجاء اختيار فئة للمعاملة.'); categorySelect.focus(); return; } if (isNaN(amount) || amount <= 0) { alert('الرجاء إدخال مبلغ صحيح أكبر من الصفر.'); return; } const signedAmount = type === 'income' ? amount : -amount; if (isEditing) { transactions = transactions.map(t => t.id === editId ? { ...t, type, category, description, amount: signedAmount } : t); /*console.log("Transaction updated:", editId);*/ } else { const newTransaction = { id: Date.now() + Math.random(), type, category, description, amount: signedAmount, timestamp: Date.now() }; transactions.push(newTransaction); /*console.log("Transaction added:", newTransaction.id);*/ } saveToLocalStorage(); updateUI(); resetForm(); });
    cancelEditBtn.addEventListener('click', resetForm);
    historyList.addEventListener('click', (e) => { if (e.target.classList.contains('edit-btn')) { startEdit(e.target.dataset.id); } else if (e.target.classList.contains('delete-btn')) { deleteTransaction(e.target.dataset.id); } });
    filterButtons.forEach(button => { button.addEventListener('click', () => { filterButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); currentFilter = button.getAttribute('data-filter'); /*console.log("Filter changed to:", currentFilter);*/ renderHistory(); }); });
    searchInput.addEventListener('input', (e) => { currentSearchTerm = e.target.value; /*console.log("Search term:", currentSearchTerm);*/ renderHistory(); });

    // --- التشغيل الأولي ---
    console.log("Initializing App...");
    populateCategories(); updateUI(); cancelEditBtn.style.display = 'none';
    console.log("App Initialized.");

}); // نهاية DOMContentLoaded
