document.addEventListener("DOMContentLoaded", () => {
  // --- العناصر الأساسية ---
  // ... (كل العناصر السابقة) ...
  const balanceDisplay = document.getElementById("balance-display");
  const totalIncomeDisplay = document.getElementById("total-income-display");
  const totalExpenseDisplay = document.getElementById("total-expense-display");
  const incomePercentageDisplay = document.getElementById("income-percentage");
  const expensePercentageDisplay = document.getElementById(
    "expense-percentage"
  );
  const transactionForm = document.getElementById("transaction-form");
  const typeSelect = document.getElementById("type");
  const categorySelect = document.getElementById("category");
  const descriptionInput = document.getElementById("description");
  const amountInput = document.getElementById("amount");
  const historyList = document.getElementById("history-list");
  const financeChartCanvas = document.getElementById("finance-chart");
  const categoryChartCanvas = document.getElementById("category-chart");
  const submitBtn = document.getElementById("submit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const filterControls = document.getElementById("filter-controls");
  const filterButtons = filterControls.querySelectorAll(".filter-btn");
  const searchInput = document.getElementById("search-input");
  const addCategoryForm = document.getElementById("add-category-form");
  const newCategoryNameInput = document.getElementById("new-category-name");
  const newCategoryTypeSelect = document.getElementById("new-category-type");
  const incomeCategoriesList = document.getElementById(
    "income-categories-list"
  );
  const expenseCategoriesList = document.getElementById(
    "expense-categories-list"
  );
  const currentBudgetMonthSpan = document.getElementById(
    "current-budget-month"
  );
  const budgetListContainer = document.getElementById("budget-list");
  const budgetProgressList = document.getElementById("budget-progress-list");
  const exportCsvButton = document.getElementById("export-csv-btn"); // <<< زر التصدير

  // --- حالة التطبيق (كما هي) ---
  let transactions = JSON.parse(localStorage.getItem("transactionsData")) || [];
  const defaultCategories = {
    income: ["راتب", "عمل حر", "هدايا", "أخرى (دخل)"],
    expense: [
      "طعام",
      "مواصلات",
      "فواتير",
      "سكن",
      "ترفيه",
      "ملابس",
      "صحة",
      "تعليم",
      "أخرى (مصروف)"
    ]
  };
  let userCategories =
    JSON.parse(localStorage.getItem("userCategoriesData")) || defaultCategories;
  let monthlyBudgets =
    JSON.parse(localStorage.getItem("monthlyBudgetsData")) || {};
  let financeChartInstance = null;
  let categoryChartInstance = null;
  let isEditing = false;
  let editId = null;
  let currentFilter = "all";
  let currentSearchTerm = "";

  // --- الدوال المساعدة (كما هي مع إضافة escapeCsvValue) ---
  const formatCurrency = (num) => (Math.abs(Number(num)) || 0).toFixed(2);
  const formatDateTime = (timestamp) =>
    new Date(timestamp).toLocaleString("ar-EG", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false
    }); // استخدام 24 ساعة قد يكون أفضل للفرز في CSV
  const formatDateTimeForCSV = (timestamp) => {
    // تنسيق مخصص لـ CSV لفرز أفضل
    const d = new Date(timestamp);
    // YYYY-MM-DD HH:MM:SS
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(
      2,
      "0"
    )}:${String(d.getMinutes()).padStart(2, "0")}:${String(
      d.getSeconds()
    ).padStart(2, "0")}`;
  };
  const saveToLocalStorage = () => {
    localStorage.setItem("transactionsData", JSON.stringify(transactions));
  };
  const saveCategoriesToLocalStorage = () => {
    localStorage.setItem("userCategoriesData", JSON.stringify(userCategories));
    console.log("Categories saved.");
  };
  const saveBudgetsToLocalStorage = () => {
    localStorage.setItem("monthlyBudgetsData", JSON.stringify(monthlyBudgets));
    console.log("Budgets saved.");
  };
  const getCurrentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  };
  const getCurrentMonthBudgets = () => {
    const currentMonthKey = getCurrentMonthKey();
    if (!monthlyBudgets[currentMonthKey]) {
      monthlyBudgets[currentMonthKey] = {};
    }
    return monthlyBudgets[currentMonthKey];
  };
  function populateCategories(valueToSelectAfter = null) {
    /* ... كما هي ... */ if (!categorySelect) return;
    const selectedType = typeSelect.value;
    const currentCategories = userCategories[selectedType] || [];
    const currentActualValue = categorySelect.value;
    categorySelect.innerHTML = '<option value="" disabled>اختر فئة...</option>';
    currentCategories.sort((a, b) => a.localeCompare(b, "ar"));
    currentCategories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });
    categorySelect.required = true;
    const finalValueToSelect = valueToSelectAfter || currentActualValue;
    if (currentCategories.includes(finalValueToSelect)) {
      categorySelect.value = finalValueToSelect;
    } else {
      categorySelect.value = "";
    }
  }
  function renderCategories() {
    /* ... كما هي ... */ if (!incomeCategoriesList || !expenseCategoriesList)
      return;
    incomeCategoriesList.innerHTML = "";
    expenseCategoriesList.innerHTML = "";
    const renderList = (listElement, categoriesOfType) => {
      if (categoriesOfType && categoriesOfType.length > 0) {
        categoriesOfType.sort((a, b) => a.localeCompare(b, "ar"));
        categoriesOfType.forEach((cat) => {
          const li = document.createElement("li");
          li.textContent = cat;
          listElement.appendChild(li);
        });
      } else {
        listElement.innerHTML = `<li class="no-categories">لا توجد فئات ${
          listElement === incomeCategoriesList ? "دخل" : "مصروفات"
        } مخصصة.</li>`;
      }
    };
    renderList(incomeCategoriesList, userCategories.income);
    renderList(expenseCategoriesList, userCategories.expense);
  }
  // <<< دالة للتعامل مع الفواصل وعلامات الاقتباس في CSV >>>
  function escapeCsvValue(value) {
    const stringValue = String(value || ""); // تحويل إلى نص والتعامل مع null/undefined
    // إذا كانت القيمة تحتوي على فاصلة أو علامة اقتباس مزدوجة أو سطر جديد
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      // ضع القيمة بين علامتي اقتباس مزدوجة
      // وضاعف أي علامة اقتباس مزدوجة موجودة داخل القيمة
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue; // إرجاع القيمة كما هي إذا كانت آمنة
  }

  // --- الدوال الرئيسية (updateUI, renderHistory, charts, etc.) ---
  // ... (تبقى هذه الدوال كما هي من الرد السابق) ...
  function updateUI() {
    /* ... */ let income = 0,
      expense = 0;
    transactions.forEach((t) =>
      t.amount > 0 ? (income += t.amount) : (expense += t.amount)
    );
    const balance = income + expense;
    const absExpense = Math.abs(expense);
    const totalFlow = income + absExpense;
    const incomePercent =
      totalFlow > 0 ? ((income / totalFlow) * 100).toFixed(1) : 0;
    const expensePercent =
      totalFlow > 0 ? ((absExpense / totalFlow) * 100).toFixed(1) : 0;
    balanceDisplay.textContent = balance.toFixed(2);
    totalIncomeDisplay.textContent = formatCurrency(income);
    totalExpenseDisplay.textContent = formatCurrency(expense);
    incomePercentageDisplay.textContent = `(${incomePercent}%)`;
    expensePercentageDisplay.textContent = `(${expensePercent}%)`;
    renderHistory();
    renderOrUpdateBalanceLineChart();
    const currentMonthKey = getCurrentMonthKey();
    const currentMonthCategorySummary = calculateCategorySummary(
      currentMonthKey
    );
    renderOrUpdateCategoryChart(currentMonthCategorySummary);
    renderBudgetProgress(currentMonthCategorySummary, getCurrentMonthBudgets());
    console.log("UI Updated");
  }
  function renderHistory() {
    /* ... */ historyList.innerHTML = "";
    const searchTerm = currentSearchTerm.toLowerCase().trim();
    const filteredTransactions = transactions.filter((t) => {
      const typeMatch =
        currentFilter === "all" ||
        (currentFilter === "income" && t.amount > 0) ||
        (currentFilter === "expense" && t.amount < 0);
      const searchMatch =
        !searchTerm ||
        (t.description && t.description.toLowerCase().includes(searchTerm));
      return typeMatch && searchMatch;
    });
    if (filteredTransactions.length === 0) {
      const message = searchTerm
        ? "لا توجد نتائج تطابق بحثك."
        : currentFilter === "all"
        ? "لا توجد معاملات بعد."
        : `لا توجد معاملات ${
            currentFilter === "income" ? "دخل" : "مصروفات"
          } لعرضها.`;
      historyList.innerHTML = `<tr><td colspan="6" style="text-align: center;">${message}</td></tr>`;
      return;
    }
    [...filteredTransactions]
      .sort((a, b) => b.timestamp - a.timestamp)
      .forEach((t) => {
        const row = document.createElement("tr");
        const amountClass = t.amount > 0 ? "income" : "expense";
        const sign = t.amount > 0 ? "+" : "-";
        row.innerHTML = `<td>${t.type === "income" ? "دخل" : "مصروف"}</td><td>${
          t.category || "-"
        }</td><td>${
          t.description || "-"
        }</td><td class="${amountClass}">${sign}${formatCurrency(
          t.amount
        )}</td><td>${formatDateTime(
          t.timestamp
        )}</td><td><button class="action-btn edit-btn" data-id="${
          t.id
        }">تعديل</button><button class="action-btn delete-btn" data-id="${
          t.id
        }">حذف</button></td>`;
        historyList.appendChild(row);
      });
  }
  function renderOrUpdateBalanceLineChart() {
    /* ... */ if (
      !financeChartCanvas ||
      typeof Chart === "undefined" ||
      typeof Chart._adapters === "undefined"
    ) {
      return;
    }
    const ctx = financeChartCanvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const lineChartData = prepareLineChartData();
    const data = {
      datasets: [
        {
          label: "الرصيد",
          data: lineChartData,
          borderColor: "rgb(0, 123, 255)",
          backgroundColor: "rgba(0, 123, 255, 0.1)",
          fill: true,
          tension: 0.1
        }
      ]
    };
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            tooltipFormat: "PPpp",
            displayFormats: {
              day: "d MMM",
              week: "d MMM",
              month: "MMM yyyy",
              quarter: "qqq yyyy",
              year: "yyyy"
            }
          },
          title: { display: true, text: "التاريخ" }
        },
        y: {
          beginAtZero: false,
          title: { display: true, text: "الرصيد" },
          ticks: {
            callback: function (value) {
              return value.toFixed(0);
            }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function (tooltipItems) {
              return formatDateTime(tooltipItems[0].parsed.x);
            },
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(2);
              }
              return label;
            }
          }
        }
      }
    };
    if (financeChartInstance) {
      financeChartInstance.data.datasets[0].data = lineChartData;
      financeChartInstance.options = options;
      financeChartInstance.update();
    } else {
      financeChartInstance = new Chart(ctx, { type: "line", data, options });
    }
  }
  function prepareLineChartData() {
    /* ... */ const sortedTransactions = [...transactions].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    let runningBalance = 0;
    const dataPoints = sortedTransactions.map((t) => {
      runningBalance += t.amount;
      return { x: t.timestamp, y: runningBalance };
    });
    if (dataPoints.length > 0 && sortedTransactions[0]?.timestamp) {
      dataPoints.unshift({
        x: sortedTransactions[0].timestamp - 3600000,
        y: 0
      });
    } else if (dataPoints.length === 0) {
      dataPoints.push({ x: Date.now(), y: 0 });
    }
    return dataPoints;
  }
  function calculateCategorySummary(monthKey = getCurrentMonthKey()) {
    /* ... */ const summary = {};
    const monthStart = new Date(monthKey + "-01T00:00:00").getTime();
    const nextMonthDate = new Date(monthKey + "-01T00:00:00");
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const monthEnd = nextMonthDate.getTime() - 1;
    transactions.forEach((t) => {
      if (
        t.timestamp >= monthStart &&
        t.timestamp <= monthEnd &&
        t.amount < 0 &&
        t.category
      ) {
        summary[t.category] = (summary[t.category] || 0) + Math.abs(t.amount);
      }
    });
    return summary;
  }
  function renderOrUpdateCategoryChart(summaryData) {
    /* ... */ if (!categoryChartCanvas || typeof Chart === "undefined") {
      return;
    }
    const ctx = categoryChartCanvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const labels = Object.keys(summaryData);
    const dataValues = Object.values(summaryData);
    const hasData = dataValues.some((value) => value > 0);
    categoryChartCanvas.style.display = hasData ? "block" : "none";
    const parentBox = categoryChartCanvas.closest(".category-summary-box");
    let noDataMsg = parentBox.querySelector(".no-data-message");
    if (!hasData) {
      if (!noDataMsg) {
        noDataMsg = document.createElement("p");
        noDataMsg.textContent =
          "لا توجد بيانات مصروفات لعرض الرسم البياني للفئات.";
        noDataMsg.className = "no-data-message";
        noDataMsg.style.textAlign = "center";
        noDataMsg.style.color = "var(--text-muted)";
        parentBox.appendChild(noDataMsg);
      }
      noDataMsg.style.display = "block";
      if (categoryChartInstance) {
        categoryChartInstance.destroy();
        categoryChartInstance = null;
      }
      return;
    } else if (noDataMsg) {
      noDataMsg.style.display = "none";
    }
    let backgroundColors = [];
    if (typeof randomColor === "function") {
      backgroundColors = randomColor({
        count: labels.length,
        luminosity: "bright",
        format: "rgba",
        alpha: 0.8,
        seed: 42
      });
    } else {
      backgroundColors = [
        "rgba(255, 99, 132, 0.8)",
        "rgba(54, 162, 235, 0.8)",
        "rgba(255, 206, 86, 0.8)",
        "rgba(75, 192, 192, 0.8)",
        "rgba(153, 102, 255, 0.8)",
        "rgba(255, 159, 64, 0.8)"
      ];
      while (backgroundColors.length < labels.length) {
        backgroundColors = backgroundColors.concat(backgroundColors);
      }
      backgroundColors = backgroundColors.slice(0, labels.length);
    }
    const data = {
      labels: labels,
      datasets: [
        { data: dataValues, backgroundColor: backgroundColors, borderWidth: 1 }
      ]
    };
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { padding: 15 } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}`
          }
        }
      }
    };
    if (categoryChartInstance) {
      categoryChartInstance.data.labels = labels;
      categoryChartInstance.data.datasets[0].data = dataValues;
      categoryChartInstance.data.datasets[0].backgroundColor = backgroundColors;
      categoryChartInstance.update();
    } else {
      categoryChartInstance = new Chart(ctx, { type: "pie", data, options });
    }
  }
  function renderBudgetInputs() {
    /* ... */ if (!budgetListContainer || !currentBudgetMonthSpan) return;
    const currentMonthKey = getCurrentMonthKey();
    currentBudgetMonthSpan.textContent = currentMonthKey;
    const budgets = getCurrentMonthBudgets();
    const expenseCategories = userCategories.expense || [];
    budgetListContainer.innerHTML = "";
    if (expenseCategories.length === 0) {
      budgetListContainer.innerHTML =
        "<p>لا توجد فئات مصروفات لإضافة ميزانية لها.</p>";
      return;
    }
    expenseCategories
      .sort((a, b) => a.localeCompare(b, "ar"))
      .forEach((category) => {
        const budgetValue = budgets[category] || "";
        const itemDiv = document.createElement("div");
        itemDiv.classList.add("budget-item");
        const label = document.createElement("label");
        label.htmlFor = `budget-${category}`;
        label.textContent = category;
        const input = document.createElement("input");
        input.type = "number";
        input.id = `budget-${category}`;
        input.dataset.category = category;
        input.placeholder = "0.00";
        input.min = "0";
        input.step = "0.01";
        input.value = budgetValue;
        input.addEventListener("change", (e) => {
          const categoryName = e.target.dataset.category;
          const newBudgetValue = parseFloat(e.target.value);
          const currentBudgets = getCurrentMonthBudgets();
          if (!isNaN(newBudgetValue) && newBudgetValue >= 0) {
            currentBudgets[categoryName] = newBudgetValue;
          } else {
            delete currentBudgets[categoryName];
            e.target.value = "";
          }
          saveBudgetsToLocalStorage();
          renderBudgetProgress(
            calculateCategorySummary(currentMonthKey),
            currentBudgets
          );
        });
        itemDiv.appendChild(label);
        itemDiv.appendChild(input);
        budgetListContainer.appendChild(itemDiv);
      });
  }
  function renderBudgetProgress(currentMonthSummary, currentBudgets) {
    /* ... */ if (!budgetProgressList) return;
    budgetProgressList.innerHTML = "";
    const categoriesWithBudget = Object.keys(currentBudgets).filter(
      (cat) => currentBudgets[cat] > 0
    );
    if (categoriesWithBudget.length === 0) {
      budgetProgressList.innerHTML =
        "<li>لا توجد ميزانيات محددة لهذا الشهر.</li>";
      return;
    }
    categoriesWithBudget
      .sort((a, b) => a.localeCompare(b, "ar"))
      .forEach((category) => {
        const budgetAmount = currentBudgets[category];
        const spentAmount = currentMonthSummary[category] || 0;
        const remainingAmount = budgetAmount - spentAmount;
        const progressPercent =
          budgetAmount > 0
            ? Math.min(100, (spentAmount / budgetAmount) * 100)
            : 0;
        const li = document.createElement("li");
        li.classList.add("budget-progress-item");
        const isOverBudget = spentAmount > budgetAmount;
        li.innerHTML = `<span class="category-name">${category}</span><div class="values">المصروف: ${formatCurrency(
          spentAmount
        )} / الميزانية: ${formatCurrency(
          budgetAmount
        )}</div><div class="progress-bar-container"><div class="progress-bar ${
          isOverBudget ? "over-budget" : ""
        }" style="width: ${progressPercent}%;"></div></div><span class="remaining ${
          remainingAmount >= 0 ? "under" : "over"
        }">${
          remainingAmount >= 0
            ? "المتبقي: " + formatCurrency(remainingAmount)
            : "تجاوز: " + formatCurrency(remainingAmount)
        }</span>`;
        budgetProgressList.appendChild(li);
      });
  }
  function resetForm() {
    /* ... */ isEditing = false;
    editId = null;
    transactionForm.reset();
    populateCategories();
    submitBtn.textContent = "إضافة المعاملة";
    submitBtn.classList.remove("editing");
    cancelEditBtn.style.display = "none";
  }
  function startEdit(id) {
    /* ... */ const transaction = transactions.find((t) => t.id === Number(id));
    if (!transaction) return;
    isEditing = true;
    editId = transaction.id;
    typeSelect.value = transaction.type;
    populateCategories(transaction.category);
    descriptionInput.value = transaction.description;
    amountInput.value = formatCurrency(transaction.amount);
    submitBtn.textContent = "تحديث المعاملة";
    submitBtn.classList.add("editing");
    cancelEditBtn.style.display = "block";
    transactionForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function deleteTransaction(id) {
    /* ... */ const idToDelete = Number(id);
    if (confirm("هل أنت متأكد من حذف هذه المعاملة؟")) {
      transactions = transactions.filter((t) => t.id !== idToDelete);
      saveToLocalStorage();
      updateUI();
      if (isEditing && editId === idToDelete) resetForm();
    }
  }
  function addCategory(name, type) {
    /* ... */ const categoryName = name.trim();
    if (!categoryName) {
      alert("الرجاء إدخال اسم صحيح للفئة.");
      return;
    }
    if (!userCategories[type]) {
      userCategories[type] = [];
    }
    if (
      userCategories[type]
        .map((c) => c.toLowerCase())
        .includes(categoryName.toLowerCase())
    ) {
      alert(`الفئة "${categoryName}" موجودة بالفعل.`);
      return;
    }
    userCategories[type].push(categoryName);
    saveCategoriesToLocalStorage();
    renderCategories();
    populateCategories();
    addCategoryForm.reset();
    alert(`تمت إضافة الفئة "${categoryName}" بنجاح.`);
  }

  // <<< دالة جديدة: تصدير البيانات إلى CSV >>>
  function exportToCsv() {
    if (transactions.length === 0) {
      alert("لا توجد معاملات لتصديرها.");
      return;
    }

    // رؤوس الأعمدة
    const headers = [
      "ID",
      "النوع",
      "الفئة",
      "الوصف",
      "المبلغ",
      "التاريخ والوقت (Timestamp)",
      "التاريخ والوقت (Formatted)"
    ];
    // تحويل بيانات المعاملات إلى مصفوفة من الصفوف
    const rows = transactions.map((t) => [
      t.id,
      t.type === "income" ? "دخل" : "مصروف",
      t.category,
      t.description,
      t.amount, // المبلغ الفعلي (موجب أو سالب)
      t.timestamp,
      formatDateTimeForCSV(t.timestamp) // تنسيق التاريخ удобочитаемый
    ]);

    // تجميع رؤوس الأعمدة والصفوف في نص CSV
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // إضافة BOM لدعم العربية في Excel
    csvContent += headers.map((h) => escapeCsvValue(h)).join(",") + "\r\n"; // صف الرؤوس

    rows.forEach((rowArray) => {
      let row = rowArray.map((cell) => escapeCsvValue(cell)).join(",");
      csvContent += row + "\r\n";
    });

    // إنشاء رابط تنزيل ظاهري
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timestamp = new Date().toISOString().slice(0, 10); // تاريخ اليوم
    link.setAttribute("download", `transactions_${timestamp}.csv`);
    document.body.appendChild(link); // مطلوب ليعمل في Firefox

    // النقر على الرابط لبدء التنزيل ثم إزالته
    link.click();
    document.body.removeChild(link);

    console.log("Data exported to CSV.");
  }

  // --- معالجات الأحداث ---
  // ... (كل مستمعات الأحداث السابقة كما هي) ...
  if (typeSelect) {
    typeSelect.addEventListener("change", populateCategories);
  }
  if (transactionForm) {
    transactionForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const type = typeSelect.value;
      const category = categorySelect.value;
      const description = descriptionInput.value.trim();
      const amount = parseFloat(amountInput.value);
      if (!category) {
        alert("الرجاء اختيار فئة للمعاملة.");
        categorySelect.focus();
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        alert("الرجاء إدخال مبلغ صحيح أكبر من الصفر.");
        return;
      }
      const signedAmount = type === "income" ? amount : -amount;
      if (isEditing) {
        transactions = transactions.map((t) =>
          t.id === editId
            ? { ...t, type, category, description, amount: signedAmount }
            : t
        );
      } else {
        const newTransaction = {
          id: Date.now() + Math.random(),
          type,
          category,
          description,
          amount: signedAmount,
          timestamp: Date.now()
        };
        transactions.push(newTransaction);
      }
      saveToLocalStorage();
      updateUI();
      resetForm();
    });
  }
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", resetForm);
  }
  if (historyList) {
    historyList.addEventListener("click", (e) => {
      if (e.target.classList.contains("edit-btn")) {
        startEdit(e.target.dataset.id);
      } else if (e.target.classList.contains("delete-btn")) {
        deleteTransaction(e.target.dataset.id);
      }
    });
  }
  if (filterButtons) {
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        filterButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        currentFilter = button.getAttribute("data-filter");
        renderHistory();
      });
    });
  }
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchTerm = e.target.value;
      renderHistory();
    });
  }
  if (addCategoryForm) {
    addCategoryForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (newCategoryNameInput && newCategoryTypeSelect) {
        const newName = newCategoryNameInput.value;
        const newType = newCategoryTypeSelect.value;
        addCategory(newName, newType);
      }
    });
  }

  // <<< إضافة مستمع حدث لزر التصدير >>>
  if (exportCsvButton) {
    exportCsvButton.addEventListener("click", exportToCsv);
  } else {
    console.warn("Export CSV button not found.");
  }

  // --- التشغيل الأولي ---
  console.log("Initializing App...");
  if (incomeCategoriesList) {
    renderCategories();
  }
  if (categorySelect) {
    populateCategories();
  }
  if (budgetListContainer) {
    renderBudgetInputs();
  }
  if (balanceDisplay) {
    updateUI();
  }
  if (cancelEditBtn) {
    cancelEditBtn.style.display = "none";
  }
  console.log("App Initialized.");
}); // نهاية DOMContentLoaded
