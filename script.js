let transactions = [];

function updateSummary() {
    let totalIncome = 0, totalExpense = 0;

    transactions.forEach(transaction => {
        if (transaction.type === "income") {
            totalIncome += transaction.amount;
        } else {
            totalExpense += transaction.amount;
        }
    });

    let balance = totalIncome - totalExpense;
    let expensePercent = totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(2) : 0;

    document.getElementById("income").textContent = totalIncome.toFixed(2);
    document.getElementById("expenses").textContent = totalExpense.toFixed(2);
    document.getElementById("balance").textContent = balance.toFixed(2);
    document.getElementById("expense-percent").textContent = `(${expensePercent}%)`;
}

function addTransaction() {
    let type = document.getElementById("type").value;
    let category = document.getElementById("category").value;
    let amount = parseFloat(document.getElementById("amount").value);

    if (!category || isNaN(amount) || amount <= 0) {
        alert("يرجى إدخال بيانات صحيحة");
        return;
    }

    transactions.push({ type, category, amount });
    renderTransactions();
    updateSummary();
}

function renderTransactions() {
    let transactionsList = document.getElementById("transactions");
    transactionsList.innerHTML = "";

    transactions.forEach((transaction, index) => {
        let listItem = document.createElement("li");
        listItem.textContent = `${transaction.category}: ${transaction.amount.toFixed(2)} (${transaction.type === "income" ? "دخل" : "مصروف"})`;

        let deleteBtn = document.createElement("button");
        deleteBtn.textContent = "حذف";
        deleteBtn.onclick = () => removeTransaction(index);

        listItem.appendChild(deleteBtn);
        transactionsList.appendChild(listItem);
    });
}

function removeTransaction(index) {
    transactions.splice(index, 1);
    renderTransactions();
    updateSummary();
}
